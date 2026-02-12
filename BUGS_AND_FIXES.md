## 🐛 AttendX – Bugs & Concrete Fixes

This file lists **practical issues** found during static review of the codebase and docs, with **how to fix** each one.  
As we discover new bugs, append them here with a short, actionable description.

---

### 1. Inconsistent Attendance Endpoint Names (Docs vs Backend vs Frontend) ✅ Fixed

- **Where**
  - Docs (`COMPLETE_PROJECT_CONTEXT.md`) list: `POST /api/v1/attendance/mark`.
  - Actual backend route (`src/routes/attendance.routes.js`): `POST /api/v1/attendance/scan`.
  - Frontend (`frontend/src/services/attendanceAPI.js`) correctly calls `/attendance/scan`.
- **Impact**
  - Confusion when integrating new clients or when following the API docs.
- **Fix (chosen approach)**
  - Keep `/scan` as the primary path (since it is wired end‑to‑end) and **add a backward‑compatible alias** `/mark` in `attendance.routes.js` that maps to the same controller:
    - Add `router.post("/mark", hasRole("student"), markAttendance);`.
  - Update the docs in the future to mention **both** `/mark` and `/scan` and mark `/mark` as alias for clarity.

---

### 2. Hard‑Coded QR Token Expiry vs Per‑Session `qrRefreshRate` ✅ Fixed

- **Where**
  - Backend `getQRToken` (`src/controllers/session.controller.js`) signs tokens with a **fixed** `expiresIn: "20s"`.
  - Session security config stores `qrRefreshRate` and `LiveSession.jsx` uses that to refresh the token.
- **Impact**
  - If a session is started with `qrRefreshRate` not equal to 20 seconds, the **UI timer and actual token lifetime diverge**.  
    Example: refresh every 30s but token still expires every 20s → students see “expired QR” even though timer says it’s valid.
- **Fix**
  - Read `securityConfig.qrRefreshRate` from the session and use it for `expiresIn` and `expiresIn` field in the response:
    - Compute `const refreshRate = session.securityConfig?.qrRefreshRate || 20;`.
    - Replace `"20s"` with ``${refreshRate}s`` and `expiresIn: 20` with `expiresIn: refreshRate`.
  - This keeps **backend and frontend timers perfectly in sync**.

---

### 3. Geofence Default Radius Mismatch (Docs vs Code) ✅ Fixed

- **Where**
  - `COMPLETE_PROJECT_CONTEXT.md` and security description emphasise a default radius around **50m**.
  - Backend `Session` schema (`src/models/session.model.js`) sets `securityConfig.radius.default = 5` (meters).
- **Impact**
  - In practice, sessions without explicit radius will use a **very strict 5m circle**, which is likely too small and doesn’t match the documented behaviour.
- **Fix**
  - Update `session.model.js` default radius from `5` to `50` to match docs and UX expectations.
  - Optionally, add a **validation guard** when creating security config so radius is clamped to e.g. `[10, 500]` as per docs.

---

### 4. `getQRToken` Not Using Session Security Config for IP/Status

- **Where**
  - `getQRToken` only checks `session.active` and teacher ownership, then issues a token.
  - It does not surface any information about `securityConfig` to the frontend.
- **Impact**
  - Not a breaking bug, but LiveSession must **rely on cached `sessionConfig`**; if a teacher changes presets mid‑session in the future, QR token logic wouldn’t know.
- **Fix (minimal)**
  - For now, keep behaviour but **document** that changing security config in the middle of a session is unsupported.
  - If we later add mid‑session changes, we should:
    - Re‑read `session.securityConfig` on every `getQRToken` call.
    - Optionally return `securityConfig` in the response so frontend can update its UI without an extra call.

---

### 5. Potential Student‑Facing Message Bug in `ScanAttendance` Success Handling ✅ Fixed

- **Where**
  - `frontend/src/pages/student/ScanAttendance.jsx` – inside `markAttendance` success branch:
    - It tries to use `response.data.studentId?.name` for the success message.
- **Impact**
  - The backend `markAttendance` response structure is:
    - `data.attendance` (populated record), `ipMatch`, `requiresApproval`.
  - Because the code uses `attendanceAPI.markAttendance` (which returns `response.data`) and then treats `response` as the whole body, `response.data.studentId` is **undefined**, so the student name interpolation will fail / show “Student” fallback always.
- **Fix**
  - Change the success handling to use `attendance.attendance.studentId.name` (or simply not mention the name):
    - After `const attendance = response.data.attendance || response.data;`, use `attendance.studentId?.name` if present.
  - This makes the success message consistent with the actual response shape.

---

### 6. Analytics Route Naming Difference vs Original Master Plan

- **Where**
  - `MASTER_PLAN.md` lists endpoints like `/api/v1/analytics/student/:studentId` and `/api/v1/analytics/class/:classId/comprehensive`.
  - Implemented routes (`src/routes/analytics.routes.js`) and controllers:
    - `GET /api/v1/analytics/student/:studentId` – OK.
    - `GET /api/v1/analytics/class/:classId` – analytics for a single class.
    - `GET /api/v1/analytics/class/:classId/defaulters` – defaulters.
    - `GET /api/v1/analytics/comprehensive` – **global filter by semester/department**, not per `classId`.
