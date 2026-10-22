import { Response } from "express";
import mongoose from "mongoose";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { Module } from "../models/Module.js";
import { Subject } from "../models/Subject.js";
import { QuizSubmission } from "../models/QuizSubmission.js";
import { AuthRequest } from "../middleware/auth.js";
import {
  recordCompletion,
  requireModuleAccess,
  verifiedCompletionIds,
} from "../services/progression.js";
import { InputError } from "../services/questionBank.js";

export const getSubjectModules = async (req: AuthRequest, res: Response) => {
  try {
    const { subjectId } = req.params;
    if (!mongoose.isValidObjectId(subjectId))
      return res.status(400).json({ message: "Invalid subject ID" });
    if (!(await Subject.exists({ _id: subjectId })))
      return res.status(404).json({ message: "Subject not found" });
    const modules = await Module.find({ subjectId })
      .sort({ orderIndex: 1 })
      .populate(
        "quizId",
        "title timeLimitMinutes timePerQuestionSeconds questionCount passingPercentage",
      );
    const completed =
      req.user?.role === "student"
        ? await verifiedCompletionIds(req.user.id, subjectId, modules)
        : new Set<string>();
    let accessible = true;
    const enriched = modules.map((module) => {
      const isCompleted = completed.has(String(module._id));
      const isLocked = req.user?.role === "student" && !accessible;
      if (!isCompleted) accessible = false;
      const data = module.toObject();
      // Locked modules expose navigation metadata only, never lecture content or files.
      return {
        ...data,
        textContent: isLocked ? undefined : data.textContent,
        fileUrl:
          isLocked || !data.fileName
            ? undefined
            : `/api/modules/${module._id}/file`,
        summary: isLocked ? "" : data.summary,
        quizId: isLocked ? undefined : data.quizId,
        isLocked,
        isCompleted,
      };
    });
    res.json({
      modules: enriched,
      progress: {
        totalModules: modules.length,
        completedCount: modules.filter((m) => completed.has(String(m._id)))
          .length,
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to retrieve modules" });
  }
};
export const createModule = async (req: AuthRequest, res: Response) => {
  try {
    const { subjectId } = req.params;
    const {
      title,
      summary,
      contentType = req.file ? "file" : "text",
      textContent = "",
    } = req.body;
    if (!mongoose.isValidObjectId(subjectId))
      throw new InputError("Invalid subject ID.");
    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof summary !== "string" ||
      !summary.trim()
    )
      throw new InputError("Title and executive summary are required.");
    if (!["text", "file", "presentation"].includes(contentType))
      throw new InputError("Invalid content type.");
    if (contentType !== "text" && !req.file)
      throw new InputError("Attach a lesson file.");
    if (typeof textContent !== "string")
      throw new InputError("Lecture content must be text.");
    const subject = await Subject.findById(subjectId);
    if (!subject) throw new InputError("Subject not found.", 404);
    if (String(subject.facultyId) !== req.user!.id)
      throw new InputError("Only the subject owner can add modules.", 403);
    const last = await Module.findOne({ subjectId }).sort({ orderIndex: -1 });
    const module = await Module.create({
      subjectId,
      title: title.trim(),
      summary: summary.trim(),
      orderIndex: (last?.orderIndex || 0) + 1,
      contentType,
      textContent,
      fileName: req.file?.originalname,
      fileUrl: req.file ? `/uploads/${req.file.filename}` : undefined,
    });
    res.status(201).json({ module });
  } catch (err: any) {
    if (req.file) fs.unlink(req.file.path, () => {});
    res
      .status(err instanceof InputError ? err.status : 400)
      .json({ message: err.message });
  }
};
export const completeModule = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "student")
      throw new InputError("Only students complete modules.", 403);
    if (!mongoose.isValidObjectId(req.params.id))
      throw new InputError("Invalid module ID.");
    const module = await requireModuleAccess(req.user!.id, req.params.id);
    const passed =
      module.quizId &&
      (await QuizSubmission.exists({
        studentId: req.user!.id,
        quizId: module.quizId,
        passed: true,
      }));
    if (!passed)
      throw new InputError(
        "Meet the designated end quiz passing mark before completing this module.",
        403,
      );
    await recordCompletion(req.user!.id, module.subjectId, module._id);
    res.json({
      message: "Module completed. Next module unlocked.",
      unlockedNext: true,
    });
  } catch (err: any) {
    res
      .status(err instanceof InputError ? err.status : 500)
      .json({ message: err.message });
  }
};
export const downloadModuleFile = async (req: AuthRequest, res: Response) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      throw new InputError("Invalid module ID.");
    const module =
      req.user!.role === "student"
        ? await requireModuleAccess(req.user!.id, req.params.id)
        : await Module.findById(req.params.id);
    if (!module?.fileUrl) throw new InputError("Lesson file not found.", 404);
    const dir = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../uploads",
    );
    res.download(
      path.join(dir, path.basename(module.fileUrl)),
      module.fileName || "lesson",
      (err) => {
        if (err && !res.headersSent)
          res.status(404).json({ message: "Lesson file not found." });
      },
    );
  } catch (err: any) {
    res
      .status(err instanceof InputError ? err.status : 500)
      .json({ message: err.message });
  }
};

export const getModuleById = async (req: AuthRequest, res: Response) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      throw new InputError("Invalid module ID.");
    if (req.user!.role === "student")
      await requireModuleAccess(req.user!.id, req.params.id);
    const module = await Module.findById(req.params.id).populate(
      "quizId",
      "title timeLimitMinutes timePerQuestionSeconds questionCount passingPercentage",
    );
    if (!module) throw new InputError("Module not found.", 404);
    res.json({
      module: {
        ...module.toObject(),
        fileUrl: module.fileName
          ? `/api/modules/${module._id}/file`
          : undefined,
      },
    });
  } catch (err: any) {
    res
      .status(err instanceof InputError ? err.status : 500)
      .json({ message: err.message });
  }
};
