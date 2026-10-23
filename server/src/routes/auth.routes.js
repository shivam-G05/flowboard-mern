import { Router } from 'express';
import * as auth from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { loginLimiter, passwordResetLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from '../validators/auth.validators.js';

const router = Router();

router.post('/register', loginLimiter, validate({ body: registerSchema }), auth.register);
router.post('/login', loginLimiter, validate({ body: loginSchema }), auth.login);
router.post('/logout', auth.logout);
router.get('/me', requireAuth, auth.me);
router.post('/forgot-password', passwordResetLimiter, validate({ body: forgotPasswordSchema }), auth.forgotPassword);
router.post('/reset-password', passwordResetLimiter, validate({ body: resetPasswordSchema }), auth.resetPassword);

export default router;
