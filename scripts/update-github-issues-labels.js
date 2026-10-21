import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const sprintsDir = path.join(rootDir, 'sprints');

// Label definitions to register on GitHub
const labels = [
  // Sprint labels
  { name: 'sprint:1', color: '1d76db', description: 'Sprint 1: Authentication & Academic Honor Gate' },
  { name: 'sprint:2', color: '0052cc', description: 'Sprint 2: Curriculum Structure & Sequential Module Reader' },
  { name: 'sprint:3', color: '5319e7', description: 'Sprint 3: Kahoot-Hybrid Quiz Maker Studio & Engine' },
  { name: 'sprint:4', color: '7057ff', description: 'Sprint 4: Master Gradebook & Export Engine' },
  { name: 'sprint:5', color: '006b75', description: 'Sprint 5: Global Lesson Directory & Telemetry' },

  // Category labels
  { name: 'cat:auth', color: '0e8a16', description: 'Authentication, Roles & Compliance' },
  { name: 'cat:curriculum', color: 'fbca04', description: 'Subjects, Modules & Linear Progression' },
  { name: 'cat:quiz', color: 'e99695', description: 'Quiz Creation Studio & Interactive Taker Engine' },
  { name: 'cat:gradebook', color: 'f9d0c4', description: 'Gradebook & Multi-Dimensional Analytics' },
  { name: 'cat:export', color: 'c5def5', description: 'PDF & Excel Spreadsheet Generation' },
  { name: 'cat:system', color: 'bfdadc', description: 'System Architecture, Seeding & Telemetry' },

  // Severity labels
  { name: 'sev:critical', color: 'b60205', description: 'Critical severity / Core architectural foundation' },
  { name: 'sev:high', color: 'd93f0b', description: 'High severity / Mandatory user-facing feature' },
  { name: 'sev:medium', color: 'fbca04', description: 'Medium severity / Enhancement or advanced capability' }
];

