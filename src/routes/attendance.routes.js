import express from 'express';
import {
  markAttendance,
  manualUpdate,
  getAttendanceBySession,
  getStudentAttendance,
} from '../controllers/attendance.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { hasRole } from '../middlewares/role.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(verifyJWT);

// Mark attendance via QR scan (Student only)
router.post('/scan', hasRole('student'), markAttendance);

// Manual attendance update (Teacher/Admin only)
router.patch('/update', hasRole('teacher', 'admin'), manualUpdate);

// Get attendance for a session
router.get('/session/:sessionId', getAttendanceBySession);

// Get student's attendance history
router.get('/student/:studentId', getStudentAttendance);

export default router;
