import express from "express";
import {
  createClass,
  joinClass,
  getAllClasses,
  getClassDetails,
  unjoinClass,
  removeStudent,
  promoteClassStudents,
  updateClassDetails,
  deleteClass,
} from "../controllers/class.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { hasRole } from "../middlewares/role.middleware.js";
import { antigravity } from "../middlewares/antigravity.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(verifyJWT);

// Create class (Teacher and Admin only)
router.post("/create", hasRole("teacher", "admin"), antigravity, createClass);

// Join class (Student only)
router.post("/join", hasRole("student"), joinClass);

// Unjoin class (Student only)
router.post("/unjoin", hasRole("student"), unjoinClass);

// Remove student from class (Teacher and Admin only)
router.post("/remove-student", hasRole("teacher", "admin"), removeStudent);

// Promote all students in a class to the next semester (Teacher and Admin only)
router.post(
  "/:id/promote-semester",
  hasRole("teacher", "admin"),
  promoteClassStudents,
);

// Update class details (Teacher and Admin only)
router.put("/:id", hasRole("teacher", "admin"), antigravity, updateClassDetails);

// Delete class (Teacher and Admin only)
router.delete("/:id", hasRole("teacher", "admin"), deleteClass);

// Get all classes (All authenticated users)
router.get("/", getAllClasses);

// Get class details (All authenticated users)
router.get("/:id", getClassDetails);

export default router;
