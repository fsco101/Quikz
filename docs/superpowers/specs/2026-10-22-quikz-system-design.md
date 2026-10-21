# Quikz Modular Quiz Learning Platform - System Design & Specification

**Date**: 2026-10-22  
**System Name**: Quikz  
**Author**: Antigravity & fsco101  
**Repository**: `fsco101/Quikz`  

---

## 1. Executive Summary & Objective

**Quikz** is a modern modular quiz and learning platform designed for academic environments. It features role-based access for Faculty and Students, sequential module progression with prerequisite gating, interactive end-of-module quizzes, automated and manual quiz generation, and a comprehensive master gradebook with multi-dimensional filtering and PDF/Excel reporting.

The frontend is built with **React + Vite (TypeScript)** styled strictly according to the **Stitch Modular Quiz Learning Platform** design system using Tailwind CSS v3. The backend is powered by **Node.js (TypeScript) + Express.js**, interfacing with **MongoDB Atlas** (with an in-memory fallback for offline resilience).

---

## 2. Sprint Backlog & GitHub Issues Mapping

All sprints are tracked in JSON format under `sprints/` and mirrored as GitHub Issues on `fsco101/Quikz`.

### Sprint 1: Authentication, Academic Honor Gate & Role Architecture
- **Issue #1**: `[Auth] Student & Faculty Registration with Mandatory Terms & Privacy Compliance Acceptance Modal`
  - Modal with scrollable terms and conditions; account creation disabled until accepted.
  - Role selection: `faculty` vs `student`.
  - Student fields: year level and section.
- **Issue #2**: `[Auth] Secure JWT Authentication & Role-Based Access Control`
  - `/api/auth/register`, `/api/auth/login`, `/api/auth/me`.
  - BCrypt password hashing and JWT token exchange.
- **Issue #3**: `[Auth] Database Seeding for Default Faculty & Student Demo Accounts`
  - Automated seeding with `faculty@quikz.edu` and `student@quikz.edu` for immediate testing.

### Sprint 2: Curriculum Structure & Sequential Scribd-Style Module Reader
- **Issue #4**: `[Curriculum] Subject Management (Subject Name, Code, Term/Semester, Year Level)`
  - Faculty can create and manage academic subjects.
  - Publicly visible catalog for enrolled/viewing students.
- **Issue #5**: `[Curriculum] Topic & Lesson Management with Text Insert & File/Presentation Uploads`
  - Support text content, PDF/PPTX/file attachments, presentation embeds.
  - Public visibility across all topics/lessons uploaded by faculty.
- **Issue #6**: `[Curriculum] Sequential Module Progression & Prerequisite Locking Engine`
  - Students cannot proceed to next topic/material without passing the prior module's end quiz.
  - Clear visual indicator of locked/unlocked state matching Stitch design.
- **Issue #7**: `[Curriculum] Topic & Module Executive Summary Generator/View`
  - High-level overview and summary card for each topic/lesson.

### Sprint 3: Kahoot-Hybrid Quiz Maker Studio & Execution Engine
- **Issue #8**: `[Quiz Maker] Quiz Studio with 10–20 Minute Configurable Countdown Timer`
  - Enforce 10-minute minimum and 20-minute maximum quiz time limits.
- **Issue #9**: `[Quiz Maker] Multi-Mode Quiz Creation (Manual, JSON/CSV Upload, and Text/File Extraction)`
  - Faculty quiz builder with live preview, question extraction from uploaded lesson materials.
- **Issue #10**: `[Quiz Engine] Student Interactive Quiz Taker with 75% Passing Threshold Enforcement & Database Upload`
  - Real-time countdown timer, immediate scoring, 75% pass mark requirement to unlock subsequent modules, record persistence.

### Sprint 4: Master Gradebook, Multi-Dimensional Analytics & Export Engine
- **Issue #11**: `[Gradebook] Student Personal Quiz Results Summary`
  - Individual student score history, sorted by surname or score.
- **Issue #12**: `[Gradebook] Faculty Master Gradebook with Mandatory Separated Records by Year Level & Section`
  - Grid/table view with mandatory segregation by year level and section. Filterable by year, section, surname, and score.
- **Issue #13**: `[Export] PDF and Excel Spreadsheet Export Engine`
  - Export student summaries and faculty gradebooks to formatted PDF and Excel (`.xlsx`) files.

---

## 3. Architecture & Tech Stack

### 3.1 Frontend (`/frontend`)
- **Framework**: React 18+ with Vite and TypeScript.
- **Styling**: Tailwind CSS v3 configured with Stitch design tokens:
  - `primary`: `#070235`
  - `secondary`: `#6063ee`
  - `tertiary`: `#009d6c`
  - `background`: `#f8f9ff`
  - `surface`: `#ffffff`
  - Typography: Google Fonts `Plus Jakarta Sans` and `Inter`
  - Icons: Material Symbols Outlined & Lucide React
