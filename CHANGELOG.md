# AttendX - Changelog

## [Latest] - February 2026

### 🎉 Major Improvements

#### Backend Enhancements

1. **Security Config Validation & Standardization**
   - Added validation and clamping in `startSession` controller
   - Radius: clamped to 10-500m (default 50m)
   - QR refresh rate: clamped to 5-60s (default 20s)
   - Console warnings when values are adjusted
   - Security config now included in `getQRToken` response
   - **Files Modified**: `src/controllers/session.controller.js`

2. **Error Code System for Security Failures**
   - Added `errorCode` field to `ApiError` class
   - Implemented error code constants:
     - `GEOFENCE_OUTSIDE` - Student too far from classroom
     - `DEVICE_LOCK_VIOLATION` - Wrong device used
     - `IP_MISMATCH` - Different network than teacher
     - `QR_EXPIRED` - QR code expired
     - `QR_INVALID` - Invalid QR token
   - Updated attendance controller to use error codes
   - **Files Modified**: `utils/ApiError.js`, `src/controllers/attendance.controller.js`

3. **Device Lock Always Enforced**
   - Device lock is now mandatory for all sessions
   - Removed toggle from StartSessionModal
   - Admin can reset student device bindings via ManageUsers page
   - **Files Modified**: `src/controllers/session.controller.js`, `frontend/src/components/modals/StartSessionModal.jsx`

#### Frontend Enhancements

1. **Enhanced Error Handling on Scan Page**
   - Icon-based error messages for better UX:
     - 📍 Geofence violations
     - 🔒 Device lock issues
     - 🌐 IP mismatches
     - ⏱️ Expired QR codes
     - ❌ Invalid tokens
   - Actionable guidance for each error type
   - Smart resume delays based on error severity
   - **Files Modified**: `frontend/src/pages/student/ScanAttendance.jsx`

2. **Live Session Security Dashboard**
   - Added security config summary card to LiveSession page
   - Shows active settings in real-time:
     - 📍 Geofence radius
     - 🔒 Device lock (always on)
     - 🌐 IP matching status
     - ✋ Manual approval status
   - Helps teachers understand active security measures
   - **Files Modified**: `frontend/src/pages/teacher/LiveSession.jsx`

3. **Public Landing Page**
   - Created beautiful marketing/demo landing page
   - Features:
     - Hero section with CTA buttons
     - 6 feature cards showcasing system capabilities
     - Responsive design for all devices
     - Auto-redirects authenticated users to dashboard
   - Perfect for demos, presentations, and FYP showcase
   - **Files Created**: `frontend/src/pages/LandingPage.jsx`
   - **Files Modified**: `frontend/src/App.jsx`

4. **Manual Approval UI Fixes**
   - Fixed pending approvals list to show student names and roll numbers
   - Approve and Approve All buttons now work correctly
   - Live attendance counter includes pending students when manual approval is on
   - **Files Modified**: `frontend/src/pages/teacher/LiveSession.jsx`

5. **Admin Device Reset**
   - Added "Reset Device" button in ManageUsers page
   - Allows admins to unbind devices for students who lost/changed devices
   - Confirmation dialog before reset
   - **Files Modified**: `frontend/src/pages/admin/ManageUsers.jsx`, `frontend/src/services/userAPI.js`
   - **Backend**: `src/controllers/user.controller.js`, `src/routes/user.routes.js`

### 🐛 Bug Fixes

1. **Attendance Endpoint Naming**
   - Added `/mark` alias for `/scan` endpoint for backward compatibility
   - **Files Modified**: `src/routes/attendance.routes.js`

2. **QR Token Expiry Sync**
   - QR token expiry now uses session's `qrRefreshRate` dynamically
   - Frontend and backend timers now perfectly synchronized
   - **Files Modified**: `src/controllers/session.controller.js`

3. **Geofence Default Radius**
   - Changed default radius from 5m to 50m to match documentation
   - **Files Modified**: `src/models/session.model.js`

4. **My Attendance Endpoint**
   - Implemented `GET /api/v1/attendance/my-attendance/:classId`
   - Uses logged-in student's ID automatically
   - **Files Modified**: `src/routes/attendance.routes.js`, `src/controllers/attendance.controller.js`

5. **Student Success Message**
   - Fixed attendance marking success message to use correct response structure
   - Now properly displays student name
   - **Files Modified**: `frontend/src/pages/student/ScanAttendance.jsx`

6. **Environment Variable Consistency**
   - Standardized on `VITE_API_URL` for frontend API base URL
   - Updated documentation to match
   - **Files Modified**: `frontend/src/services/api.js`

7. **Analytics JSDoc Comments**
   - Updated comments to match actual endpoint signatures
   - **Files Modified**: `src/controllers/analytics.controller.js`

### 📚 Documentation Updates

1. **BUGS_AND_FIXES.md**
   - Marked all critical bugs as fixed
   - Added summary of recent fixes
   - Added list of additional improvements

2. **IMPROVEMENTS_PLAN.md**
   - Marked completed improvements with ✅
   - Added implementation notes for each completed item
   - Added "Recent Updates" section at top

3. **CHANGELOG.md** (this file)
   - Created comprehensive changelog
   - Documents all changes made in this iteration

### 🔄 Breaking Changes

None. All changes are backward compatible.

### 📝 Notes for Developers

1. **Security Config**: Always enforced device lock means all sessions now have this security measure active. Frontend no longer shows device lock toggle.

2. **Error Codes**: Frontend can now check `error.response?.data?.errorCode` to provide specific error handling. Legacy string-based detection still works as fallback.

3. **Landing Page**: Root route `/` now shows landing page for unauthenticated users. Authenticated users are auto-redirected to their dashboard.

4. **Device Reset**: Admins can reset student device bindings from ManageUsers page. Students will be able to bind a new device on their next attendance scan.

### 🚀 Next Steps

See `IMPROVEMENTS_PLAN.md` for remaining improvements:
- IP matching robustness improvements
- Better test coverage for analytics
- Stronger API response typing
- Notifications & alerts system
- Further accessibility enhancements

---

## Previous Versions

See git history for changes before February 2026.
