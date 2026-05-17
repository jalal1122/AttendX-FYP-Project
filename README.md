<div align="center">

  <br />
  <h1>🚀 AttendX</h1>
  <h3>The Next-Gen Smart Attendance System</h3>

  <p>
    <b>Secure. Scalable. Smart.</b>
    <br />
    AttendX replaces outdated paper sheets with a military-grade, QR-based attendance engine.
    <br />
    Built with the <b>MERN Stack</b>.
  </p>

  <p>
    <img src="https://img.shields.io/badge/Status-Production_Ready-success?style=for-the-badge" alt="Status" />
    <img src="https://img.shields.io/badge/Stack-MERN-blue?style=for-the-badge" alt="Stack" />
    <img src="https://img.shields.io/badge/UI-Sky_Blue_Minimalist-0ea5e9?style=for-the-badge" alt="UI" />
    <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License" />
  </p>

  <p>
    <a href="#-key-features">Key Features</a> •
    <a href="#-tech-stack">Tech Stack</a> •
    <a href="#-getting-started">Getting Started</a> •
    <a href="#-team">The Team</a>
  </p>
</div>

---

## 📖 Overview

**AttendX** addresses the critical flaws in traditional attendance systems: Proxy (Buddy Punching), Time Wastage, and Lack of Analytics.

Unlike simple QR scanners, AttendX implements a **Triple-Layer Security Protocol**:
1.  **Device Fingerprinting:** Locks attendance to a specific phone.
2.  **Geofencing:** Validates GPS coordinates against the classroom radius.
3.  **Rotating Tokens:** QR codes regenerate every 20 seconds to prevent photo sharing.

---

## ✨ Key Features

### 🛡️ Core Security
* **📱 Device Lock (Anti-Proxy):** Students can only mark attendance from their own registered device.
* **📍 Geofencing:** Real-time GPS validation (Haversine Formula) ensures physical presence.
* **🔄 Rotating QR Engine:** Dynamic JWT tokens prevent static QR copying.
* **👮 Manual Approval Queue:** Teachers can review and approve attendance in real-time.

### 🎓 For Teachers
* **Live Dashboard:** Watch student count rise in real-time.
* **Security Presets:** One-click switch between "Casual Lecture" and "Strict Exam" modes.
* **Retroactive Sessions:** Create sessions for past dates to digitize manual records.
* **Enterprise Reports:** Download beautifully styled **Excel** reports with conditional formatting.
* **Defaulter Alerts:** Send email warnings to students with low attendance.

### 🎒 For Students
* **Fast Scanning:** 1-click camera scan with real-time feedback.
* **Self-Analytics:** Track your own attendance (Week/Month/Semester).
* **Email Notifications:** Receive alerts for low attendance and device changes.
* **Download Transcript:** Export your attendance history as a professional Excel report.

### ⚡ For Admins
* **User Management:** Create/Edit/Delete Teachers and Students with welcome emails.
* **System Health Dashboard:** Real-time monitoring of service status, database, and email delivery.
* **Notification Center:** Bell icon with real-time alerts and updates.
* **Comprehensive Reports:** Generate system-wide analytics and department summaries.

---

## 🛠 Tech Stack

<div align="center">