// Issue metadata dictionary for all 22 issues
const issueMetadata = {
  1: {
    category: 'cat:auth',
    severity: 'sev:critical',
    sprint: 'sprint:1',
    implementation: `### Implementation Architecture & Details

#### 1. Scope & Objective
Implements dual-role user registration (Faculty vs. Student) requiring explicit acceptance of the institutional Academic Honor Code and Terms of Service before account creation is enabled.

#### 2. Key Components
- **Frontend**: \`frontend/src/components/auth/AuthPage.tsx\` & \`TermsModal.tsx\`
- **Backend**: \`backend/src/controllers/authController.ts\` (\`register\`)
- **Model**: \`backend/src/models/User.ts\` (\`termsAccepted: { type: Boolean, required: true }\`)

#### 3. Behavioral Rules & Constraints
- Role selector tabs: Faculty (\`faculty\`) vs Student (\`student\`).
- Student profile captures **Year Level** (\`1st Year\` to \`4th Year\`) and **Section** (\`Section A\` to \`Section D\`).
- Scroll-to-bottom policy check: The "I Agree" checkbox is locked until the registrant scrolls through the terms to the bottom.
- Account creation button is disabled until terms are accepted.

#### 4. Design Reference
Directly conforms to Stitch design token \`authentication_compliance_gateway/code.html\` with primary tone \`#070235\`, secondary accent \`#6063ee\`, and Google Fonts Plus Jakarta Sans.`
  },
  2: {
    category: 'cat:auth',
    severity: 'sev:critical',
    sprint: 'sprint:1',
    implementation: `### Implementation Architecture & Details

#### 1. Scope & Objective
Delivers cryptographic password hashing, JSON Web Token (JWT) exchange, login verification, and role-based route guard middleware.

#### 2. Key Components
- **Backend Route**: \`POST /api/auth/login\`, \`GET /api/auth/me\`
- **Middleware**: \`authenticateToken\`, \`requireRole('faculty' | 'student')\` in \`backend/src/middleware/auth.ts\`
- **Context**: \`frontend/src/context/AuthContext.tsx\` with token persistence in \`localStorage\`

#### 3. API Contract
- **Login Request**: \`{ loginIdentifier: "email or username", password: "password" }\`
- **Response**: \`{ token: string, user: { id, username, email, role, fullName, surname, yearLevel, section } }\`
- **Security**: BCrypt salt factor 10, JWT expiration 7 days.`
  },
  3: {
    category: 'cat:system',
    severity: 'sev:high',
    sprint: 'sprint:1',
    implementation: `### Implementation Architecture & Details

#### 1. Scope & Objective
Automated database seeder ensuring testing environments and new deployments immediately possess verified demo accounts.

#### 2. Seeded Credentials
- **Faculty Account**: \`faculty@quikz.edu\` / \`Faculty@123\` (\`Prof. Marcus Alvarez\`)
- **Student Account**: \`student@quikz.edu\` / \`Student@123\` (\`Alex Dela Cruz\`, 3rd Year · Section A)

#### 3. Key Components
- **Seeder Utility**: \`backend/src/utils/seeder.ts\` called automatically on server startup.
- **Frontend Quick Login**: 1-click evaluation shortcuts on the AuthPage gateway.`
  },
  4: {
    category: 'cat:curriculum',
    severity: 'sev:critical',
    sprint: 'sprint:2',
    implementation: `### Implementation Architecture & Details

#### 1. Scope & Objective
Faculty administration of academic subjects with subject name, unique subject code, term/semester, and year level.

#### 2. Key Components
- **Model**: \`backend/src/models/Subject.ts\` (\`name\`, \`code\`, \`term\`, \`yearLevel\`, \`facultyId\`, \`facultyName\`)
- **Controller & Routes**: \`GET /api/subjects\`, \`POST /api/subjects\` in \`subjectController.ts\`
- **UI Components**: \`SubjectList.tsx\` & \`CreateSubjectModal.tsx\`

#### 3. Validation & Constraints
- Subject code is unique, trimmed, and uppercase (e.g. \`CS101\`, \`MATH201\`).
- Year levels: \`1st Year\`, \`2nd Year\`, \`3rd Year\`, \`4th Year\`.
- Catalog is visible to all students and faculty (Requirement 4 & 9).`
  },
  5: {
    category: 'cat:curriculum',
    severity: 'sev:high',
    sprint: 'sprint:2',
    implementation: `### Implementation Architecture & Details

#### 1. Scope & Objective
Authoring of curriculum topics/modules supporting text lecture notes, PDF document uploads, and slide presentations.

#### 2. Key Components
- **Model**: \`backend/src/models/Module.ts\` (\`subjectId\`, \`title\`, \`orderIndex\`, \`summary\`, \`contentType\`, \`textContent\`, \`fileUrl\`)
- **File Upload Engine**: Multer middleware storing files into \`uploads/\` static folder with 25MB threshold.
- **Modal Component**: \`CreateModuleModal.tsx\` with text input, format picker, and file attachment.`
  },
  6: {
    category: 'cat:curriculum',
    severity: 'sev:critical',
    sprint: 'sprint:2',
    implementation: `### Implementation Architecture & Details

#### 1. Scope & Objective
Enforces strict linear course progression: students cannot unlock subsequent topics without passing the prior module's end quiz.

#### 2. Algorithm & Mechanics
- **Progression State**: Managed in \`backend/src/models/StudentProgress.ts\` (\`completedModuleIds\`).
- **Gating Rule**: Module 1 (\`orderIndex: 1\`) is unlocked by default. For any module N > 1, \`isLocked = true\` unless Module N-1 is in \`completedModuleIds\`.
- **UI Presentation**: Padlock indicators on locked modules; unlock animation when milestone is completed.`
  },
  7: {
    category: 'cat:curriculum',
    severity: 'sev:high',
    sprint: 'sprint:2',
    implementation: `### Implementation Architecture & Details

#### 1. Scope & Objective
Displays an executive topic summary for each module inside the Scribd-style reader view for rapid student comprehension (Requirement 5a).

#### 2. Design & Layout
- Styled card placed at the top of the reading viewport in \`ModuleReader.tsx\`.
- Highlights core objectives, expected competencies, and key terminology.
- Follows Stitch reader template tokens with soft indigo container styling.`
  },
  8: {
    category: 'cat:quiz',
    severity: 'sev:high',
    sprint: 'sprint:3',
    implementation: `### Implementation Architecture & Details

#### 1. Scope & Objective
Configurable active countdown timer strictly constrained between 10 minutes minimum and 20 minutes maximum (Requirement 6).

#### 2. Technical Specifications
- **Validation**: Quiz creation form rejects values < 10 or > 20 minutes.
- **Runtime Timer**: High-precision interval timer with visual circular progress bar and pulse warnings during final 2 minutes.
- **Auto-Submission**: Automated submission payload dispatch when timer reaches 00:00.`
  },
  9: {
    category: 'cat:quiz',
    severity: 'sev:high',
    sprint: 'sprint:3',
    implementation: `### Implementation Architecture & Details

#### 1. Scope & Objective
Multi-mode quiz builder enabling manual interactive question entry, bulk file uploads, and lecture-based quiz synthesis.

#### 2. Supported Formats
- **Manual Mode**: Question text, 4 options, radio select correct answer, explanation field.
- **File Mode**: JSON / CSV quiz templates with automatic parsing and preview.
- **Lecture Data Extraction**: Extraction from uploaded notes/presentations.`
  },
  10: {
    category: 'cat:quiz',
    severity: 'sev:critical',
    sprint: 'sprint:3',
    implementation: `### Implementation Architecture & Details

#### 1. Scope & Objective
Student interactive quiz taking interface inspired by Kahoot-hybrid aesthetics with 75% passing mark enforcement and MongoDB upload.

#### 2. Key Components
- **Model**: \`QuizSubmission.ts\` (\`quizId\`, \`studentId\`, \`score\`, \`totalQuestions\`, \`percentage\`, \`passed\`, \`answers\`).
- **Scoring**: \`percentage = (score / totalQuestions) * 100\`. \`passed = percentage >= 75\`.
- **Instant Persistence**: Immediate database write to MongoDB Atlas.`
  },
  11: {
    category: 'cat:gradebook',
    severity: 'sev:high',
    sprint: 'sprint:4',
    implementation: `### Implementation Architecture & Details

#### 1. Scope & Objective
Personal student performance dashboard displaying all completed quizzes, scores, attempts, and pass/fail statuses.

#### 2. Features
- Sortable by date, surname, and score (Requirement 7 & 7a).
- Visual 75% benchmark indicator (Passed in green, Needs Review in amber).
- Export personal results to individual PDF or spreadsheet report.`
  },
  12: {
    category: 'cat:gradebook',
    severity: 'sev:critical',
    sprint: 'sprint:4',
    implementation: `### Implementation Architecture & Details

#### 1. Scope & Objective
Faculty Master Gradebook with mandatory separation of student records by Year Level and Section (Requirement 8).

#### 2. Data Segregation Architecture
- Dedicated separate datasets and tabs for each unique combination (e.g. "3rd Year · Section A", "3rd Year · Section B").
- Filterable by year level, section, student surname, and score ranges.`
  },
  13: {
    category: 'cat:export',
    severity: 'sev:high',
    sprint: 'sprint:4',
    implementation: `### Implementation Architecture & Details

#### 1. Scope & Objective
Automated document export pipeline for formatted PDF documents and Excel (.xlsx) spreadsheets for students and professors.

#### 2. Implementation Stack
- **Excel Export**: \`xlsx\` generating styled tabular worksheets.
- **PDF Export**: \`jspdf\` + \`jspdf-autotable\` with academic institutional styling.`
  },
  14: {
    category: 'cat:quiz',
    severity: 'sev:high',
    sprint: 'sprint:3',
    implementation: `### Implementation Architecture & Details

#### 1. Scope & Objective
Automated question generation engine analyzing uploaded lecture slides, PDF documents, and lecture text to generate quiz questions.

#### 2. Algorithm & Mechanics
- Extracts key terminology, definitions, and conceptual sentences.
- Synthesizes question stems, identifies correct answers, and generates plausible distractor options.
- Previews questions in the Quiz Studio for faculty review and customization before publishing.`
  },
  15: {
    category: 'cat:quiz',
    severity: 'sev:medium',
    sprint: 'sprint:3',
    implementation: `### Implementation Architecture & Details

#### 1. Scope & Objective
Format linter and schema validator for bulk uploaded question banks in JSON and CSV formats.

#### 2. Validation Checks
- Minimum question count verification (ensuring enough items for statistically sound 75% threshold).
- Valid correct option index bounds check.
- Inline highlighting for missing fields or malformed syntax.`
  },
  16: {
    category: 'cat:quiz',
    severity: 'sev:high',
    sprint: 'sprint:3',
    implementation: `### Implementation Architecture & Details

#### 1. Scope & Objective
Anti-tampering and academic integrity safeguards conforming to the institutional Academic Honor Code.

#### 2. Technical Safeguards
- **Tab-Switching / Blur Monitor**: Tracks \`window.onblur\` and warns candidate on focus loss.
- **Single Active Session**: Prevents duplicate concurrent quiz sessions under same student account.
- **Timestamp Integrity**: Server-side expiration checks preventing client clock manipulation.`
  },
  17: {
    category: 'cat:curriculum',
    severity: 'sev:critical',
    sprint: 'sprint:3',
    implementation: `### Implementation Architecture & Details

#### 1. Scope & Objective
Direct linkage between topic modules and end quizzes with automated milestone progression triggers.

#### 2. Trigger Mechanics
- Upon quiz submission scoring >= 75%, an automated progression trigger marks the module completed in \`StudentProgress\`.
- Subsequent module in course sequence immediately transitions from locked to unlocked.
- Failed attempts (< 75%) retain locked status and recommend retrieval study review.`
  },
  18: {
    category: 'cat:gradebook',
    severity: 'sev:critical',
    sprint: 'sprint:4',
    implementation: `### Implementation Architecture & Details

#### 1. Scope & Objective
Interactive multi-dimensional gradebook filtering engine strictly maintaining separate records per Year Level & Section.

#### 2. Capabilities
- Filter chips: Year Level (\`1st Year\` to \`4th Year\`), Section (\`Section A\` to \`Section D\`).
- Multi-column sort: Alphabetical by student surname, numerical by score percentage.
- Real-time search query matching student name, ID, or quiz title.`
  },
  19: {
    category: 'cat:export',
    severity: 'sev:high',
    sprint: 'sprint:4',
    implementation: `### Implementation Architecture & Details

#### 1. Scope & Objective
Multi-sheet Excel workbook export generating distinct spreadsheet tabs for each Year Level and Section combination.

#### 2. Workbook Structure
- **Sheet 1**: "3rd Year - Section A"
- **Sheet 2**: "3rd Year - Section B"
- **Summary Sheet**: Overall cohort metrics, pass rates (>= 75%), score distributions, and averages.`
  },
  20: {
    category: 'cat:export',
    severity: 'sev:high',
    sprint: 'sprint:4',
    implementation: `### Implementation Architecture & Details

#### 1. Scope & Objective
Formal PDF report card and faculty master gradebook exporter formatted with academic styling and instructor signature lines.

#### 2. Layout Specifications
- Institutional Quikz header banner with course code, term, and date.
- Alphabetical student table sorted by surname with individual quiz scores and pass/fail badges.
- Formal academic certification block with faculty signature underline.`
  },
  21: {
    category: 'cat:curriculum',
    severity: 'sev:medium',
    sprint: 'sprint:5',
    implementation: `### Implementation Architecture & Details

#### 1. Scope & Objective
Centralized global repository of all faculty-authored topics and lessons, accessible and visible to all (Requirement 9).

#### 2. Capabilities
- Global keyword search across all subject topics, lesson summaries, and lecture notes.
- Filtering by semester, academic year level, and faculty instructor.
- Syllabus overview cards allowing prospective students to explore curriculum outlines.`
  },
  22: {
    category: 'cat:system',
    severity: 'sev:high',
    sprint: 'sprint:5',
    implementation: `### Implementation Architecture & Details

#### 1. Scope & Objective
Comprehensive audit logging, telemetry health monitor, and MongoDB Atlas database connection synchronization engine.

#### 2. Monitoring Metrics
- Assessment submission latency and transaction logs.
- MongoDB Atlas cluster connection pool health and failover metrics.
- Security event logging for authentication attempts and honor code compliance.`
  }
};

