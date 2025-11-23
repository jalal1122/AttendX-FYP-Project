# AttendX - QR Code Based Attendance System

## Project Overview

AttendX is a full-stack MERN (MongoDB, Express, React, Node.js) application that provides a modern, QR code-based attendance management system for educational institutions. The system supports three user roles: Admin, Teacher, and Student.

---

## Technology Stack

### Backend

- **Node.js** with **Express.js** - Server framework
- **MongoDB** with **Mongoose** - Database and ODM
- **JWT (JSON Web Tokens)** - Authentication (Access + Refresh tokens)
- **bcrypt** - Password hashing
- **cookie-parser** - HTTP-only cookie management
- **helmet** - Security headers
- **cors** - Cross-origin resource sharing
- **dotenv** - Environment variable management

### Frontend

- **React 18** with **Vite** - UI framework and build tool
- **Redux Toolkit** - State management
- **React Router v6** - Client-side routing
- **Tailwind CSS** - Styling
- **Recharts** - Data visualization (charts/graphs)
- **Axios** - HTTP client
- **QR Code libraries** - QR generation and scanning

---

## Project Structure

```
AttendX/
├── backend (root directory)
│   ├── src/
│   │   ├── controllers/      # Business logic
│   │   │   ├── auth.controller.js
│   │   │   ├── class.controller.js
│   │   │   ├── session.controller.js
│   │   │   ├── attendance.controller.js
│   │   │   ├── analytics.controller.js
│   │   │   └── user.controller.js
│   │   ├── models/           # MongoDB schemas
│   │   │   ├── user.model.js
│   │   │   ├── class.model.js
│   │   │   ├── session.model.js
│   │   │   └── attendance.model.js
│   │   ├── routes/           # API endpoints
│   │   │   ├── auth.routes.js
│   │   │   ├── class.routes.js
│   │   │   ├── session.routes.js
│   │   │   ├── attendance.routes.js
│   │   │   ├── analytics.routes.js
│   │   │   └── user.routes.js
│   │   ├── middlewares/      # Request interceptors
│   │   │   ├── auth.middleware.js
│   │   │   └── role.middleware.js
│   │   └── utils/            # Helper functions
│   │       └── asyncHandler.js
│   ├── utils/                # Shared utilities
│   │   ├── ApiError.js
│   │   └── ApiResponse.js
│   ├── config/               # Configuration files
│   │   └── db.js
│   ├── server.js             # Entry point
│   ├── .env                  # Environment variables
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/       # Reusable UI components
    │   │   ├── ui/
    │   │   │   ├── Button.jsx
    │   │   │   ├── Card.jsx
    │   │   │   └── Input.jsx
    │   │   ├── layout/
    │   │   │   └── Navbar.jsx
    │   │   └── PrivateRoute.jsx
    │   ├── features/         # Redux slices
    │   │   └── auth/
    │   │       └── authSlice.js
    │   ├── pages/            # Route components
    │   │   ├── auth/
    │   │   │   └── Login.jsx
    │   │   ├── admin/
    │   │   │   ├── AdminDashboard.jsx
    │   │   │   ├── ManageUsers.jsx
    │   │   │   ├── ManageClasses.jsx
    │   │   │   └── AdminReports.jsx
    │   │   ├── teacher/
    │   │   │   ├── TeacherDashboard.jsx
    │   │   │   ├── LiveSession.jsx
    │   │   │   ├── ClassDetails.jsx
    │   │   │   └── SessionHistory.jsx
    │   │   ├── student/
    │   │   │   ├── StudentDashboard.jsx
    │   │   │   └── ScanAttendance.jsx
    │   │   └── common/
    │   │       └── Reports.jsx
    │   ├── services/         # API integration
    │   │   ├── api.js
    │   │   ├── classAPI.js
    │   │   ├── sessionAPI.js
    │   │   ├── attendanceAPI.js
    │   │   ├── analyticsAPI.js
    │   │   └── userAPI.js
    │   ├── store/            # Redux store
    │   │   └── store.js
    │   ├── App.jsx           # Main app component
    │   ├── main.jsx          # Entry point
    │   └── index.css         # Global styles
    ├── public/
    ├── package.json
    └── vite.config.js
```

---

## Database Schema

### User Model

