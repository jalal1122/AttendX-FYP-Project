## 📘 AttendX – Project Overview & Working Notes

This file is the **single source of truth for ongoing development** on AttendX.  
It summarizes how the project works today and provides structured sections where we can log **bugs, enhancements, refactors, and deployment notes** as we keep improving the system.

---

## 🧠 High‑Level Concept

- **AttendX** is a MERN‑stack, production‑ready attendance platform with:
  - **Roles:** Admin, Teacher, Student
  - **Core flow:** Teacher starts a secured session → dynamic QR is shown → students scan from their own device and location → attendance is stored with security checks → teachers/admins get analytics and exports.
- **Security pillars (already implemented):**
  - **Device lock:** per‑browser UUID in `localStorage`, **always enforced** in attendance marking. Admins can reset device bindings.
  - **Geofencing:** Haversine distance from teacher's location against per‑session radius (default 50m, clamped 10-500m).
  - **IP match:** optional, compares student IP to teacher IP.
  - **Manual approval:** optional pending queue the teacher can approve.
  - **2FA:** optional per user, via OTP secret.
  - **Error codes:** Machine-readable codes (GEOFENCE_OUTSIDE, DEVICE_LOCK_VIOLATION, etc.) for better error handling.

---

## 🏗 Current Architecture (Short Form)

- **Backend (Node/Express, `server.js` + `src/`):**
  - `config/`: `db.js` (MongoDB), `cloudinary.js`.
  - `utils/`: `ApiError.js`, `ApiResponse.js`.
  - `src/models/`: `user`, `class`, `session`, `attendance`, `otp`.
  - `src/controllers/`: `auth`, `user`, `class`, `session`, `attendance`, `analytics`.
  - `src/middlewares/`: `auth.middleware` (JWT), `role.middleware` (RBAC), `upload.middleware` (multer).
  - `src/routes/`: `/auth`, `/user`, `/class`, `/session`, `/attendance`, `/analytics`.
  - `src/utils/`: `asyncHandler`, `geolocation`, `sendEmail`.

- **Frontend (React/Vite, `frontend/`):**
  - Entry: `main.jsx`, `App.jsx`, `store.js`.
  - **State:** Redux Toolkit `authSlice` for auth/user/token.
  - **Services:** `api.js` (axios instance) + typed API modules (`authAPI`, `classAPI`, `sessionAPI`, `attendanceAPI`, `analyticsAPI`, `userAPI`).
  - **Routing:** `App.jsx` with `PrivateRoute` and role‑based dashboards:
    - Admin: `AdminDashboard`, `ManageUsers`, `ManageClasses`, `AdminReports`.
    - Teacher: `TeacherDashboard`, `ClassDetails`, `LiveSession`, `SessionHistory`.
    - Student: `StudentDashboard`, `ScanAttendance`, `MyAttendance`.
    - Common: `Profile`, `Reports`, secret `/create-admin`.
  - **UI:** `components/ui` (Button, Card, Input, Modal), `Navbar`, modals (`StartSessionModal`, `CreateUserModal`), `TwoFactorSettings`.

---

## 🔁 Key Flows (Condensed)

- **Authentication & Roles**
  - JWT access + refresh tokens; refresh token in HTTP‑only cookie.
  - `auth.middleware` checks JWT; `role.middleware` restricts routes by `user.role`.
  - Frontend keeps token + user in Redux; `PrivateRoute` gates routes and redirects by role.

- **Teacher Starts Live Session**
  - From `TeacherDashboard` / `ClassDetails` → open `StartSessionModal` with security presets.
  - Backend `POST /api/v1/session/start`:
    - Stores `classId`, `teacherId`, `location`, `securityConfig`, `teacherIP`.
    - Marks session as active.
  - Frontend `LiveSession`:
    - Checks for existing active session (`getActiveSession`).
    - Fetches initial QR token then **rotates** it via `getQRToken` at `securityConfig.qrRefreshRate`.
    - Shows live counts + pending approvals when `manualApproval` is on.

- **Student Scans & Marks Attendance**
  - `ScanAttendance`:
    - Generates/reads persistent `device_uuid` in `localStorage`.
    - Uses `Html5Qrcode` for camera scanning; also supports dev token input.
    - On scan, gets browser geolocation and calls attendance API.
  - Backend `POST /api/v1/attendance/scan` (`markAttendance` controller):
    - Verifies QR token (`QR_SECRET`).
    - Validates session active, student enrolled in class.
    - **Geofence**: distance check via `calculateDistance` / `isWithinRadius`.
    - **IP match** (if enabled): compares client IP with `session.teacherIP`.
    - **Device lock** (if enabled): denies if same `deviceId` already used by another student.
    - Creates attendance as `"Present"` or `"Pending"` (manual approval).

- **Manual Approval & History**
  - Teacher sees pending list in `LiveSession` (orange card).
  - `POST /api/v1/attendance/approve` updates `"Pending"` to `"Present"`.
  - History & analytics flows are exposed via `/attendance/*` and `/analytics/*` controllers.

---

