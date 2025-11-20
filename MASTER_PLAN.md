# PROJECT MASTER PLAN: AttendX (FYP Edition)

## 🚨 INSTRUCTIONS FOR AI AGENT (COPILOT/CURSOR)

This is the strict engineering blueprint for "AttendX".

1. **Do not deviate** from the stack, versions, or folder structure.
2. **Do not assume** features. Only implement what is listed.
3. **Prioritize** the "Advanced Reporting" module as described in Phase 5.
4. **Deployment Context:** This app will be deployed on Vercel/Render. IP Validation must use Public IP detection.

---

## 1. TECH STACK & VERSIONS

- **Runtime:** Node.js 20+ (LTS)
- **Backend:** Express.js 4.18+
- **Database:** MongoDB Atlas (Mongoose 8+)
- **Frontend:** React 18.3 (Vite 5)
- **State:** Redux Toolkit
- **Styling:** Tailwind CSS 3.4
- **QR Engine:** `qrcode` (Backend), `html5-qrcode` (Frontend)
- **Charts:** Recharts (for the advanced analytics)

---

## 2. DATABASE SCHEMA (STRICT)

### A. User

- `name`: String
- `email`: String (Unique, Index)
- `password`: String (Bcrypt)
- `role`: Enum ['admin', 'teacher', 'student']
- `info`: Object (Dynamic based on role)
  - For Student: `{ rollNo, semester, department, batch, year }`
  - For Teacher: `{ department, designation }`
- `refreshToken`: String

### B. Class

- `name`: String (e.g., "Web Engineering")
- `code`: String (Unique, e.g., "CS-301")
- `teacher`: ObjectId (Ref: User)
- `students`: [ObjectId] (Ref: User)
- `department`: String
- `semester`: Number (1-8)
- `batch`: String (e.g., "2021-2025")
- `academicYear`: String (e.g., "2025")

### C. Session (The Attendance Event)

- `classId`: ObjectId (Ref: Class)
- `teacherId`: ObjectId (Ref: User)
- `startTime`: Date
- `endTime`: Date
- `active`: Boolean
- `isRetroactive`: Boolean (True if created after the fact)
- `qrCodeHash`: String (Current active token)
- `teacherIP`: String (Public IP)
- `type`: Enum ['Lecture', 'Lab', 'Exam']

### D. Attendance (The Record)

- `sessionId`: ObjectId (Ref: Session)
- `studentId`: ObjectId (Ref: User)
- `classId`: ObjectId (Ref: Class) - _Added for fast aggregation_
- `status`: Enum ['Present', 'Absent', 'Late', 'Leave']
- `verificationMethod`: Enum ['QR', 'Manual']
- `date`: Date (For easy grouping)
- `weekNumber`: Number (ISO Week for weekly reports)
- `month`: Number (1-12)
- `year`: Number

---

## 3. IMPLEMENTATION PHASES

### Phase 1: System Setup

1. Initialize `server.js` with Express, CORS (allow credentials), and Helmet.
2. Setup `config/db.js` for MongoDB connection.
3. Create generic `utils/ApiResponse.js` and `utils/ApiError.js` for standardized JSON responses.

### Phase 2: Authentication & Roles

1. Implement `auth.controller.js`: Register, Login, Logout, RefreshToken.
2. Create `middlewares/auth.middleware.js`: Verify JWT access token.
3. Create `middlewares/role.middleware.js`: Check if user is Admin/Teacher/Student.
4. _Critical:_ Admin must be able to create Teacher/Student accounts in bulk.

### Phase 3: Core Management (Classes)

1. **Teacher:** Can create a Class.
2. **Student:** Can join a Class via Code.
3. **Validation:** Student can only join if their `semester` matches the Class `semester` (optional warning).

### Phase 4: The Attendance Engine (Complex)

1. **Start Session (Live):**
   - API: `POST /api/session/start`
   - Logic: Capture `req.ip`. Status: Active.
2. **Rotating QR (Socket/Polling):**
   - API: `GET /api/session/:id/qr`
   - Logic: Generate a signed JWT containing `{ sessionId, expires: 20s }`.
