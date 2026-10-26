# Quikz

Modular learning platform with faculty authoring, sequential lessons, timed quizzes, cohort gradebooks, report exports, a public lesson directory, and database health monitoring.

## Run locally

Use Node.js 22.13 or newer. Install dependencies in both `backend` and `frontend` with `npm ci`.

In `backend`, copy `.env.example` to `.env`, set a private `JWT_SECRET`, and optionally set `MONGODB_URI` to your MongoDB Atlas connection string. Run `npm run dev`.

In `frontend`, run `npm run dev` and open http://localhost:3000. Without a MongoDB URI, the backend uses an ephemeral local MongoDB instance; that data disappears when the server stops. Atlas persistence requires a working URI.

Demo accounts: `faculty@quikz.edu` / `Faculty@123` and `student@quikz.edu` / `Student@123`. Local development also seeds `admin@quikz.edu` / `Admin@123`; the Admin Demo button is available in development only. The CS101 demo includes three linked end quizzes. Guests can browse the public subject catalog from the login page.

## Workspace design

The workspace uses a shared Quikz identity, a desktop sidebar, and compact mobile navigation with an active-page indicator. Course cards combine learning progress or teaching readiness with clear next actions. Returning to **Learning path** opens the course catalog.

The lesson reader provides a wider reading canvas and sticky course navigation on desktop. On phones, **Show course modules** expands the module list and choosing an available lesson closes it again. Locked prerequisites remain disabled. Authentication, reporting, directory, quizzes and account pages share consistent headings, controls, focus states and surfaces; registration still requires acceptance of the Terms and Honor Code.

Responsive and keyboard coverage lives in `frontend/e2e/design.spec.ts`, alongside the existing workflow tests. The shared styles are in `frontend/src/index.css`; reusable workspace components are under `frontend/src/components/layout` and `frontend/src/components/ui`.

## Student and professor connections

Open **Connections** as a student or faculty member and enter the other person's registered Quikz email. Either role can send a request. The recipient accepts it from **Incoming requests**; sending or receiving a pending request grants no lesson or report access. **My students** or **My professors** shows accepted connections, with name/email search and pagination. You can decline incoming requests, cancel sent requests, or disconnect an accepted relationship. Students can connect to multiple professors. Requests are delivered inside Quikz; email addresses identify existing accounts, and this workflow does not send email or verify mailbox ownership.

Faculty see academic year/section only for their accepted students. The **People** directory exposes student profiles only to the student, their connected professors and administrators. Faculty profiles remain discoverable. Only administrators retain the complete account directory.

When creating or editing a module, choose its audience:

- **Connected students only**: the default for new uploads. Only accepted students of the course owner can study the lesson; the owner and administrators retain access. Other professors and unconnected students cannot retrieve its content, attachment or assessment. Private lessons are omitted from public search, syllabuses and unrelated course overviews.
- **Public**: publish a directory preview and make the lesson available to signed-in learners. Public study does not add students to the professor's roster or share their results.
- **Both connected students and public**: share the lesson with the connected class and public learners. Public access includes connected students, so the reading permissions overlap with Public; neither option makes student data public.

Public directory previews contain summaries, not full lecture text, attachment URLs or quiz answers. Full lessons and assessments still require sign-in. Prerequisites apply to the modules the student is permitted to access; hidden private modules do not block a public learning path. Editing a module's audience updates the lesson, attachment and bound quiz permissions together.

Disconnecting immediately ends private lesson access and removes the student from that professor's reports and exports. Previously downloaded material cannot be recalled. Saved quiz history remains available to the student. Faculty can report only on accepted, active students **and** subjects they own. Public learners' results are not disclosed to faculty without an accepted connection. Existing modules retain their previous public-discovery behavior as **Both** until their owner changes the audience. Existing accounts are not automatically connected; only a newly seeded demo pair starts connected, and restarting does not restore a removed demo connection.

## Invite a class from CSV

Faculty can open **Connections → Invite a class from CSV** and download the template. Keep the `email` header, optionally include `name`, and replace the sample rows with registered student emails. Save as UTF-8 CSV, up to **500 student rows / 256 KB**. The optional name is a label from your file; importing never changes student profiles or creates accounts.

Choose the file and select **Preview roster**. The preview does not send anything. Each row shows whether it is ready, invalid, duplicated in the file, unavailable, already connected, or has an incoming/outgoing pending request. Matching trims whitespace and ignores email case. Fix malformed files before continuing; eligible rows can still be invited when other rows need correction. Row numbers count CSV records, including the header as row 1; blank lines are ignored.

