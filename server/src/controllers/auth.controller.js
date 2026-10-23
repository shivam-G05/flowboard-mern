import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { sendMail } from '../services/mailer.js';
import { getOrCreateWorkflow } from '../services/workflow.service.js';
import { AppError } from '../utils/AppError.js';
import { created, ok } from '../utils/respond.js';
import { clearAuthCookie, createResetToken, hashToken, setAuthCookie, signAuthToken } from '../utils/tokens.js';

const publicUser = (user) => ({ _id: user._id, name: user.name, email: user.email, createdAt: user.createdAt });

// Compared against when the email doesn't exist, so a login for an unknown user takes as long as
// a wrong password and response timing doesn't reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser-not-a-real-password', 10);

export async function register(req, res) {
  const { name, email, password } = req.valid.body;
  if (await User.exists({ email })) throw AppError.conflict('An account with this email already exists');

  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  const user = await User.create({ name, email, passwordHash });
  await getOrCreateWorkflow(user._id);

  setAuthCookie(res, signAuthToken(user));
  created(res, { user: publicUser(user) });
}

export async function login(req, res) {
  const { email, password } = req.valid.body;
  const user = await User.findOne({ email }).select('+passwordHash +sessionVersion');
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');

  setAuthCookie(res, signAuthToken(user));
  ok(res, { user: publicUser(user) });
}

export function logout(_req, res) {
  clearAuthCookie(res);
  ok(res, { message: 'Signed out' });
}

export function me(req, res) {
  ok(res, { user: { _id: req.user.id, name: req.user.name, email: req.user.email, createdAt: req.user.createdAt } });
}

const GENERIC_RESET_MESSAGE = 'If an account exists for that email, a password reset link has been sent.';

export async function forgotPassword(req, res) {
  const { email } = req.valid.body;
  const user = await User.findOne({ email });

  if (user) {
    const { token, tokenHash } = createResetToken();
    user.passwordResetTokenHash = tokenHash;
    user.passwordResetExpiresAt = new Date(Date.now() + env.RESET_TOKEN_TTL_MINUTES * 60 * 1000);
    await user.save();

    const actionUrl = `${env.CLIENT_URL}/reset-password?token=${token}`;
    await sendMail({
      to: user.email,
      subject: 'Reset your FlowBoard password',
      text: `Hi ${user.name},\n\nUse the link below to choose a new password. It expires in ${env.RESET_TOKEN_TTL_MINUTES} minutes and can only be used once.\n\n${actionUrl}\n\nIf you didn't ask for this, you can ignore this email.`,
      actionUrl,
    });
  }

  // Same response whether or not the account exists (no account enumeration).
  ok(res, { message: GENERIC_RESET_MESSAGE });
}

export async function resetPassword(req, res) {
  const { token, password } = req.valid.body;
  const user = await User.findOne({
    passwordResetTokenHash: hashToken(token),
    passwordResetExpiresAt: { $gt: new Date() },
  }).select('+passwordResetTokenHash +passwordResetExpiresAt +sessionVersion');

  if (!user) throw AppError.badRequest('This reset link is invalid or has expired. Please request a new one.');

  user.passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  user.passwordResetTokenHash = null; // single use
  user.passwordResetExpiresAt = null;
  user.sessionVersion = (user.sessionVersion ?? 0) + 1; // signs out every existing session
  await user.save();

  clearAuthCookie(res);
  ok(res, { message: 'Your password has been updated. Please sign in with your new password.' });
}
