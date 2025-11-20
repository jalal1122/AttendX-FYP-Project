import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";

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

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    role,
    info: info || {},
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

  // Generate tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  // Remove password and refresh token from response
  const loggedInUser = await User.findById(user._id).select(
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
