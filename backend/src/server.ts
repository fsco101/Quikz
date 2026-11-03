import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import draftRoutes from "./routes/draftRoutes.js";
import { EditorDraft } from "./models/EditorDraft.js";
import { bootstrapAdmin } from "./services/users.js";
import authRoutes from "./routes/authRoutes.js";
import subjectRoutes from "./routes/subjectRoutes.js";
import moduleRoutes from "./routes/moduleRoutes.js";
import quizRoutes from "./routes/quizRoutes.js";
import { seedDatabase } from "./utils/seeder.js";
import { InputError } from "./services/questionBank.js";
import { downloadModuleFile } from "./controllers/moduleController.js";
import { authenticateToken } from "./middleware/auth.js";
import multer from "multer";
import { QuizAttempt } from "./models/QuizAttempt.js";
import { QuizSubmission } from "./models/QuizSubmission.js";
import { StudentProgress } from "./models/StudentProgress.js";
import { finalizeExpiredAttempts } from "./controllers/quizController.js";
import gradebookRoutes from "./routes/gradebookRoutes.js";
import directoryRoutes from "./routes/directoryRoutes.js";
import systemRoutes from "./routes/systemRoutes.js";
import { auditRequests } from "./middleware/audit.js";
import { AuditEvent } from "./models/AuditEvent.js";
import mongoose from "mongoose";
import connectionRoutes from "./routes/connectionRoutes.js";
import { FacultyConnection } from "./models/FacultyConnection.js";
import { corsOptions, CorsOriginError } from "./config/cors.js";
import { disconnectDB } from "./config/db.js";
import { migrateAcademicTerms } from './services/academicTerms.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 5000);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error('PORT must be a valid TCP port.');

// Middleware
app.disable('x-powered-by');
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.use(cors(corsOptions()));
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(auditRequests);
app.use((req, res, next) => {
  if (
    req.path.startsWith("/api/gradebook") ||
    req.path.startsWith("/api/system") ||
    req.path.startsWith("/api/admin") || req.path.startsWith("/api/auth/me") ||
    req.path.startsWith("/api/connections") || req.path.startsWith("/api/subjects") ||
    req.path.startsWith("/api/modules") || req.path.startsWith("/api/quizzes") || req.path.startsWith("/api/users")
  )
    res.setHeader("Cache-Control", "no-store");
  next();
});

// Lesson files share the same authentication and prerequisite checks as lessons.
app.get("/api/modules/:id/file", authenticateToken, downloadModuleFile);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/drafts", draftRoutes);
app.use("/api/connections", connectionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/modules", moduleRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/gradebook", gradebookRoutes);
app.use("/api/directory", directoryRoutes);
app.use("/api/system", systemRoutes);
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    const status =
      err instanceof CorsOriginError ? 403 : err instanceof InputError
        ? err.status
        : err.code === 11000 ? 409
        : err instanceof multer.MulterError
          ? 400
          : err.name === "CastError" ||
              err.name === "ValidationError" ||
              err.type === "entity.parse.failed"
            ? 400
            : 500;
    res
      .status(status)
      .json({
        message: status === 500 ? "Request failed. Please retry." : status === 409 && err.code === 11000 ? "Username or email is already in use." : err.message,
        errors: err.details,
      });
  },
);

// Healthcheck endpoint
app.get("/api/health", (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(mongoose.connection.readyState === 1 ? 200 : 503).json({
    status: mongoose.connection.readyState === 1 ? "ok" : "unavailable",
    system: "Quikz Modular Quiz Learning Platform",
    timestamp: new Date().toISOString(),
  });
});

export const startServer = async () => {
  await connectDB();
  await migrateAcademicTerms();
  await bootstrapAdmin();
  await Promise.all([
    QuizAttempt.init(),
    QuizSubmission.init(),
    StudentProgress.init(),
    AuditEvent.init(),
    FacultyConnection.init(),
    EditorDraft.init(),
  ]);
  if (process.env.NODE_ENV !== 'production' || process.env.SEED_DEMO_DATA === 'true') await seedDatabase();
  const server = app.listen(PORT, '0.0.0.0');
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  console.log(`[Quikz Server] Listening on 0.0.0.0:${PORT}`);
  const sweep = setInterval(() => {
    void finalizeExpiredAttempts().catch((err) =>
      console.error("Quiz expiry sweep failed:", err),
    );
  }, 15000);
  sweep.unref();
  server.on("close", () => clearInterval(sweep));
  return server;
};

if (process.env.NODE_ENV !== "test") {
  startServer().then((server) => {
    let stopping = false;
    const shutdown = () => {
      if (stopping) return;
      stopping = true;
      console.log('[Quikz Server] Draining requests before shutdown.');
      const deadline = setTimeout(() => process.exit(1), 25000);
      deadline.unref();
      server.close((error) => {
        void disconnectDB().then(() => {
          clearTimeout(deadline);
          process.exitCode = error ? 1 : 0;
        }).catch(() => { process.exitCode = 1; });
      });
    };
    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);
  }).catch(async (err) => {
    console.error('Failed to start server:', err instanceof Error ? err.message : 'Unknown startup error');
    await disconnectDB().catch(() => {});
    process.exitCode = 1;
  });
}

export default app;
