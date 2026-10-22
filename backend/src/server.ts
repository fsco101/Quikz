import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import subjectRoutes from './routes/subjectRoutes.js';
import moduleRoutes from './routes/moduleRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import { seedDatabase } from './utils/seeder.js';
import { InputError } from './services/questionBank.js';
import { downloadModuleFile } from './controllers/moduleController.js';
import { authenticateToken } from './middleware/auth.js';
import multer from 'multer';
import { QuizAttempt } from './models/QuizAttempt.js';
import { QuizSubmission } from './models/QuizSubmission.js';
import { StudentProgress } from './models/StudentProgress.js';
import { finalizeExpiredAttempts } from './controllers/quizController.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Lesson files share the same authentication and prerequisite checks as lessons.
app.get('/api/modules/:id/file', authenticateToken, downloadModuleFile);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/quizzes', quizRoutes);
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const status = err instanceof InputError ? err.status : err instanceof multer.MulterError ? 400 : err.name === 'CastError' || err.name === 'ValidationError' || err.type === 'entity.parse.failed' ? 400 : 500;
  res.status(status).json({ message: status === 500 ? 'Request failed. Please retry.' : err.message, errors: err.details });
});

// Healthcheck endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'Quikz Modular Quiz Learning Platform',
    timestamp: new Date().toISOString()
  });
});

export const startServer = async () => {
  await connectDB();
  await Promise.all([QuizAttempt.init(), QuizSubmission.init(), StudentProgress.init()]);
  await seedDatabase();
  const sweep = setInterval(() => { void finalizeExpiredAttempts().catch(err => console.error('Quiz expiry sweep failed:', err)); }, 15000);
  sweep.unref();
  const server = app.listen(PORT, () => {
    console.log(`[Quikz Server] Running on http://localhost:${PORT}`);
  });
  server.on('close', () => clearInterval(sweep));
  return server;
};

if (process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
  });
}

export default app;
