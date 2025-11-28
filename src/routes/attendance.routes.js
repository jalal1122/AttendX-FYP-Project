import express from "express";
import {
  markAttendance,
  manualUpdate,
  getAttendanceBySession,
  getStudentAttendance,
  getDetailedClassAttendance,
  approveAttendance,
} from "../controllers/attendance.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { hasRole } from "../middlewares/role.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(verifyJWT);

// Mark attendance via QR scan (Student only)
router.post("/scan", hasRole("student"), markAttendance);

// Approve pending attendance (Teacher/Admin only)
router.post("/approve", hasRole("teacher", "admin"), approveAttendance);

// Manual attendance update (Teacher/Admin only)
router.patch("/update", hasRole("teacher", "admin"), manualUpdate);

// Get attendance for a session
router.get("/session/:sessionId", getAttendanceBySession);

// Get student's attendance history
router.get("/student/:studentId", getStudentAttendance);

// Get detailed class attendance for export (Teacher/Admin only)
router.get(
  "/class/:classId/detailed",
  hasRole("teacher", "admin"),
  getDetailedClassAttendance
);

export default router;