```javascript
{
  name: String (required),
  email: String (required, unique, lowercase),
  password: String (required, hashed with bcrypt),
  role: String (enum: ['student', 'teacher', 'admin']),
  info: {
    // For Students:
    rollNo: String,
    semester: Number (1-8),
    department: String,
    batch: String,
    year: String,

    // For Teachers:
    department: String,
    designation: String
  },
  refreshToken: String,
  timestamps: true
}
```

### Class Model

```javascript
{
  name: String (required),
  code: String (required, unique, 6-char hex),
  teacher: ObjectId (ref: 'User', required),
  students: [ObjectId] (ref: 'User'),
  department: String (required),
  semester: Number (required, 1-8),
  batch: String,
  academicYear: String,
  timestamps: true
}
```

### Session Model

```javascript
{
  classId: ObjectId (ref: 'Class', required),
  teacher: ObjectId (ref: 'User', required),
  startTime: Date (required),
  endTime: Date,
  qrCode: String (unique, encrypted token),
  qrExpiry: Date,
  status: String (enum: ['active', 'completed', 'expired']),
  location: {
    latitude: Number,
    longitude: Number
  },
  attendanceCount: {
    present: Number,
    absent: Number,
    late: Number
  },
  timestamps: true
}
```

### Attendance Model

```javascript
{
  session: ObjectId (ref: 'Session', required),
  student: ObjectId (ref: 'User', required),
  status: String (enum: ['present', 'absent', 'late'], default: 'absent'),
  markedAt: Date,
  method: String (enum: ['qr', 'manual'], default: 'qr'),
  timestamps: true,
  // Compound unique index: [session, student]
}
```

---

## Authentication & Authorization

### Authentication Flow

1. **Login**: User provides email/password
2. **Token Generation**: Server creates:
   - Access Token (JWT, 15min expiry) - stored in localStorage
   - Refresh Token (JWT, 7d expiry) - stored in HTTP-only cookie
3. **Authorization**: Access token sent in `Authorization: Bearer <token>` header
4. **Token Refresh**: When access token expires, refresh token used to get new access token
5. **Logout**: Clears refresh token cookie and removes access token from localStorage

### Middleware

- `verifyJWT`: Validates access token, attaches user to `req.user`
- `hasRole(...roles)`: Checks if authenticated user has required role

### Protected Routes

All API routes (except `/auth/register` and `/auth/login`) require authentication.
Role-specific routes enforce role checks via `hasRole` middleware.

---

## Core Features by Role

### Admin

1. **Dashboard**

   - View total classes, students, teachers
   - Recent classes overview
   - Quick actions to manage users/classes/reports

2. **User Management** (`/admin/users`)

   - View all users (students, teachers, admins)
   - Filter by role
   - Search by name/email
   - Change user roles
   - Delete users (cannot delete self)

3. **Class Management** (`/admin/classes`)

   - View ALL classes in system
   - Filter by department
   - Search by name/code
   - View class details (teacher, students, semester)

4. **System Reports** (`/admin/reports`)
   - User role distribution (pie chart)
   - Classes by department (bar chart)
   - Classes by semester (bar chart)
   - Department details table
   - Export report as JSON

### Teacher

1. **Dashboard** (`/teacher/dashboard`)

   - View classes created by teacher
   - Create new class (auto-generates unique 6-char code)
   - Quick access to start sessions

2. **Live Session** (`/teacher/session/:classId`)

   - Start attendance session for a class
   - Generate dynamic QR code (refreshes every 30 seconds)
   - Real-time attendance tracking
   - View present/absent/late counts
   - Manual attendance marking
   - End session

3. **Class Details** (`/teacher/class/:classId`)

   - View class information (code, students, semester)
   - View session history
   - Create retroactive sessions (for missed sessions)
   - Access reports and analytics

4. **Session History/Manual Editor** (`/teacher/session/:sessionId/edit`)

   - View all students in class
   - Toggle attendance status (Present/Absent/Late)
   - Save changes with instant API updates

5. **Reports** (`/reports/:classId`)
   - Attendance overview (pie chart: present/absent/late percentages)
   - Trend analysis (bar chart by date)
   - Defaulters list (students below 75% attendance threshold)
   - Filter by period (daily/weekly/monthly)

### Student

