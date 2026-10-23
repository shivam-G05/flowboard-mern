import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    // select: false — these fields are never loaded unless a query explicitly asks for them.
    passwordHash: { type: String, required: true, select: false },
    // Embedded in every JWT. Incrementing it (e.g. after a password reset) invalidates all existing sessions.
    sessionVersion: { type: Number, default: 0, select: false },
    // Only the SHA-256 hash of the reset token is stored, so a database leak cannot be used to reset passwords.
    passwordResetTokenHash: { type: String, default: null, select: false },
    passwordResetExpiresAt: { type: Date, default: null, select: false },
  },
  { timestamps: true, versionKey: false },
);

// Defence in depth: even if a sensitive field was selected, it is stripped when serialised to JSON.
userSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.passwordHash;
    delete ret.sessionVersion;
    delete ret.passwordResetTokenHash;
    delete ret.passwordResetExpiresAt;
    return ret;
  },
});

export const User = mongoose.model('User', userSchema);