3. **Mark Attendance (Student Scan):**
   - API: `POST /api/attendance/mark`
   - Logic: Decode QR Token. Validate IP. Prevent Duplicates.
4. **Manual Override (Edit):**
   - API: `PATCH /api/attendance/update`
   - Logic: Update status (Present/Absent) for an existing session.
5. **Retroactive Session (The "Forgot to Scan" Feature):**
   - API: `POST /api/session/create-retroactive`
   - Input: `{ classId, date, startTime, endTime }`
   - Logic: Create a session with `active: false`. Return `sessionId`. Teacher is then redirected to the Manual Attendance Sheet to fill it in.

### Phase 5: The Analytics Engine (EXTREME DETAIL)

_This is the core requirement. Use MongoDB Aggregation Pipelines._

#### A. Student-Wise Report (`/api/reports/student/:id`)

- **Overall:** Total Classes vs Present % across all subjects.
- **Subject-wise:** Breakdown per subject (e.g., "Web Eng: 85%", "Math: 60%").
- **Low Attendance Warning:** Flag any subject < 75%.

#### B. Teacher-Wise Report (`/api/reports/teacher/:id`)

- **Performance:** Total sessions conducted vs Expected sessions.
- **Consistency:** Average student attendance in their classes.

#### C. Temporal Reports (The "Angles")

1. **Weekly Report:**
   - Group by `weekNumber`. Show attendance trends (e.g., "Week 4 attendance dropped by 10%").
2. **Monthly Report:**
   - Group by `month`. Compare Month-over-Month.
3. **Semester Report:**
   - Aggregate all data for `classId` where `semester` matches.

#### D. The "Defaulter" List

- API: `/api/reports/defaulters?min_percentage=75`
- Logic: Find all students with aggregate attendance below threshold.

---

## 4. PHASE 6: FRONTEND PAGES MAP (STRICT)

_Implement these exact pages in `/src/pages`._

### A. Public / Auth

1. **`LandingPage.jsx`**: Hero section.
2. **`Login.jsx`**: Single form. Redirects based on role.

### B. Admin Portal (`/src/pages/admin/`)

1. **`AdminDashboard.jsx`**: Stats Cards & System-wide chart.
2. **`UserManagement.jsx`**: Table of all users. Actions: Edit / Delete.
3. **`ClassManagement.jsx`**: View all classes.
4. **`SystemReports.jsx`**: Semester/Department wise analytics.

### C. Teacher Portal (`/src/pages/teacher/`)

1. **`TeacherDashboard.jsx`**:
   - Grid view of Classes.
   - Button: "Create Class".
2. **`ClassDetails.jsx`**:
   - Tabs: "Students", "History", "Analytics".
   - **Action 1:** "Start Live Session" (Goes to QR screen).
   - **Action 2:** "Add Past Session" (Opens Modal -> Select Date -> Goes to Manual Entry).
3. **`LiveSession.jsx`**:
   - Big QR Code (refreshes 20s).
   - Live Counter.
4. **`SessionHistory.jsx` (Includes Manual Entry)**:
   - List of sessions (Live & Retroactive).
   - Click session -> Opens **Attendance Table**.
   - **Bulk Action:** "Mark All Present" / "Mark All Absent".
   - **Individual Action:** Toggle status per student.

### D. Student Portal (`/src/pages/student/`)

1. **`StudentDashboard.jsx`**: Grid of classes + Overall Attendance %.
2. **`JoinClass.jsx`**: Input for Class Code.
3. **`ScanAttendance.jsx`**: Camera Interface.
4. **`MyReports.jsx`**: Line Chart (My trends) + Subject List.

---

## 5. API ENDPOINT MAP (Strict Naming)

- `POST /api/v1/auth/login`
- `POST /api/v1/class/create`
- `POST /api/v1/class/join`
- `POST /api/v1/session/start` (Live)
- `POST /api/v1/session/create-retroactive` (Manual/Past)
- `POST /api/v1/session/qr-token`
- `POST /api/v1/attendance/scan`
- `PATCH /api/v1/attendance/update` (Manual Override)
- `GET /api/v1/analytics/student/:studentId`
- `GET /api/v1/analytics/class/:classId/comprehensive`