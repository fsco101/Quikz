import { Response, NextFunction } from "express";
import mongoose from 'mongoose';
import { InputError } from '../services/questionBank.js';
import { Subject } from "../models/Subject.js";
import { AuthRequest } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { hiddenSubjectIds } from "../services/connections.js";

export const getSubjects = async (req: AuthRequest, res: Response) => {
  try {
    const subjects = await Subject.find(req.path.replace(/\/$/, '') === '/mine'
      ? { facultyId: req.user!.id }
      : { _id: { $nin: await hiddenSubjectIds(req.user) } }).sort({ createdAt: -1 });
    const authors = await User.find({ _id: { $in: subjects.map((s) => s.facultyId) } }).select("fullName");
    const names = new Map(authors.map((u) => [String(u._id), u.fullName]));
    res.json({ subjects: subjects.map((s) => ({ ...s.toObject(), facultyName: names.get(String(s.facultyId)) || s.facultyName })) });
  } catch (err: any) {
    res
      .status(500)
      .json({ message: "Failed to retrieve subjects", error: err.message });
  }
};

export const updateSubject = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!mongoose.isValidObjectId(req.params.subjectId)) throw new InputError('Invalid subject ID.');
    const allowed = ['name', 'code', 'term', 'yearLevel', 'description'];
    if (!req.body || Array.isArray(req.body) || !Object.keys(req.body).length || Object.keys(req.body).some(key => !allowed.includes(key)))
      throw new InputError('Only subject name, code, term, year level and description can be updated.');
    const changes: Record<string, string> = {};
    for (const key of Object.keys(req.body)) {
      const value = req.body[key];
      if (typeof value !== 'string' || (key !== 'description' && !value.trim()))
        throw new InputError(`Provide a valid ${key}.`);
      changes[key] = value.trim();
    }
    if (changes.yearLevel && !['1st Year', '2nd Year', '3rd Year', '4th Year'].includes(changes.yearLevel))
      throw new InputError('Choose a valid year level.');
    if (changes.code) changes.code = changes.code.toUpperCase();
    const subject = await Subject.findOneAndUpdate(
      { _id: req.params.subjectId, facultyId: req.user!.id },
      { $set: changes }, { new: true, runValidators: true },
    );
    if (!subject) throw new InputError('Subject not found or you do not own it.', 404);
    res.json({ message: 'Subject updated successfully', subject });
  } catch (err: any) {
    if (err.code === 11000) return res.status(409).json({ message: 'That subject code already exists.' });
    next(err);
  }
};

export const createSubject = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== "faculty") {
      return res
        .status(403)
        .json({ message: "Only faculty members can create subjects." });
    }

    const { name, code, term, yearLevel, description } = req.body;

    if (
      [name, code, term, yearLevel].some(
        (value) => typeof value !== "string" || !value.trim(),
      )
    ) {
      return res.status(400).json({
        message: "Name, code, term/semester, and year level are required.",
      });
    }

    if (!["1st Year", "2nd Year", "3rd Year", "4th Year"].includes(yearLevel)) {
      return res.status(400).json({ message: "Choose a valid year level." });
    }

    const existing = await Subject.findOne({ code: code.toUpperCase().trim() });
    if (existing) {
      return res
        .status(409)
        .json({
          message: `Subject code ${code.toUpperCase()} already exists.`,
        });
    }

    const faculty = await User.findById(req.user.id);

    const subject = new Subject({
      name: name.trim(),
      code: code.toUpperCase().trim(),
      term: term.trim(),
      yearLevel: yearLevel.trim(),
      facultyId: req.user.id,
      facultyName: faculty ? faculty.fullName : req.user.username,
      description: description ? description.trim() : "",
    });

    await subject.save();

    res.status(201).json({
      message: "Subject created successfully",
      subject,
    });
  } catch (err: any) {
    res
      .status(
        err.name === "ValidationError" ? 400 : err.code === 11000 ? 409 : 500,
      )
      .json({ message: "Failed to create subject", error: err.message });
  }
};
