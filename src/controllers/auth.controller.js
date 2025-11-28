import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import User from "../models/user.model.js";
import OTP from "../models/otp.model.js";
import jwt from "jsonwebtoken";
import { uploadToCloudinary } from "../../config/cloudinary.js";
import sendEmail from "../utils/sendEmail.js";
import fs from "fs";

/**
 * Generate Access and Refresh Tokens
 */
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Save refresh token to database
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw ApiError.internal("Error generating tokens");
  }
};

/**
 * Register User
 * POST /api/v1/auth/register
 */
export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, info } = req.body;

  // Validate required fields
  if (!name || !email || !password || !role) {
    throw ApiError.badRequest(
      "All fields are required: name, email, password, role"
    );
  }

  // Validate role
  if (!["admin", "teacher", "student"].includes(role)) {
    throw ApiError.badRequest(
      "Invalid role. Must be admin, teacher, or student"
    );
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw ApiError.conflict("User with this email already exists");
  }

  // Validate info based on role
  if (role === "student" && info) {
    const { rollNo, semester, department, batch, year } = info;
    if (!rollNo || !semester || !department || !batch || !year) {
      throw ApiError.badRequest(
        "Student info must include: rollNo, semester, department, batch, year"
      );
    }
  }

  if (role === "teacher" && info) {
    const { department, designation } = info;
    if (!department || !designation) {
      throw ApiError.badRequest(
        "Teacher info must include: department, designation"
      );
    }
  }

  // Handle avatar upload
  let avatarUrl = null;
  if (req.file) {
    try {
      avatarUrl = await uploadToCloudinary(req.file.path);
      // Delete local file after upload
      fs.unlinkSync(req.file.path);
    } catch (error) {
      console.error("Avatar upload error:", error);
      // Continue without avatar if upload fails
    }
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    role,
    info: info || {},
    avatar: avatarUrl,
  });

  // Generate tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  // Remove password and refresh token from response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // Set refresh token in HTTP-only cookie
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: process.env.COOKIE_SAME_SITE || "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  res
    .status(201)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        201,
        {
          user: createdUser,
          accessToken,
        },
        "User registered successfully"
      )
    );
});

/**
 * Login User
 * POST /api/v1/auth/login
 */
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate fields
  if (!email || !password) {
    throw ApiError.badRequest("Email and password are required");
  }

  // Find user
  const user = await User.findOne({ email });
  if (!user) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  // Validate password
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  // Check if 2FA is enabled
  if (user.isTwoFactorEnabled) {
    // Generate temporary short-lived token (5 minutes)
    const tempToken = jwt.sign(
      { _id: user._id, temp2FA: true },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "5m" }
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          require2FA: true,
          tempToken,
        },
        "2FA verification required"
      )
    );
  }

  // Generate tokens (if 2FA not enabled)
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  // Remove password and refresh token from response
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken -twoFactorSecret"
  );

  // Set refresh token in HTTP-only cookie
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: process.env.COOKIE_SAME_SITE || "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  res
    .status(200)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
        },
        "User logged in successfully"
      )
    );
});

/**
 * Get Current User
 * GET /api/v1/auth/me
 */
export const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    "-password -refreshToken -twoFactorSecret"
  );

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, { user }, "User fetched successfully"));
});

/**
 * Logout User
 * POST /api/v1/auth/logout
 */
export const logoutUser = asyncHandler(async (req, res) => {
  // Remove refresh token from database
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: { refreshToken: 1 },
    },
    { new: true }
  );

  // Clear cookie
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: process.env.COOKIE_SAME_SITE || "lax",
  };

  res
    .status(200)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

