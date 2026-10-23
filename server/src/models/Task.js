import mongoose from 'mongoose';
import { PRIORITIES, STATUSES } from '../utils/constants.js';
import { applyDerivedFields } from '../utils/sla.js';

const { ObjectId } = mongoose.Schema.Types;

// One entry per time a task enters a stage. exitedAt stays null while the task is still there.
// This is what "time spent in each stage" analytics are computed from.
const stageVisitSchema = new mongoose.Schema(
  {
    stage: { type: ObjectId, required: true },
    stageName: { type: String, default: '' }, // snapshot, so history survives a stage rename or delete
    enteredAt: { type: Date, required: true },
    exitedAt: { type: Date, default: null },
  },
  { _id: false },
);

const taskSchema = new mongoose.Schema(
  {
    owner: { type: ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, default: '', maxlength: 5000 },
    priority: { type: String, enum: PRIORITIES, default: 'medium' },
    priorityRank: { type: Number, default: 2 },

    // Workflow position. `stage` is the source of truth; `status` is its category, denormalised for fast filters.
    stage: { type: ObjectId, required: true },
    status: { type: String, enum: STATUSES, default: 'todo' },
    stageEnteredAt: { type: Date, default: () => new Date() },
    stageHistory: { type: [stageVisitSchema], default: [] },

    startDate: { type: Date, default: null },
    dueDate: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    estimatedHours: { type: Number, min: 0, max: 10000, default: null },

    // SLA target plus pre-computed thresholds (see utils/sla.js).
    slaHours: { type: Number, min: 0, max: 10000, default: null },
    slaRiskAt: { type: Date, default: null },
    slaDueAt: { type: Date, default: null },
    slaMet: { type: Boolean, default: null },

    tags: { type: [String], default: [] },
    assignee: { type: String, trim: true, maxlength: 60, default: null },
  },
  { timestamps: true, versionKey: false },
);

taskSchema.pre('validate', function derive() {
  applyDerivedFields(this);
});

// Every query is scoped by owner, so owner leads each compound index.
taskSchema.index({ owner: 1, createdAt: -1 });
taskSchema.index({ owner: 1, status: 1, dueDate: 1 });
taskSchema.index({ owner: 1, stage: 1 });
taskSchema.index({ owner: 1, priorityRank: -1 });
taskSchema.index({ owner: 1, slaDueAt: 1 });
taskSchema.index({ owner: 1, completedAt: -1 });

export const Task = mongoose.model('Task', taskSchema);
