# Quikz

Modular learning platform with faculty authoring, sequential lessons, timed quizzes, cohort gradebooks, report exports, a public lesson directory, and database health monitoring.

## Run locally

Use Node.js 22.13 or newer. Install dependencies in both `backend` and `frontend` with `npm ci`.

In `backend`, copy `.env.example` to `.env`, set a private `JWT_SECRET`, and optionally set `MONGODB_URI` to your MongoDB Atlas connection string. Run `npm run dev`.

In `frontend`, run `npm run dev` and open http://localhost:3000. Without a MongoDB URI, the backend uses an ephemeral local MongoDB instance; that data disappears when the server stops. Atlas persistence requires a working URI.

Demo accounts: `faculty@quikz.edu` / `Faculty@123` and `student@quikz.edu` / `Student@123`. Local development also seeds `admin@quikz.edu` / `Admin@123`; the Admin Demo button is available in development only. The CS101 demo includes three linked end quizzes. Guests can browse the public subject catalog from the login page.

## Quiz workflow

Open a subject you own, add a module, and choose **Create end quiz**. Build questions manually, import a bank, or generate a draft from lecture text/files. Review questions and answer keys before publishing. Creators can use **Edit module** and **Edit quiz** to update their own content. Other faculty, students and admins cannot edit someone else’s module or quiz. Legacy modules without a creator field belong to their subject’s faculty owner. Active attempts keep a private snapshot of the original questions, answer keys, passing mark and timing. Existing results and earned progress remain intact. Editing is temporarily blocked if an active attempt predates assessment snapshots; finish or expire that session first.

- Question banks contain 1–100 questions, each with four distinct options and one correct answer. Faculty set questions per attempt (up to the bank size), passing percentage (1–100%), and time per question in seconds or minutes (1 second–24 hours). Each attempt draws a shuffled subset and independently shuffles its answer choices.
- JSON accepts an array or `{ "questions": [...] }`, with fields `questionText`, `options`, `correctIndex` (0–3), and optional `explanation`.
- CSV uses `questionText,optionA,optionB,optionC,optionD,correctIndex,explanation`. Quoted commas and multiline fields are supported. Aiken uses A–D options and `ANSWER: A`, with blank lines between questions. Templates are available in the studio.
- Lecture generation accepts TXT, Markdown, text-based PDF, DOCX, and PPTX, up to 25 MB / 250,000 extracted characters. Provide at least four distinct definitions such as `Term: definition`. Generated distractors come from the same lecture and require faculty review. Scans need OCR; convert legacy DOC/PPT files first.
- Answers save as students select them. Refreshing resumes the original server deadline from the same tab. One active quiz session is allowed per student. Focus warnings are recorded as an integrity signal; browser monitoring cannot prove whether cheating occurred.
- Only scores meeting the quiz’s published passing percentage complete a module. Module quizzes can be retaken immediately after passing or failing; standalone quizzes retain their one-minute review interval. Answer choices are shuffled independently for each new attempt and stay fixed when an attempt is resumed. New quizzes use server-enforced per-question deadlines: advancing locks the current answer, expired questions advance automatically, and refreshing never resets the timer. Existing quizzes retain their saved total timer. Reports store each result’s passing percentage, with 75% used for historical results. Expired sessions use answers saved before the deadline; a server sweep persists abandoned sessions within approximately 15 seconds.

## Results and reports

Open **My results** as a student or **Master gradebook** as faculty. Student reports contain only the signed-in student's records. Faculty reports contain only subjects they own, with separate year-and-section tables and cohort tabs. Filter by subject, year, section, student/name/quiz search, score range, and pass status; sort by surname, score, or date. Surname sorting uses highest score as a secondary key. Attempt numbers include retakes.

