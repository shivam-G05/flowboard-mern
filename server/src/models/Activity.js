import mongoose from 'mongoose';

export const ACTIVITY_TYPES = [
  'created',
  'updated',
  'status_changed',
  'priority_changed',
  'due_date_changed',
  'completed',
  'reopened',
  'duplicated',
  'deleted',
];

// Only task fields are ever recorded here — never anything about the user's credentials.
const changeSchema = new mongoose.Schema(
  {
    field: { type: String, required: true },
    from: { type: mongoose.Schema.Types.Mixed, default: null },
    to: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: false },
);

const activitySchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    taskTitle: { type: String, default: '' }, // snapshot so the feed still reads well after deletion
    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    changes: { type: [changeSchema], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

activitySchema.index({ owner: 1, createdAt: -1 });
activitySchema.index({ owner: 1, task: 1, createdAt: -1 });

export const Activity = mongoose.model('Activity', activitySchema);
