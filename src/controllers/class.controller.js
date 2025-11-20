import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import Class from "../models/class.model.js";
import crypto from "crypto";

/**
 * Generate unique 6-character class code
 */
const generateClassCode = () => {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
};

/**
 * Create Class (Teacher/Admin only)
 * POST /api/v1/class/create
 */
export const createClass = asyncHandler(async (req, res) => {
  const { name, department, semester, batch, academicYear } = req.body;

  // Validate required fields
  if (!name || !department || !semester) {
    throw ApiError.badRequest("Name, department, and semester are required");
  }

  // Validate semester
  if (semester < 1 || semester > 8) {
    throw ApiError.badRequest("Semester must be between 1 and 8");
  }

  // Generate unique code
  let code;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    code = generateClassCode();
    const existingClass = await Class.findOne({ code });
    if (!existingClass) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    throw ApiError.internal(
      "Failed to generate unique class code. Please try again"
    );
  }

  // Create class
  const newClass = await Class.create({
    name,
    code,
    teacher: req.user._id,
    department,
    semester,
    batch: batch || "",
    academicYear: academicYear || new Date().getFullYear().toString(),
    students: [],
  });

  // Populate teacher info
  const populatedClass = await Class.findById(newClass._id)
    .populate("teacher", "name email role")
    .select("-__v");

  res
    .status(201)
    .json(new ApiResponse(201, populatedClass, "Class created successfully"));
});

/**
 * Join Class (Student only)
 * POST /api/v1/class/join
 */
export const joinClass = asyncHandler(async (req, res) => {
  const { code } = req.body;

  // Validate code
  if (!code) {
    throw ApiError.badRequest("Class code is required");
  }

  // Find class by code
  const classDoc = await Class.findOne({ code: code.toUpperCase() });

  if (!classDoc) {
    throw ApiError.notFound("Class not found with this code");
  }

  // Check if student is already enrolled
  if (classDoc.students.includes(req.user._id)) {
    throw ApiError.conflict("You are already enrolled in this class");
  }

  // Validate semester match (optional warning)
  const studentSemester = req.user.info?.semester;
  if (studentSemester && studentSemester !== classDoc.semester) {
    // Return warning but allow joining
    const updatedClass = await Class.findByIdAndUpdate(
      classDoc._id,
      { $addToSet: { students: req.user._id } },
      { new: true }
    )
      .populate("teacher", "name email")
      .populate("students", "name email info");

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          class: updatedClass,
          warning: `Your semester (${studentSemester}) does not match the class semester (${classDoc.semester})`,
        },
        "Joined class successfully with semester mismatch warning"
      )
    );
  }

  // Add student to class using $addToSet (prevents duplicates)
  const updatedClass = await Class.findByIdAndUpdate(
    classDoc._id,
    { $addToSet: { students: req.user._id } },
    { new: true }
  )
    .populate("teacher", "name email")
    .populate("students", "name email info");

  res
    .status(200)
    .json(new ApiResponse(200, updatedClass, "Joined class successfully"));
});

/**
 * Get All Classes
 * GET /api/v1/class
 */
export const getAllClasses = asyncHandler(async (req, res) => {
  let classes;

  if (req.user.role === "teacher" || req.user.role === "admin") {
    // Get classes created by teacher
    classes = await Class.find({ teacher: req.user._id })
      .populate("teacher", "name email role")
      .populate("students", "name email info")
      .sort({ createdAt: -1 });
  } else if (req.user.role === "student") {
    // Get classes student has joined
    classes = await Class.find({ students: req.user._id })
      .populate("teacher", "name email role")
      .populate("students", "name email info")
      .sort({ createdAt: -1 });
  } else {
    throw ApiError.forbidden("Invalid role");
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        count: classes.length,
        classes,
      },
      "Classes retrieved successfully"
    )
  );
});

/**
 * Get Class Details
 * GET /api/v1/class/:id
 */
export const getClassDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const classDoc = await Class.findById(id)
    .populate("teacher", "name email role info")
    .populate("students", "name email info");

  if (!classDoc) {
    throw ApiError.notFound("Class not found");
  }

  // Check if user has access to this class
  const isTeacher = classDoc.teacher._id.toString() === req.user._id.toString();
  const isStudent = classDoc.students.some(
    (student) => student._id.toString() === req.user._id.toString()
  );
  const isAdmin = req.user.role === "admin";

  if (!isTeacher && !isStudent && !isAdmin) {
    throw ApiError.forbidden("You do not have access to this class");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, classDoc, "Class details retrieved successfully")
    );
});