/**
 * Refresh Access Token
 * POST /api/v1/auth/refresh
 */
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw ApiError.unauthorized("Refresh token is required");
  }

  try {
    // Verify refresh token
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.JWT_REFRESH_SECRET
    );

    // Find user
    const user = await User.findById(decodedToken._id);
    if (!user) {
      throw ApiError.unauthorized("Invalid refresh token");
    }

    // Check if refresh token matches
    if (incomingRefreshToken !== user.refreshToken) {
      throw ApiError.unauthorized("Refresh token is expired or used");
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    // Set new refresh token in cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === "true",
      sameSite: process.env.COOKIE_SAME_SITE || "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    res.status(200).cookie("refreshToken", newRefreshToken, cookieOptions).json(
      new ApiResponse(
        200,
        {
          accessToken,
        },
        "Access token refreshed successfully"
      )
    );
  } catch (error) {
    throw ApiError.unauthorized(error?.message || "Invalid refresh token");
  }
});

/**
 * Enable 2FA - Generate QR Code
 * POST /api/v1/auth/2fa/enable
 */
export const enable2FA = asyncHandler(async (req, res) => {
  const { authenticator } = await import("otplib");
  const QRCode = await import("qrcode");

  const user = await User.findById(req.user._id);

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  if (user.isTwoFactorEnabled) {
    throw ApiError.badRequest("2FA is already enabled for this account");
  }

  // Generate a new secret
  const secret = authenticator.generateSecret();

  // Generate OTP Auth URL for QR Code
  const otpauth = authenticator.keyuri(user.email, "AttendX", secret);

  // Generate QR Code as Data URL
  const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        qrCode: qrCodeDataUrl,
        secret: secret,
        email: user.email,
      },
      "2FA QR Code generated. Scan with your authenticator app and verify."
    )
  );
});

/**
 * Verify and Activate 2FA
 * POST /api/v1/auth/2fa/verify
 */
export const verify2FA = asyncHandler(async (req, res) => {
  const { token, secret } = req.body;
  const { authenticator } = await import("otplib");

  if (!token || !secret) {
    throw ApiError.badRequest("Token and secret are required");
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  // Verify the token
  const isValid = authenticator.verify({ token, secret });

  if (!isValid) {
    throw ApiError.badRequest("Invalid verification code. Please try again.");
  }

  // Save 2FA settings
  user.isTwoFactorEnabled = true;
  user.twoFactorSecret = secret;
  await user.save({ validateBeforeSave: false });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        isTwoFactorEnabled: true,
      },
      "2FA enabled successfully"
    )
  );
});

/**
 * Disable 2FA
 * POST /api/v1/auth/2fa/disable
 */
export const disable2FA = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const { authenticator } = await import("otplib");

  if (!token) {
    throw ApiError.badRequest("Verification code is required");
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  if (!user.isTwoFactorEnabled) {
    throw ApiError.badRequest("2FA is not enabled for this account");
  }

  // Verify the token before disabling
  const isValid = authenticator.verify({
    token,
    secret: user.twoFactorSecret,
  });

  if (!isValid) {
    throw ApiError.badRequest("Invalid verification code");
  }

  // Disable 2FA
  user.isTwoFactorEnabled = false;
  user.twoFactorSecret = null;
  await user.save({ validateBeforeSave: false });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        isTwoFactorEnabled: false,
      },
      "2FA disabled successfully"
    )
  );
});

/**
 * Validate 2FA during Login
 * POST /api/v1/auth/2fa/validate
 */
export const validate2FALogin = asyncHandler(async (req, res) => {
  const { tempToken, otp } = req.body;
  const { authenticator } = await import("otplib");

  if (!tempToken || !otp) {
    throw ApiError.badRequest("Temporary token and OTP are required");
  }

  // Verify temp token
  let decoded;
  try {
    decoded = jwt.verify(tempToken, process.env.JWT_ACCESS_SECRET);
  } catch (error) {
    throw ApiError.unauthorized("Invalid or expired temporary token");
  }

  const user = await User.findById(decoded._id);

  if (!user || !user.isTwoFactorEnabled) {
    throw ApiError.unauthorized("Invalid authentication state");
  }

  // Verify OTP
  const isValid = authenticator.verify({
    token: otp,
    secret: user.twoFactorSecret,
  });

  if (!isValid) {
    throw ApiError.unauthorized("Invalid verification code");
  }

  // Generate actual access and refresh tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  // Remove sensitive fields
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken -twoFactorSecret"
  );

  // Cookie options
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: process.env.COOKIE_SAME_SITE || "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  res
    .status(200)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "Login successful"
      )
    );
});

