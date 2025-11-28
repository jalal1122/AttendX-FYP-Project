# AttendX - Complete Project Context for AI Assistants

**Version:** 1.0.0  
**Date:** November 28, 2025  
**Status:** Production Ready ✅

---

## 📋 Executive Summary

**AttendX** is an enterprise-grade attendance management system built with the MERN stack. It features advanced security measures including device fingerprinting, geofence validation, manual approval workflows, and per-session security configurations. The system supports three user roles (Admin, Teacher, Student) with comprehensive dashboards, analytics, and real-time QR code-based attendance marking.

---

## 🏗️ System Architecture

### Technology Stack

**Backend:**
- **Runtime:** Node.js 20+ (LTS)
- **Framework:** Express.js 4.18+
- **Database:** MongoDB Atlas (Mongoose 8+)
- **Authentication:** JWT (jsonwebtoken 9.0+)
- **File Upload:** Multer + Cloudinary
- **Email:** Nodemailer
- **QR Generation:** qrcode 1.5+
- **2FA:** otplib 12.0+
- **Exports:** xlsx 0.18+

**Frontend:**
- **Framework:** React 18.3+ (Vite 5)
- **State Management:** Redux Toolkit 2.10+
- **Routing:** React Router DOM 7.9+
- **Styling:** Tailwind CSS 3.4+
- **QR Scanning:** html5-qrcode 2.3+
- **QR Display:** react-qr-code 2.0+
- **Charts:** Recharts 3.4+
- **Icons:** Lucide React, React Icons

---

## 📂 Project Structure

```
AttendX/
├── backend/ (root directory)
│   ├── server.js                    # Entry point
│   ├── .env                         # Environment variables
│   ├── package.json                 # Dependencies
│   │
│   ├── config/
│   │   ├── db.js                    # MongoDB connection
│   │   └── cloudinary.js            # Image upload config
│   │
│   ├── utils/
│   │   ├── ApiError.js              # Error handler class
│   │   └── ApiResponse.js           # Response formatter
│   │
│   ├── src/
│   │   ├── models/
│   │   │   ├── user.model.js        # User schema (Admin/Teacher/Student)
│   │   │   ├── class.model.js       # Class schema
│   │   │   ├── session.model.js     # Session schema with securityConfig
│   │   │   ├── attendance.model.js  # Attendance schema with deviceId
│   │   │   └── otp.model.js         # OTP for password reset
│   │   │
│   │   ├── controllers/
│   │   │   ├── auth.controller.js   # Authentication (login, register, 2FA, createAdmin)
│   │   │   ├── user.controller.js   # User CRUD operations
│   │   │   ├── class.controller.js  # Class management
│   │   │   ├── session.controller.js # Live/retroactive sessions
│   │   │   ├── attendance.controller.js # Attendance marking & approval
│   │   │   └── analytics.controller.js  # Reports & analytics
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.routes.js       # /api/v1/auth/*
│   │   │   ├── user.routes.js       # /api/v1/user/*
│   │   │   ├── class.routes.js      # /api/v1/class/*
│   │   │   ├── session.routes.js    # /api/v1/session/*
│   │   │   ├── attendance.routes.js # /api/v1/attendance/*
│   │   │   └── analytics.routes.js  # /api/v1/analytics/*
│   │   │
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.js   # JWT verification (verifyJWT)
│   │   │   ├── role.middleware.js   # Role-based access (hasRole)
│   │   │   └── upload.middleware.js # Multer config for avatars
│   │   │
│   │   └── utils/
│   │       ├── asyncHandler.js      # Async error wrapper
│   │       ├── geolocation.js       # Haversine formula (distance calc)
│   │       └── sendEmail.js         # Email service
│   │
│   └── uploads/                     # Temporary file storage
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx                 # Entry point
│   │   ├── App.jsx                  # Route definitions
│   │   ├── store.js                 # Redux store
│   │   │
│   │   ├── features/
│   │   │   └── auth/
│   │   │       └── authSlice.js     # Authentication state
│   │   │
│   │   ├── services/
│   │   │   ├── api.js               # Axios instance with interceptors
│   │   │   ├── authAPI.js           # Auth endpoints
│   │   │   ├── userAPI.js           # User endpoints
│   │   │   ├── classAPI.js          # Class endpoints
│   │   │   ├── sessionAPI.js        # Session endpoints
│   │   │   ├── attendanceAPI.js     # Attendance endpoints
│   │   │   └── analyticsAPI.js      # Analytics endpoints
│   │   │
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   ├── Login.jsx        # Login page
│   │   │   │   ├── ForgotPassword.jsx # Password reset
│   │   │   │   └── RegisterAdmin.jsx  # Secret admin portal
│   │   │   │
│   │   │   ├── admin/
│   │   │   │   ├── AdminDashboard.jsx # Admin home
│   │   │   │   ├── ManageUsers.jsx    # User CRUD
│   │   │   │   ├── ManageClasses.jsx  # Class overview
│   │   │   │   └── AdminReports.jsx   # System-wide reports
│   │   │   │
│   │   │   ├── teacher/
│   │   │   │   ├── TeacherDashboard.jsx # Teacher home
│   │   │   │   ├── LiveSession.jsx      # QR display & pending approvals
│   │   │   │   ├── ClassDetails.jsx     # Student list & settings
│   │   │   │   └── SessionHistory.jsx   # Past sessions
│   │   │   │
│   │   │   ├── student/
│   │   │   │   ├── StudentDashboard.jsx # Student home
│   │   │   │   ├── ScanAttendance.jsx   # Camera scanner
│   │   │   │   └── MyAttendance.jsx     # Personal records
│   │   │   │
│   │   │   └── common/
│   │   │       ├── Profile.jsx          # User profile & 2FA
│   │   │       └── Reports.jsx          # Analytics page
│   │   │
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   └── Navbar.jsx           # Top navigation
│   │   │   │
│   │   │   ├── ui/
│   │   │   │   ├── Button.jsx           # Reusable button
│   │   │   │   ├── Input.jsx            # Form input
│   │   │   │   ├── Card.jsx             # Container
│   │   │   │   └── Modal.jsx            # Dialog
│   │   │   │
│   │   │   ├── modals/
│   │   │   │   ├── StartSessionModal.jsx # Security config form
│   │   │   │   └── CreateUserModal.jsx   # User creation form
│   │   │   │
│   │   │   ├── settings/
│   │   │   │   └── TwoFactorSettings.jsx # 2FA management
│   │   │   │
│   │   │   └── PrivateRoute.jsx         # Route protection
│   │   │
│   │   └── assets/                      # Images, fonts
│   │
│   ├── public/                          # Static files
│   ├── .env                             # Environment variables
│   ├── package.json                     # Dependencies
│   ├── vite.config.js                   # Vite configuration
│   ├── tailwind.config.js               # Tailwind configuration
│   └── postcss.config.js                # PostCSS configuration
│
└── Documentation/
    └── QUICK_START_GUIDE.md             # 5-minute setup
```