Summary averages, pass rates, and score distributions count all matching attempts. Tables show up to 25 attempts per cohort per page. **Export PDF** and **Export Excel** include every matching page, keeping cohorts separate. Excel workbooks have a summary plus one styled sheet per cohort; PDFs include institutional headers, surname indexing, course/term details, page numbers, and a faculty verification signature line. Reports are limited to 10,000 attempts per subject selection; narrow the subject selection if the combined report exceeds this limit.

## Public directory

**Lesson directory** is available from the sign-in page and the signed-in navigation. Search matches lesson titles, summaries, lecture text, course metadata, and instructor names. Filter by year, term, instructor, and resource format; browse paginated results and expand course syllabuses. Public results contain metadata and summaries, never full notes, download URLs, or quiz keys. **Open learning path** uses the student's prerequisite checks for full lesson access.

## Audit and database operations

Only administrators can open **System health** or access `/api/system/health` and `/api/system/audit`. The dashboard shows database ping, actual write/read/delete verification, observed connection-pool events, topology changes, latency, and the system-wide audit trail, refreshed every 15 seconds. The former `SYSTEM_ADMIN_USER_IDS` faculty allowlist no longer grants access. `/api/health` remains a minimal liveness endpoint for deployment checks.

## Administrators, profiles and avatars

For the initial production administrator, set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and optionally `ADMIN_USERNAME` and `ADMIN_FULL_NAME` before starting the backend. Bootstrap creates one administrator only when none exists; it never promotes an existing account or resets an existing admin’s password. Remove the bootstrap password from the environment after provisioning. Production never seeds the development admin account.

Admins open **User management** to search/filter accounts, create students/faculty/admins, edit details and roles, reset passwords, and disable/reactivate accounts. Creation requires confirmation that the user accepted the Terms and Honor Code. Disabling preserves ownership and grade history. Role changes take effect on the next API request; deactivation and password changes revoke old sessions. Admins cannot disable or demote themselves. Public registration offers only student and faculty roles.

Every user can open **My profile** to update name, surname, username, email, bio, student year/section, avatar and password. Password changes require the current password and sign out existing sessions. Avatars accept PNG/JPEG/WebP up to 5 MB and 25 megapixels, then are decoded, resized to 256×256 and re-encoded as WebP without the original metadata. Others see avatars in course cards, the lesson directory, gradebooks, and the signed-in **People** directory. People profiles expose only display name, username, role, bio and avatar; email and academic records remain private. Avatar pixels themselves are publicly readable for display.

Audit events cover registration/consent, login successes and failures, curriculum/quiz publication, quiz sessions, focus warnings, persisted results (including abandoned expired sessions), and exports. Credentials, tokens, answer keys, submitted answers, and lecture content are excluded. If an audit write fails after processing a mutation, the API reports that failure; check the result before retrying. The health dashboard exposes audit-write failures.

MongoDB's driver writes application data directly to the configured database and handles replica-set topology changes. The write/read check verifies that actual connection; it is not a separate cross-database replication service. A real Atlas deployment requires a reachable `MONGODB_URI`; the automated checks use isolated local MongoDB and do not certify a live Atlas cluster.

Production requires `NODE_ENV=production`, a private `JWT_SECRET`, and a working `MONGODB_URI`. A configured MongoDB connection failure stops startup instead of silently moving data into temporary storage. Temporary MongoDB is allowed only without a configured URI outside production. Demo seeding is disabled by default in production; `SEED_DEMO_DATA=true` explicitly enables it.

## Verify

In `backend`, run `npm test` and `npm run build`. Tests always use isolated local MongoDB instances. Vitest uses separate processes for compatibility with the PDF parser's native dependencies on Windows.

In `frontend`, run `npm run build`. For browser coverage, run `npx playwright install chromium`, then `npm run test:e2e`. Playwright starts isolated servers on ports 3100 and 5100 with an ephemeral database, leaving normal development ports alone.

The issue-by-issue audit is in [sprints/sprint-audit.json](sprints/sprint-audit.json). The [completion workflow](AGENTS.md) requires checking and closing completed GitHub issues as well as updating the local sprint records.