- **Client Libraries**:
  - `react-router-dom` for client routing
  - `axios` / native `fetch` client
  - `jspdf`, `jspdf-autotable`, and `xlsx` for client-side document export

### 3.2 Backend (`/backend`)
- **Runtime**: Node.js with Express.js in TypeScript (`tsx` / `tsc`).
- **Database**: MongoDB Atlas via Mongoose ODM (with automatic fallback to `mongodb-memory-server` if connection string is offline/unconfigured).
- **Security**: `jsonwebtoken` (JWT), `bcryptjs`, CORS, input validation.
- **Uploads**: `multer` handling file & presentation uploads.
- **File Parsing & Quiz Generation**: Heuristic extractor converting uploaded text or lesson slides into multiple-choice questions.

---

## 4. Database Schema (Mongoose Models)

### `User`
```typescript
{
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['faculty', 'student'], required: true },
  fullName: { type: String, required: true },
  surname: { type: String, required: true },
  yearLevel: { type: String }, // e.g. "1st Year", "2nd Year", "3rd Year", "4th Year"
  section: { type: String },   // e.g. "Section A", "Section B"
  termsAccepted: { type: Boolean, required: true },
  termsAcceptedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
}
```

### `Subject`
```typescript
{
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  term: { type: String, required: true }, // e.g. "1st Semester", "2nd Semester", "Summer"
  yearLevel: { type: String, required: true }, // e.g. "1st Year", "2nd Year"
  facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String },
  createdAt: { type: Date, default: Date.now }
}
```

### `Module` (Topic / Material)
```typescript
{
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  title: { type: String, required: true },
  orderIndex: { type: Number, required: true }, // 1, 2, 3... for linear gating
  summary: { type: String, required: true },
  contentType: { type: String, enum: ['text', 'file', 'presentation'], required: true },
  textContent: { type: String },
  fileName: { type: String },
  fileUrl: { type: String },
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' },
  createdAt: { type: Date, default: Date.now }
}
```

### `Quiz`
```typescript
{
  title: { type: String, required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  moduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Module' },
  timeLimitMinutes: { type: Number, min: 10, max: 20, default: 15 },
  passingPercentage: { type: Number, default: 75 },
  questions: [{
    questionText: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctIndex: { type: Number, required: true },
    explanation: { type: String }
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
}
```

### `QuizSubmission`
```typescript
{
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  moduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Module' },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  score: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  percentage: { type: Number, required: true },
  passed: { type: Boolean, required: true }, // percentage >= 75
  answers: [{
    questionIndex: Number,
    selectedOption: Number,
    isCorrect: Boolean
  }],
  submittedAt: { type: Date, default: Date.now }
}
```

### `StudentProgress`
```typescript
{
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  completedModuleIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Module' }],
  currentModuleOrder: { type: Number, default: 1 },
  updatedAt: { type: Date, default: Date.now }
}
```

---

## 5. UI Layout & Stitch Design Alignment

1. **Authentication Gate**: Ported from `stitch_modular_quiz_learning_platform/authentication_compliance_gateway/code.html`. Features brand styling, role switch (`Faculty` vs `Student`), academic honor pledge modal with explicit checkbox confirmation before account creation.
2. **Curriculum & Scribd Reader**: Ported from `stitch_modular_quiz_learning_platform/subject_modules_scribd_style_document_reader/code.html`. Side navigation showing module sequence, padlock icons for uncompleted prerequisites, active topic summary pill, document viewer, and end quiz trigger.
3. **Quiz Studio & Taker**: Ported from `stitch_modular_quiz_learning_platform/kahoot_hybrid_quiz_maker_studio/code.html`. Vibrant Kahoot-style question answer tiles, 10–20 min active timer ring, 75% score feedback modal, and instant database submission.
4. **Faculty Gradebook**: Ported from `stitch_modular_quiz_learning_platform/faculty_master_gradebook_filter_analytics/code.html`. Categorized tabs for each Year Level and Section, multi-column sorting (Surname, Score), analytics summary cards, and PDF / Excel download buttons.

---

## 6. Execution & Verification Flow

1. Create Sprint JSON definitions in `sprints/` for Sprints 1, 2, 3, and 4.
2. Use GitHub CLI (`gh issue create`) to push all sprint issues to repository `fsco101/Quikz`.
3. Implement Sprint 1 and Sprint 2 full functionality (backend + frontend).
4. Verify backend routes, auth tokens, MongoDB integration, subject/module creation, prerequisite gating, and UI flows.
5. Close the corresponding Sprint 1 and Sprint 2 GitHub issues automatically via `gh issue close`.
