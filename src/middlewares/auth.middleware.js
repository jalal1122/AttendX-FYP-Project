import jwt from "jsonwebtoken";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import User from "../models/user.model.js";

/**
 * Verify JWT Middleware
 * Protects routes by verifying the access token
 */
export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    // Get token from header or cookies
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw ApiError.unauthorized("Access token is required");
    }

    // Verify token
    const decodedToken = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Find user
    const user = await User.findById(decodedToken._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw ApiError.unauthorized("Invalid access token");
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    throw ApiError.unauthorized(error?.message || "Invalid access token");
  }
});