Select **Send N invitations** after reviewing the preview. The server rechecks the original CSV and current accounts/connections, and creates pending requests only for eligible students. It never accepts a student request automatically or changes an accepted connection. Each invited student must accept from **Incoming requests** before private lessons or faculty reports become available. Invitations stay inside Quikz; no email is sent.

**Download row report** saves the preview or send results, with a reason for every skipped/failed row. Uploaded values are escaped to prevent spreadsheet formulas. If a request fails or a row needs retry, use **Preview again**; existing invitations are skipped, including those created by another upload. Selecting a different file clears the old preview. Successful rows are retained if another row fails. Import audit events contain counts only, without roster content.

## Course overview

The subject catalog now shows students how many modules they have mastered in each course, with filters for in-progress, not-started, completed and empty courses. **Start learning** and **Continue learning** open the first unfinished lesson. Opening a course normally also selects that lesson. Progress uses the same recorded completion plus designated-quiz pass evidence as prerequisite checks; historical flags alone never count. Empty courses are not treated as completed.

Faculty see totals for their own courses, end quizzes ready, and modules missing a valid end quiz. Filter to **My courses**, **Needs end quizzes**, **All end quizzes ready**, or **My empty courses**. **Review missing end quiz** opens the first affected lesson. Readiness checks the referenced quiz exists and belongs to that course and module. These indicators describe assessment coverage, not faculty approval of question quality. Personal overview data is authenticated, marked `no-store`, and separate from the public catalog.

Catalog errors display **Retry catalog**; if only the overview fails, course browsing remains available. Search includes course code, name, instructor and term; year/status filters combine with search. Course buttons support keyboard navigation.

## Quiz authoring and attempts

Open a subject you own, add a module, and choose **Create end quiz**. Build questions manually, import a bank, or generate a draft from lecture text/files. Review questions and answer keys before publishing. Creators can use **Edit module** and **Edit quiz** to update their own content. Other faculty, students and admins cannot edit someone else’s module or quiz. Legacy modules without a creator field belong to their subject’s faculty owner. Active attempts keep a private snapshot of the original questions, answer keys, passing mark and timing. Existing results and earned progress remain intact. Editing is temporarily blocked if an active attempt predates assessment snapshots; finish or expire that session first.

- Question banks contain 1–100 questions, each with four distinct options and one correct answer. Faculty set questions per attempt (up to the bank size), passing percentage (1–100%), and time per question in seconds or minutes (1 second–24 hours). Each attempt draws a shuffled subset and independently shuffles its answer choices.
- JSON accepts an array or `{ "questions": [...] }`, with fields `questionText`, `options`, `correctIndex` (0–3), and optional `explanation`.
- CSV uses `questionText,optionA,optionB,optionC,optionD,correctIndex,explanation`. Quoted commas and multiline fields are supported. Aiken uses A–D options and `ANSWER: A`, with blank lines between questions. Templates are available in the studio.
- Lecture generation accepts TXT, Markdown, text-based PDF, DOCX, and PPTX, up to 25 MB / 250,000 extracted characters. Provide at least four distinct definitions such as `Term: definition`. Generated distractors come from the same lecture and require faculty review. Scans need OCR; convert legacy DOC/PPT files first.
- Answers save as students select them. Refreshing resumes the original server deadline from the same tab. One active quiz session is allowed per student. Focus warnings are recorded as an integrity signal; browser monitoring cannot prove whether cheating occurred.
- Only scores meeting the quiz’s published passing percentage complete a module. Module quizzes can be retaken immediately after passing or failing; standalone quizzes retain their one-minute review interval. Answer choices are shuffled independently for each new attempt and stay fixed when an attempt is resumed. New quizzes use server-enforced per-question deadlines: advancing locks the current answer, expired questions advance automatically, and refreshing never resets the timer. Existing quizzes retain their saved total timer. Reports store each result’s passing percentage, with 75% used for historical results. Expired sessions use answers saved before the deadline; a server sweep persists abandoned sessions within approximately 15 seconds.

## Results and reports

Open **My results** as a student or **Master gradebook** as faculty. Student reports, totals, subject options, cohort tabs, quiz submission history and PDF/Excel exports contain only the signed-in student's records. Supplying another student's ID in a query cannot change that scope. Faculty reports contain only their accepted, active students' results in subjects they own, with separate year-and-section tables and cohort tabs. Filter by subject, year, section, student/name/quiz search, score range, and pass status; sort by surname, score, or date. Surname sorting uses highest score as a secondary key. Attempt numbers include retakes.

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
