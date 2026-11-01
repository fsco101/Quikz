import mongoose, { Schema } from "mongoose";

const schema = new Schema({
  ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  scope: { type: String, required: true },
  revision: { type: String, default: "" },
  data: { type: Schema.Types.Mixed },
  version: { type: Number, required: true, default: 1 },
  deleted: { type: Boolean, default: false },
  savedAt: { type: Date, default: Date.now },
});
schema.index({ ownerId: 1, scope: 1 }, { unique: true });
export const EditorDraft = mongoose.model("EditorDraft", schema);
