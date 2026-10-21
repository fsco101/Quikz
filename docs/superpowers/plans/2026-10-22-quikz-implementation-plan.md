# Quikz Modular Quiz Learning Platform - Implementation Plan (Sprints 1 & 2 Focus)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the foundational Quikz platform featuring Sprint JSON backlog tracking, publishing all GitHub issues to `fsco101/Quikz`, and delivering full end-to-end functionality for Sprint 1 (Academic Honor Gate & Authentication) and Sprint 2 (Curriculum & Sequential Scribd-Style Module Reader with Prerequisite Locking), automatically closing Sprint 1 & 2 issues upon verification.

**Architecture:** A decoupled monorepo containing a high-performance React 18+ Vite frontend styled with Tailwind CSS v3 mirroring the Stitch design tokens, and an Express.js TypeScript REST backend connecting to MongoDB Atlas with an in-memory fallback. Sprints and GitHub issues track lifecycle progress directly in git and GitHub.

**Tech Stack:** React 18, Vite, TypeScript, Tailwind CSS v3, Node.js, Express, Mongoose, MongoDB Atlas / `mongodb-memory-server`, JWT, BCrypt, GitHub CLI (`gh`).

**Spec:** `docs/superpowers/specs/2026-10-22-quikz-system-design.md`

## Global Constraints
- System Name must be strictly "Quikz".
- Frontend: TypeScript, Vite, Tailwind CSS v3 with Stitch design system tokens (`primary: #070235`, `secondary: #6063ee`, `accent: #009d6c`, Google Fonts `Plus Jakarta Sans` & `Inter`, Material Symbols).
- Backend: Node.js with TypeScript (`tsx`) and Express.js REST API.
- Database: MongoDB Atlas via Mongoose with auto-fallback to local / in-memory server.
- All Sprint definitions (Sprints 1, 2, 3, 4) stored in `sprints/*.json`.
- All issues across all sprints must be published to GitHub repository `fsco101/Quikz`.
- Sprint 1 and Sprint 2 issues must be closed upon complete implementation and verification.

---

### Task 1: Generate Sprint JSON Definitions & Publish All GitHub Issues

**Files:**
- Create: `sprints/sprint-1-auth.json`
- Create: `sprints/sprint-2-curriculum.json`
- Create: `sprints/sprint-3-quiz-maker.json`
- Create: `sprints/sprint-4-gradebook.json`
- Create: `scripts/sync-github-issues.js`

**Interfaces:**
- Consumes: Spec backlog requirements from `docs/superpowers/specs/2026-10-22-quikz-system-design.md`.
- Produces: JSON sprint files in `sprints/` and live GitHub Issues on `fsco101/Quikz`.

- [ ] **Step 1: Create Sprint 1 JSON (`sprints/sprint-1-auth.json`)**
- [ ] **Step 2: Create Sprint 2 JSON (`sprints/sprint-2-curriculum.json`)**
- [ ] **Step 3: Create Sprint 3 JSON (`sprints/sprint-3-quiz-maker.json`)**
- [ ] **Step 4: Create Sprint 4 JSON (`sprints/sprint-4-gradebook.json`)**
- [ ] **Step 5: Run script to push all 13 issues to GitHub (`fsco101/Quikz`) and record issue numbers**
- [ ] **Step 6: Commit sprint definitions and issue sync records**

---

