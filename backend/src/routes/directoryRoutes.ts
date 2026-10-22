import { Router } from "express";
import mongoose from "mongoose";
import { Module } from "../models/Module.js";
import { Subject } from "../models/Subject.js";
import { queryText, YEARS } from "../services/gradebook.js";
import { InputError } from "../services/questionBank.js";
const router = Router();
router.get("/", async (req, res, next) => {
  try {
    const search = queryText(req.query.search, "search");
    const yearLevel = queryText(req.query.yearLevel, "year level");
    const term = queryText(req.query.term, "term");
    const facultyId = queryText(req.query.facultyId, "instructor ID");
    const contentType = queryText(req.query.contentType, "content type");
    const subjectId = queryText(req.query.subjectId, "subject ID");
    const page = Number(queryText(req.query.page, "page") || "1");
    if (!Number.isInteger(page) || page < 1 || page > 100000)
      throw new InputError("Invalid page.");
    if (yearLevel && !YEARS.includes(yearLevel))
      throw new InputError("Invalid year level.");
    if (
      (facultyId && !mongoose.isValidObjectId(facultyId)) ||
      (subjectId && !mongoose.isValidObjectId(subjectId))
    )
      throw new InputError("Invalid directory ID.");
    if (contentType && !["text", "file", "presentation"].includes(contentType))
      throw new InputError("Invalid content type.");
    const all = await Subject.find()
      .select("name code term yearLevel facultyId facultyName description")
      .sort({ code: 1 })
      .lean();
    const selected = all.filter(
      (s) =>
        (!yearLevel || s.yearLevel === yearLevel) &&
        (!term || s.term === term) &&
        (!facultyId || String(s.facultyId) === facultyId) &&
        (!subjectId || String(s._id) === subjectId),
    );
    const match: any = { subjectId: { $in: selected.map((s) => s._id) } };
    if (contentType) match.contentType = contentType;
    const subjectMap = new Map(selected.map((s) => [String(s._id), s]));
    // Literal matching prevents query operators or pathological regular expressions.
    if (search) {
      const literal = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const matchingSubjects = selected
        .filter((s) =>
          [s.name, s.code, s.description, s.facultyName].some((v) =>
            v?.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
          ),
        )
        .map((s) => s._id);
      match.$or = [
        { title: { $regex: literal, $options: "i" } },
        { summary: { $regex: literal, $options: "i" } },
        { textContent: { $regex: literal, $options: "i" } },
        { subjectId: { $in: matchingSubjects } },
      ];
    }
    const [total, modules] = await Promise.all([
      Module.countDocuments(match),
      Module.find(match)
        .select("subjectId title summary contentType orderIndex")
        .sort({ subjectId: 1, orderIndex: 1, _id: 1 })
        .skip((page - 1) * 12)
        .limit(12)
        .lean(),
    ]);
    const syllabuses = await Module.aggregate([
      { $match: { subjectId: { $in: selected.map((s) => s._id) } } },
      { $sort: { orderIndex: 1 } },
      {
        $group: {
          _id: "$subjectId",
          modules: {
            $push: {
              id: "$_id",
              title: "$title",
              orderIndex: "$orderIndex",
              contentType: "$contentType",
            },
          },
        },
      },
    ]);
    res.json({
      page,
      pageSize: 12,
      total,
      pages: Math.ceil(total / 12),
      lessons: modules.map((m) => ({
        ...m,
        subject: subjectMap.get(String(m.subjectId)),
      })),
      syllabuses: selected.map((s) => ({
        ...s,
        modules:
          syllabuses.find((item) => String(item._id) === String(s._id))
            ?.modules || [],
      })),
      filters: {
        years: YEARS,
        terms: [...new Set(all.map((s) => s.term))].sort(),
        instructors: [
          ...new Map(
            all.map((s) => [
              String(s.facultyId),
              { id: String(s.facultyId), name: s.facultyName },
            ]),
          ).values(),
        ],
      },
    });
  } catch (err) {
    next(err);
  }
});
export default router;
