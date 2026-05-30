import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import User from "../models/user.model.js";
import { uploadToCloudinary } from "../../config/cloudinary.js";
import EmailService from "../services/email.service.js";
import fs from "fs";
import bcrypt from "bcryptjs";
import XLSX from "xlsx";

const studentSpreadsheetAliases = {
  name: ["name", "studentname", "fullname"],
  email: ["email", "emailaddress", "studentemail"],
  password: ["password", "temppassword", "initialpassword"],
  rollNo: ["rollno", "rollnumber", "roll"],
  section: ["section", "sec"],
  semester: ["semester", "sem"],
  department: ["department", "dept"],
  batch: ["batch", "admissionbatch"],
  year: ["year", "academicyear", "classyear"],
};

const normalizeSpreadsheetKey = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const normalizeSpreadsheetValue = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value).trim();
  return String(value).trim();
};

const readSpreadsheetRow = (row) => {
  const mapped = {};

  for (const [key, value] of Object.entries(row || {})) {
    const normalizedKey = normalizeSpreadsheetKey(key);

    for (const [field, aliases] of Object.entries(studentSpreadsheetAliases)) {
      if (aliases.includes(normalizedKey)) {
        mapped[field] = normalizeSpreadsheetValue(value);
        break;
      }
    }
  }

  return mapped;
};

const parseStudentSpreadsheet = (buffer) => {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw ApiError.badRequest("The spreadsheet does not contain any sheets");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
    blankrows: false,
  });

  if (!rows.length) {
    throw ApiError.badRequest(
      "The spreadsheet does not contain any student rows",
    );
  }

  return rows.map((row, index) => ({
    rowNumber: index + 2,
    data: readSpreadsheetRow(row),
  }));
};

const buildBulkStudentValidationError = (rowNumber, messages) =>
  `Row ${rowNumber}: ${messages.join(", ")}`;

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Get All Users (Admin only)
 * GET /api/v1/user/all
 */
export const getAllUsers = asyncHandler(async (req, res) => {
  const {
    role,
    search,
    department,
    semester,
    batch,
    year,
    name,
    email,
    rollNo,
  } = req.query;

  let query = {};

  // Filter by role if provided
  if (role && ["student", "teacher", "admin"].includes(role)) {
    query.role = role;
  }

  // Search by name or email
  if (search) {
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { "info.rollNo": { $regex: search, $options: "i" } },
      ],
    });
  }

  if (name) {
    query.$and = query.$and || [];
    query.$and.push({ name: { $regex: escapeRegex(name), $options: "i" } });
  }

  if (email) {
    query.$and = query.$and || [];
    query.$and.push({ email: { $regex: escapeRegex(email), $options: "i" } });
  }

  if (rollNo) {
    query.$and = query.$and || [];
    query.$and.push({
      "info.rollNo": { $regex: escapeRegex(rollNo), $options: "i" },
    });
  }

  if (department) {
    query.$and = query.$and || [];
    query.$and.push({
      "info.department": {
        $regex: `^${escapeRegex(department)}$`,
        $options: "i",
      },
    });
  }

  if (semester) {
    query.$and = query.$and || [];
    query.$and.push({ "info.semester": String(semester) });
  }

  if (batch) {
    query.$and = query.$and || [];
    query.$and.push({
      "info.batch": { $regex: `^${escapeRegex(batch)}$`, $options: "i" },
    });
  }

  if (year) {
    query.$and = query.$and || [];
    query.$and.push({ "info.year": String(year) });
  }

  const users = await User.find(query)
    .select("-password -refreshToken")
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json(
    new ApiResponse(
      200,
      {
        count: users.length,
        users,
      },
      "Users retrieved successfully",
    ),
  );
});

/**
 * Get User Statistics (Admin only)
 * GET /api/v1/user/stats
 */
export const getUserStats = asyncHandler(async (req, res) => {
  // Get users created in the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const [totalUsers, totalStudents, totalTeachers, totalAdmins, recentUsers] =
    await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "teacher" }),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({
        createdAt: { $gte: thirtyDaysAgo },
      }),
    ]);

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
      "User statistics retrieved successfully",
    ),
  );
});