### Task 2: Backend Architecture Scaffolding & Resilient MongoDB Atlas Connection

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/.env.example`
- Create: `backend/src/config/db.ts`
- Create: `backend/src/server.ts`
- Test: `backend/src/__tests__/db.test.ts`

**Interfaces:**
- Consumes: Mongoose, `mongodb-memory-server`, `dotenv`, `express`.
- Produces: `connectDB()` returning connected Mongoose instance, Express server running on port 5000.

- [ ] **Step 1: Initialize backend dependencies (`express`, `mongoose`, `cors`, `dotenv`, `bcryptjs`, `jsonwebtoken`, `multer`, `mongodb-memory-server`)**
- [ ] **Step 2: Write test for database connection resilience in `backend/src/__tests__/db.test.ts`**
- [ ] **Step 3: Implement `backend/src/config/db.ts` with Atlas connection string and in-memory fallback**
- [ ] **Step 4: Implement `backend/src/server.ts` with healthcheck `/api/health`**
- [ ] **Step 5: Verify backend startup and database connection**
- [ ] **Step 6: Commit backend scaffolding**

---

### Task 3: Sprint 1 Backend - Models, JWT Auth, Terms Acceptance & Demo Seeder

**Files:**
- Create: `backend/src/models/User.ts`
- Create: `backend/src/middleware/auth.ts`
- Create: `backend/src/controllers/authController.ts`
- Create: `backend/src/routes/authRoutes.ts`
- Create: `backend/src/utils/seeder.ts`
- Test: `backend/src/__tests__/auth.test.ts`

**Interfaces:**
- Consumes: `connectDB()`, Express `Router`.
- Produces:
  - `POST /api/auth/register` (requires `username`, `email`, `password`, `role`, `fullName`, `surname`, `termsAccepted: true`)
  - `POST /api/auth/login` (returns JWT + sanitized user)
  - `GET /api/auth/me` (protected route)
  - `seedDatabase()` seeding `faculty@quikz.edu` and `student@quikz.edu`

- [ ] **Step 1: Write tests for registration validation, terms check, and login**
- [ ] **Step 2: Implement `User` model with `termsAccepted` validation**
- [ ] **Step 3: Implement Auth controllers, JWT sign/verify middleware, and router**
- [ ] **Step 4: Implement seeder utility that seeds faculty & student demo accounts**
- [ ] **Step 5: Run tests and verify auth endpoints**
- [ ] **Step 6: Commit Sprint 1 backend**

---

### Task 4: Frontend Scaffolding & Stitch Design System Theme Setup

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/index.html`
- Create: `frontend/src/index.css`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/main.tsx`

**Interfaces:**
- Consumes: Vite, React 18, Tailwind CSS v3.
- Produces: Styled layout with Stitch color tokens, typography (Plus Jakarta Sans & Inter), Material Symbols icon integration.

- [ ] **Step 1: Initialize Vite React TypeScript frontend in `frontend/`**
- [ ] **Step 2: Configure `tailwind.config.js` with Stitch palette and container queries**
- [ ] **Step 3: Configure `index.html` and `src/index.css` with Google Fonts and Material Symbols**
- [ ] **Step 4: Verify frontend dev server launches and renders themed baseline**
- [ ] **Step 5: Commit frontend scaffolding**

---

### Task 5: Sprint 1 Frontend - Authentication & Academic Honor Gate UI

**Files:**
- Create: `frontend/src/types/auth.ts`
- Create: `frontend/src/services/api.ts`
- Create: `frontend/src/context/AuthContext.tsx`
- Create: `frontend/src/components/auth/TermsModal.tsx`
- Create: `frontend/src/components/auth/AuthPage.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `/api/auth/login`, `/api/auth/register`, `/api/auth/me`.
- Produces: Full authentication experience matching `stitch_modular_quiz_learning_platform/authentication_compliance_gateway/code.html`, including:
  - Faculty & Student role switcher tabs
  - Form validation with quick demo account buttons
  - Academic Honor Code / Terms & Conditions modal with mandatory scroll & checkbox
  - Global `AuthContext` with login state & token persistence

- [ ] **Step 1: Build API client and Auth context state management**
- [ ] **Step 2: Implement `TermsModal.tsx` requiring explicit confirmation before registration**
- [ ] **Step 3: Implement `AuthPage.tsx` matching Stitch design pixel-for-pixel**
- [ ] **Step 4: Integrate into `App.tsx` with protected route handling**
- [ ] **Step 5: Test login with demo faculty and student accounts, test new registration with terms modal**
- [ ] **Step 6: Commit Sprint 1 frontend**

---

### Task 6: Close Sprint 1 GitHub Issues

**Files:**
- Modify: `sprints/sprint-1-auth.json` (mark completed)

