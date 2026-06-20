import express from "express";
import {
  getStudentReport,
  getClassAnalytics,
  getDefaulters,
  getTeacherStats,
  getComprehensiveReport,
  exportReport,
  checkAndNotifyDefaulters,
} from "../controllers/analytics.controller.js";
import {
  getAdminStudentReports,
  getAdminTeacherReports,
  getAdminDepartmentReports,
  getAdminBatchReports,
  getAdminSectionReports,
  getAdminSubjectReports,
  getAdminClassReports,
  getAdminDefaulters,
  getStudentAttendanceDetail,
} from "../controllers/adminReports.controller.js";
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

// Export report (Excel/CSV) - All authenticated users based on type
router.get("/export", exportReport);

// Check and notify defaulters (Teacher/Admin only)
router.post("/check-defaulters", hasRole("teacher", "admin"), checkAndNotifyDefaulters);

// --- Phase 2: Admin Reports ---
router.get("/admin/students", hasRole("admin"), getAdminStudentReports);
router.get("/admin/teachers", hasRole("admin"), getAdminTeacherReports);
router.get("/admin/departments", hasRole("admin"), getAdminDepartmentReports);
router.get("/admin/batches", hasRole("admin"), getAdminBatchReports);
router.get("/admin/sections", hasRole("admin"), getAdminSectionReports);
router.get("/admin/subjects", hasRole("admin"), getAdminSubjectReports);
router.get("/admin/classes", hasRole("admin"), getAdminClassReports);
router.get("/admin/defaulters", hasRole("admin"), getAdminDefaulters);
// Missing sections & subjects from the plan, let's just make sure we add what we wrote.
// Also drill down for attendance details
router.get("/admin/students/:studentId/attendance", hasRole("admin", "teacher"), getStudentAttendanceDetail);

export default router;