/**
 * Get User Details (Admin only)
 * GET /api/v1/user/:id
 */
export const getUserDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id).select("-password -refreshToken").lean();

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
      "Invalid role. Must be student, teacher, or admin",
    );
  }

  // Prevent changing own role
  if (id === req.user._id.toString()) {
    throw ApiError.badRequest("Cannot change your own role");
  }

  const user = await User.findByIdAndUpdate(
    id,
    { $set: { role } },
    { new: true, runValidators: true },
  )
    .select("-password -refreshToken")
    .lean();

  if (!user) {
    throw ApiError.notFound("User not found");
  }

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

  // Prevent deleting own account
  if (id === req.user._id.toString()) {
    throw ApiError.badRequest("Cannot delete your own account");
  }

  const deletedUser = await User.findByIdAndDelete(id).select("_id").lean();
  if (!deletedUser) {
    throw ApiError.notFound("User not found");
  }

  res.status(200).json(new ApiResponse(200, null, "User deleted successfully"));
});

/**
 * Create User (Admin only)
 * POST /api/v1/user/create
 */
export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, info } = req.body;

  // Validate required fields
  if (!name || !email || !password || !role) {
    throw ApiError.badRequest(
      "All fields are required: name, email, password, role",
    );
  }

  // Validate role
  if (!["admin", "teacher", "student"].includes(role)) {
    throw ApiError.badRequest(
      "Invalid role. Must be admin, teacher, or student",
    );
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw ApiError.conflict("User with this email already exists");
  }

  // Handle avatar upload
  let avatarUrl = null;
  if (req.file) {
    try {
      avatarUrl = await uploadToCloudinary(req.file.path);
      // Delete local file after upload (safe for serverless)
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        // Ignore unlink errors in serverless environments
        console.log("Temp file cleanup skipped (serverless environment)");
      }
    } catch (error) {
      console.error("Avatar upload error:", error);
      // Continue without avatar if upload fails
    }
  }

  // Parse info if it's a JSON string
  let parsedInfo = info;
  if (typeof info === "string") {
    try {
      parsedInfo = JSON.parse(info);
    } catch (error) {
      parsedInfo = {};
    }
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    role,
    info: parsedInfo || {},
    avatar: avatarUrl,
  });

  // Remove sensitive data
  const userResponse = user.toObject();
  delete userResponse.password;
  delete userResponse.refreshToken;

  // Send welcome email
  try {
    await EmailService.sendWelcomeEmail(user, password);
  } catch (emailError) {
    console.error("Failed to send welcome email:", emailError);
    // Don't fail user creation if email fails
  }

  res
    .status(201)
    .json(new ApiResponse(201, userResponse, "User created successfully"));
});

/**
 * Bulk Create Student Users (Admin only)
 * POST /api/v1/user/bulk-students
 */
