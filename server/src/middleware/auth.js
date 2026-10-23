import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { AUTH_COOKIE } from '../utils/constants.js';
import { verifyAuthToken } from '../utils/tokens.js';

/**
 * Reads the JWT from the HTTP-only cookie, verifies it and loads the user.
 * Everything downstream uses req.user.id to scope database queries to the signed-in user.
 */
export async function requireAuth(req, _res, next) {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) throw AppError.unauthorized();

  let payload;
  try {
    payload = verifyAuthToken(token);
  } catch {
    throw AppError.unauthorized('Your session has expired. Please sign in again.');
  }

  const user = await User.findById(payload.sub).select('+sessionVersion');
  // sessionVersion changes after a password reset, which revokes every older token.
  if (!user || user.sessionVersion !== payload.sv) {
    throw AppError.unauthorized('Your session has expired. Please sign in again.');
  }

  req.user = { id: user._id.toString(), name: user.name, email: user.email, createdAt: user.createdAt };
  next();
}
