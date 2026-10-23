import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';

/*
 * Email delivery.
 *
 * Local development has no email provider, so messages go to a "dev mailbox":
 *   - written as JSON files to server/dev-mailbox/ (git-ignored), and
 *   - kept in memory so the dev-only route GET /api/dev/mailbox can show them in the UI.
 *
 * In production you replace `deliver` with a real provider (Resend, SendGrid, Amazon SES,
 * nodemailer + SMTP...). The rest of the app only calls sendMail(), so nothing else changes.
 * The dev mailbox route is never mounted when NODE_ENV=production.
 */

const MAX_IN_MEMORY = 20;
const outbox = [];
const mailboxDir = path.join(env.serverRoot, 'dev-mailbox');

async function deliver(message) {
  outbox.unshift(message);
  outbox.length = Math.min(outbox.length, MAX_IN_MEMORY);
  if (env.isTest) return;

  await fs.mkdir(mailboxDir, { recursive: true });
  const file = `${message.sentAt.replace(/[:.]/g, '-')}.json`;
  await fs.writeFile(path.join(mailboxDir, file), JSON.stringify(message, null, 2));
}

export async function sendMail({ to, subject, text, actionUrl }) {
  if (env.isProduction) {
    // Deliberately loud: shipping without a provider would silently break password resets.
    throw new Error('No email provider configured. Wire one up in services/mailer.js before deploying.');
  }
  await deliver({ id: crypto.randomUUID(), to, subject, text, actionUrl, sentAt: new Date().toISOString() });
}

/** Dev/test only — the most recent messages, newest first. */
export function getOutbox() {
  return [...outbox];
}
