import mongoose, { Schema } from "mongoose";

const schema = new Schema({
  facultyId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["pending", "accepted"], default: "pending", required: true },
  acceptedAt: Date,
}, { timestamps: true });
schema.index({ facultyId: 1, studentId: 1 }, { unique: true });
schema.index({ studentId: 1, status: 1 });
export const FacultyConnection = mongoose.model("FacultyConnection", schema);
