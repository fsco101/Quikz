import mongoose, { Schema } from "mongoose";
const AuditEventSchema = new Schema(
  {
    dedupeKey: { type: String, unique: true, sparse: true },
    action: { type: String, required: true, index: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    actorRole: String,
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject" },
    resourceId: String,
    statusCode: { type: Number, required: true },
    outcome: { type: String, enum: ["success", "failure"], required: true },
    durationMs: { type: Number, required: true },
    details: { type: Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { bufferCommands: false },
);
AuditEventSchema.index({ subjectId: 1, createdAt: -1 });
AuditEventSchema.index({ actorId: 1, createdAt: -1 });
export const AuditEvent = mongoose.model("AuditEvent", AuditEventSchema);
