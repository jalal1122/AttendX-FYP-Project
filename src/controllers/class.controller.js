import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import User from "../models/user.model.js";
import Class from "../models/class.model.js";
import Session from "../models/session.model.js";
import Attendance from "../models/attendance.model.js";
import crypto from "crypto";

/**
 * Generate unique 6-character class code
 */
const generateClassCode = () => {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
};

const classNamePattern = /^[A-Za-z0-9][A-Za-z0-9 ]*\sSection\s[A-Z]$/i;

/**
 * Create Class (Teacher/Admin only)
 * POST /api/v1/class/create
 */
export const createClass = asyncHandler(async (req, res) => {
  const { name, department, semester, batch, academicYear, sections } =
    req.body;

  const trimmedName = typeof name === "string" ? name.trim() : "";

  // Validate required fields
  if (!trimmedName || !department || !semester) {
    throw ApiError.badRequest("Name, department, and semester are required");
  }

  if (!classNamePattern.test(trimmedName)) {
    throw ApiError.badRequest(
      "Class name must end with 'Section A' through 'Section Z'",
    );
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
    const existingClass = await Class.findOne({ code }).select("_id").lean();
    if (!existingClass) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    throw ApiError.internal(
      "Failed to generate unique class code. Please try again",
    );
  }

  // Parse sections if provided (frontend may send JSON string)
  let parsedSections = [];
  if (sections) {
    try {
      parsedSections =
        typeof sections === "string" ? JSON.parse(sections) : sections;
    } catch (err) {
      parsedSections = sections;
    }
  }

  // Flatten students from sections into class-level students (unique)
  const sectionStudentIds = new Set();
  parsedSections.forEach((s) => {
    (s.students || []).forEach((stu) => sectionStudentIds.add(stu.toString()));
  });

  // Create class
  const newClass = await Class.create({
    name: trimmedName,
    code,
    teacher: req.user._id,
    department,
    semester,
    batch: batch || "",
    academicYear: academicYear || new Date().getFullYear().toString(),
    students: Array.from(sectionStudentIds),
    sections: parsedSections,
  });

  // Populate teacher info
  await newClass.populate("teacher", "name email role");
  const populatedClass = newClass.toObject();
  delete populatedClass.__v;

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

  // --- Strict Validation: Semester, Department, Batch ---
  const studentInfo = req.user.info || {};

  // 1. Semester validation
  const studentSemester = studentInfo.semester;
  if (studentSemester && studentSemester !== classDoc.semester) {
    throw ApiError.badRequest(
      `Your semester (${studentSemester}) does not match the class requirement (Semester ${classDoc.semester}). You cannot join this class.`,
    );
  }

  // 2. Department validation
  const studentDepartment = studentInfo.department;
  if (
    studentDepartment &&
    classDoc.department &&
    studentDepartment.toLowerCase() !== classDoc.department.toLowerCase()
  ) {
    throw ApiError.badRequest(
      `Your department (${studentDepartment}) does not match the class department (${classDoc.department}). You cannot join this class.`,
    );
  }

  // 3. Batch validation (only if the class has a batch set)
  const studentBatch = studentInfo.batch;
  if (
    classDoc.batch &&
    studentBatch &&
    studentBatch.toLowerCase() !== classDoc.batch.toLowerCase()
  ) {
    throw ApiError.badRequest(
      `Your batch (${studentBatch}) does not match the class batch (${classDoc.batch}). You cannot join this class.`,
    );
  }

  // Add student to class using $addToSet (prevents duplicates)
  const updatedClass = await Class.findByIdAndUpdate(
    classDoc._id,
    { $addToSet: { students: req.user._id } },
    { new: true },
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
  let query = {};
  if (req.user.role === "teacher") {
    query = { teacher: req.user._id };
  } else if (req.user.role === "student") {
    query = { students: req.user._id };
  } else if (req.user.role !== "admin") {
    throw ApiError.forbidden("Invalid role");
  }
  const classes = await Class.find(query)
    .populate("teacher", "name email role")
    .populate("students", "name email info")
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json(
    new ApiResponse(
      200,
      {
        count: classes.length,
        classes,
      },
      "Classes retrieved successfully",
    ),
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
    .populate("students", "name email info")
    .populate("sections.students", "name email info");

  if (!classDoc) {
    throw ApiError.notFound("Class not found");
  }

  // Check if user has access to this class
  const isTeacher = classDoc.teacher._id.toString() === req.user._id.toString();
  const isStudent = classDoc.students.some(
    (student) => student._id.toString() === req.user._id.toString(),
  );
  const isAdmin = req.user.role === "admin";

  if (!isTeacher && !isStudent && !isAdmin) {
    throw ApiError.forbidden("You do not have access to this class");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, classDoc, "Class details retrieved successfully"),
    );
});

/**
 * Unjoin Class (Student Self-Leave)
 * POST /api/v1/class/unjoin
 * Removes student from class but preserves attendance records for audit trail
 */
export const unjoinClass = asyncHandler(async (req, res) => {
  const { classId } = req.body;

  if (!classId) {
    throw ApiError.badRequest("Class ID is required");
  }

  const classExists = await Class.exists({ _id: classId });
  if (!classExists) {
    throw ApiError.notFound("Class not found");
  }

  const removed = await Class.updateOne(
    { _id: classId, students: req.user._id },
    { $pull: { students: req.user._id } },
  );
  if (removed.modifiedCount === 0) {
    throw ApiError.badRequest("You are not enrolled in this class");
  }

  // NOTE: We do NOT delete attendance records - preserving for audit trail

  res
    .status(200)
    .json(new ApiResponse(200, null, "Successfully left the class"));
});

/**
 * Remove Student (Teacher Kick)
 * POST /api/v1/class/remove-student
 * Teacher removes student from class but preserves attendance records
 */
export const removeStudent = asyncHandler(async (req, res) => {
  const { classId, studentId } = req.body;

  if (!classId || !studentId) {
    throw ApiError.badRequest("Class ID and Student ID are required");
  }

  const classDoc = await Class.findById(classId)
    .select("teacher students")
    .lean();
  if (!classDoc) {
    throw ApiError.notFound("Class not found");
  }
  if (
    req.user.role !== "admin" &&
    classDoc.teacher.toString() !== req.user._id.toString()
  ) {
    throw ApiError.forbidden(
      "Only the class teacher or admin can remove students",
    );
  }

  // Check if student is actually in this class
  const isEnrolled = classDoc.students.some(
    (id) => id.toString() === studentId,
  );

  if (!isEnrolled) {
    throw ApiError.badRequest("Student is not enrolled in this class");
  }

  // Remove student from class using $pull
  await Class.findByIdAndUpdate(classId, {
    $pull: { students: studentId },
  });

  // NOTE: Attendance records are preserved for audit trail (Scenario A)

  res
    .status(200)
    .json(new ApiResponse(200, null, "Student removed successfully"));
});

/**
 * Promote Class Students to the Next Semester
 * POST /api/v1/class/:id/promote-semester
 */
export const promoteClassStudents = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { targetSemester } = req.body;

  const classDoc = await Class.findById(id)
    .select("teacher students semester name")
    .lean();

  if (!classDoc) {
    throw ApiError.notFound("Class not found");
  }

  if (
    req.user.role !== "admin" &&
    classDoc.teacher.toString() !== req.user._id.toString()
  ) {
    throw ApiError.forbidden(
      "Only the class teacher or admin can promote students",
    );
  }

  const currentSemester = Number(classDoc.semester);
  const parsedTargetSemester =
    targetSemester !== undefined && targetSemester !== ""
      ? Number.parseInt(targetSemester, 10)
      : currentSemester + 1;

  if (
    !Number.isInteger(parsedTargetSemester) ||
    parsedTargetSemester < 1 ||
    parsedTargetSemester > 8
  ) {
    throw ApiError.badRequest("Target semester must be between 1 and 8");
  }

  if (parsedTargetSemester <= currentSemester) {
    throw ApiError.badRequest(
      "Target semester must be greater than the current class semester",
    );
  }

  if (!classDoc.students.length) {
    throw ApiError.badRequest("No students are enrolled in this class");
  }

  const updateResult = await User.updateMany(
    { _id: { $in: classDoc.students }, role: "student" },
    { $set: { "info.semester": parsedTargetSemester } },
  );

  const updatedClass = await Class.findByIdAndUpdate(
    id,
    { $set: { semester: parsedTargetSemester } },
    { new: true },
  )
    .populate("teacher", "name email role")
    .populate("students", "name email info");

  res.status(200).json(
    new ApiResponse(
      200,
      {
        class: updatedClass,
        promotedStudents: updateResult.modifiedCount,
        targetSemester: parsedTargetSemester,
      },
      `Promoted ${updateResult.modifiedCount} student(s) to semester ${parsedTargetSemester}`,
    ),
  );
});

