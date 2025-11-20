import express from "express";
import {
  startSession,
  getQRToken,
  endSession,
  createRetroactiveSession,
  getSessionsByClass,
  getSessionDetails,
} from "../controllers/session.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { hasRole } from "../middlewares/role.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(verifyJWT);

// Start live session (Teacher/Admin only)
router.post("/start", hasRole("teacher", "admin"), startSession);

// Get QR token for active session (Teacher/Admin only)
router.get("/:id/qr-token", hasRole("teacher", "admin"), getQRToken);

// End session (Teacher/Admin only)
router.post("/:id/end", hasRole("teacher", "admin"), endSession);

// Create retroactive session (Teacher/Admin only)
router.post(
  "/create-retroactive",
  hasRole("teacher", "admin"),
  createRetroactiveSession
);

// Get all sessions for a class
router.get("/class/:classId", getSessionsByClass);

// Get session details
router.get("/:id", getSessionDetails);

export default router;