async function updateLabelsAndIssues() {
  console.log('=== Step 1: Ensuring GitHub Labels on fsco101/Quikz ===');
  for (const lbl of labels) {
    try {
      execSync(`gh label create "${lbl.name}" --color "${lbl.color}" --description "${lbl.description}" --force --repo fsco101/Quikz`, {
        stdio: 'pipe'
      });
      console.log(`✓ Label verified/created: ${lbl.name}`);
    } catch (err) {
      console.warn(`Label check for ${lbl.name}: ${err.message}`);
    }
  }

  console.log('\n=== Step 2: Updating GitHub Issues with Labels & Detailed Specs ===');
  for (const [issueNum, meta] of Object.entries(issueMetadata)) {
    const lblArgs = `--add-label "${meta.sprint},${meta.category},${meta.severity}"`;
    const bodyContent = `${meta.implementation}\n\n---\n**Internal Reference**: \`QUIKZ-${issueNum}\` · **System**: \`Quikz\` · **Sprint**: \`${meta.sprint}\``;

    try {
      execSync(`gh issue edit ${issueNum} --repo fsco101/Quikz ${lblArgs} --body "${bodyContent.replace(/"/g, '\\"')}"`, {
        stdio: 'pipe'
      });
      console.log(`✓ Updated Issue #${issueNum} with labels [${meta.sprint}, ${meta.category}, ${meta.severity}]`);
    } catch (err) {
      console.error(`Failed to update Issue #${issueNum}:`, err.message);
    }
  }

  console.log('\n=== Step 3: Synchronizing Local Sprint JSON Files ===');
  const sprintFiles = fs.readdirSync(sprintsDir).filter(f => f.startsWith('sprint-') && f.endsWith('.json'));

  for (const file of sprintFiles) {
    const filePath = path.join(sprintsDir, file);
    const sprintData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    for (const issue of sprintData.issues) {
      const issueNum = issue.githubIssueNumber;
      if (issueNum && issueMetadata[issueNum]) {
        const meta = issueMetadata[issueNum];
        issue.labels = [meta.sprint, meta.category, meta.severity];
        issue.implementationDetails = meta.implementation;
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(sprintData, null, 2), 'utf-8');
    console.log(`✓ Synchronized ${file}`);
  }

  console.log('\n=== All 22 Issues Updated with Labels & Implementation Details! ===');
}

updateLabelsAndIssues();
