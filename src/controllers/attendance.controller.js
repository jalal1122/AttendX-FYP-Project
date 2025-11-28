import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import Attendance from "../models/attendance.model.js";
import Session from "../models/session.model.js";
import Class from "../models/class.model.js";
import jwt from "jsonwebtoken";
import { calculateDistance, isWithinRadius } from "../utils/geolocation.js";

/**
 * Get client IP address (handles proxies and localhost)
 */
const getClientIP = (req) => {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    req.headers["x-real-ip"] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.ip
  );
};

/**
 * Mark Attendance via QR Scan (Student)
 * POST /api/v1/attendance/scan
 */
export const markAttendance = asyncHandler(async (req, res) => {
  const { token, latitude, longitude, deviceId } = req.body;

  // Validate token
  if (!token) {
    throw ApiError.badRequest("QR token is required");
  }

  // Verify student role
  if (req.user.role !== "student") {
    throw ApiError.forbidden("Only students can mark attendance via QR scan");
  }

  // Verify and decode token
  let decodedToken;
  try {
    decodedToken = jwt.verify(
      token,
      process.env.QR_SECRET || process.env.JWT_ACCESS_SECRET
    );
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw ApiError.badRequest(
        "QR code has expired. Please refresh and try again."
      );
    }
    throw ApiError.badRequest("Invalid QR token");
  }

  const { sessionId, classId } = decodedToken;

  // Find session with security config
  const session = await Session.findById(sessionId);
  if (!session) {
    throw ApiError.notFound("Session not found");
  }

  // Check if session is active
  if (!session.active) {
    throw ApiError.badRequest("Session is no longer active");
  }

  // Get security config (with defaults if not set)
  const securityConfig = session.securityConfig || {
    radius: 50,
    ipMatchEnabled: true,
    deviceLockEnabled: false,
    qrRefreshRate: 20,
    manualApproval: false,
  };

  // 1. GEOFENCING CHECK - Use dynamic radius from securityConfig
  if (
    session.location &&
    session.location.latitude &&
    session.location.longitude
  ) {
    if (!latitude || !longitude) {
      throw ApiError.badRequest("Location is required for this session");
    }

    const studentLat = parseFloat(latitude);
    const studentLon = parseFloat(longitude);
    const sessionLat = session.location.latitude;
    const sessionLon = session.location.longitude;
    const allowedRadius = securityConfig.radius || 50;

    const distance = calculateDistance(
      sessionLat,
      sessionLon,
      studentLat,
      studentLon
    );

    if (
      !isWithinRadius(
        sessionLat,
        sessionLon,
        studentLat,
        studentLon,
        allowedRadius
      )
    ) {
      throw ApiError.badRequest(
        `You are too far from the class location (${distance}m away, ${allowedRadius}m allowed). Please move closer to mark attendance.`
      );
    }

    console.log(
      `✓ Geofencing passed: Student is ${distance}m away (within ${allowedRadius}m radius)`
    );
  }

  // Find class
  const classDoc = await Class.findById(classId);
  if (!classDoc) {
    throw ApiError.notFound("Class not found");
  }

  // Check if student is enrolled in this class
  const isEnrolled = classDoc.students.some(
    (student) => student.toString() === req.user._id.toString()
  );

  if (!isEnrolled) {
    throw ApiError.forbidden("You are not enrolled in this class");
  }

  // 2. IP CHECK - Only validate if ipMatchEnabled
  const studentIP = getClientIP(req);
  const teacherIP = session.teacherIP;
  let ipMatch = true;

  if (securityConfig.ipMatchEnabled) {
    if (studentIP !== teacherIP) {
      console.log("⚠️  IP Mismatch Warning:");
      console.log(`   Teacher IP: ${teacherIP}`);
      console.log(`   Student IP: ${studentIP}`);
      console.log(
        "   IP matching is enabled but IPs don't match. (Normal on localhost)"
      );
      ipMatch = false;
    }
  }

  // 3. DEVICE LOCK CHECK - Anti-buddy punching
  if (securityConfig.deviceLockEnabled) {
    if (!deviceId) {
      throw ApiError.badRequest("Device ID is required for this session");
    }

    // Check if this device has already been used for this session by a DIFFERENT student
    const deviceUsage = await Attendance.findOne({
      sessionId,
      deviceId,
    });

    if (
      deviceUsage &&
      deviceUsage.studentId.toString() !== req.user._id.toString()
    ) {
      throw ApiError.forbidden(
        "Security Alert: This device has already marked attendance for this session."
      );
    }
  }

  // Check if attendance already marked
  const existingAttendance = await Attendance.findOne({
    sessionId,
    studentId: req.user._id,
  });

  if (existingAttendance) {
    throw ApiError.conflict(
      `Attendance already marked as ${existingAttendance.status}`
    );
  }

  // 4. MANUAL APPROVAL - Determine status
  const attendanceStatus = securityConfig.manualApproval
    ? "Pending"
    : "Present";

  // Create attendance record
  const attendance = await Attendance.create({
    sessionId,
    studentId: req.user._id,
    classId,
    status: attendanceStatus,
    verificationMethod: "QR",
    deviceId: deviceId || null,
    date: new Date(),
  });

  // Populate references
  const populatedAttendance = await Attendance.findById(attendance._id)
    .populate("studentId", "name email info")
    .populate("sessionId", "startTime type")
    .populate("classId", "name code");

  const message = securityConfig.manualApproval
    ? "Attendance marked as pending. Waiting for teacher approval."
    : "Attendance marked successfully";

  res.status(201).json(
    new ApiResponse(
      201,
      {
        attendance: populatedAttendance,
        ipMatch,
        requiresApproval: securityConfig.manualApproval,
      },
      message
    )
  );
});

