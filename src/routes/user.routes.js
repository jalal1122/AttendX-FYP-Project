import express from "express";
import {
  getAllUsers,
  getUserStats,
  getUserDetails,
  updateUserRole,
  deleteUser,
  createUser,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { hasRole } from "../middlewares/role.middleware.js";
import upload from "../middlewares/upload.middleware.js";

const router = express.Router();

// All routes require authentication and admin role
router.use(verifyJWT, hasRole("admin"));

// Create user
router.post("/create", upload.single("avatar"), createUser);

// Get all users
router.get("/all", getAllUsers);

// Get user statistics
router.get("/stats", getUserStats);

// Get user details
router.get("/:id", getUserDetails);

// Update user role
router.patch("/:id/role", updateUserRole);

// Delete user
router.delete("/:id", deleteUser);

export default router;