/**
 * Update Class Details
 * PUT /api/v1/class/:id
 * Teacher/Admin can update class name, room, semester, department
 */
export const updateClassDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, room, semester, department, batch, academicYear, sections } =
    req.body;

  // Validate semester if provided
  if (semester && (semester < 1 || semester > 8)) {
    throw ApiError.badRequest("Semester must be between 1 and 8");
  }

  const existingClass = await Class.findById(id).select("teacher").lean();
  if (!existingClass) {
    throw ApiError.notFound("Class not found");
  }
  if (
    req.user.role !== "admin" &&
    existingClass.teacher.toString() !== req.user._id.toString()
  ) {
    throw ApiError.forbidden(
      "Only the class teacher or admin can update class details",
    );
  }

  const updates = {};
  if (name) updates.name = name;
  if (room) updates.room = room;
  if (semester) updates.semester = semester;
  if (department) updates.department = department;
  if (batch) updates.batch = batch;
  if (academicYear) updates.academicYear = academicYear;
  if (sections) {
    try {
      const parsed =
        typeof sections === "string" ? JSON.parse(sections) : sections;
      updates.sections = parsed;
      // Also update class-level students to include students from sections
      const sectionStudentIds = new Set();
      parsed.forEach((s) =>
        (s.students || []).forEach((st) => sectionStudentIds.add(st)),
      );
      updates.students = Array.from(sectionStudentIds);
    } catch (err) {
      updates.sections = sections;
    }
  }

  const classDoc = await Class.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true },
  );

  res
    .status(200)
    .json(new ApiResponse(200, classDoc, "Class updated successfully"));
});

/**
 * Delete Class (Nuclear Option)
 * DELETE /api/v1/class/:id
 * Deletes class and cascade deletes all sessions and attendance records
 */
export const deleteClass = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const classDoc = await Class.findById(id);

  if (!classDoc) {
    throw ApiError.notFound("Class not found");
  }

  // Verify teacher ownership or admin
  const isTeacher = classDoc.teacher.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";

  if (!isTeacher && !isAdmin) {
    throw ApiError.forbidden(
      "Only the class teacher or admin can delete this class",
    );
  }

  // Cascade delete: Delete all sessions for this class
  const [deletedSessions, deletedAttendance] = await Promise.all([
    Session.deleteMany({ classId: id }),
    Attendance.deleteMany({ classId: id }),
  ]);

  // Finally, delete the class itself
  await Class.findByIdAndDelete(id);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        deletedSessions: deletedSessions.deletedCount,
        deletedAttendance: deletedAttendance.deletedCount,
      },
      "Class and all related data deleted successfully",
    ),
  );
});