/**
 * Manual Attendance Update (Teacher Override)
 * PATCH /api/v1/attendance/update
 */
export const manualUpdate = asyncHandler(async (req, res) => {
  const { sessionId, studentId, status } = req.body;

  // Validate required fields
  if (!sessionId || !studentId || !status) {
    throw ApiError.badRequest(
      "Session ID, student ID, and status are required"
    );
  }

  // Validate status
  const validStatuses = ["Present", "Absent", "Late", "Leave"];
  if (!validStatuses.includes(status)) {
    throw ApiError.badRequest(
      `Status must be one of: ${validStatuses.join(", ")}`
    );
  }

  // Find session
  const session = await Session.findById(sessionId);
  if (!session) {
    throw ApiError.notFound("Session not found");
  }

  // Verify teacher owns this session or is admin
  const isTeacher = session.teacherId.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";

  if (!isTeacher && !isAdmin) {
    throw ApiError.forbidden(
      "You are not authorized to update attendance for this session"
    );
  }

  // Find class
  const classDoc = await Class.findById(session.classId);
  if (!classDoc) {
    throw ApiError.notFound("Class not found");
  }

  // Check if student is enrolled in this class
  const isEnrolled = classDoc.students.some(
    (student) => student.toString() === studentId
  );

  if (!isEnrolled) {
    throw ApiError.badRequest("Student is not enrolled in this class");
  }

  // Update or create attendance record (upsert)
  const attendance = await Attendance.findOneAndUpdate(
    { sessionId, studentId },
    {
      sessionId,
      studentId,
      classId: session.classId,
      status,
      verificationMethod: "Manual",
      date: new Date(session.startTime),
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
    }
  )
    .populate("studentId", "name email info")
    .populate("sessionId", "startTime type")
    .populate("classId", "name code");

  res
    .status(200)
    .json(new ApiResponse(200, attendance, "Attendance updated successfully"));
});

/**
 * Get Attendance for a Session
 * GET /api/v1/attendance/session/:sessionId
 */
export const getAttendanceBySession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  // Find session
  const session = await Session.findById(sessionId);
  if (!session) {
    throw ApiError.notFound("Session not found");
  }

  // Find class
  const classDoc = await Class.findById(session.classId).populate(
    "students",
    "name email info"
  );
  if (!classDoc) {
    throw ApiError.notFound("Class not found");
  }

  // Check if user has access
  const isTeacher = session.teacherId.toString() === req.user._id.toString();
  const isStudent = classDoc.students.some(
    (student) => student._id.toString() === req.user._id.toString()
  );
  const isAdmin = req.user.role === "admin";

  if (!isTeacher && !isStudent && !isAdmin) {
    throw ApiError.forbidden("You do not have access to this session");
  }

  // Get attendance records
  const attendanceRecords = await Attendance.find({ sessionId })
    .populate("studentId", "name email info")
    .sort({ createdAt: 1 });

  // Get list of all enrolled students
  const allStudents = classDoc.students;

  // Create a map of attendance
  const attendanceMap = new Map();
  attendanceRecords.forEach((record) => {
    attendanceMap.set(record.studentId._id.toString(), record);
  });

  // Build complete list with attendance status
  const completeAttendanceList = allStudents.map((student) => {
    const attendance = attendanceMap.get(student._id.toString());
    return {
      student: {
        _id: student._id,
        name: student.name,
        email: student.email,
        info: student.info,
      },
      status: attendance ? attendance.status : "Absent",
      verificationMethod: attendance ? attendance.verificationMethod : null,
      markedAt: attendance ? attendance.createdAt : null,
      attendanceId: attendance ? attendance._id : null,
    };
  });

  // Calculate statistics
  const stats = {
    total: allStudents.length,
    present: completeAttendanceList.filter((a) => a.status === "Present")
      .length,
    absent: completeAttendanceList.filter((a) => a.status === "Absent").length,
    late: completeAttendanceList.filter((a) => a.status === "Late").length,
    leave: completeAttendanceList.filter((a) => a.status === "Leave").length,
  };

  res.status(200).json(
    new ApiResponse(
      200,
      {
        session: {
          _id: session._id,
          startTime: session.startTime,
          endTime: session.endTime,
          active: session.active,
          type: session.type,
        },
        stats,
        attendance: completeAttendanceList,
      },
      "Attendance retrieved successfully"
    )
  );
});