| Frontend | Backend | Database | Services |
| :---: | :---: | :---: | :---: |
| ![React](https://img.shields.io/badge/react-%2320232a.svg?style=flat&logo=react&logoColor=%2361DAFB) | ![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=flat&logo=node.js&logoColor=white) | ![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=flat&logo=mongodb&logoColor=white) | ![Nodemailer](https://img.shields.io/badge/Nodemailer-0F9DCE?style=flat&logo=nodemailer&logoColor=white) |
| ![Redux](https://img.shields.io/badge/redux-%23593d88.svg?style=flat&logo=redux&logoColor=white) | ![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=flat&logo=express&logoColor=%2361DAFB) | ![Mongoose](https://img.shields.io/badge/Mongoose-880000?style=flat&logo=mongoose&logoColor=white) | ![ExcelJS](https://img.shields.io/badge/ExcelJS-217346?style=flat&logo=microsoft-excel&logoColor=white) |
| ![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=flat&logo=tailwind-css&logoColor=white) | ![JWT](https://img.shields.io/badge/JWT-black?style=flat&logo=JSON%20web%20tokens) | ![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?style=flat&logo=Cloudinary&logoColor=white) | ![Lucide](https://img.shields.io/badge/Lucide-F56565?style=flat&logo=lucide&logoColor=white) |

</div>

---

## 🏗 Architecture

AttendX follows a robust MVC architecture with a secure attendance loop.

```mermaid
sequenceDiagram
    participant T as Teacher
    participant S as Student
    participant API as Backend
    participant DB as MongoDB

    Note over T, API: 1. Teacher Configures Session
    T->>API: Start Session (Radius: 20m, DeviceLock: ON)
    API->>DB: Create Active Session

    Note over T, S: 2. Rotating QR Loop
    loop Every 20 Seconds
        API->>T: Send New Encrypted Token
        T->>T: Display QR Code
    end

    Note over S, API: 3. Student Scans
    S->>S: Capture GPS & Device UUID
    S->>API: POST /mark (Token + GPS + UUID)
    
    API->>API: Validate Token Signature
    API->>API: Validate Geofence (Haversine)
    API->>API: Validate Device Fingerprint
    
    alt Validation Passed
        API->>DB: Save Attendance (Status: Present)
        API-->>S: Success Toast ✅
        API-->>T: Update Live Count
    else Validation Failed
        API-->>S: Error (Too Far / Device Used) ❌
    end
````

-----

## 🚀 Getting Started

### Prerequisites

  * Node.js (v18+)
  * MongoDB Atlas URI
  * Cloudinary Account (for images)

### 1\. Clone the Repo

```bash
git clone [https://github.com/yourusername/AttendX.git](https://github.com/yourusername/AttendX.git)
cd AttendX
```

### 2\. Backend Setup

```bash
cd backend
npm install
# Create .env file and add your credentials (see .env.example)
npm start
```

### 3\. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 4\. Admin Bootstrap

Since there are no admins initially, use the secret portal:

1.  Navigate to `http://localhost:5173/create-admin`
2.  Enter details and the Secret Key defined in your `.env`.

-----

## 🔑 Environment Variables

Create a `.env` file in the `backend` folder:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_ACCESS_SECRET=your_super_secret_key
JWT_REFRESH_SECRET=your_refresh_secret
QR_SECRET=secret_for_qr_tokens
ADMIN_SECRET=attendx_super_admin_2025
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

-----

## 🎨 What's New in Phase 14

### Sky Blue Minimalist UI
- **Modern Design:** Complete UI overhaul with Sky Blue (#0EA5E9) as the primary color
- **Consistent Theme:** All components follow the same design language
- **Smooth Animations:** Hover effects, transitions, and focus states
- **Responsive:** Mobile-first design that works on all devices

### 📧 Smart Email System
- **Welcome Emails:** Automatically sent when admins create new users
- **Low Attendance Alerts:** Email warnings for students below 75%
- **Device Security Notifications:** Alerts when devices are bound or reset
- **Beautiful Templates:** Professional HTML emails with Sky Blue branding

### 🔔 Notification Center
- **Real-time Alerts:** Bell icon in navbar with unread count
- **Color-coded:** Success (green), Warning (amber), Error (red), Info (blue)
- **Interactive:** Mark as read, dismiss, or clear all
- **Persistent:** Stored in localStorage for continuity

### 🏥 System Health Dashboard
- **Live Monitoring:** Real-time service and database status
- **Email Statistics:** Track total emails sent
- **System Metrics:** Uptime, load status, network stability
- **Admin-only:** Exclusive to administrators

### 📊 Enhanced Reports
- **Excel Export:** Beautifully styled reports with conditional formatting
- **Multiple Types:** Class matrix, student transcripts, department summaries
- **Professional Styling:** Sky Blue headers, color-coded attendance status
- **Auto-width Columns:** Optimized for readability

See `PHASE_14_FINAL_POLISH.md` for complete details.

-----

## 👥 The Team

**Final Year Project - Agriculture University Peshawar**

| Member | Role |
| :--- | :--- |
| **Muhammad Jalal** | Full Stack Developer |
| **Anis Riaz** | Mern Stack Developer |
| **Mahnoor Zafar** | Frontend Developer |

-----

<div align="center">
<p>Made with ❤️ by the AttendX Team</p>
<p>
<a href="\#">Report Bug</a> •
<a href="\#">Request Feature</a>
</p>
</div>
