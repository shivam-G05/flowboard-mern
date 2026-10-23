# Flowboard — Interview Guide

How to explain this project clearly, and how to answer the questions you're likely to get. Each section points at the file to open if the interviewer wants to see code.

---

## 1. The 2–3 minute pitch

> "Flowboard is a MERN task manager focused on **workflows and SLAs**.
>
> On the **backend**, Express is organised as routes → middleware → controllers → services → Mongoose models. Every request is validated with Zod, authenticated with a JWT in an HTTP-only cookie, and every query is scoped by the owner's id, so users can never see each other's data. There are four collections: users, tasks, workflows and activities.
>
> The interesting modelling decision is **stage vs status**. Each user has a workflow of custom stages — Backlog, To Do, In Progress, In Review, Done, or anything they add. Every stage belongs to one of three *categories*: to-do, in-progress or done. A task stores its stage, and its status is a copy of that stage's category. That lets users customise stages freely, while the Kanban board, filters and 'is it complete?' logic stay simple.
>
> Every time a task moves, I close the current entry in its **stage history** and open a new one. That history powers 'time spent in each stage', and the dashboard's analytics are MongoDB aggregations over it — nothing is hard-coded.
>
> **SLAs**: a task can have a target like 24 hours. The clock starts at creation and stops at completion. Under 75% used it's on track, then at risk, then breached. I keep that separate from **overdue**, which is about the due date the user picked.
>
> On the **frontend**, React Query holds server state. The list view uses server-side pagination, sorting and filtering, with filters stored in the URL so all three views share them. Kanban and Pipeline use dnd-kit; a drop updates the cache **optimistically**, calls the API, and **rolls back** with a toast if the request fails.
>
> It has 39 backend tests with supertest against a real test database, including tests that one user can't read or change another user's tasks."

**If you only get 30 seconds:** "A MERN task manager with list, Kanban and customizable pipeline views on one data model, JWT cookie auth with secure password reset, an SLA system that's separate from due dates, and analytics computed from recorded stage transitions."

---

## 2. Demo script (5 minutes)

1. **Landing page** → "Sign in" → *Fill demo credentials* → dashboard.
2. **Dashboard**: point at overdue vs SLA breached ("different things"), the 14-day trend, compliance rate, average time per stage. "All one `$facet` aggregation."
3. **List**: type in search (watch the URL update after a pause = debounce), open *Filters* → *At risk*, sort by priority, change rows per page. Select two rows → *Move to… Done* (bulk).
4. Click a task → **drawer**: SLA meter with the 75% marker, time in each stage, activity timeline. *Edit* → change priority → a new "Changed priority" event appears.
5. **Kanban**: drag a card To Do → In Progress. Mention optimistic update + rollback.
6. **Pipeline**: per-column stats; *Add stage* "QA"; drag a card into it; *Delete stage* on a stage with tasks → the dialog forces you to choose where tasks go.
7. Optional: sign out → *Forgot password* → dev mailbox link → reset → old sessions are revoked.

---

## 3. Frontend → backend request flow

Example: changing priority in the list view.

