import { Response } from 'express';
import { Module } from '../models/Module.js';
import { Subject } from '../models/Subject.js';
import { StudentProgress } from '../models/StudentProgress.js';
import { AuthRequest } from '../middleware/auth.js';
import mongoose from 'mongoose';

export const getSubjectModules = async (req: AuthRequest, res: Response) => {
  try {
    const { subjectId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      return res.status(400).json({ message: 'Invalid subject ID' });
    }

    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    const modules = await Module.find({ subjectId }).sort({ orderIndex: 1 });

    // If user is faculty, all modules are unlocked for viewing/editing
    if (!req.user || req.user.role === 'faculty') {
      const enriched = modules.map((m) => ({
        ...m.toObject(),
        isLocked: false,
        isCompleted: true
      }));
      return res.json({ modules: enriched });
    }

    // If user is student, calculate linear sequential lock status
    const studentId = req.user.id;
    let progress = await StudentProgress.findOne({ studentId, subjectId });

    if (!progress) {
      progress = new StudentProgress({
        studentId,
        subjectId,
        completedModuleIds: []
      });
      await progress.save();
    }

    const completedSet = new Set(
      progress.completedModuleIds.map((id) => id.toString())
    );

    // Progression Rule: Module 1 is always unlocked.
    // Module N is unlocked ONLY if Module N-1 is in completedSet.
    let enrichedModules = [];
    let canAccessNext = true;

    for (let i = 0; i < modules.length; i++) {
      const mod = modules[i];
      const isCompleted = completedSet.has(mod._id.toString());
      const isLocked = !canAccessNext;

      enrichedModules.push({
        ...mod.toObject(),
        isLocked,
        isCompleted
      });

      // If current module is NOT completed, all subsequent modules are locked!
      if (!isCompleted) {
        canAccessNext = false;
      }
    }

    res.json({
      modules: enrichedModules,
      progress: {
        totalModules: modules.length,
        completedCount: completedSet.size
      }
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to retrieve modules', error: err.message });
  }
};

export const createModule = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'faculty') {
      return res.status(403).json({ message: 'Only faculty can add topics/modules.' });
    }

    const { subjectId } = req.params;
    const { title, summary, contentType, textContent } = req.body;

    if (!title || !summary) {
      return res.status(400).json({ message: 'Title and executive summary are required.' });
    }

    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found.' });
    }

    // Determine next orderIndex
    const lastModule = await Module.findOne({ subjectId }).sort({ orderIndex: -1 });
    const orderIndex = lastModule ? lastModule.orderIndex + 1 : 1;

    let fileName = undefined;
    let fileUrl = undefined;

    if (req.file) {
      fileName = req.file.originalname;
      fileUrl = `/uploads/${req.file.filename}`;
    }

    const newModule = new Module({
      subjectId,
      title: title.trim(),
      orderIndex,
      summary: summary.trim(),
      contentType: contentType || (req.file ? 'file' : 'text'),
      textContent: textContent || '',
      fileName,
      fileUrl
    });

    await newModule.save();

    res.status(201).json({
      message: 'Module topic created successfully',
      module: newModule
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to create module', error: err.message });
  }
};

export const completeModule = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { id } = req.params;
    const moduleItem = await Module.findById(id);

    if (!moduleItem) {
      return res.status(404).json({ message: 'Module not found' });
    }

    const studentId = req.user.id;
    const subjectId = moduleItem.subjectId;

    let progress = await StudentProgress.findOne({ studentId, subjectId });

    if (!progress) {
      progress = new StudentProgress({
        studentId,
        subjectId,
        completedModuleIds: [moduleItem._id]
      });
    } else {
      const alreadyCompleted = progress.completedModuleIds.some(
        (mId) => mId.toString() === moduleItem._id.toString()
      );
      if (!alreadyCompleted) {
        progress.completedModuleIds.push(moduleItem._id as any);
        progress.updatedAt = new Date();
      }
    }

    await progress.save();

    res.json({
      message: 'Module completed! Subsequent material unlocked.',
      unlockedNext: true,
      completedModuleId: moduleItem._id
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to complete module', error: err.message });
  }
};
