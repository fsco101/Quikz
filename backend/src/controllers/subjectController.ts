import { Response } from 'express';
import { Subject } from '../models/Subject.js';
import { AuthRequest } from '../middleware/auth.js';
import { User } from '../models/User.js';

export const getSubjects = async (req: AuthRequest, res: Response) => {
  try {
    const subjects = await Subject.find().sort({ createdAt: -1 });
    res.json({ subjects });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to retrieve subjects', error: err.message });
  }
};

export const createSubject = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'faculty') {
      return res.status(403).json({ message: 'Only faculty members can create subjects.' });
    }

    const { name, code, term, yearLevel, description } = req.body;

    if (!name || !code || !term || !yearLevel) {
      return res.status(400).json({
        message: 'Name, code, term/semester, and year level are required.'
      });
    }

    const existing = await Subject.findOne({ code: code.toUpperCase().trim() });
    if (existing) {
      return res.status(409).json({ message: `Subject code ${code.toUpperCase()} already exists.` });
    }

    const faculty = await User.findById(req.user.id);

    const subject = new Subject({
      name: name.trim(),
      code: code.toUpperCase().trim(),
      term: term.trim(),
      yearLevel: yearLevel.trim(),
      facultyId: req.user.id,
      facultyName: faculty ? faculty.fullName : req.user.username,
      description: description ? description.trim() : ''
    });

    await subject.save();

    res.status(201).json({
      message: 'Subject created successfully',
      subject
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to create subject', error: err.message });
  }
};
