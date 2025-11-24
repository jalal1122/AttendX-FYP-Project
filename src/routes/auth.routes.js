import express from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
  enable2FA,
  verify2FA,
  disable2FA,
  validate2FALogin,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.middleware.js";

const router = express.Router();

// Public routes
router.post("/register", upload.single("avatar"), registerUser);
router.post("/login", loginUser);
router.post("/refresh", refreshAccessToken);

// Password reset routes (Public)
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// 2FA routes
router.post("/2fa/validate", validate2FALogin); // Public - used during login
router.post("/2fa/enable", verifyJWT, enable2FA); // Protected
router.post("/2fa/verify", verifyJWT, verify2FA); // Protected
router.post("/2fa/disable", verifyJWT, disable2FA); // Protected

// Protected routes
router.get("/me", verifyJWT, getCurrentUser);
router.post("/logout", verifyJWT, logoutUser);

export default router;