- [ ] **Step 1: Verify all Sprint 1 acceptance criteria**
- [ ] **Step 2: Run `gh issue close` for Sprint 1 issues (Issues #1, #2, #3)**
- [ ] **Step 3: Update `sprints/sprint-1-auth.json` with closed status**
- [ ] **Step 4: Commit Sprint 1 issue closure update**

---

### Task 7: Sprint 2 Backend - Subjects, Modules & Prerequisite Gating Engine

**Files:**
- Create: `backend/src/models/Subject.ts`
- Create: `backend/src/models/Module.ts`
- Create: `backend/src/models/StudentProgress.ts`
- Create: `backend/src/controllers/subjectController.ts`
- Create: `backend/src/controllers/moduleController.ts`
- Create: `backend/src/routes/subjectRoutes.ts`
- Create: `backend/src/routes/moduleRoutes.ts`
- Test: `backend/src/__tests__/curriculum.test.ts`

**Interfaces:**
- Consumes: Mongoose models, Express Router, JWT Auth middleware.
- Produces:
  - `GET /api/subjects`: List all subjects (code, term, yearLevel, faculty)
  - `POST /api/subjects`: Create subject (Faculty only)
  - `GET /api/subjects/:id/modules`: List modules for subject (with student lock/unlock flags)
  - `POST /api/subjects/:id/modules`: Create topic/module with text/file upload (Faculty only)
  - `GET /api/modules/:id`: Get module detail and executive summary
  - `POST /api/modules/:id/complete`: Complete module upon passing quiz requirement, unlocking the next module

- [ ] **Step 1: Write tests for subject creation, module ordering, and progression gating**
- [ ] **Step 2: Implement Mongoose models (`Subject`, `Module`, `StudentProgress`)**
- [ ] **Step 3: Implement `subjectController` and `moduleController` with prerequisite lock logic**
- [ ] **Step 4: Seed sample subjects and modules for demo testing**
- [ ] **Step 5: Verify curriculum endpoints with authenticated requests**
- [ ] **Step 6: Commit Sprint 2 backend**

---

### Task 8: Sprint 2 Frontend - Scribd-Style Module Reader & Prerequisite Progression UI

**Files:**
- Create: `frontend/src/types/curriculum.ts`
- Create: `frontend/src/components/layout/Navbar.tsx`
- Create: `frontend/src/components/curriculum/SubjectList.tsx`
- Create: `frontend/src/components/curriculum/CreateSubjectModal.tsx`
- Create: `frontend/src/components/curriculum/CreateModuleModal.tsx`
- Create: `frontend/src/components/curriculum/ModuleReader.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: Curriculum REST APIs from Task 7.
- Produces:
  - Subject catalog displaying Name, Code, Term, and Year Level
  - Scribd-style document and topic reader adapted from `stitch_modular_quiz_learning_platform/subject_modules_scribd_style_document_reader/code.html`
  - Sequential sidebar with locked/unlocked state badges, progress bar
  - Module executive summary badge & content preview
  - Faculty modal for creating subjects and uploading topics/lessons (visible to all)

- [ ] **Step 1: Create Navbar and Subject Catalog view**
- [ ] **Step 2: Implement Create Subject & Create Module modals for Faculty**
- [ ] **Step 3: Implement `ModuleReader.tsx` with sidebar navigation, locked status gating, summary box, and End Quiz CTA**
- [ ] **Step 4: Wire routing in `App.tsx`**
- [ ] **Step 5: Verify student progression (locked subsequent modules until prerequisite is completed)**
- [ ] **Step 6: Commit Sprint 2 frontend**

---

### Task 9: Close Sprint 2 GitHub Issues

**Files:**
- Modify: `sprints/sprint-2-curriculum.json` (mark completed)

- [ ] **Step 1: Verify all Sprint 2 acceptance criteria**
- [ ] **Step 2: Run `gh issue close` for Sprint 2 issues (Issues #4, #5, #6, #7)**
- [ ] **Step 3: Update `sprints/sprint-2-curriculum.json` with closed status**
- [ ] **Step 4: Commit Sprint 2 issue closure update**

---

### Task 10: End-to-End System Verification & Demo Recording

**Files:**
- Test across frontend and backend

- [ ] **Step 1: Verify both backend and frontend build and run cleanly (`npm run build` / dev servers)**
- [ ] **Step 2: Test faculty login, creating subject, adding module with text/file summary**
- [ ] **Step 3: Test student login, viewing subject, sequential progression through module 1, unlocking module 2**
- [ ] **Step 4: Verify all GitHub issues status on repository `fsco101/Quikz`**