/**
 * Forgot Password - Send OTP
 * POST /api/v1/auth/forgot-password
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw ApiError.badRequest("Email is required");
  }

  // Check if user exists
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw ApiError.notFound("No account found with this email address");
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Delete any existing OTPs for this email
  await OTP.deleteMany({ email: email.toLowerCase() });

  // Save new OTP to database
  await OTP.create({
    email: email.toLowerCase(),
    otp,
  });

  // Send email with OTP
  try {
    await sendEmail({
      to: email,
      subject: "Password Reset OTP - AttendX",
      text: `Your OTP for password reset is: ${otp}\n\nThis OTP will expire in 10 minutes.\n\nIf you didn't request this, please ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Password Reset Request</h2>
          <p>You have requested to reset your password for AttendX.</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Your OTP Code:</p>
            <h1 style="margin: 10px 0; color: #4F46E5; font-size: 36px; letter-spacing: 5px;">${otp}</h1>
          </div>
          <p style="color: #6b7280; font-size: 14px;">This OTP will expire in <strong>10 minutes</strong>.</p>
          <p style="color: #6b7280; font-size: 14px;">If you didn't request this password reset, please ignore this email.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Error sending OTP email:", error);
    // Don't throw error - OTP is still valid even if email fails
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        email: email.toLowerCase(),
        message: "OTP sent successfully",
      },
      "Password reset OTP sent to your email"
    )
  );
});

/**
 * Reset Password with OTP
 * POST /api/v1/auth/reset-password
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  // Validate inputs
  if (!email || !otp || !newPassword) {
    throw ApiError.badRequest("Email, OTP, and new password are required");
  }

  if (newPassword.length < 6) {
    throw ApiError.badRequest("Password must be at least 6 characters long");
  }

  // Find OTP record
  const otpRecord = await OTP.findOne({
    email: email.toLowerCase(),
    otp,
  });

  if (!otpRecord) {
    throw ApiError.badRequest("Invalid or expired OTP");
  }

  // Find user
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw ApiError.notFound("User not found");
  }

  // Update password
  user.password = newPassword;
  await user.save();

  // Delete used OTP
  await OTP.deleteOne({ _id: otpRecord._id });

  // Clear all refresh tokens for security
  user.refreshToken = undefined;
  await user.save({ validateBeforeSave: false });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Password reset successful. Please login with your new password."
      )
    );
});

/**
 * Create Admin (Bootstrap Solution)
 * POST /api/v1/auth/create-admin
 * Public Route - No JWT Required
 */
export const createAdmin = asyncHandler(async (req, res) => {
  const { name, email, password, adminSecret } = req.body;

  // Validate required fields
  if (!name || !email || !password || !adminSecret) {
    throw ApiError.badRequest(
      "All fields are required: name, email, password, adminSecret"
    );
  }

  // Verify admin secret key
  const envAdminSecret = process.env.ADMIN_SECRET;

  if (!envAdminSecret) {
    throw ApiError.internal(
      "Admin secret not configured on server. Contact system administrator."
    );
  }

  if (adminSecret !== envAdminSecret) {
    throw ApiError.forbidden("Invalid admin secret key. Access denied.");
  }

  // Check if admin already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw ApiError.conflict("User with this email already exists");
  }

  // Create admin user
  const admin = await User.create({
    name,
    email,
    password,
    role: "admin",
    info: {},
  });

  // Remove password from response
  const createdAdmin = await User.findById(admin._id).select(
    "-password -refreshToken"
  );

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { user: createdAdmin },
        "Admin account created successfully. Please login to continue."
      )
    );
});
