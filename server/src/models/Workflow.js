import mongoose from 'mongoose';
import { STATUSES } from '../utils/constants.js';

const stageSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 40 },
  // Which status category this stage rolls up into (todo / in_progress / done).
  category: { type: String, enum: STATUSES, required: true },
  color: { type: String, default: '#5B6B8C', match: /^#[0-9a-f]{6}$/i },
});

// One workflow per user. Stage order is simply the array order.
const workflowSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    stages: { type: [stageSchema], default: [] },
  },
  { timestamps: true, versionKey: false },
);

export const Workflow = mongoose.model('Workflow', workflowSchema);