---

## 🗄️ Database Schema

### 1. User Model
```javascript
{
  name: String,
  email: String (unique, indexed),
  password: String (bcrypt hashed),
  role: Enum ['admin', 'teacher', 'student'],
  info: {
    // Student-specific
    rollNo: String,
    semester: Number,
    department: String,
    batch: String,
    year: String,
    
    // Teacher-specific
    department: String,
    designation: String
  },
  avatar: String (Cloudinary URL),
  refreshToken: String,
  twoFactorSecret: String,
  twoFactorEnabled: Boolean (default: false),
  timestamps: true
}
```

### 2. Class Model
```javascript
{
  name: String (e.g., "Data Structures"),
  code: String (unique, e.g., "CS301"),
  teacher: ObjectId (ref: User),
  students: [ObjectId] (ref: User),
  department: String,
  semester: Number (1-8),
  batch: String,
  academicYear: String,
  timestamps: true
}
```

### 3. Session Model
```javascript
{
  classId: ObjectId (ref: Class),
  teacherId: ObjectId (ref: User),
  sessionType: Enum ['live', 'retroactive'],
  status: Enum ['active', 'completed'],
  date: Date,
  startTime: Date,
  endTime: Date,
  qrToken: String (rotating JWT token),
  location: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  securityConfig: {
    radius: Number (10-500m, default: 50),
    ipMatchEnabled: Boolean (default: true),
    deviceLockEnabled: Boolean (default: false),
    qrRefreshRate: Number (5-60s, default: 20),
    manualApproval: Boolean (default: false)
  },
  ipAddress: String,
  timestamps: true
}
```