1. `ListView.jsx` — the priority `<select>` calls `quickUpdate.mutate({ id, priority })`.
2. `features/tasks/queries.js` — `useQuickUpdateTask` → `tasksApi.update(id, body)`.
3. `services/endpoints.js` → `services/api.js` — `fetch('/api/tasks/:id', { method: 'PATCH', credentials: 'include', body })`. The browser attaches the `fb_session` cookie automatically.
4. Vite dev server proxies `/api` to Express on port 5000 (in production you'd serve both behind one domain or set `VITE_API_URL`).
5. `server/src/app.js` — helmet → CORS → JSON parser (100 kB limit) → cookie parser → `sanitizeBody`.
6. `routes/task.routes.js` — `requireAuth` → `validate({ params: idParams, body: updateTaskSchema })` → `controllers/task.controller.js#update`.
7. `services/task.service.js#updateTask` — loads `{ _id, owner }` (404 if not yours), diffs fields, records `priority_changed`, saves. The `pre('validate')` hook recomputes `priorityRank` and SLA thresholds.
8. Response `{ data: task }` with computed `sla`, `isOverdue`.
9. React Query `onSettled` invalidates `['tasks']`, `['dashboard']`, `['workflow','stats']`, `['task', id]` → anything on screen refetches.
10. Any thrown `AppError`, Zod error, CastError or duplicate key is turned into `{ error: { code, message, details } }` by `middleware/errorHandler.js`; the client's `ApiError` shows the message in a toast or under the field.

---

## 4. Why MERN?

- **MongoDB** — tasks are document-shaped (tags array, embedded stage history, optional fields). Aggregation pipelines (`$facet`, `$unwind`, `$group`) do the analytics in the database. Trade-off: no joins/foreign keys, so I enforce ownership in code and denormalise carefully.
- **Express** — minimal and explicit: you can see every middleware in `app.js`. Express 5 forwards rejected promises from async handlers to the error middleware.
- **React** — component model fits a UI with many reusable pieces (cards, badges, dialogs); hooks keep logic reusable (`useTaskFilters`, `useFocusTrap`, `useDebounce`).
- **Node.js** — one language end to end; Zod schemas look the same on both sides; I/O-heavy API is a good fit for Node's event loop.

---

## 5. Security talking points

**bcrypt** (`controllers/auth.controller.js`)
- Slow, salted hash; cost 12 ≈ a few hundred ms per hash, which makes brute force expensive. The salt is inside the hash string.
- `bcryptjs` is the same algorithm in pure JS (no native build).
- Max password length 72 because bcrypt ignores bytes after 72.
- Unknown emails are compared against a dummy hash so login timing doesn't leak which emails exist.

**JWT in an HTTP-only cookie** (`utils/tokens.js`, `middleware/auth.js`)
- Payload is only `{ sub, sv }` — no personal data. Signed HS256 with a ≥32-char secret validated at startup; `algorithms: ['HS256']` pinned when verifying.
- `HttpOnly` → JavaScript (and therefore XSS) can't read it. `SameSite=Lax` → not sent on cross-site POST/PATCH/DELETE, which blocks classic CSRF. `Secure` in production.
- Why not localStorage? Any XSS could read the token from localStorage.
- **Revocation:** JWTs are stateless, so I store `sessionVersion` on the user and put it in the token. A password reset increments it; `requireAuth` rejects tokens with an old version. Cost: one user lookup per request (which I need anyway to load the user).

**Middleware** — `requireAuth` (who are you), `validate` (is the input well-formed — and it drops unknown keys), `rateLimit` (login/register: 10 per 15 min; reset: 5 per 15 min), `sanitizeBody` (strips `$` keys), `errorHandler` (one place to format errors, no stack traces leaked).

**Authorization** — every query includes `owner: req.user.id`. Asking for another user's task returns **404**, not 403, so you can't even probe which ids exist. Tests prove it for read, update, move, delete, activity and bulk operations.

**NoSQL injection & mass assignment** — `{ "email": { "$ne": null } }` fails Zod (expects a string) → 400. A body with `owner` or `completedAt` is stripped by Zod, so a client can't assign them. Search input is regex-escaped. Both have tests.

**Password reset** (`auth.controller.js#forgotPassword/resetPassword`)
- 32 random bytes → hex token sent by email; **only its SHA-256 hash is stored**, so a DB leak can't be used to reset accounts. (SHA-256 is fine here because the token is high-entropy random, unlike a password.)
- Expires in 15 minutes; cleared after use (single use); same response whether or not the email exists; rate limited.
- Client removes the token from the URL and sets `no-referrer`.
- Locally, emails go to a dev mailbox; that route isn't registered in production, and `sendMail()` throws in production until a real provider is configured.

---

## 6. React state & component design

- **Server state vs UI state.** Anything that comes from the API lives in **React Query** (cache, loading/error, refetch, invalidation). Local UI state (open dialogs, form values, selection) is `useState`. Shareable UI state (filters, page, open task) lives in the **URL**. No Redux needed.
- **Auth state** — `AuthProvider` runs `GET /auth/me` once; since the cookie is unreadable by JS, the server is the source of truth. A global `QueryCache.onError` marks the user signed out on any 401, and the route guard redirects to `/login` (and back afterwards).
- **TaskUIProvider** — one context exposes `openCreate`, `openEdit`, `openTask`, `confirmDelete`, so any component (card menu, drawer, dashboard row) can open the same dialogs without prop drilling.
- **Design system** — `components/ui` (Button, Field/Input/Select, Dialog, Dropdown, Badge, Skeleton, EmptyState, ConfirmDialog, Checkbox) with Tailwind tokens in `tailwind.config.js`.
- **Reuse** — `TaskBoard` powers both Kanban (columns = statuses) and Pipeline (columns = stages); only `columns`, `getColumnId` and `onMove` differ. `TaskFormModal` handles create and edit.
- **Accessibility** — labelled inputs with `aria-describedby` errors, focus-trapped dialogs that restore focus, menu keyboard navigation, keyboard drag-and-drop with screen-reader announcements, visible focus rings, `prefers-reduced-motion` respected, skip link.
- **Re-render control** — `DraggableTaskCard` is `memo`'d and receives stable callbacks; derived maps are `useMemo`'d; contexts expose memoised values.

---

## 7. Pagination, indexing, debouncing, optimistic updates

**Pagination** (`task.service.js#listTasks`) — `skip((page-1)*limit).limit(limit)` plus `countDocuments(filter)` in parallel → `{ total, page, limit, totalPages }`. The UI offers 10–100 rows; Zod rejects anything above 500 (the board views' limit). *Trade-off:* skip/limit gets slower on very deep pages; cursor pagination (`_id > lastId`) would fix that but makes "jump to page 7" harder.

**Indexes** (`models/Task.js`) — every query starts with `owner`, so every compound index starts with `owner` (ESR rule: equality first, then sort/range). `priorityRank` exists because sorting the string `priority` alphabetically would put "high" before "low" before "medium" before "urgent".

**Debouncing** (`hooks/useDebounce.js`, `TaskToolbar.jsx`) — the input updates instantly, but the URL (and therefore the API call) only updates after 350 ms without typing; the effect cleanup cancels the pending timer on every keystroke. React Query also cancels the previous in-flight request via `AbortSignal`.

**Optimistic updates** (`features/tasks/queries.js#useMoveTask`) — `onMutate` cancels board queries, snapshots them and moves the card; `onError` restores snapshots + toast; `onSettled` refetches. Stage reordering (`features/workflows/queries.js`) uses the same pattern.

---

## 8. SLA & stage analytics

- Pure function `computeSla(task, now)` in `utils/sla.js` — easy to unit test (see `tests/sla.test.js`).
- Stored thresholds `slaRiskAt` / `slaDueAt` / `slaMet` make SLA filters simple indexed range queries instead of per-document maths.
- **Stage history** — `services/taskTransitions.js#moveTaskToStage` is the *only* code that changes a task's stage: it closes the open visit, opens a new one, syncs status/completedAt, and returns activity events. Bulk moves, drag-and-drop, the detail-drawer select, "Mark complete" and stage-deletion migration all reuse it, so the data can't drift.
- **Per-stage stats** (`analytics.service.js#getStageStats`) — one `$group` by current stage (count, overdue, at risk, breached, average age) and one `$unwind` of `stageHistory` grouped by stage (exits, average duration of completed visits).
- **Calendar vs business hours** — calendar time. Business hours would need a working-hours calendar per user and a function that counts only working minutes between two timestamps; it's listed as a future improvement.
- **Bug I hit and fixed:** `{'stageHistory.exitedAt': {$ne: null}}` on an array only matches documents where *no* element is null — i.e. it excluded every task with an open visit. I switched to `{$type: 'date'}` ("at least one element is a date"). A test caught it.

---

## 8b. Design decisions (if asked about the UI)

- **Why it doesn't look like a template:** hierarchy comes from typography (serif display, sans UI, mono figures) and rules, not from cards and gradients. One accent colour (persimmon) is reserved for focus, active navigation and urgency, so it always means something.
- **Accessibility of colour:** status is never colour-only. Priority has signal bars, status has distinct ring glyphs, SLA health has a word next to the dot. The trend chart separates its two series by line style (solid vs dashed), not just hue.
- **Each view has a job:** list = triage (dense, inline edits, bulk bar), Kanban = status at a glance (one "needs attention" line per column), pipeline = flow (strip sized by where work sits, time per stage), dashboard = a sentence you can act on plus one primary metric.
- **Motion:** short and functional — it confirms an action (a dialog opening, a card landing) and never delays one; `prefers-reduced-motion` turns it off.
- **Tokens:** everything comes from `tailwind.config.js` (paper, ink, brand, good/warn/bad, three font families), so a dark theme or a rebrand is a token change, not a rewrite.

---

## 9. Trade-offs to own

| Decision | Why | Cost |
|---|---|---|
| Embedded stage history | Read together with the task; atomic update | Bounded at 200 entries; analytics need `$unwind` |
| Separate activity collection | Feed across tasks; survives deletion | Two writes per change (not transactional) |
| Status denormalised from stage | Simple filters, Kanban, completion logic | Must be kept in sync — centralised in one function |
| Kanban by status, Pipeline by stage | Two genuinely different views | Kanban drop picks the *first* stage of a category |
| Regex search | Partial matches, simple | Doesn't use an index well at scale → Atlas Search/text index |
| skip/limit pagination | Simple, supports page numbers | Slow on very deep pages |
| Client-side rendering | Simple deployment | Weaker SEO → SSR for marketing pages |
| JWT + sessionVersion | Stateless-ish, revocable on reset | No per-device logout |

---

## 10. Likely questions — with honest answers

**Why cookies instead of `Authorization: Bearer` + localStorage?**
XSS can read localStorage; it can't read an HTTP-only cookie. Cookies bring CSRF risk, which `SameSite=Lax` handles for state-changing requests, plus CORS is restricted to my origin. For a public mobile API I'd use bearer tokens.

**How do you stop one user reading another's tasks?**
Every query includes `owner: req.user.id` where `req.user` comes from a verified JWT, never from the request body. Ids from other users return 404. There's a test that tries every endpoint as another user.

**What happens if two requests move the same task at once?**
Last write wins. Each move loads the document, modifies and saves; there's no optimistic-concurrency check. To harden it I'd enable Mongoose's `optimisticConcurrency` (version key) and retry on conflict, or use an atomic `findOneAndUpdate` with the expected stage in the filter.

**Why not compute SLA health on the fly in the query?**
`$expr` with date maths can't use an index. Pre-computing the two thresholds when the task is saved turns "at risk" into `slaRiskAt <= now < slaDueAt`, a range query on an indexed field.

**What does deleting a stage do to its tasks?**
The API refuses with 409 and the task count unless you pass `moveTo`. With `moveTo`, every task is moved through the same transition function (history and activity recorded), then the stage is removed. You also can't delete the last stage of a category.

**How is the dashboard efficient?**
One aggregation with `$facet` computes counts, SLA buckets, average completion time and both trend series in a single pass over the user's tasks (index on `owner`). Plus one indexed activity query. No documents are loaded into Node to be counted.

**What's not tested?**
The React app has no automated tests yet — I verified flows manually in the browser. Rate limiting is skipped in the test environment. Next step would be Playwright for login → create → drag → reload.

**How would you deploy it?**
Build the client (`npm run build`), serve `dist/` from a CDN or from Express, run the API with `NODE_ENV=production` behind HTTPS (so the cookie gets `Secure`), MongoDB Atlas, real secrets in environment variables, an email provider wired into `mailer.js`, and `trust proxy` already set for correct client IPs.

**How would you scale it?**
The API is stateless (JWT), so add instances behind a load balancer. Move rate-limit counters to Redis (the default store is in-memory per process). Cursor pagination, Atlas Search, and caching the dashboard summary for a short TTL.

**Why React Query instead of Redux?**
Most of the state is server state. React Query gives caching, deduping, background refetch, cancellation and optimistic updates out of the box; Redux would mean writing that by hand. The remaining client state is small and local.

**What would you improve first?**
Teams and real assignees, concurrency control on moves, E2E tests, and business-hours SLAs.

---

## 11. Files to read before the interview (in this order)

1. `server/src/app.js` and `server/src/routes/task.routes.js` — the request pipeline.
2. `server/src/middleware/auth.js`, `validate.js`, `errorHandler.js`.
3. `server/src/controllers/auth.controller.js` + `utils/tokens.js` — login, cookie, reset.
4. `server/src/models/Task.js` — schema, derived fields, indexes.
5. `server/src/utils/sla.js` — SLA logic.
6. `server/src/services/taskTransitions.js` — the single place stage changes happen.
7. `server/src/services/task.service.js` — filters, pagination, updates with activity.
8. `server/src/services/analytics.service.js` — `$facet` dashboard and stage stats.
9. `server/src/services/workflow.service.js` — stage add/reorder/delete-with-migration.
10. `client/src/features/tasks/queries.js` — React Query keys, invalidation, optimistic move.
11. `client/src/features/tasks/TaskBoard.jsx` — dnd-kit setup.
12. `client/src/features/tasks/useTaskFilters.js` — URL-driven filters.
13. `client/src/features/auth/AuthProvider.jsx` + `RouteGuards.jsx`.
14. `server/tests/tasks.test.js` — especially the cross-user authorization test.