1. **Dashboard** (`/student/dashboard`)

   - View joined classes
   - Overall attendance percentage
   - Join class using 6-character code

2. **Scan Attendance** (`/student/scan`)
   - QR code scanner
   - Mark attendance by scanning teacher's QR
   - Real-time feedback (success/error)

---

## API Endpoints

### Auth Routes (`/api/v1/auth`)

- `POST /register` - Register new user
- `POST /login` - Login user (returns access token + refresh cookie)
- `POST /logout` - Logout user (clears refresh token)

### Class Routes (`/api/v1/class`)

- `GET /` - Get all classes (role-based filtering)
- `GET /:id` - Get class details
- `POST /create` - Create class (Teacher/Admin only)
- `POST /join` - Join class (Student only)

### Session Routes (`/api/v1/session`)

- `POST /start` - Start new session (Teacher/Admin)
- `POST /end/:id` - End session (Teacher/Admin)
- `GET /active/:classId` - Get active session for class
- `GET /:id` - Get session details
- `GET /class/:classId` - Get all sessions for class
- `POST /retroactive` - Create retroactive session (Teacher/Admin)
- `POST /refresh-qr/:id` - Refresh QR code (Teacher/Admin)

### Attendance Routes (`/api/v1/attendance`)

- `POST /mark` - Mark attendance via QR scan (Student)
- `POST /manual` - Manual attendance update (Teacher/Admin)
- `GET /session/:sessionId` - Get attendance for session
- `GET /student/:studentId` - Get student's attendance history
- `GET /student/:studentId/class/:classId` - Get student attendance for specific class

### Analytics Routes (`/api/v1/analytics`)

- `GET /class/:classId` - Get class analytics
- `GET /class/:classId/defaulters` - Get defaulters (threshold param)
- `GET /teacher/stats` - Get teacher statistics

### User Routes (`/api/v1/user`) - Admin only

- `GET /all` - Get all users (filter by role, search)
- `GET /stats` - Get user statistics
- `GET /:id` - Get user details
- `PATCH /:id/role` - Update user role
- `DELETE /:id` - Delete user

---

## Key Implementation Details

### QR Code System

1. **Generation**:

   - Teacher starts session → QR code generated with encrypted session token
   - QR refreshes every 30 seconds (client-side interval)
   - Backend generates new token on refresh, expires in 2 minutes

2. **Scanning**:
   - Student scans QR → extracts token → sends to backend
   - Backend validates token, checks expiry, marks attendance
   - Prevents duplicate marking (compound unique index)

### Attendance Status Logic

- **Present**: Marked within session time via QR scan
- **Late**: Marked after designated time (logic can be extended)
- **Absent**: Default status, or when session ends without marking

### Retroactive Sessions

- Teacher can create past sessions for classes
- Used for manual record-keeping or missed digital sessions
- Includes manual attendance marking interface

### Real-time Features

- QR code auto-refresh (30s interval)
- Attendance count updates in live session
- Session auto-transitions to 'completed' when ended

### Security Measures

1. **Password**: Bcrypt hashing (10 salt rounds)
2. **Tokens**: JWT with secure secrets
3. **Cookies**: HTTP-only, prevents XSS attacks
4. **CORS**: Configured for specific frontend origin
5. **Helmet**: Security headers middleware
6. **Role-based access**: Middleware enforces permissions
7. **Input validation**: Required fields, enum constraints

### State Management (Frontend)

- **Redux Toolkit**: Auth state (user, token, isAuthenticated)
- **localStorage**: Persist access token and user data
- **React Context**: Not used (Redux handles global state)

### Error Handling

- **Backend**: Custom `ApiError` class with status codes
- **Frontend**: Try-catch blocks with user-friendly messages
- **Async Handler**: Wraps controllers to catch errors globally

---

## Environment Variables

### Backend (.env)

```
PORT=5000
MONGODB_URI=mongodb+srv://...
CLIENT_URL=http://localhost:5173
NODE_ENV=development

JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
```

### Frontend (VITE\_\* variables in .env or direct config)

```
VITE_API_URL=http://localhost:5000/api/v1
```

---

## Current Limitations & Known Issues

