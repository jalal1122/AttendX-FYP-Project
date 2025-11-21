import express from "express";
import {
  getStudentReport,
  getClassAnalytics,
  getDefaulters,
  getTeacherStats,
  getComprehensiveReport,
} from "../controllers/analytics.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { hasRole } from "../middlewares/role.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(verifyJWT);

// Student report (Student can view own, Admin can view any)
router.get("/student/:studentId", getStudentReport);

// Class analytics with temporal trends (Teacher/Admin only)
router.get("/class/:classId", getClassAnalytics);

// Defaulters list (Teacher/Admin only)
router.get("/class/:classId/defaulters", getDefaulters);

// Teacher statistics (Teacher/Admin only)
router.get("/teacher/stats", hasRole("teacher", "admin"), getTeacherStats);

// Comprehensive report (Admin only)
router.get("/comprehensive", hasRole("admin"), getComprehensiveReport);

export default router;