export const bulkCreateStudents = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest("An Excel sheet file is required");
  }

  const spreadsheetRows = parseStudentSpreadsheet(req.file.buffer);
  const validationErrors = [];
  const emails = [];
  const seenEmails = new Set();
  const preparedStudents = [];

  for (const { rowNumber, data } of spreadsheetRows) {
    const rowErrors = [];

    const name = normalizeSpreadsheetValue(data.name);
    const email = normalizeSpreadsheetValue(data.email).toLowerCase();
    const password = normalizeSpreadsheetValue(data.password);
    const rollNo = normalizeSpreadsheetValue(data.rollNo);
    const section = normalizeSpreadsheetValue(data.section).toUpperCase();
    const semesterRaw = normalizeSpreadsheetValue(data.semester);
    const department = normalizeSpreadsheetValue(data.department);
    const batch = normalizeSpreadsheetValue(data.batch);
    const year = normalizeSpreadsheetValue(data.year);

    if (!name) rowErrors.push("name is required");
    if (!email) rowErrors.push("email is required");
    if (!password) rowErrors.push("password is required");
    if (!rollNo) rowErrors.push("rollNo is required");
    if (!semesterRaw) rowErrors.push("semester is required");
    if (!department) rowErrors.push("department is required");
    if (!batch) rowErrors.push("batch is required");
    if (!year) rowErrors.push("year is required");

    const semester = Number.parseInt(semesterRaw, 10);
    if (
      semesterRaw &&
      (!Number.isInteger(semester) || semester < 1 || semester > 8)
    ) {
      rowErrors.push("semester must be a number between 1 and 8");
    }

    if (password && password.length < 6) {
      rowErrors.push("password must be at least 6 characters");
    }

    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      rowErrors.push("email is invalid");
    }

    if (email) {
      if (seenEmails.has(email)) {
        rowErrors.push("email is duplicated within the spreadsheet");
      }
      seenEmails.add(email);
      emails.push(email);
    }

    if (rowErrors.length) {
      validationErrors.push(
        buildBulkStudentValidationError(rowNumber, rowErrors),
      );
      continue;
    }

    preparedStudents.push({
      rowNumber,
      name,
      email,
      password,
      info: {
        rollNo,
        section: section || undefined,
        semester,
        department,
        batch,
        year,
      },
    });
  }

  if (validationErrors.length) {
    throw ApiError.badRequest(
      `Invalid spreadsheet data: ${validationErrors.join(" | ")}`,
    );
  }

  const existingUsers = await User.find({ email: { $in: emails } })
    .select("email")
    .lean();

  if (existingUsers.length) {
    throw ApiError.conflict(
      `The following emails already exist: ${existingUsers
        .map((user) => user.email)
        .join(", ")}`,
    );
  }

  const documents = await Promise.all(
    preparedStudents.map(async (student) => ({
      name: student.name,
      email: student.email,
      password: await bcrypt.hash(student.password, 10),
      role: "student",
      info: student.info,
    })),
  );

  const createdUsers = await User.insertMany(documents, { ordered: true });

  await Promise.allSettled(
    preparedStudents.map((student, index) =>
      EmailService.sendWelcomeEmail(createdUsers[index], student.password),
    ),
  );

  res.status(201).json(
    new ApiResponse(
      201,
      {
        createdCount: createdUsers.length,
        users: createdUsers.map((user) => ({
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          info: user.info,
        })),
      },
      `${createdUsers.length} student accounts created successfully`,
    ),
  );
});

/**
 * Update User (Admin only)
 * PUT /api/v1/user/:id
 * Admin can update name, mobileNumber, and info fields
 * Email and password CANNOT be changed via this endpoint
 */
export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, mobileNumber, info, email, password } = req.body;

  // Security: Prevent email/password changes
  if (email || password) {
    throw ApiError.badRequest(
      "Email and password cannot be changed through this endpoint. Use dedicated password reset/change endpoints.",
    );
  }

  const user = await User.findById(id);

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  // Update allowed fields
  if (name) user.name = name;
  if (mobileNumber !== undefined) user.mobileNumber = mobileNumber;
  if (info) {
    // Merge with existing info
    user.info = { ...user.info, ...info };
  }

  await user.save();

  // Remove sensitive data
  const userResponse = user.toObject();
  delete userResponse.password;
  delete userResponse.refreshToken;
  delete userResponse.twoFactorSecret;

  res
    .status(200)
    .json(new ApiResponse(200, userResponse, "User updated successfully"));
});

/**
 * Reset User Device Binding (Admin only)
 * POST /api/v1/user/:id/reset-device
 */
export const resetUserDevice = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findByIdAndUpdate(
    id,
    { $set: { deviceId: null } },
    { new: true },
  )
    .select("_id deviceId")
    .lean();
  if (!user) {
    throw ApiError.notFound("User not found");
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        _id: user._id,
        deviceId: user.deviceId,
      },
      "User device binding reset successfully. The user can now bind a new device on next attendance.",
    ),
  );
});