- **Impact**
  - Slight mismatch between doc expectations and actual comprehensive endpoint (`/comprehensive` takes `semester`/`department` instead of `:classId`).
- **Fix**
  - Clarify in docs:
    - Keep current implementation.
    - Update API reference so “comprehensive class report” is described as `GET /api/v1/analytics/comprehensive?semester=&department=` instead of `.../class/:classId/comprehensive`.

---

### 7. Environment Variable Name Divergence for Frontend API ✅ Fixed

- **Where**
  - `COMPLETE_PROJECT_CONTEXT.md` suggests frontend `.env` uses `VITE_API_BASE_URL`.
  - `frontend/src/services/api.js` actually uses `import.meta.env.VITE_API_URL`.
- **Impact**
  - If you follow the context doc and set only `VITE_API_BASE_URL`, the frontend will **still use the fallback** `http://localhost:5000/api/v1` and may break in production.
- **Fix**
  - Either:
    - Update docs to say **`VITE_API_URL`** is the real variable; or
    - Change `api.js` to read `VITE_API_BASE_URL` first and keep `VITE_API_URL` as legacy/alias:
      - e.g. `const base = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";`.

---

### 8. Minor: Analytics “Comprehensive” JSDoc Comment Not Matching Real Signature ✅ Fixed

- **Where**
  - JSDoc above `getComprehensiveReport` says:  
    `GET /api/v1/analytics/comprehensive` – OK, but comment still references “semester/department analysis” only vaguely.
- **Impact**
  - Low‑severity; just documentation clarity. No runtime bug.
- **Fix**
  - Update comment to:  
    `* GET /api/v1/analytics/comprehensive?semester=...&department=...` so it is unambiguous.

---

### 9. Possible “My Attendance” Endpoint Missing (Frontend vs Backend) ✅ Fixed

- **Where**
  - Frontend `attendanceAPI.getMyAttendance` calls `GET /attendance/my-attendance/:classId`.
  - Backend `attendance.routes.js` does **not** define `/my-attendance/:classId`; it exposes:
    - `/session/:sessionId`, `/student/:studentId`, `/class/:classId/detailed`.
- **Impact**
  - Any UI that relies on `getMyAttendance` will fail with 404 at runtime.
- **Fix**
  - Option A (recommended):  
    - Implement a new backend route `GET /attendance/my-attendance/:classId` that:
      - Uses `req.user._id` as the studentId.
      - Filters `Attendance` by `classId` and `studentId`.
      - Returns summarized and raw records for that class.
  - Option B:  
    - Change `getMyAttendance` to call an existing endpoint (`/attendance/student/:studentId?classId=`) and pass the current user’s id from Redux; but then you must ensure the route checks that students can only see their own data (already done in `getStudentAttendance`).

---

### 10. Security Default Radius and Messages Not Aligned With Quick‑Start Presets

- **Where**
  - Quick‑start and context docs describe presets like:
    - Casual: 100m, 30s, checks off.
    - Strict: 20m, 10s, all checks on.
  - Backend defaults: radius=5, qrRefreshRate=20, ipMatchEnabled=true, deviceLockEnabled=false, manualApproval=false.
- **Impact**
  - If a developer forgets to pass config from `StartSessionModal`, **actual security level may not match the preset name**.
- **Fix**
  - Ensure `StartSessionModal` **always sends explicit `securityConfig`** (it already does, but verify) and consider:
    - Adding validation in `startSession` to enforce sensible min/max ranges and log if values deviate heavily from expected presets.

---

---

## 📋 Recent Bug Fixes (Feb 2026)

### ✅ All Critical Bugs Fixed

All bugs listed above have been addressed:

1. **Endpoint naming** - Added `/mark` alias for `/scan`
2. **QR token expiry** - Now uses session's `qrRefreshRate` dynamically
3. **Geofence radius** - Default changed from 5m to 50m
4. **My attendance endpoint** - Implemented and wired
5. **Student-facing messages** - Fixed to use correct response structure
6. **Environment variables** - Unified to use `VITE_API_URL`
7. **Analytics JSDoc** - Updated to match actual implementation
8. **Manual approval UI** - Fixed to show names and work correctly
9. **Device lock** - Now always enforced with admin reset capability
10. **Security error codes** - Implemented for better frontend error handling

### 🔍 Additional Improvements Made

- Security config validation with clamping (radius 10-500m, QR 5-60s)
- Enhanced error messages with icons and actionable guidance
- Live session security dashboard showing active settings
- Public landing page for demos and presentations
- Live attendance counter includes pending when manual approval is on

---

## ✅ Next Steps When Fixes Are Applied

- After implementing a fix:
  - Mark the bullet as **fixed** and briefly note the commit/branch or date.
  - If the fix required a **breaking change in API** or env vars, also update:
    - `PROJECT_OVERVIEW_AND_PLAN.md`
    - `COMPLETE_PROJECT_CONTEXT.md` (if behaviour changes)


