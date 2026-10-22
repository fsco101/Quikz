import { Router, RequestHandler } from "express";
import multer from "multer";
import {
  createQuiz,
  importQuestions,
  generateQuestions,
  getQuizzesBySubject,
  getQuizById,
  startAttempt,
  advanceQuestion,
  saveAttempt,
  submitQuiz,
  getStudentSubmissions,
} from "../controllers/quizController.js";
import { authenticateToken, requireRole } from "../middleware/auth.js";
const router = Router();
const file = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});
const run =
  (handler: any): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(handler(req, res)).catch(next);
  };
router.use(authenticateToken);
router.post("/", requireRole("faculty"), run(createQuiz));
router.post(
  "/import",
  requireRole("faculty"),
  file.single("file"),
  run(importQuestions),
);
router.post(
  "/generate",
  requireRole("faculty"),
  file.single("file"),
  run(generateQuestions),
);
router.get("/subject/:subjectId", run(getQuizzesBySubject));
router.get("/submissions", requireRole("student"), run(getStudentSubmissions));
router.get("/:id", run(getQuizById));
router.post("/:id/attempts", requireRole("student"), run(startAttempt));
router.patch(
  "/:id/attempts/:attemptId",
  requireRole("student"),
  run(saveAttempt),
);
router.post(
  "/:id/attempts/:attemptId/advance",
  requireRole("student"),
  run(advanceQuestion),
);
router.post(
  "/:id/attempts/:attemptId/submit",
  requireRole("student"),
  run(submitQuiz),
);
export default router;
