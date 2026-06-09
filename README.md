# 🚀 CSIT Attendance System: Advanced Attendance Management System

**CSIT Attendance System** is a production-ready, enterprise-grade attendance management system designed to eliminate attendance fraud (such as proxy attendance or "buddy punching"), automate record keeping, and deliver real-time data insights. Developed using the MERN (MongoDB, Express, React, Node) stack, CSIT Attendance System combines geolocation verification, device fingerprinting, and dynamic rotating QR codes to guarantee physical presence and attendance integrity.

---

## 📖 Table of Contents
1. [Overview](#-overview)
2. [Architecture & Tech Stack](#-architecture--tech-stack)
3. [Core Features](#-core-features)
4. [Project Structure](#-project-structure)
5. [Prerequisites & Environment Variables](#-prerequisites--environment-variables)
6. [Local Development & Installation](#-local-development--installation)
7. [API Reference](#-api-reference)

---

## 🎯 Overview

Traditional classroom and seminar attendance procedures are prone to manual errors, proxies, and significant time wastage. CSIT Attendance System introduces a **Triple-Layer Security Protocol** to solve these issues:
1. **Device Fingerprinting:** Locks each student account to a single registered browser/device.
2. **Geofencing:** Uses the **Haversine Formula** to compute the physical distance between the student and the teacher's coordinates, enforcing attendance within a strict radius.
3. **Rotating QR Engine:** The classroom QR code is generated using encrypted JSON Web Tokens (JWT) that rotate automatically at a configurable rate (default: 20 seconds) to prevent photo sharing and static copying.

This platform provides dedicated portals for system administrators, teachers, and students, complete with real-time updates powered by WebSockets (Socket.io) and beautiful analytical reports exported directly to styled Excel worksheets.

---

## 🛠 Architecture & Tech Stack

CSIT Attendance System is built using a decoupled architecture, with an Express API backend and a single-page React client frontend.

### 💻 Frontend
* **Core Library:** React 19 / React 18
* **Build Tool & Bundler:** Vite
* **State Management:** Redux Toolkit & React Redux
* **Client Routing:** React Router DOM (v6 / v7)
* **Styling:** Tailwind CSS with a modern Sky Blue theme (#0EA5E9)
* **Icons:** Lucide React & React Icons
* **Real-time Sync:** Socket.io Client
* **Utility Libraries:** Axios (HTTP client with interceptors), Moment.js (date parsing)
* **QR Handlers:** `react-qr-code` (generator), `html5-qrcode` (camera scanner)

### ⚙️ Backend
* **Runtime Environment:** Node.js (v18+)
* **Framework:** Express.js (ES Modules syntax)
* **Database ODM:** Mongoose (MongoDB)
* **Real-time Engine:** Socket.io (WebSocket connections)
* **Security & Auth:**
  * JSON Web Tokens (JWT) for stateless access token authentication
  * HTTP-only Cookies for secure refresh tokens
  * `bcryptjs` for secure password hashing
  * `otplib` / `speakeasy` for optional Two-Factor Authentication (2FA)
  * Helmet (headers security), Compression (Gzip level 6 compression), CORS configuration
* **File Processing & Hosting:** Multer + Cloudinary (for avatar uploads)
* **Email System:** Nodemailer (sending responsive HTML templates)
* **Export Engine:** ExcelJS & XLSX (generating formatted spreadsheets with conditional formatting)

### 🗄️ Database
* **Primary Database:** MongoDB
* **Mongoose Models:** User, Class, Session, Attendance, OTP

---

## ✨ Core Features

### 🔒 Triple-Layer Attendance Verification
* **Rotating QR Engine:** Real-time generation of JWT tokens on the teacher's screen containing session parameters. Tokens expire in sync with the visual timer to prevent screenshot sharing.
* **Geofence Check:** Validates student GPS coordinates against class coordinates. The system supports custom ranges from 10 meters up to 500 meters.
* **Device Binding:** Persists a browser UUID (`deviceId`) to the student's profile upon first login. Subsequent logins or submissions from a different device violate the lock policy and trigger security warnings.
* **IP Matching Check:** Offers optional verification checking if the student's client IP matches the teacher's IP address.

### 🎓 Teacher Tools
* **Live Session Controller:** Initiate sessions (Lecture, Lab, or Exam) with custom security configurations (radius, IP matching, manual approval queue).
* **Live Feed Monitor:** View a real-time table of students marking attendance via Socket.io broadcasts.
* **Manual Override & Approvals:** Review students in the pending approval queue or manually change a student's status (Present, Absent, Late, Leave).
* **Retroactive Registration:** Retroactively document past sessions for digitized bookkeeping.
* **Email Defaulter Alerts:** Analyze attendance rates and dispatch email warnings to students falling below the 75% threshold.

### 🎒 Student Portal
* **One-Click Scanner:** Camera-enabled QR scanner capturing device ID and GPS coordinates automatically.
* **Attendance Transcripts:** Review chronological records across all enrolled subjects with color-coded badges indicating compliance.
* **Compliance Dashboards:** Self-analytics showing overall percentage, trends, and warning highlights.

### 👑 Admin Operations
* **Central User Manager:** Create, update, or remove profiles. Features bulk import of student accounts via Excel spreadsheet upload.
* **System Health Widget:** Live dashboard reflecting server uptime, DB status, system load, network stability, and email dispatch telemetry.
* **Device Reset Control:** Clear device-bindings for students replacing or updating their hardware.
* **Bootstrap Endpoint:** A dedicated `/api/v1/auth/create-admin` route to initialize the system's first administrator using a configured server secret.

---

## 📁 Project Structure

```text
CSIT Attendance System/
├── config/                         # Server integrations
│   ├── db.js                       # MongoDB Mongoose connection handler
│   └── cloudinary.js               # Cloudinary API storage config
├── documentations/                 # Exhaustive guides (ENV configuration, styling rules, polish logs)
├── frontend/                       # React SPA Frontend (Vite + Redux + Tailwind)
│   ├── src/
│   │   ├── assets/                 # Static visual assets
│   │   ├── components/             # Reusable UI widgets (modals, cards, layout, private routes)
│   │   ├── constants/              # Frontend configuration constants
│   │   ├── features/               # Redux slices (e.g., authSlice)
│   │   ├── pages/                  # Role-based segmented dashboards & views
│   │   │   ├── admin/              # User/class CRUD and system health controls
│   │   │   ├── auth/               # Login, forgot password, and registration
│   │   │   ├── student/            # Scanner view and personal transcripts
│   │   │   └── teacher/            # Live session screens, logs, and export settings
│   │   ├── services/               # Axios request instances and WebSocket socket connections
│   │   ├── store.js                # Redux state store configuration
│   │   ├── App.jsx                 # Client router mappings and theme rules
│   │   └── main.jsx                # React app entry point
│   ├── vite.config.js              # Vite server & proxy configurations
│   ├── tailwind.config.js          # Tailwind theme styling tokens (custom sky-blue palettes)
│   └── index.html                  # HTML5 base viewport template
├── src/                            # Express Backend Core (ES modules)
│   ├── controllers/                # Request validation and business logic
│   ├── middlewares/                # Custom hooks (JWT parsing, role check, upload configs)
│   ├── models/                     # MongoDB ODM schema definitions
│   ├── routes/                     # Express REST endpoints
│   ├── services/                   # Enterprise service layer (Nodemailer system, ExcelJS reports)
│   ├── socket/                     # Socket.io real-time room communication handlers
│   ├── tests/                      # Jest test suites
│   └── utils/                      # Helper engines (distance calc, async handler, raw email client)
├── utils/                          # Global error templates & API response standards
│   ├── ApiError.js
│   └── ApiResponse.js
├── server.js                       # Server entry point (Express app, middleware, Socket server init)
├── vercel.json                     # Serverless build instructions for Vercel deployment
└── package.json                    # Backend project dependencies and custom scripts
```

---

## 🔑 Prerequisites & Environment Variables

### Prerequisites
* **Node.js:** v18.x or higher
* **MongoDB:** Local instance running at `mongodb://localhost:27017` or a MongoDB Atlas Cloud URI
* **Cloudinary:** Account credentials for user avatar uploads
* **SMTP Server:** A mail transfer agent (e.g., Gmail App Password or SendGrid API key)

### Backend Environment Configuration (`.env`)
Create a file named `.env` in the root folder using the following schema:

| Variable Name | Required | Default / Example Value | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | No | `5000` | Port number on which the Express server listens. |
| `NODE_ENV` | Yes | `development` | Runtime mode: `development` (displays stack traces) or `production`. |
| `MONGODB_URI` | Yes | `mongodb://localhost:27017/CSIT Attendance System_db` | MongoDB connection URI. |
| `CLIENT_URL` | Yes | `http://localhost:5173` | Address of the client frontend (used for CORS and email links). |
| `JWT_ACCESS_SECRET` | Yes | `your_access_token_secret_string` | Signing secret for access JWT tokens. |
| `JWT_REFRESH_SECRET` | Yes | `your_refresh_token_secret_string`| Signing secret for refresh JWT tokens. |
| `JWT_ACCESS_EXPIRY` | No | `15m` | Lifetime of the access token. |
| `JWT_REFRESH_EXPIRY` | No | `7d` | Lifetime of the refresh token. |
| `QR_SECRET` | Yes | `your_qr_code_token_secret` | Secret key used to encrypt the rotating classroom QR codes. |
| `ADMIN_SECRET` | Yes | `bootstrap_secret_key` | Secret token string required to authorize the `/create-admin` endpoint. |
| `COOKIE_SECURE` | No | `false` | Set to `true` in production to enforce HTTPS cookie distribution. |
| `COOKIE_SAME_SITE` | No | `lax` | Cookie protection policy state (`lax`, `strict`, `none`). |
| `CLOUDINARY_CLOUD_NAME` | Yes | `your_cloudinary_cloud_name` | Cloudinary Storage account cloud name. |
| `CLOUDINARY_API_KEY` | Yes | `your_cloudinary_api_key` | Cloudinary access API key. |
| `CLOUDINARY_API_SECRET`| Yes | `your_cloudinary_api_secret` | Cloudinary access API secret. |
| `EMAIL_HOST` | Yes | `smtp.gmail.com` | SMTP host of your email provider. |
| `EMAIL_PORT` | Yes | `587` | SMTP port (typically `587` for TLS or `465` for SSL). |
| `EMAIL_USER` | Yes | `your-email@gmail.com` | Account username for sending system emails. |
| `EMAIL_PASS` | Yes | `your-app-password` | SMTP password / Gmail App-Specific Password (*Note: code looks for EMAIL_PASS*). |
| `EMAIL_FROM` | Yes | `CSIT Attendance System <noreply@CSIT Attendance System.com>`| Header email address appearing as the sender. |
| `KEEP_ALIVE_TIMEOUT` | No | `65000` | HTTP keep-alive timeout in milliseconds. |
| `HEADERS_TIMEOUT` | No | `66000` | HTTP headers parsing timeout in milliseconds. |
| `REQUEST_TIMEOUT` | No | `15000` | HTTP request execution timeout in milliseconds. |
| `BODY_SIZE_LIMIT` | No | `1mb` | Maximum body size parsing limit. |

### Frontend Environment Configuration (`frontend/.env`)
Create a file named `.env` in the `frontend` folder:

| Variable Name | Required | Default / Example Value | Description |
| :--- | :--- | :--- | :--- |
| `VITE_API_URL` | Yes | `http://localhost:5000/api/v1` | URL mapping to the backend API layer. |
| `VITE_SOCKET_URL` | No | `http://localhost:5000` | Socket connection path (defaults to backend base URL if empty). |

---

## 🚀 Local Development & Installation

Follow these steps to run CSIT Attendance System locally for development or testing purposes.

### 1. Repository Setup
Clone the codebase and navigate to the directory:
```bash
git clone https://github.com/jalal1122/CSIT Attendance System-FYP-Project.git
cd CSIT Attendance System-FYP-Project
```

### 2. Backend Installation & Startup
Open a terminal in the root folder to install packages and start the development server:
```bash
# Install backend dependencies
npm install

# Copy env template and set up your variables
cp .env.example .env

# Run development server (runs with nodemon and automatically restarts)
npm run dev
```
The server will bind to `http://localhost:5000`. You should see `🚀 Server running on port 5000` and `✅ MongoDB Connected`.

### 3. Frontend Installation & Startup
Open a second terminal window, navigate to the `frontend` folder, and launch the development client:
```bash
cd frontend

# Install client-side dependencies
npm install

# Start the Vite local server
npm run dev
```
The frontend will boot at `http://localhost:5173`. Open this URL in your web browser.

### 4. Admin Bootstrap
To initialize the system with the first administrator:
1. Ensure the backend server and frontend client are running.
2. Open your browser and navigate to `http://localhost:5173/create-admin`.
3. Provide your name, email, desired password, and the `ADMIN_SECRET` configured in your backend `.env` file.
4. Submit the form to bootstrap the first administrator. From here, you can log in and register classes, teachers, and students.

### 5. Running Automated Tests
Run unit and integration tests configured in Jest:
```bash
# Run all tests
npm run test

# Run tests with watch mode
npm run test:watch

# Test backend controllers specifically
npm run test:controllers
```

---

## 🔌 API Reference

All requests and responses use JSON formatting. API endpoints (excluding authentication setup and token refresh) require a JSON Web Token (JWT) provided in the HTTP authorization header as: `Authorization: Bearer <access_token>`.

### Authentication Routes (`/api/v1/auth`)

* `POST /register`
  * **Role:** Public (Student/Teacher)
  * **Details:** Registers a user with credentials and optional avatar file uploads. (Admin user creation via `/api/v1/user/create` is recommended in production).
* `POST /login`
  * **Role:** Public
  * **Details:** Authenticates a user. Returns access token, user info payload, and writes the refresh token cookie.
* `POST /refresh`
  * **Role:** Public
  * **Details:** Checks the refresh token cookie and returns a renewed access token.
* `POST /logout`
  * **Role:** Private (All roles)
  * **Details:** Clears the cookie and invalidates the session refresh token.
* `POST /create-admin`
  * **Role:** Public (Secret bootstrap authorization via `ADMIN_SECRET` request body parameter)
  * **Details:** Registers the initial admin account for the application.
* `POST /forgot-password` / `POST /reset-password`
  * **Role:** Public
  * **Details:** Sends a password reset token via email; updates the user's password.
* `POST /2fa/validate` / `/2fa/enable` / `/2fa/verify` / `/2fa/disable`
  * **Role:** Private (Except validate which is public during login)
  * **Details:** Setting up, validating, and managing two-factor authentication credentials.

### Class Routes (`/api/v1/class`)

* `POST /create`
  * **Role:** Teacher, Admin
  * **Details:** Creates a new class with name, code, department, and semester.
* `POST /join`
  * **Role:** Student
  * **Details:** Enrolls the logged-in student in a class using the specific class code.
* `POST /unjoin`
  * **Role:** Student
  * **Details:** Unenrolls the student from the class.
* `POST /remove-student`
  * **Role:** Teacher, Admin
  * **Details:** Removes a student from a class.
* `POST /:id/promote-semester`
  * **Role:** Teacher, Admin
  * **Details:** Promotes all students in a class to the next semester.
* `GET /` / `GET /:id`
  * **Role:** All authenticated users
  * **Details:** Retrieves a list of all classes or the detailed parameters of a specific class.

### Live Session Routes (`/api/v1/session`)

* `POST /start`
  * **Role:** Teacher, Admin
  * **Details:** Starts an active attendance session mapping class coordinates and security flags.
* `GET /:id/qr-token`
  * **Role:** Teacher, Admin
  * **Details:** Fetches the active rotating token for QR display.
* `POST /:id/end`
  * **Role:** Teacher, Admin
  * **Details:** Closes the active session and locks attendance markings.
* `POST /create-retroactive`
  * **Role:** Teacher, Admin
  * **Details:** Manually logs an attendance session for a historical date.
* `GET /class/:classId/active`
  * **Role:** Teacher, Admin
  * **Details:** Fetches the active session details (if any) currently running for a class.
* `GET /all/active`
  * **Role:** Teacher, Admin
  * **Details:** Lists all active sessions in the system.
* `GET /class/:classId` / `GET /:id`
  * **Role:** All authenticated users
  * **Details:** Retrieves all sessions for a class or specific details for a single session.

### Attendance Routes (`/api/v1/attendance`)

* `POST /scan` (or `POST /mark`)
  * **Role:** Student
  * **Details:** Submits scanned QR token, device ID, and GPS coordinates to record presence.
* `POST /approve`
  * **Role:** Teacher, Admin
  * **Details:** Bulk approves students in the pending attendance approval queue.
* `PATCH /update`
  * **Role:** Teacher, Admin
  * **Details:** Overrides status for a specific student's attendance record.
* `GET /session/:sessionId`
  * **Role:** Teacher, Admin, Student (Enrolled)
  * **Details:** Retrieves the full list of attendance statuses for a session.
* `GET /student/:studentId`
  * **Role:** Admin, Student (Self)
  * **Details:** Chronological attendance records for a student.
* `GET /my-attendance/:classId`
  * **Role:** Student (Self)
  * **Details:** Summarized presence stats and records for a class.
* `GET /class/:classId/detailed`
  * **Role:** Teacher, Admin
  * **Details:** Exports detailed grid records for classes.

### Analytics Routes (`/api/v1/analytics`)

* `GET /student/:studentId`
  * **Role:** Admin, Student (Self)
  * **Details:** Analytical breakdown of subject compliance rates.
* `GET /class/:classId`
  * **Role:** Teacher, Admin
  * **Details:** Attendance trends (weekly/monthly) and statistics for a class.
* `GET /class/:classId/defaulters`
  * **Role:** Teacher, Admin
  * **Details:** Lists enrolled students with attendance rates below the threshold (default: 75%).
* `GET /teacher/stats`
  * **Role:** Teacher, Admin
  * **Details:** Summary of classes, active sessions, and student compliance.
* `GET /comprehensive`
  * **Role:** Admin
  * **Details:** System-wide report filtered by department or semester.
* `GET /export`
  * **Role:** Private (Depends on query)
  * **Details:** Downloads a generated Excel workbook (`.xlsx`) or `.csv` based on queries (`type=class_matrix`, `type=student_transcript`, or `type=dept_summary`).
* `POST /check-defaulters`
  * **Role:** Teacher, Admin
  * **Details:** Checks attendance and sends emails to students falling below the 75% threshold.

### User Routes (`/api/v1/user`)

* `POST /create`
  * **Role:** Admin
  * **Details:** Registers an individual student or teacher and sends a welcome email.
* `POST /bulk-students`
  * **Role:** Admin
  * **Details:** Expects a spreadsheet file upload (`sheet` field) to register multiple student accounts.
* `GET /all` / `GET /stats` / `GET /:id`
  * **Role:** Admin
  * **Details:** Lists users with optional filters; retrieves role stats; views single profile configurations.
* `PUT /:id` / `PATCH /:id/role` / `DELETE /:id`
  * **Role:** Admin
  * **Details:** Standard CRUD operations.
* `POST /:id/reset-device`
  * **Role:** Admin
  * **Details:** Deletes the persisted device ID mapping, allowing the user to bind a new device.