### 4. Attendance Model
```javascript
{
  sessionId: ObjectId (ref: Session),
  studentId: ObjectId (ref: User),
  status: Enum ['Present', 'Absent', 'Late', 'Leave', 'Pending'],
  markedAt: Date,
  location: {
    latitude: Number,
    longitude: Number
  },
  deviceId: String (browser UUID, indexed),
  ipAddress: String,
  modifiedBy: ObjectId (ref: User, for manual changes),
  modifiedAt: Date,
  timestamps: true
}
```

### 5. OTP Model
```javascript
{
  email: String (indexed),
  otp: String,
  expiresAt: Date,
  timestamps: true
}
```

---

## 🔐 Authentication & Security

### JWT Authentication
- **Access Token:** 15 minutes expiry, sent in response body
- **Refresh Token:** 7 days expiry, stored in HTTP-only cookie
- **QR Token:** Rotating token embedded in QR code (configurable refresh rate)

### Security Features

#### 1. Device Lock (Anti-Buddy-Punching)
```javascript
// Frontend: Generate UUID on mount
useEffect(() => {
  let uuid = localStorage.getItem('device_uuid');
  if (!uuid) {
    uuid = crypto.randomUUID();
    localStorage.setItem('device_uuid', uuid);
  }
  setDeviceId(uuid);
}, []);

// Backend: Validate device usage
if (securityConfig.deviceLockEnabled && deviceId) {
  const deviceUsage = await Attendance.findOne({ sessionId, deviceId });
  if (deviceUsage && deviceUsage.studentId !== studentId) {
    throw new Error("Security Alert: Device already used");
  }
}
```

#### 2. Geofence Validation
```javascript
// Haversine formula
const distance = calculateDistance(
  session.location.latitude,
  session.location.longitude,
  studentLatitude,
  studentLongitude
);

if (distance > securityConfig.radius) {
  throw new Error("Not within required location range");
}
```

#### 3. IP Matching
```javascript
if (securityConfig.ipMatchEnabled) {
  if (studentIP !== session.ipAddress) {
    throw new Error("IP address mismatch");
  }
}
```

#### 4. Manual Approval
```javascript
const status = securityConfig.manualApproval ? "Pending" : "Present";

// Teacher approves later
await Attendance.updateMany(
  { sessionId, studentId: { $in: studentIds }, status: "Pending" },
  { $set: { status: "Present" } }
);
```

#### 5. Two-Factor Authentication (2FA)
- QR code generation with `otplib`
- Time-based OTP validation
- Optional for all users

---

## 🚀 Core Features

### Admin Portal
1. **Dashboard:** System statistics (users, classes, sessions)
2. **Manage Users:** Create, edit, delete users (all roles)
3. **Manage Classes:** View all classes across departments
4. **Reports:** System-wide analytics and defaulter lists
5. **Secret Admin Bootstrap:** Create first admin via `/create-admin`

### Teacher Portal
1. **Dashboard:** List of assigned classes
2. **Start Session:** Modal with security presets
   - 🎓 Casual Lecture: 100m, 30s QR, no strict checks
   - 📝 Strict Exam: 20m, 10s QR, all checks enabled
3. **Live Session:** 
   - Dynamic QR code display
   - Real-time student count
   - Pending approvals queue (orange card)
   - Approve individually or approve all
4. **Class Details:**
   - Student list with attendance percentages
   - Settings tab (edit class, remove students, delete class)
5. **Session History:** Past sessions with attendance records
6. **Manual Attendance:** Create retroactive sessions

### Student Portal
1. **Dashboard:** Enrolled classes with attendance percentages
2. **Join Class:** Enter class code to enroll
3. **Scan Attendance:** 
   - Camera-based QR scanner
   - Device fingerprinting
   - Location access
   - Status feedback (✅ Success | ⏳ Pending | 🔒 Device Lock)
4. **My Attendance:** Personal attendance records per class

---

## 📡 API Endpoints

### Authentication (`/api/v1/auth`)
```javascript
POST   /register              // Register new user (admin creates via UI)
POST   /login                 // Login with email/password
POST   /logout                // Logout (clear refresh token)
GET    /me                    // Get current user
POST   /refresh               // Refresh access token
POST   /forgot-password       // Send OTP email
POST   /reset-password        // Reset password with OTP

// 2FA
POST   /2fa/enable            // Generate QR code
POST   /2fa/verify            // Activate 2FA
POST   /2fa/validate          // Validate OTP during login
POST   /2fa/disable           // Disable 2FA

// Bootstrap
POST   /create-admin          // Create first admin (requires ADMIN_SECRET)
```