/**
 * Get Student's Attendance History
 * GET /api/v1/attendance/student/:studentId
 */
export const getStudentAttendance = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { classId } = req.query;

  // Check authorization
  const isOwnRecord = req.user._id.toString() === studentId;
  const isAdmin = req.user.role === "admin";

  if (!isOwnRecord && !isAdmin) {
    throw ApiError.forbidden("You can only view your own attendance records");
  }

  // Build query
  const query = { studentId };
  if (classId) {
    query.classId = classId;
  }

  // Get attendance records
  const attendanceRecords = await Attendance.find(query)
    .populate("classId", "name code semester")
    .populate("sessionId", "startTime type")
    .sort({ date: -1 });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        count: attendanceRecords.length,
        attendance: attendanceRecords,
      },
      "Attendance history retrieved successfully"
    )
  );
});

/**
 * Get Detailed Attendance Records for Class (for exports)
 * GET /api/v1/attendance/class/:classId/detailed
 */
export const getDetailedClassAttendance = asyncHandler(async (req, res) => {
  const { classId } = req.params;
  const { startDate, endDate } = req.query;

  // Validate class exists
  const classDoc = await Class.findById(classId)
    .populate("students", "name email info")
    .populate("teacher", "name");
  if (!classDoc) {
    throw ApiError.notFound("Class not found");
  }

  // Check authorization
  const isTeacher = classDoc.teacher._id.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";

  if (!isTeacher && !isAdmin) {
    throw ApiError.forbidden("You do not have access to this class attendance");
  }

  // Build date filter
  const dateFilter = { classId };
  if (startDate || endDate) {
    dateFilter.date = {};
    if (startDate) {
      dateFilter.date.$gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.date.$lte = new Date(endDate);
    }
  }

  // Get all sessions for the class in date range
  const sessionFilter = { classId };
  if (startDate || endDate) {
    sessionFilter.startTime = {};
    if (startDate) {
      sessionFilter.startTime.$gte = new Date(startDate);
    }
    if (endDate) {
      sessionFilter.startTime.$lte = new Date(endDate);
    }
  }

  const sessions = await Session.find(sessionFilter).sort({ startTime: 1 });

  // Get all attendance records for these sessions
  const sessionIds = sessions.map((s) => s._id);
  const attendanceRecords = await Attendance.find({
    sessionId: { $in: sessionIds },
  }).populate("studentId", "name email info");

  // Build detailed report structure
  const report = classDoc.students.map((student) => {
    const studentAttendance = {
      studentId: student._id,
      studentName: student.name,
      email: student.email,
      rollNo: student.info?.rollNo || "N/A",
      sessions: [],
    };

    sessions.forEach((session) => {
      const attendance = attendanceRecords.find(
        (a) =>
          a.sessionId.toString() === session._id.toString() &&
          a.studentId._id.toString() === student._id.toString()
      );

      studentAttendance.sessions.push({
        sessionId: session._id,
        date: session.startTime,
        status: attendance ? attendance.status : "Absent",
        markedAt: attendance?.markedAt || null,
      });
    });

    return studentAttendance;
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        class: {
          name: classDoc.name,
          code: classDoc.code,
          teacher: classDoc.teacher.name,
        },
        sessions: sessions.map((s) => ({
          _id: s._id,
          date: s.startTime,
          type: s.type,
        })),
        attendance: report,
      },
      "Detailed attendance retrieved successfully"
    )
  );
});

/**
 * Approve Pending Attendance (Teacher only)
 * POST /api/v1/attendance/approve
 */
export const approveAttendance = asyncHandler(async (req, res) => {
  const { sessionId, studentIds } = req.body;

  if (!sessionId || !studentIds || !Array.isArray(studentIds)) {
    throw ApiError.badRequest("Session ID and student IDs array are required");
  }

  // Find session and verify teacher ownership
  const session = await Session.findById(sessionId);
  if (!session) {
    throw ApiError.notFound("Session not found");
  }

  const isTeacher = session.teacherId.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";

  if (!isTeacher && !isAdmin) {
    throw ApiError.forbidden(
      "Only the session teacher or admin can approve attendance"
    );
  }

  // Update all pending attendance records for these students
  const result = await Attendance.updateMany(
    {
      sessionId,
      studentId: { $in: studentIds },
      status: "Pending",
    },
    {
      $set: { status: "Present" },
    }
  );

  // Get updated attendance records
  const updatedAttendance = await Attendance.find({
    sessionId,
    studentId: { $in: studentIds },
  })
    .populate("studentId", "name email info")
    .populate("sessionId", "startTime type")
    .populate("classId", "name code");

  res.status(200).json(
    new ApiResponse(
      200,
      {
        approvedCount: result.modifiedCount,
        attendance: updatedAttendance,
      },
      `${result.modifiedCount} attendance record(s) approved successfully`
    )
  );
});
