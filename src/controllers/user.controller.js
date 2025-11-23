import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import User from "../models/user.model.js";

/**
 * Get All Users (Admin only)
 * GET /api/v1/user/all
 */
export const getAllUsers = asyncHandler(async (req, res) => {
  const { role, search } = req.query;

  let query = {};

  // Filter by role if provided
  if (role && ["student", "teacher", "admin"].includes(role)) {
    query.role = role;
  }

  // Search by name or email
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const users = await User.find(query)
    .select("-password -refreshToken")
    .sort({ createdAt: -1 });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        count: users.length,
        users,
      },
      "Users retrieved successfully"
    )
  );
});

/**
 * Get User Statistics (Admin only)
 * GET /api/v1/user/stats
 */
export const getUserStats = asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments();
  const totalStudents = await User.countDocuments({ role: "student" });
  const totalTeachers = await User.countDocuments({ role: "teacher" });
  const totalAdmins = await User.countDocuments({ role: "admin" });

  // Get users created in the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentUsers = await User.countDocuments({
    createdAt: { $gte: thirtyDaysAgo },
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        totalUsers,
        totalStudents,
        totalTeachers,
        totalAdmins,
        recentUsers,
      },
      "User statistics retrieved successfully"
    )
  );
});

/**
 * Get User Details (Admin only)
 * GET /api/v1/user/:id
 */
export const getUserDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id).select("-password -refreshToken");

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, user, "User details retrieved successfully"));
});

/**
 * Update User Role (Admin only)
 * PATCH /api/v1/user/:id/role
 */
export const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!role || !["student", "teacher", "admin"].includes(role)) {
    throw ApiError.badRequest(
      "Invalid role. Must be student, teacher, or admin"
    );
  }

  const user = await User.findById(id).select("-password -refreshToken");

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  // Prevent changing own role
  if (user._id.toString() === req.user._id.toString()) {
    throw ApiError.badRequest("Cannot change your own role");
  }

  user.role = role;
  await user.save({ validateBeforeSave: false });

  res
    .status(200)
    .json(new ApiResponse(200, user, "User role updated successfully"));
});

/**
 * Delete User (Admin only)
 * DELETE /api/v1/user/:id
 */
export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  // Prevent deleting own account
  if (user._id.toString() === req.user._id.toString()) {
    throw ApiError.badRequest("Cannot delete your own account");
  }

  await User.findByIdAndDelete(id);

  res.status(200).json(new ApiResponse(200, null, "User deleted successfully"));
});