### User Management (`/api/v1/user`)
```javascript
GET    /                      // Get all users (admin/teacher)
GET    /stats                 // User statistics
GET    /:id                   // Get user details
POST   /create                // Create user (admin only)
PUT    /:id                   // Update user (admin only)
DELETE /:id                   // Delete user (admin only)
```

### Class Management (`/api/v1/class`)
```javascript
POST   /create                // Create class (admin/teacher)
POST   /join                  // Student joins class
POST   /unjoin                // Student leaves class
POST   /remove-student        // Teacher removes student
GET    /                      // Get user's classes
GET    /:id                   // Get class details
PUT    /:id                   // Update class (teacher/admin)
DELETE /:id                   // Delete class (cascade delete sessions)
```

### Session Management (`/api/v1/session`)
```javascript
POST   /start                 // Start live session (with securityConfig)
POST   /end                   // End live session
POST   /retroactive           // Create past session
GET    /qr-token              // Get new QR token (rotating)
GET    /active/:classId       // Get active session for class
GET    /class/:classId        // Get all sessions for class
GET    /:id                   // Get session details
```

### Attendance (`/api/v1/attendance`)
```javascript
POST   /mark                  // Mark attendance (student scans)
POST   /approve               // Approve pending attendance (teacher)
POST   /manual-update         // Update attendance manually (teacher)
GET    /session/:sessionId    // Get attendance for session
GET    /student/:studentId    // Get student's attendance
GET    /class/:classId/detailed // Get detailed class attendance
```

### Analytics (`/api/v1/analytics`)
```javascript
GET    /student/:studentId    // Student performance report
GET    /class/:classId        // Class analytics
GET    /defaulters/:classId   // List of defaulters (<75%)
GET    /teacher               // Teacher statistics
GET    /comprehensive/:classId // Full report (Excel export)
```

---

## 🎨 User Interface Components

### Reusable Components
- **Button:** Primary, secondary, danger variants with loading states
- **Input:** Text, email, password, number with labels and validation
- **Card:** Container with shadow and padding
- **Modal:** Centered dialog with backdrop
- **Navbar:** Role-specific navigation with profile dropdown

### Key Pages

#### StartSessionModal
```javascript
// Security configuration form
- Geofence Radius Slider (10-500m)
- QR Refresh Rate Slider (5-60s)
- IP Matching Toggle
- Device Lock Toggle
- Manual Approval Toggle
- Preset Buttons (Casual/Strict)
```

#### LiveSession
```javascript
// Real-time session management
- QR Code Display (react-qr-code)
- Dynamic refresh interval
- Student count
- Pending Approvals Card (when manualApproval ON)
- End Session button
```

#### ScanAttendance
```javascript
// Camera-based scanning
- HTML5 QR scanner
- Device fingerprinting
- Location access
- Status feedback (colors + icons)
- Dev mode (manual token input)
```

---

## 🔧 Environment Variables

### Backend (`.env`)
```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb+srv://...

# Frontend URL
CLIENT_URL=http://localhost:5173

# JWT Secrets
JWT_ACCESS_SECRET=<strong_secret>
JWT_REFRESH_SECRET=<strong_secret>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# QR Token Secret
QR_SECRET=<strong_secret>

# Admin Bootstrap Secret
ADMIN_SECRET=attendx_super_admin_2025

# Cookies
COOKIE_SECURE=false  # true for HTTPS
COOKIE_SAME_SITE=lax

# Cloudinary (Image Upload)
CLOUDINARY_CLOUD_NAME=<your_name>
CLOUDINARY_API_KEY=<your_key>
CLOUDINARY_API_SECRET=<your_secret>

# Email (NodeMailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=<your_email>
EMAIL_PASS=<app_password>
```

### Frontend (`frontend/.env`)
```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

---

## 🎯 Key Business Logic

### Session Security Flow
```javascript
// 1. Teacher starts session with config
POST /api/v1/session/start
{
  classId: "...",
  securityConfig: {
    radius: 50,
    ipMatchEnabled: true,
    deviceLockEnabled: true,
    qrRefreshRate: 20,
    manualApproval: false
  }
}

// 2. Backend creates session + generates QR token
const qrToken = jwt.sign(
  { sessionId, type: 'attendance' },
  QR_SECRET,
  { expiresIn: '5m' }
);

// 3. Frontend displays QR, refreshes at qrRefreshRate interval
setInterval(() => fetchNewQRToken(), qrRefreshRate * 1000);