## 🔧 Environment & Deployment Snapshot

- **Backend `.env` (core keys):**
  - `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `QR_SECRET`
  - `ADMIN_SECRET`, `CLIENT_URL`, Cloudinary + email credentials
  - `COOKIE_SECURE`, `COOKIE_SAME_SITE`
- **Frontend `.env`:**
  - `VITE_API_URL=http://localhost:5000/api/v1` (or production URL).
- **Deployment:**
  - Backend is Express, ready for Vercel/Render (exports `app`, conditional `listen`).
  - Frontend meant for Vercel/Netlify; simple static deployment from `npm run build`.

---

## 🪲 Current / Future Bug Log

Use this section to track issues as they appear. Keep entries **short and specific**.

### ✅ Recently Fixed (Feb 2026)

All critical bugs have been resolved. See `BUGS_AND_FIXES.md` and `CHANGELOG.md` for details:
- ✅ Endpoint naming inconsistencies
- ✅ QR token expiry sync issues
- ✅ Geofence default radius mismatch
- ✅ Missing "my attendance" endpoint
- ✅ Student success message bugs
- ✅ Environment variable inconsistencies
- ✅ Manual approval UI issues
- ✅ Device lock enforcement

### 📋 Active Issues

- **[ ]** None currently tracked

> When you report a bug, please add: **context (where it happens), exact error message, steps to reproduce, expected vs actual behaviour.**

---

## ✨ Enhancements & Feature Ideas

These extend what is already described in `COMPLETE_PROJECT_CONTEXT.md` and `MASTER_PLAN.md`.

### ✅ Recently Completed (Feb 2026)

- ✅ **Security config validation & standardization** - Radius and QR refresh rate clamping
- ✅ **Error code system** - Machine-readable codes for better frontend error handling
- ✅ **Enhanced scan error UX** - Icon-based messages with actionable guidance
- ✅ **Live session security dashboard** - Real-time display of active security settings
- ✅ **Public landing page** - Marketing/demo page for unauthenticated users
- ✅ **Manual approval improvements** - Fixed UI, shows names, correct live counts
- ✅ **Admin device reset** - Admins can unbind student devices

### 📋 Planned / Nice‑to‑have

- **[ ]** Face recognition integration (tie to existing device/location checks).
- **[ ]** Real‑time notifications (e.g. when a student is rejected by device lock).
- **[ ]** Detailed audit logs for all security events.
- **[ ]** Mobile‑optimized PWA version (offline‑friendly).
- **[ ]** More customizable security presets (per‑class defaults, per‑teacher defaults).
- **[ ]** IP matching robustness improvements (logging masks, dev mode toggle).
- **[ ]** Better test coverage for analytics aggregation pipelines.
- **[ ]** Stronger API response typing with JSDoc.

Add any new idea below with a short description and a priority tag like `[HIGH] / [MED] / [LOW]`.

---

## 🧹 Refactor & Code‑Quality Tasks

### ✅ Recently Completed

- ✅ **Standardized error messages** - Implemented error code system with categorized feedback
- ✅ **Security config centralization** - Validation and defaults now in one place

### 📋 Remaining Tasks

- **[ ]** Centralize date/time handling (attendance/session) to avoid drift and duplicated logic.
- **[ ]** Review and prune unused fields/endpoints from early phases versus final implementation.
- **[ ]** Add more unit/integration tests around:
  - Device lock enforcement
  - Manual approval flow
  - Analytics aggregation correctness

---

## 📈 Analytics & Reporting Notes

- Advanced analytics endpoints are in `analytics.controller.js` and surfaced via `analyticsAPI.js` + dashboard pages.
- Key concepts:
  - Per‑student trends, per‑class heatmaps, defaulters (<75%), teacher stats, export to Excel.
- When changing attendance/session schemas, **re‑check**:
  - Aggregation pipelines
  - Excel export shapes
  - Frontend charts (field names, date formats).

---

## 📑 Documentation Index (Where to Read More)

- **`COMPLETE_PROJECT_CONTEXT.md`** – deep technical/system context (for AI & devs).
- **`MASTER_PLAN.md`** – original phased blueprint and strict requirements.
- **`QUICK_START_GUIDE.md`** – 5‑minute setup & demo script.
- **`frontend/FRONTEND_SETUP.md`** – how the React/Tailwind/Redux skeleton is wired.
- **`BUGS_AND_FIXES.md`** – list of bugs found and their fixes (all critical bugs resolved).
- **`IMPROVEMENTS_PLAN.md`** – non-urgent improvements, refactors, and future features.
- **`CHANGELOG.md`** – comprehensive log of all changes and updates.
- Other phase‑specific docs referenced in `COMPLETE_PROJECT_CONTEXT.md` (testing, admin setup, etc.).

---

## ✅ How To Use This File Going Forward

- When we **start a new task**, briefly note it in **Enhancements** or **Refactor**.
- When we **find a bug**, log it in **Bug Log** with enough info to reproduce.
- When we make **architectural changes**, add 1–2 lines above (architecture or flow sections) so this file always reflects the current truth.


