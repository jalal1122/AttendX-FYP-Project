# 🚀 AttendX - Quick Start Guide

## Get Your System Running in 5 Minutes!

---

## ⚡ Prerequisites

- Node.js (v16 or higher)
- MongoDB Atlas account (or local MongoDB)
- Git installed

---

## 📦 Installation

### 1. Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Verify .env file exists with these keys:
# - MONGODB_URI
# - JWT_ACCESS_SECRET
# - JWT_REFRESH_SECRET
# - QR_SECRET
# - ADMIN_SECRET=attendx_super_admin_2025
# - CLIENT_URL=http://localhost:5173

# Start backend server
npm start
```

**Expected Output:**

```
✅ Server is running on port 5000
✅ MongoDB Connected Successfully
```

---

### 2. Frontend Setup

```bash
# Navigate to frontend (new terminal)
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

**Expected Output:**

```
✅ VITE ready in 500ms
✅ Local: http://localhost:5173/
```

---

## 🔐 Create First Admin (Bootstrap)

### Step 1: Access Secret Portal

Open browser and navigate to:

```
http://localhost:5173/create-admin
```

### Step 2: Fill the Form

- **Name:** Super Admin
- **Email:** admin@attendx.com
- **Password:** Admin@123
- **Admin Secret Key:** `attendx_super_admin_2025`

### Step 3: Submit

Click **"🚀 Create Admin Account"**

**Success!** You'll see:

```
✅ Admin account created successfully! Please login to continue.
```

---

## 🎯 Login & Test

### 1. Login as Admin

```
URL: http://localhost:5173/login
Email: admin@attendx.com
Password: Admin@123
```

### 2. Create a Teacher

1. Go to **Manage Users**
2. Click **"Add User"**
3. Select Role: **Teacher**
4. Fill details:
   - Name: John Teacher
   - Email: teacher@attendx.com
   - Password: Teacher@123
   - Department: Computer Science
   - Designation: Professor

### 3. Create a Student

1. Go to **Manage Users**
2. Click **"Add User"**
3. Select Role: **Student**
4. Fill details:
   - Name: Alice Student
   - Email: student@attendx.com
   - Password: Student@123
   - Roll No: CS2025001
   - Semester: 5
   - Department: Computer Science
   - Batch: A
   - Year: 2025

### 4. Create a Class

1. Go to **Manage Classes**
2. Click **"Create Class"**
3. Fill details:
   - Class Name: Data Structures
   - Code: CS301
   - Semester: 5
   - Department: Computer Science
   - Batch: A
   - Year: 2025
   - Teacher: John Teacher

### 5. Join Student to Class

1. **Logout** from admin
2. **Login** as student (student@attendx.com / Student@123)
3. Go to **Dashboard**
4. Click **"Join Class"**
5. Enter Class Code: **CS301**
6. Click **"Join"**

---

## 🎓 Test the System

### Test 1: Start Live Session (Teacher)

1. **Logout** and login as teacher (teacher@attendx.com / Teacher@123)
2. Go to **Dashboard** → Select class **"Data Structures"**
3. Click **"Start Session"**
4. **Choose Preset:**
   - Click **"🎓 Casual Lecture"** (for testing)
5. Click **"Submit"**
6. QR code appears! ✅

### Test 2: Mark Attendance (Student)

1. **Logout** and login as student
2. Go to **"Scan Attendance"**
3. Allow camera and location permissions
4. Point camera at teacher's QR code (or use Dev Mode with token)
5. **Success!** ✅ Attendance marked

### Test 3: View Attendance (Teacher)

1. **Logout** and login as teacher
2. Go to **Session History**
3. Click **"View Details"** on the session
4. See student attendance record ✅

---

## 🔒 Test Device Lock (Award-Winning Feature!)

### Setup

1. Login as teacher
2. Start session with **"📝 Strict Exam"** preset
   - This enables **Device Lock**
3. QR code appears

### Test on Mobile

1. Open **Chrome Mobile** (or any browser)
2. Login as **student@attendx.com**
3. Scan QR → **Success!** ✅
4. **Logout** (stay in same browser)
5. Login as **different student** (create another student first)
6. Scan QR → **REJECT!** 🔒
   ```
   🔒 Security Alert: This device has already marked attendance for this session.
   ```

**Why?** Same browser = same device UUID = buddy punching prevented!

---

## 🧪 Test Manual Approval

### Setup

1. Login as teacher
2. Start session
3. Click **"Start Session"** button
4. Check **"Require Manual Approval"**
5. Click **"Submit"**

### Student Scans

1. Student scans QR
2. Gets **yellow toast**: "⏳ Waiting for teacher approval"
3. Status: **Pending**

### Teacher Approves

1. Teacher sees **orange card**: "Pending Approvals (1)"
2. Student name listed
3. Click **"Approve All"**
4. Status updated to **"Present"** ✅

---

## 📋 Common Issues & Solutions

### Issue 1: Backend won't start

**Error:** "MONGODB_URI is not defined"  
**Fix:** Check `.env` file exists in backend folder

### Issue 2: Frontend can't connect

**Error:** "Network Error"  
**Fix:** Ensure backend is running on port 5000

### Issue 3: Camera not working

**Error:** "Permission denied"  
**Fix:** Click camera icon in browser address bar → Allow

### Issue 4: Location not working

**Error:** "Location access required"  
**Fix:** Enable location in browser settings

### Issue 5: QR scanner black screen

**Fix:** Close other apps using camera, refresh page

### Issue 6: "Invalid admin secret key"

**Fix:** Check `.env` → Ensure `ADMIN_SECRET=attendx_super_admin_2025`

---

## 🎉 You're All Set!

Your AttendX system is now fully functional with:

- ✅ Role-based access (Admin, Teacher, Student)
- ✅ Device lock anti-buddy-punching
- ✅ Manual approval workflow
- ✅ Dynamic security presets
- ✅ Real-time attendance tracking

---

## 📖 Next Steps

1. **Read Documentation:**

   - `MASTER_PLAN.md` - System architecture
   - `PHASE_11_TESTING_GUIDE.md` - Security testing
   - `PHASE_12_SECRET_ADMIN_SETUP.md` - Admin setup
   - `PROJECT_COMPLETE_OVERVIEW.md` - Full overview

2. **Customize:**

   - Change `.env` secrets for production
   - Update colors/branding in frontend
   - Add your university logo

3. **Deploy:**

   - Backend → Heroku, Railway, or Render
   - Frontend → Vercel or Netlify
   - Database → MongoDB Atlas

4. **Present:**
   - Demo device lock feature
   - Show manual approval workflow
   - Highlight per-session security

---

## 🏆 Demo Script (5 Minutes)

**Minute 1:** Login as admin, show dashboard  
**Minute 2:** Create class and add students  
**Minute 3:** Login as teacher, start session with **Strict Exam** preset  
**Minute 4:** Login as student, scan QR → Success  
**Minute 5:** **CLIMAX** → Different student same device → **REJECT!** 🔒

**Judges' Reaction:** 🤯 "This prevents buddy punching perfectly!"

---

**Good luck!** 🚀

_Need help? Check the documentation files or review code comments._