// 4. Student scans QR with deviceId
POST /api/v1/attendance/mark
{
  token: "...",
  latitude: 12.34,
  longitude: 56.78,
  deviceId: "uuid-from-localStorage"
}

// 5. Backend validates: Token → Geo → IP → Device Lock → Status
```

### Device Lock Logic
```javascript
// Prevent same device from marking multiple students
const deviceUsage = await Attendance.findOne({
  sessionId,
  deviceId
});

if (deviceUsage) {
  if (deviceUsage.studentId.toString() !== studentId) {
    throw ApiError.forbidden(
      "Security Alert: This device has already marked attendance for this session."
    );
  }
}
```

### Manual Approval Workflow
```javascript
// 1. Student marks attendance
const status = session.securityConfig.manualApproval 
  ? "Pending" 
  : "Present";

await Attendance.create({ sessionId, studentId, status, ... });

// 2. Teacher sees pending list
const pending = await Attendance.find({
  sessionId,
  status: "Pending"
});

// 3. Teacher approves
POST /api/v1/attendance/approve
{
  sessionId: "...",
  studentIds: ["id1", "id2"]
}

await Attendance.updateMany(
  { sessionId, studentId: { $in: studentIds }, status: "Pending" },
  { $set: { status: "Present" } }
);
```

### Cascade Delete
```javascript
// When class is deleted, delete all related data
await Session.deleteMany({ classId });
await Attendance.deleteMany({ 
  sessionId: { $in: sessionIds } 
});
await Class.findByIdAndDelete(classId);
```

---

## 📊 Analytics & Reports

### Student Report
- Overall attendance percentage
- Subject-wise breakdown
- Trend chart (Recharts line graph)
- Weekly patterns
- Warning if below 75%

### Class Analytics
- Average attendance
- Session-wise breakdown
- Attendance heatmap (by date)
- Top performers
- Defaulters list (<75%)

### Teacher Dashboard Stats
- Total classes taught
- Total sessions conducted
- Average class strength
- Overall attendance rate

### Comprehensive Report
- Exportable to Excel (XLSX)
- Student list with percentages
- Session-wise attendance matrix
- Department-wise aggregation

---

## 🧪 Testing Scenarios

### Device Lock Test
```
1. Teacher: Start session with deviceLockEnabled: true
2. Student A: Scan QR on Chrome Mobile → Success ✅
3. Student A: Logout (same browser)
4. Student B: Login on same Chrome → Scan QR
5. Expected: REJECT 🔒 "Device already used"
```

### Manual Approval Test
```
1. Teacher: Start session with manualApproval: true
2. Student: Scan QR → Yellow toast "Waiting for approval"
3. Teacher: See orange Pending Approvals card
4. Teacher: Click "Approve All"
5. Expected: Status updated to "Present" ✅
```

### Preset Buttons Test
```
1. Casual Lecture: 100m, 30s, all checks OFF
2. Strict Exam: 20m, 10s, all checks ON
3. Verify QR refreshes at configured interval
```

---

## 🚢 Deployment Guide

### Backend Deployment (Render/Railway)
1. Set all environment variables
2. Change secrets from defaults
3. Set `COOKIE_SECURE=true` for HTTPS
4. Update `CLIENT_URL` to production domain
5. Deploy from GitHub repository

### Frontend Deployment (Vercel/Netlify)
1. Set `VITE_API_BASE_URL` to backend URL
2. Build: `npm run build`
3. Deploy `dist/` folder
4. Configure custom domain (optional)

### Database (MongoDB Atlas)
1. Create production cluster
2. Whitelist deployment IPs
3. Update `MONGODB_URI` in backend .env
4. Enable backups

---

## 🐛 Known Issues & Solutions

### Camera Access Denied
**Solution:** User must manually enable in browser settings

### Location Timeout
**Solution:** Increase timeout, fallback to manual lat/lon input

### QR Scanner Black Screen
**Solution:** Close other apps using camera, refresh page

### Device UUID Not Persisting
**Solution:** Check if localStorage is enabled/cleared

---

## 🔮 Future Enhancements

1. **Face Recognition:** Integrate with device camera for identity verification
2. **Notification System:** Real-time alerts for teachers/students
3. **Audit Logs:** Track all security events (rejections, violations)
4. **Multi-Factor Attendance:** Combine QR + Face + Location + Device
5. **Mobile Apps:** Native iOS/Android with better performance
6. **Bluetooth Beacons:** More accurate indoor positioning
7. **Machine Learning:** Predict defaulters, suggest interventions

---

## 📞 Support & Maintenance

### Error Handling
- All API errors use `ApiError` class
- Frontend displays user-friendly messages
- Backend logs errors to console

### Code Organization
- Async handlers wrap all controllers
- Middleware chain: `verifyJWT → hasRole → controller`
- Consistent naming: `camelCase` for functions, `PascalCase` for components

### Best Practices
- No sensitive data in frontend
- All secrets in `.env`
- Password hashing with bcrypt (10 rounds)
- JWT tokens in HTTP-only cookies
- Input validation on both ends

---

## 📚 Documentation Files

1. **MASTER_PLAN.md** - Original architecture blueprint
2. **PHASE_11_TESTING_GUIDE.md** - Security features testing procedures
3. **PHASE_11_IMPLEMENTATION_SUMMARY.md** - Technical implementation details
4. **PHASE_12_SECRET_ADMIN_SETUP.md** - Bootstrap admin creation guide
5. **PROJECT_COMPLETE_OVERVIEW.md** - Feature summary and highlights
6. **QUICK_START_GUIDE.md** - 5-minute setup instructions
7. **COMPLETE_PROJECT_CONTEXT.md** - This document (AI assistant reference)

---

## 🏆 Award-Winning Features

### 1. Device Lock Anti-Buddy-Punching
- Browser-persistent UUID prevents phone sharing
- One device = one student per session
- Critical for exam integrity

### 2. Per-Session Security Flexibility
- Not global - each session has own rules
- Enables same system for lectures AND exams
- Teacher controls security level

### 3. Manual Approval Workflow
- Human verification layer
- Teacher can verify identities in person
- Combines automation + oversight

### 4. Preset-Based UX
- One-click configuration
- Makes complex security accessible
- Teacher-friendly interface

### 5. Secret Admin Bootstrap
- Solves circular dependency elegantly
- Web-based (no CLI needed)
- Production-safe with environment secrets

---

## 💡 Important Notes for AI Assistants

### When Helping with Code
1. **Always check current file contents** before making changes
2. **Use exact string matching** in replace operations (include context lines)
3. **Follow existing patterns** (don't introduce new libraries without asking)
4. **Respect the architecture** (MERN stack, Redux, JWT auth)
5. **Test error-free** - run linter before confirming changes

### When Adding Features
1. **Backend first:** Model → Controller → Route → Test
2. **Frontend second:** API service → Component → Route
3. **Update docs:** Modify MASTER_PLAN.md if architecture changes
4. **Security:** Always validate input, sanitize output

### When Debugging
1. **Check logs:** Backend console for API errors
2. **Check network tab:** Frontend for failed requests
3. **Check Redux DevTools:** State management issues
4. **Check MongoDB:** Data integrity

### Current Implementation Status
- ✅ Phase 1-9: Core features (completed in earlier development)
- ✅ Phase 10: Management & Moderation (Scenario A - audit-safe)
- ✅ Phase 11: Advanced Session Security (device lock, manual approval)
- ✅ Phase 12: Secret Admin Portal (bootstrap solution)
- ✅ All features production-ready
- ✅ Zero compile errors
- ✅ Full documentation

---

## 🎓 Academic Context

**Project Type:** Final Year Project (FYP)  
**Category:** Web Application  
**Domain:** Educational Technology  
**Innovation Level:** High  
**Award Potential:** Excellent

**Key Differentiators:**
- Not just attendance tracking - comprehensive security suite
- Real-world problem solving (buddy punching, proxy attendance)
- Enterprise-grade architecture
- Production-ready code quality
- Comprehensive documentation

---

## 📝 Quick Reference

### Start Development
```bash
# Backend
cd backend
npm install
npm start  # Port 5000

# Frontend
cd frontend
npm install
npm run dev  # Port 5173
```

### Create First Admin
```
1. Navigate to http://localhost:5173/create-admin
2. Enter: Name, Email, Password
3. Secret Key: attendx_super_admin_2025
4. Submit → Login
```

### Test Device Lock
```
1. Teacher: Start session (Device Lock ON)
2. Student A: Scan → Success
3. Student A: Logout
4. Student B: Login (same browser)
5. Student B: Scan → REJECT 🔒
```

---

**END OF DOCUMENT**

This context document contains everything an AI assistant needs to understand, modify, or extend the AttendX project. All code patterns, architectural decisions, and business logic are documented for seamless collaboration.

**Last Updated:** November 28, 2025  
**Version:** 1.0.0  
**Status:** Production Ready ✅