1. **Location Verification**: Location tracking exists in schema but not enforced
2. **Geofencing**: No proximity check when scanning QR (can scan from anywhere)
3. **Session Auto-End**: Manual end required, no auto-expire after time
4. **Notification System**: No email/push notifications
5. **File Uploads**: No profile pictures or document uploads
6. **Advanced Analytics**: Limited to basic charts, no trend predictions
7. **Mobile App**: Web-only, no native mobile apps
8. **Real-time Updates**: No WebSocket/SSE for live attendance updates
9. **Bulk Operations**: No bulk import/export for users or classes
10. **Audit Logs**: No logging of admin actions or data changes

---

## Testing Accounts

```json
Admin:
{
  "email": "admin@attendx.com",
  "password": "password123",
  "role": "admin"
}

Teacher:
{
  "email": "teacher@attendx.com",
  "password": "password123",
  "role": "teacher"
}

Student:
{
  "email": "student@attendx.com",
  "password": "password123",
  "role": "student"
}
```

---

## Recent Updates & Bug Fixes

### Phase 6 (Latest)

1. ✅ Fixed admin dashboard not showing classes (getAllClasses now returns all classes for admin)
2. ✅ Fixed student/teacher stats using real user counts from database
3. ✅ Added user management system (CRUD operations for admin)
4. ✅ Created ManageUsers page with search, filter, role change, delete
5. ✅ Created ManageClasses page with department filtering
6. ✅ Created AdminReports page with system-wide analytics
7. ✅ Fixed attendance display bug (backend returns 'student' field, not 'studentId')
8. ✅ Fixed [object Object] navigation errors (extracting .\_id from populated fields)
9. ✅ Fixed analytics API route mismatches
10. ✅ Implemented logout functionality (Redux thunk, Navbar, HTTP-only cookie clearing)
11. ✅ Created Navbar component with conditional rendering
12. ✅ Fixed SessionHistory syntax errors from debug log cleanup

---

## Dependencies

### Backend package.json

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^8.0.0",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "dotenv": "^16.3.1"
  }
}
```

### Frontend package.json

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "axios": "^1.6.2",
    "@reduxjs/toolkit": "^2.0.1",
    "react-redux": "^9.0.4",
    "recharts": "^2.10.3"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.8",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.32",
    "autoprefixer": "^10.4.16"
  }
}
```

---

## Running the Project

### Backend

```bash
cd AttendX
npm install
npm start  # Runs on port 5000
```

### Frontend

```bash
cd AttendX/frontend
npm install
npm run dev  # Runs on port 5173
```

### Database

- MongoDB Atlas connection required
- Database name: AttendX2
- Collections: users, classes, sessions, attendances

---

## Future Enhancement Opportunities

1. **Real-time Features**: WebSocket for live attendance updates
2. **Geofencing**: Enforce location-based attendance marking
3. **Mobile Apps**: React Native version for iOS/Android
4. **Advanced Analytics**: ML-based attendance predictions
5. **Notifications**: Email/SMS alerts for low attendance
6. **Bulk Operations**: CSV import/export for users
7. **Calendar Integration**: Sync with Google Calendar
8. **Multi-language**: i18n support
9. **Dark Mode**: Theme switching
10. **Biometric Auth**: Fingerprint/face recognition
11. **Parent Portal**: Parent access to student attendance
12. **Attendance Appeals**: Student can contest marked absences
13. **Session Recording**: Audio/video for virtual sessions
14. **Exam Mode**: Special attendance for exams
15. **Leave Management**: Student leave requests with approval workflow

---

## Code Quality Notes

### Strengths

- Clear separation of concerns (MVC pattern)
- Reusable components and services
- Consistent error handling
- Protected routes and role-based access
- Responsive UI design
- Secure authentication flow

### Areas for Improvement

- Add unit/integration tests
- Implement API rate limiting
- Add request validation middleware (express-validator)
- Add logging system (winston/morgan)
- Implement caching (Redis)
- Add API documentation (Swagger)
- Optimize MongoDB queries (indexing)
- Add TypeScript for type safety
- Implement proper error boundaries in React
- Add loading states and skeleton screens
- Implement retry logic for failed API calls

---

## Git Repository Structure

```
.gitignore includes:
- node_modules/
- .env
- dist/
- build/
```

---

## Contact & Maintenance

- Last Updated: November 23, 2025
- Current Version: 1.0.0
- Status: Development/Testing Phase
