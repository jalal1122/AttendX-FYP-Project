# AttendX - Complete Project Documentation

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Features](#features)
5. [Security Mechanisms](#security-mechanisms)
6. [Database Models](#database-models)
7. [API Endpoints](#api-endpoints)
8. [Frontend Structure](#frontend-structure)
9. [Key Workflows](#key-workflows)
10. [Recent Updates & Fixes](#recent-updates--fixes)
11. [Known Issues & Limitations](#known-issues--limitations)
12. [Setup & Installation](#setup--installation)
13. [Environment Variables](#environment-variables)
14. [Deployment](#deployment)
15. [Future Improvements](#future-improvements)

---

## 🎯 Project Overview

**AttendX** is a comprehensive, production-ready attendance management system built with the MERN stack. It uses advanced security mechanisms including QR code scanning, geofencing, device locking, and IP matching to ensure attendance integrity while preventing proxy attendance and buddy punching.

### Purpose
- Modernize traditional attendance systems
- Prevent attendance fraud (proxy attendance, buddy punching)
- Provide real-time attendance tracking
- Generate comprehensive analytics and reports
- Support multiple security levels based on class requirements

### Target Users
- **Admins**: System administrators who manage users and classes
- **Teachers**: Faculty who conduct classes and manage attendance
- **Students**: Enrolled students who mark their attendance

---

## 🛠 Tech Stack

### Backend
- **Runtime**: Node.js v18+
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
  - Access tokens (short-lived, in memory)
  - Refresh tokens (long-lived, HTTP-only cookies)
- **Security**: 
  - bcrypt for password hashing
  - 2FA support with OTP (speakeasy)
  - CORS enabled
  - Helmet for security headers
- **File Upload**: Multer + Cloudinary
- **Email**: Nodemailer

### Frontend
- **Framework**: React 18 with Vite
- **Routing**: React Router DOM v6
- **State Management**: Redux Toolkit
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **QR Code**: 
  - Generation: react-qr-code
  - Scanning: html5-qrcode
- **Build Tool**: Vite

### Development Tools
- **Package Manager**: npm
- **Version Control**: Git
- **Code Editor**: VS Code (recommended)

---

## 🏗 Architecture

### High-Level Architecture

```
┌─────────────────┐
│   React SPA     │
│  (Frontend)     │
│                 │
│  - Redux Store  │
│  - React Router │
│  - Tailwind UI  │
└────────┬────────┘
         │
         │ HTTPS/API Calls
         │
┌────────▼────────┐
│  Express API    │
│   (Backend)     │
│                 │
│  - JWT Auth     │
│  - Controllers  │
│  - Middlewares  │
└────────┬────────┘
         │
         │ Mongoose
         │
┌────────▼────────┐
│    MongoDB      │
│   (Database)    │
│                 │
│  - Users        │
│  - Classes      │
│  - Sessions     │
│  - Attendance   │
│  - OTPs         │
└─────────────────┘
```

### Backend Structure

```
AttendX/
├── server.js                 # Entry point
├── config/
│   ├── db.js                 # MongoDB connection
│   └── cloudinary.js         # Cloudinary config
├── utils/
│   ├── ApiError.js           # Custom error class
│   └── ApiResponse.js        # Standard response wrapper
├── src/
│   ├── models/               # Mongoose models
│   │   ├── user.model.js
│   │   ├── class.model.js
│   │   ├── session.model.js
│   │   ├── attendance.model.js
│   │   └── otp.model.js
│   ├── controllers/          # Business logic
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   ├── class.controller.js
│   │   ├── session.controller.js
│   │   ├── attendance.controller.js
│   │   └── analytics.controller.js
│   ├── middlewares/          # Express middlewares
│   │   ├── auth.middleware.js
│   │   ├── role.middleware.js
│   │   └── upload.middleware.js
│   ├── routes/               # API routes
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── class.routes.js
│   │   ├── session.routes.js
│   │   ├── attendance.routes.js
│   │   └── analytics.routes.js
│   └── utils/                # Helper utilities
│       ├── asyncHandler.js
│       ├── geolocation.js
│       └── sendEmail.js
```

### Frontend Structure

```
frontend/
├── src/
│   ├── main.jsx              # Entry point
│   ├── App.jsx               # Root component & routing
│   ├── store.js              # Redux store
│   ├── features/             # Redux slices
│   │   └── auth/
│   │       └── authSlice.js
│   ├── services/             # API services
│   │   ├── api.js            # Axios instance
│   │   ├── authAPI.js
│   │   ├── userAPI.js
│   │   ├── classAPI.js
│   │   ├── sessionAPI.js
│   │   ├── attendanceAPI.js
│   │   └── analyticsAPI.js
│   ├── pages/                # Page components
│   │   ├── LandingPage.jsx
│   │   ├── auth/
│   │   │   ├── Login.jsx
│   │   │   ├── ForgotPassword.jsx
│   │   │   └── RegisterAdmin.jsx
│   │   ├── admin/
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── ManageUsers.jsx
│   │   │   ├── ManageClasses.jsx
│   │   │   └── AdminReports.jsx
│   │   ├── teacher/
│   │   │   ├── TeacherDashboard.jsx
│   │   │   ├── ClassDetails.jsx
│   │   │   ├── LiveSession.jsx
│   │   │   └── SessionHistory.jsx
│   │   ├── student/
│   │   │   ├── StudentDashboard.jsx
│   │   │   ├── ScanAttendance.jsx
│   │   │   └── MyAttendance.jsx
│   │   └── common/
│   │       ├── Profile.jsx
│   │       └── Reports.jsx
│   ├── components/           # Reusable components
│   │   ├── PrivateRoute.jsx
│   │   ├── layout/
│   │   │   └── Navbar.jsx
│   │   ├── ui/
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Input.jsx
│   │   │   └── Modal.jsx
│   │   └── modals/
│   │       ├── StartSessionModal.jsx
│   │       ├── CreateUserModal.jsx
│   │       └── TwoFactorSettings.jsx
│   └── index.css             # Tailwind imports
```

---

## ✨ Features

### 1. Role-Based Access Control (RBAC)
- **Three roles**: Admin, Teacher, Student
- **Role-specific dashboards** with appropriate permissions
- **Protected routes** with automatic redirection
- **Middleware-enforced** authorization on backend

### 2. Authentication & Security
- **JWT-based authentication** with access and refresh tokens
- **Password hashing** using bcrypt
- **2FA support** (optional per user) using TOTP
- **Forgot password** with email verification
- **Secure cookie-based** refresh token storage
- **Device fingerprinting** using browser UUID

### 3. Live Attendance Sessions
- **Real-time QR code generation** with rotating tokens
- **Configurable QR refresh rate** (5-60 seconds)
- **Live attendance counter** showing present/pending students
- **Security config per session**: radius, IP match, manual approval
- **Active session management** (only one active session per class)

### 4. Multi-Layer Security for Attendance
#### a) Geofencing
- GPS-based location verification
- Haversine formula for distance calculation
- Configurable radius (10-500m, default 100m)
- GPS accuracy warnings and enhanced error messages

#### b) Device Lock (Always Enforced)
- One device per student account
- Browser UUID stored in localStorage
- Per-session device uniqueness check
- Admin can reset device bindings

#### c) IP Matching (Optional)
- Compares student IP with teacher IP
- Useful for same-network verification
- Can be disabled for flexibility

#### d) Manual Approval (Optional)
- Teacher manually approves each attendance
- Pending queue with student names
- Approve individual or all at once
- Live count includes pending when enabled

#### e) Rotating QR Tokens
- JWT-based tokens with short expiration
- Prevents screenshot/sharing fraud
- Synced with frontend timer

### 5. Attendance Management
- **Mark attendance** via QR scan or manual entry
- **Retroactive sessions** for past attendance
- **Attendance status**: Present, Absent, Pending
- **Manual updates** by teachers
- **Detailed history** per student/class/session

### 6. Analytics & Reports
- **Student reports**: attendance percentage, trends, defaulters
- **Class analytics**: session-wise breakdown, heatmaps
- **Teacher stats**: classes taught, average attendance
- **Comprehensive reports**: department/semester-wide
- **Defaulter identification**: students below 75%
- **Excel export** capability (backend ready)

### 7. Class Management
- **Create/edit/delete classes**
- **Enroll/remove students**
- **Assign teachers**
- **Department and semester organization**
- **Student count tracking**

### 8. User Management (Admin)
- **Create users** (bulk or individual)
- **Edit user details**
- **Delete users**
- **Reset device bindings**
- **Role management**
- **Profile picture upload**

### 9. Student Features
- **Dashboard** with enrolled classes and attendance stats
- **QR scanner** with camera access and dev token input
- **My attendance** page with per-class breakdown
- **Profile management**

### 10. Teacher Features
- **Dashboard** with all classes and quick stats
- **Class details** page with student list
- **Start live session** with security presets
- **Live session management** with QR display and real-time counts
- **Session history** for each class
- **Manual attendance updates**

### 11. Admin Features
- **System-wide dashboard** with statistics
- **Manage all users** (students, teachers, admins)
- **Manage all classes**
- **Comprehensive reports**
- **Device reset** for students

---

## 🔒 Security Mechanisms

### 1. Geofencing
**How it works:**
- Teacher starts session → browser captures GPS coordinates
- Student scans QR → browser captures student GPS
- Backend calculates distance using Haversine formula
- Compares distance against configured radius
- Rejects if outside radius

**Recent improvements:**
- Increased default radius to 100m (GPS accuracy tolerance)
- Added GPS accuracy warnings for large distances
- Enhanced error messages with troubleshooting tips
- Radius range: 10-500m (clamped during validation)

**Known issues:**
- **Laptop GPS**: WiFi-based location can be inaccurate (off by 100s or 1000s of meters)
- **Solution**: Use mobile devices for better accuracy, or increase radius to 100m+

### 2. Device Lock
**How it works:**
- First scan: generates UUID via `crypto.randomUUID()` and stores in `localStorage`
- UUID sent with every attendance request
- Backend binds UUID to student account on first use
- Subsequent scans: verifies UUID matches bound device
- Rejects if different UUID detected

**Always enforced** (no toggle):
- Prevents buddy punching
- One device per student
- Admin can reset if device lost/changed

### 3. IP Matching
**How it works:**
- Teacher IP captured when session starts
- Student IP captured when marking attendance
- Backend compares IPs
- Optional check (can be disabled)

**Limitations:**
- Same network required (NAT can cause mismatches)
- Not reliable on public WiFi or cellular
- Recommended: keep disabled unless specific need

### 4. Manual Approval
**How it works:**
- When enabled, all attendance marked as "Pending"
- Teacher sees pending list in LiveSession
- Teacher approves individually or all at once
- Status changes from "Pending" to "Present"

**Use cases:**
- High-security exams
- Small classes where teacher knows all students
- Verification of problematic scans

### 5. Error Code System
**Machine-readable error codes:**
- `GEOFENCE_OUTSIDE`: Student too far from classroom
- `DEVICE_LOCK_VIOLATION`: Wrong device used
- `IP_MISMATCH`: Different network than teacher
- `QR_EXPIRED`: QR code expired
- `QR_INVALID`: Invalid QR token

**Frontend uses codes to:**
- Display specific icons (📍 🔒 🌐 ⏱️ ❌)
- Provide actionable guidance
- Adjust retry delays

---

## 💾 Database Models

### 1. User Model
```javascript
{
  name: String (required),
  email: String (required, unique, lowercase),
  password: String (required, hashed),
  role: String (enum: ["admin", "teacher", "student"], default: "student"),
  rollNumber: String (unique, for students),
  department: String,
  semester: Number,
  profilePicture: String (Cloudinary URL),
  deviceId: String (for device lock),
  twoFactorSecret: String,
  twoFactorEnabled: Boolean (default: false),
  createdAt: Date,
  updatedAt: Date
}
```

### 2. Class Model
```javascript
{
  name: String (required),
  code: String (required, unique),
  teacher: ObjectId (ref: "User", required),
  department: String (required),
  semester: Number (required),
  students: [ObjectId] (ref: "User"),
  createdAt: Date,
  updatedAt: Date
}
```

### 3. Session Model
```javascript
{
  classId: ObjectId (ref: "Class", required),
  teacherId: ObjectId (ref: "User", required),
  startTime: Date (required),
  endTime: Date,
  active: Boolean (default: true),
  isRetroactive: Boolean (default: false),
  type: String (enum: ["Lecture", "Lab", "Exam"], default: "Lecture"),
  location: {
    latitude: Number,
    longitude: Number
  },
  teacherIP: String,
  securityConfig: {
    radius: Number (default: 50),
    ipMatchEnabled: Boolean (default: true),
    deviceLockEnabled: Boolean (default: false),
    qrRefreshRate: Number (default: 20),
    manualApproval: Boolean (default: false)
  },
  createdAt: Date,
  updatedAt: Date
}
```

### 4. Attendance Model
```javascript
{
  sessionId: ObjectId (ref: "Session", required),
  studentId: ObjectId (ref: "User", required),
  classId: ObjectId (ref: "Class", required),
  status: String (enum: ["Present", "Absent", "Pending"], default: "Present"),
  markedAt: Date (default: Date.now),
  ipAddress: String,
  deviceId: String,
  location: {
    latitude: Number,
    longitude: Number
  },
  manuallyMarked: Boolean (default: false),
  markedBy: ObjectId (ref: "User"), // for manual marking
  createdAt: Date,
  updatedAt: Date
}
```

### 5. OTP Model
```javascript
{
  userId: ObjectId (ref: "User", required),
  email: String (required),
  otp: String (required),
  expiresAt: Date (required),
  verified: Boolean (default: false),
  createdAt: Date
}
```

---

## 🌐 API Endpoints

### Authentication Routes (`/api/v1/auth`)
- `POST /register` - Register new user (requires admin secret or existing admin)
- `POST /login` - Login with email/password (optional 2FA)
- `POST /verify-2fa` - Verify 2FA token during login
- `POST /logout` - Logout (clears refresh token)
- `POST /refresh-token` - Get new access token using refresh token
- `POST /forgot-password` - Request password reset (sends OTP)
- `POST /verify-otp` - Verify OTP for password reset
- `POST /reset-password` - Reset password with verified OTP
- `GET /me` - Get current user details

### User Routes (`/api/v1/user`)
- `GET /` - Get all users (admin only)
- `GET /:id` - Get user by ID
- `POST /` - Create new user (admin only)
- `PUT /:id` - Update user (admin/self)
- `DELETE /:id` - Delete user (admin only)
- `POST /upload-profile-picture` - Upload profile picture
- `POST /:id/reset-device` - Reset device binding (admin only)

### Class Routes (`/api/v1/class`)
- `GET /` - Get all classes
- `GET /:id` - Get class details with students
- `POST /` - Create new class (admin only)
- `PUT /:id` - Update class (admin/teacher)
- `DELETE /:id` - Delete class (admin only)
- `GET /teacher/:teacherId` - Get classes by teacher
- `POST /:id/students` - Add students to class (admin/teacher)
- `DELETE /:id/students/:studentId` - Remove student from class

### Session Routes (`/api/v1/session`)
- `POST /start` - Start live session (teacher)
- `POST /:id/end` - End session (teacher)
- `GET /:id/qr-token` - Get rotating QR token (teacher)
- `GET /active/:classId` - Get active session for class
- `GET /class/:classId` - Get all sessions for class
- `POST /create-retroactive` - Create past session (teacher)

### Attendance Routes (`/api/v1/attendance`)
- `POST /scan` - Mark attendance via QR scan (student)
- `POST /mark` - Alias for /scan (backward compatibility)
- `POST /manual` - Manually mark attendance (teacher)
- `PUT /:id` - Update attendance record (teacher)
- `GET /session/:sessionId` - Get attendance for session
- `GET /student/:studentId` - Get attendance for student
- `GET /class/:classId/detailed` - Get detailed class attendance
- `GET /my-attendance/:classId` - Get logged-in student's attendance
- `POST /approve` - Approve pending attendance (teacher)

### Analytics Routes (`/api/v1/analytics`)
- `GET /student/:studentId` - Get student analytics report
- `GET /class/:classId` - Get class analytics
- `GET /class/:classId/defaulters` - Get defaulters list (<75%)
- `GET /comprehensive` - Get comprehensive report (admin)
- `GET /teacher/:teacherId` - Get teacher statistics

---

## 🎨 Frontend Structure

### Redux State Management
```javascript
// authSlice.js
{
  user: { /* user object */ },
  token: "access_token",
  isAuthenticated: boolean,
  loading: boolean,
  error: string
}
```

### API Service Pattern
```javascript
// Example: attendanceAPI.js
import api from "./api";

const attendanceAPI = {
  markAttendance: (token, latitude, longitude, deviceId) =>
    api.post("/attendance/scan", { token, latitude, longitude, deviceId }),
  
  getMyAttendance: (classId) =>
    api.get(`/attendance/my-attendance/${classId}`),
  
  // ... more methods
};

export default attendanceAPI;
```

### Routing & Protection
```javascript
// App.jsx
<Route
  path="/student/dashboard"
  element={
    <PrivateRoute allowedRoles={["student"]}>
      <StudentDashboard />
    </PrivateRoute>
  }
/>
```

### Key Components

#### 1. LiveSession (Teacher)
- Displays rotating QR code
- Shows live attendance count
- Lists pending approvals (if manual approval enabled)
- Real-time timer for QR refresh
- Security config dashboard
- End session button

#### 2. ScanAttendance (Student)
- HTML5 QR scanner with camera access
- Device UUID generation/retrieval
- GPS location capture
- Enhanced error handling with icons
- Dev token input for testing
- Success/error messages

#### 3. StartSessionModal (Teacher)
- Quick security presets (Casual, Recommended, Strict, Testing)
- Manual config: radius slider, QR refresh rate, IP match, manual approval
- GPS accuracy warnings
- Session type selection (Lecture/Lab/Exam)

---

## 🔄 Key Workflows

### 1. User Registration & Login
```
1. Admin registers via /create-admin (first time) or ManageUsers
2. User logs in with email/password
3. If 2FA enabled:
   a. Enter 2FA code
   b. Verify with backend
4. Backend issues access + refresh tokens
5. Frontend stores token in Redux
6. Refresh token stored in HTTP-only cookie
7. User redirected to role-specific dashboard
```

### 2. Teacher Starts Live Session
```
1. Teacher navigates to class details
2. Clicks "Start Session"
3. StartSessionModal opens
4. Teacher selects security preset or customizes
5. Browser captures teacher's GPS location
6. Frontend sends: classId, location, securityConfig
7. Backend creates session record
8. Frontend navigates to LiveSession page
9. Backend generates first QR token
10. Frontend displays QR + starts refresh timer
11. QR rotates every X seconds (configurable)
```

### 3. Student Marks Attendance
```
1. Student navigates to "Scan Attendance"
2. Browser generates/retrieves device UUID
3. Student grants camera permission
4. QR scanner activates
5. Student scans teacher's QR code
6. Browser captures student's GPS location
7. Frontend sends: token, latitude, longitude, deviceId
8. Backend verifies:
   a. Token valid & not expired
   b. Session active
   c. Student enrolled in class
   d. Geofence check (distance ≤ radius)
   e. Device lock check (UUID matches or first time)
   f. IP match check (if enabled)
9. Backend creates attendance record:
   - Status: "Present" or "Pending" (if manual approval)
10. Frontend shows success/error message
11. Student redirected to dashboard
```

### 4. Manual Approval (If Enabled)
```
1. Student scans → attendance marked as "Pending"
2. Teacher sees pending list in LiveSession
3. Teacher reviews pending attendance
4. Teacher clicks "Approve" or "Approve All"
5. Backend updates status: "Pending" → "Present"
6. Live count updates
7. Student can see "Present" in their attendance
```

### 5. Admin Resets Device
```
1. Student loses device or changes phone
2. Student cannot mark attendance (device mismatch)
3. Student contacts admin
4. Admin opens ManageUsers
5. Admin finds student, clicks "Reset Device"
6. Backend clears deviceId field
7. Student can now bind new device on next scan
```

---

## 🔄 Recent Updates & Fixes (February 2026)

### Critical Bug Fixes

1. **GPS Accuracy Issue**
   - **Problem**: 1954m distance shown when user was 0.5m away
   - **Root cause**: Laptop WiFi-based GPS is inaccurate
   - **Fix**: 
     - Increased default radius from 50m to 100m
     - Increased max radius from 50m to 500m
     - Added GPS accuracy warnings in error messages
     - Added troubleshooting tips in UI
     - Added testing preset with 500m radius

2. **QR Token Expiry Sync**
   - Fixed: Token expiry now uses session's qrRefreshRate dynamically
   - Was: Hard-coded 20s causing frontend/backend mismatch

3. **Geofence Default Radius**
   - Changed: Default from 5m to 50m (now 100m)
   - Reason: GPS accuracy tolerance

4. **Device Lock Always Enforced**
   - Removed toggle from UI
   - Always set to true for security

5. **Endpoint Naming**
   - Added /mark alias for /scan endpoint
   - Backward compatibility

### Major Improvements

1. **Error Code System**
   - Machine-readable codes for security failures
   - Frontend shows specific icons and guidance
   - Smart retry delays based on error type

2. **Enhanced Error Messages**
   - Icon-based: 📍 🔒 🌐 ⏱️ ❌
   - Actionable guidance for each error
   - GPS troubleshooting tips

3. **Security Config Validation**
   - Radius clamped to 10-500m
   - QR refresh rate clamped to 5-60s
   - Console warnings when values adjusted

4. **Live Session Security Dashboard**
   - Real-time display of active security settings
   - Shows: radius, device lock, IP match, manual approval
   - Visual icons for clarity

5. **Quick Security Presets**
   - Casual: 150m, relaxed
   - Recommended: 100m, balanced (default)
   - Strict: 50m, exam mode
   - Testing: 500m, for GPS issues

6. **Public Landing Page**
   - Beautiful marketing page for unauthenticated users
   - Features showcase with icons
   - Auto-redirects authenticated users

7. **Manual Approval UI Fixes**
   - Shows student names and roll numbers
   - Approve/Approve All buttons work correctly
   - Live counter includes pending students

8. **Admin Device Reset**
   - Button in ManageUsers page
   - Confirmation dialog
   - Clears deviceId field

---

## ⚠️ Known Issues & Limitations

### 1. GPS Accuracy Issues
**Problem**: Laptop GPS using WiFi location is very inaccurate
- Can be off by 100s or 1000s of meters
- Causes false geofence violations

**Current Solutions**:
- Increased default radius to 100m
- Added GPS accuracy warnings
- Provided troubleshooting tips
- Added "Testing" preset with 500m radius

**Recommended**:
- Use mobile devices (better GPS)
- Increase radius to 100m+ for laptops
- Use "Testing" preset for development
- Consider disabling geofencing for testing

### 2. IP Matching Limitations
**Problem**: IP match not reliable in many scenarios
- Public WiFi: students on different subnets
- Cellular data: different IPs
- NAT: all devices share one public IP
- VPNs: completely different IPs

**Current Status**: Disabled by default

**Recommendation**: Only enable if all students/teacher on same private network

### 3. QR Code Screenshot Fraud
**Mitigation**: Rotating QR with short expiry (5-60s)
- Prevents sharing of QR codes
- Screenshots become invalid quickly

**Limitation**: Very determined students could still share in real-time
**Additional Layer**: Manual approval can be enabled for high-security scenarios

### 4. Device Lock Bypass
**Potential bypass**: Student uses different browser/incognito
**Mitigation**: Device UUID stored in localStorage (per-browser)
**Limitation**: Not foolproof, but makes buddy punching harder

**Recommendation**: Combine with geofencing and manual approval for exams

### 5. Geolocation Permission Denied
**Problem**: Student denies location permission
**Current behavior**: Attendance fails (geofencing enabled)
**Solution**: Clear error message instructing to enable location

### 6. Camera Permission Denied
**Problem**: Student denies camera permission
**Workaround**: Dev token input available (for testing)
**Production**: Camera required for QR scanning

### 7. Network Issues
**Problem**: Slow/unstable internet during session
**Impact**: QR refresh may fail, attendance may timeout
**Mitigation**: Frontend retries, error messages

### 8. Database Scalability
**Current**: Single MongoDB instance
**Consideration**: For large institutions (10,000+ students), consider:
- MongoDB sharding
- Read replicas
- Indexing optimization
- Caching layer (Redis)

---

## 🚀 Setup & Installation

### Prerequisites
- **Node.js**: v18 or higher
- **MongoDB**: v5 or higher (local or MongoDB Atlas)
- **npm**: v8 or higher
- **Git**: for version control

### Backend Setup

1. **Clone repository**
```bash
git clone <repository-url>
cd AttendX
```

2. **Install dependencies**
```bash
npm install
```

3. **Create .env file**
```bash
cp .env.example .env
```

4. **Configure environment variables** (see Environment Variables section)

5. **Start MongoDB** (if local)
```bash
mongod
```

6. **Run backend**
```bash
# Development
npm run dev

# Production
npm start
```

Backend runs on: `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend**
```bash
cd frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Create .env file**
```bash
cp .env.example .env
```

4. **Configure frontend env** (see Environment Variables section)

5. **Run frontend**
```bash
# Development
npm run dev

# Production build
npm run build
npm run preview
```

Frontend runs on: `http://localhost:5173`

### First-Time Admin Registration

1. Navigate to: `http://localhost:5173/create-admin`
2. Use the `ADMIN_SECRET` from backend .env
3. Create first admin account
4. Login with admin credentials
5. Start creating classes and users

---

## 🔐 Environment Variables

### Backend (.env)

```bash
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/attendx
# OR MongoDB Atlas:
# MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/attendx

# JWT Secrets
JWT_ACCESS_SECRET=your_access_secret_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars
QR_SECRET=your_qr_secret_min_32_chars

# JWT Expiry
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Admin Registration
ADMIN_SECRET=your_admin_secret

# Client URL
CLIENT_URL=http://localhost:5173

# Cookie Settings
COOKIE_SECURE=false  # true in production (HTTPS)
COOKIE_SAME_SITE=lax

# Cloudinary (for profile pictures)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email (for password reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password  # Gmail app password
EMAIL_FROM=noreply@attendx.com
```

### Frontend (.env)

```bash
# API Base URL
VITE_API_URL=http://localhost:5000/api/v1

# Production:
# VITE_API_URL=https://your-backend-domain.com/api/v1
```

---

## 🌍 Deployment

### Backend Deployment

#### Option 1: Vercel
1. Push code to GitHub
2. Import project in Vercel
3. Set environment variables
4. Deploy

**Note**: `server.js` is already configured for Vercel (conditional `listen()`)

#### Option 2: Render
1. Create new Web Service
2. Connect GitHub repo
3. Build command: `npm install`
4. Start command: `npm start`
5. Set environment variables
6. Deploy

#### Option 3: Railway
1. Create new project
2. Connect GitHub repo
3. Set environment variables
4. Deploy

### Frontend Deployment

#### Option 1: Vercel
1. Navigate to frontend folder
2. Run: `vercel`
3. Follow prompts
4. Set `VITE_API_URL` to production backend URL

#### Option 2: Netlify
1. Run: `npm run build`
2. Drag `dist` folder to Netlify
3. Or connect GitHub repo
4. Build command: `npm run build`
5. Publish directory: `dist`
6. Set `VITE_API_URL` environment variable

### Database

#### MongoDB Atlas (Recommended)
1. Create free cluster at mongodb.com
2. Create database user
3. Whitelist IP (0.0.0.0/0 for development)
4. Get connection string
5. Update `MONGODB_URI` in backend .env

### Post-Deployment Checklist
- [ ] Backend health check: `GET /api/v1/health`
- [ ] Frontend loads correctly
- [ ] Admin registration works
- [ ] Login works
- [ ] QR generation works
- [ ] Attendance marking works
- [ ] Analytics load correctly
- [ ] Email sending works (forgot password)
- [ ] Profile picture upload works (Cloudinary)

---

## 🔮 Future Improvements

### High Priority

1. **Improve GPS Accuracy Handling**
   - Add GPS accuracy value from browser
   - Dynamically adjust radius based on accuracy
   - Warn teacher if students have poor GPS
   - Option to temporarily disable geofencing

2. **Better Testing Mode**
   - Environment variable to bypass security checks
   - Mock GPS coordinates for development
   - Bypass camera requirement with token input

3. **Enhanced Analytics**
   - Charts and graphs (Chart.js or Recharts)
   - Export to Excel/PDF
   - Weekly/monthly trends
   - Heatmaps for attendance patterns
   - Predictive analytics for defaulters

4. **Notifications System**
   - Real-time notifications (Socket.io)
   - Teacher: "X pending approvals", "Session ending soon"
   - Student: "Attendance below 75%", "Session started"
   - Email notifications for critical events

5. **Test Coverage**
   - Unit tests for controllers
   - Integration tests for API endpoints
   - E2E tests for critical flows
   - Jest + Supertest for backend
   - React Testing Library for frontend

### Medium Priority

6. **PWA Support**
   - Installable web app
   - Offline support
   - Push notifications
   - Service worker caching

7. **Mobile App**
   - React Native or Flutter
   - Better camera/GPS access
   - Native device ID
   - Push notifications

8. **Face Recognition**
   - Optional additional layer
   - Integrate with device lock
   - TensorFlow.js or face-api.js
   - Privacy considerations

9. **Bulk Operations**
   - Bulk student enrollment (CSV upload)
   - Bulk class creation
   - Bulk attendance marking (for special cases)

10. **Advanced Security**
    - Rate limiting per user
    - IP-based rate limiting
    - Captcha for repeated failures
    - Audit logs for all security events
    - Suspicious activity alerts

11. **Attendance Policies**
    - Custom attendance policies per class
    - Grace periods for late marks
    - Attendance prerequisites
    - Automated warnings for low attendance

12. **UI/UX Improvements**
    - Dark mode
    - Accessibility (ARIA labels, keyboard navigation)
    - Mobile responsive improvements
    - Loading skeletons
    - Better empty states
    - Onboarding tour

### Low Priority / Future

13. **Multi-Language Support**
    - i18n implementation
    - RTL support

14. **Calendar Integration**
    - Sync with Google Calendar
    - Class schedule management
    - Automated session creation

15. **Integration APIs**
    - Webhook support
    - REST API for third-party integration
    - Student information system integration

16. **Advanced Reporting**
    - Custom report builder
    - Scheduled reports (email)
    - Department-level dashboards
    - Parent portals

17. **Gamification**
    - Badges for perfect attendance
    - Leaderboards
    - Attendance streaks

18. **Video Attendance**
    - Record short video during attendance
    - Face verification
    - Voice verification

---

## 📊 Current System Statistics

### Code Statistics (Approximate)
- **Backend Files**: ~40 files
- **Frontend Files**: ~50 files
- **Total Lines of Code**: ~15,000+
- **API Endpoints**: 35+
- **Database Collections**: 5
- **React Components**: 40+

### Features Status
- ✅ Authentication & Authorization
- ✅ Role-based access control
- ✅ Live attendance sessions
- ✅ QR code generation & scanning
- ✅ Geofencing
- ✅ Device lock
- ✅ IP matching
- ✅ Manual approval
- ✅ Analytics & reports
- ✅ User management
- ✅ Class management
- ✅ Profile management
- ✅ 2FA support
- ✅ Forgot password
- ✅ Landing page
- ⏳ Excel export (backend ready, frontend pending)
- ⏳ Email notifications (partially implemented)
- ❌ Face recognition (planned)
- ❌ Mobile app (planned)
- ❌ PWA (planned)

---

## 🎓 Educational Context

### Target Institution Size
- **Small**: 500-2000 students (fully supported)
- **Medium**: 2000-10000 students (supported with optimization)
- **Large**: 10000+ students (requires scaling considerations)

### Typical Use Cases
1. **Regular lectures**: 50-200 students, casual security
2. **Lab sessions**: 30-50 students, moderate security
3. **Exams**: 50-500 students, strict security with manual approval
4. **Seminars**: 20-100 students, relaxed security
5. **Online/hybrid**: geofencing disabled, focus on device lock

### Semester Structure
- Supported: 1-8 semesters
- Department-wise organization
- Multiple classes per teacher
- Multiple classes per student (enrollment-based)

---

## 🔧 Troubleshooting

### Common Issues

1. **"Too far from class location" error**
   - **Cause**: GPS inaccuracy, especially on laptops
   - **Solution**: 
     - Use mobile device
     - Increase radius to 100m+
     - Use "Testing" preset (500m)
     - Check if location services enabled

2. **"Device already bound to different device"**
   - **Cause**: Student changed device or cleared browser data
   - **Solution**: Admin resets device binding in ManageUsers

3. **"QR code expired"**
   - **Cause**: Token expiry before scan completed
   - **Solution**: Scan faster, or teacher increases QR refresh rate

4. **"Camera permission denied"**
   - **Cause**: Browser blocked camera access
   - **Solution**: 
     - Click camera icon in address bar
     - Allow camera permissions
     - Reload page

5. **"Location permission denied"**
   - **Cause**: Browser blocked location access
   - **Solution**: Enable location in browser settings

6. **Backend connection refused**
   - **Cause**: Backend not running or wrong URL
   - **Solution**: Check `VITE_API_URL` in frontend .env

7. **MongoDB connection error**
   - **Cause**: MongoDB not running or wrong URI
   - **Solution**: 
     - Start MongoDB locally
     - Check `MONGODB_URI` in backend .env
     - Whitelist IP in MongoDB Atlas

---

## 📞 Support & Contribution

### For Developers
- Follow existing code patterns
- Use ESLint and Prettier
- Write meaningful commit messages
- Test before committing
- Update documentation for new features

### For Issues
- Include error messages
- Describe steps to reproduce
- Mention environment (OS, browser, Node version)
- Attach screenshots if relevant

---

## 📄 License

This project is for educational purposes. 

---

## 🎉 Conclusion

AttendX is a comprehensive, production-ready attendance management system with advanced security features. It addresses real-world problems of attendance fraud while providing flexibility for different use cases.

**Key Strengths**:
- Multi-layer security (QR, geofencing, device lock, IP, manual approval)
- Role-based access with intuitive dashboards
- Real-time attendance tracking
- Comprehensive analytics
- GPS accuracy handling

**Best For**:
- Universities and colleges
- Training institutes
- Corporate training sessions
- Conference attendance
- Any scenario requiring verified presence

**Current Status**: ✅ Production-ready with ongoing improvements

---

**Last Updated**: February 2026
**Version**: 2.0
**Total Files**: 24 modified, 3 new
**Total Improvements**: 15+ major features and fixes
