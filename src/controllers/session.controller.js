import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import Session from "../models/session.model.js";
import Class from "../models/class.model.js";
import jwt from "jsonwebtoken";
import { emitToSession } from "../services/socket.js";

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
 * Start Live Session
 * POST /api/v1/session/start
 */
export const startSession = asyncHandler(async (req, res) => {
  const { classId, type, latitude, longitude, securityConfig } = req.body;

  // Validate required fields
  if (!classId) {
    throw ApiError.badRequest("Class ID is required");
  }

  // Validate type
  const validTypes = ["Lecture", "Lab", "Exam"];
  if (type && !validTypes.includes(type)) {
    throw ApiError.badRequest(`Type must be one of: ${validTypes.join(", ")}`);
  }

  // Check if class exists
  const classDoc = await Class.findById(classId).select("teacher").lean();
  if (!classDoc) {
    throw ApiError.notFound("Class not found");
  }

  // Verify teacher owns this class
  if (classDoc.teacher.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden(
      "You are not authorized to start a session for this class",
    );
  }

  // Check if there's already an active session for this class
  const existingActiveSession = await Session.findOne({
    classId,
    active: true,
  })
    .select("_id")
    .lean();

  if (existingActiveSession) {
    throw ApiError.conflict(
      "There is already an active session for this class. Please end it before starting a new one.",
    );
  }

  // Capture teacher's IP
  const teacherIP = getClientIP(req);

  // Prepare location data
  const location = {};
  if (latitude !== undefined && longitude !== undefined) {
    location.latitude = parseFloat(latitude);
    location.longitude = parseFloat(longitude);
  }

  // Prepare security config with defaults and validation
  const rawRadius = securityConfig?.radius || 50;
  const rawQrRefresh = securityConfig?.qrRefreshRate || 20;

  // Clamp radius to sensible range (10m - 500m)
  const clampedRadius = Math.max(10, Math.min(500, rawRadius));

  // Clamp QR refresh rate to sensible range (5s - 60s)
  const clampedQrRefresh = Math.max(5, Math.min(60, rawQrRefresh));

  const finalSecurityConfig = {
    radius: clampedRadius,
    ipMatchEnabled:
      securityConfig?.ipMatchEnabled !== undefined
        ? securityConfig.ipMatchEnabled
        : true,
    deviceLockEnabled: true, // Always enabled as per requirements
    qrRefreshRate: clampedQrRefresh,
    manualApproval: securityConfig?.manualApproval || false,
  };

  // Log validation warnings if values were clamped
  if (clampedRadius !== rawRadius) {
    console.warn(
      `⚠️ Radius clamped from ${rawRadius}m to ${clampedRadius}m (allowed: 10-500m)`,
    );
  }
  if (clampedQrRefresh !== rawQrRefresh) {
    console.warn(
      `⚠️ QR refresh rate clamped from ${rawQrRefresh}s to ${clampedQrRefresh}s (allowed: 5-60s)`,
    );
  }

  // Create session
  const session = await Session.create({
    classId,
    teacherId: req.user._id,
    startTime: new Date(),
    active: true,
    isRetroactive: false,
    teacherIP,
    type: type || "Lecture",
    location: Object.keys(location).length > 0 ? location : undefined,
    securityConfig: finalSecurityConfig,
  });

  // Populate class and teacher info
  await session.populate("classId", "name code department semester");
  await session.populate("teacherId", "name email");

  emitToSession(session._id.toString(), "session:started", {
    sessionId: session._id.toString(),
    classId: session.classId?._id?.toString?.() || classId,
    startedAt: session.startTime,
    securityConfig: session.securityConfig,
  });

  res
    .status(201)
    .json(new ApiResponse(201, session, "Session started successfully"));
});

/**
 * Get QR Token (Rotating Token)
 * GET /api/v1/session/:id/qr-token
 */
export const getQRToken = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find session
  const session = await Session.findById(id).select(
    "_id classId teacherId active securityConfig",
  );

  if (!session) {
    throw ApiError.notFound("Session not found");
  }

  // Check if session is active
  if (!session.active) {
    throw ApiError.badRequest("Session is not active");
  }

  // Verify teacher owns this session
  if (session.teacherId.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden("You are not authorized to access this session");
  }

  // Determine QR token lifetime from session security config (fallback to 20s)
  const refreshRate =
    session.securityConfig?.qrRefreshRate &&
    session.securityConfig.qrRefreshRate > 0
      ? session.securityConfig.qrRefreshRate
      : 20;

  // Generate signed JWT with expiry matching refreshRate
  const token = jwt.sign(
    {
      sessionId: session._id.toString(),
      classId: session.classId.toString(),
      teacherId: session.teacherId.toString(),
      timestamp: Date.now(),
    },
    process.env.QR_SECRET || process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: `${refreshRate}s`,
    },
  );

  res.status(200).json(
    new ApiResponse(
      200,
      {
        token,
        expiresIn: refreshRate,
        sessionId: session._id,
        securityConfig: session.securityConfig, // Include security config for frontend sync
      },
      "QR token generated successfully",
    ),
  );
});

/**
 * End Session
 * POST /api/v1/session/:id/end
 */
export const endSession = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find session
  const session = await Session.findById(id).select("teacherId active");
  if (!session) {
    throw ApiError.notFound("Session not found");
  }
  if (session.teacherId.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden("You are not authorized to end this session");
  }
  if (!session.active) {
    throw ApiError.badRequest("Session is already ended");
  }
  const updatedSession = await Session.findByIdAndUpdate(
    id,
    { $set: { active: false, endTime: new Date() } },
    { new: true },
  );

  emitToSession(id, "session:ended", {
    sessionId: id,
    endedAt: updatedSession?.endTime || new Date(),
  });

  res
    .status(200)
    .json(new ApiResponse(200, updatedSession, "Session ended successfully"));
});

/**
 * Create Retroactive Session (Manual/Past)
 * POST /api/v1/session/create-retroactive
 */
export const createRetroactiveSession = asyncHandler(async (req, res) => {
  const { classId, date, startTime, endTime, type } = req.body;

  // Validate required fields
  if (!classId || !date || !startTime || !endTime) {
    throw ApiError.badRequest(
      "Class ID, date, start time, and end time are required",
    );
  }

  // Check if class exists
  const classDoc = await Class.findById(classId).select("teacher allowRetroactiveSessions").lean();
  if (!classDoc) {
    throw ApiError.notFound("Class not found");
  }

  // Verify class allows retroactive sessions
  if (classDoc.allowRetroactiveSessions !== true) {
    throw ApiError.forbidden(
      "Retroactive sessions are not allowed for this class. Please contact an admin.",
    );
  }

  // Verify teacher owns this class
  if (classDoc.teacher.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden(
      "You are not authorized to create a session for this class",
    );
  }

  // Parse date and time
  const sessionDate = new Date(date);
  const sessionStartTime = new Date(`${date}T${startTime}`);
  const sessionEndTime = new Date(`${date}T${endTime}`);

  // Validate that start time is before end time
  if (sessionStartTime >= sessionEndTime) {
    throw ApiError.badRequest("Start time must be before end time");
  }

  // Validate that session is in the past (not future)
  if (sessionStartTime > new Date()) {
    throw ApiError.badRequest(
      "Cannot create retroactive session for future date",
    );
  }

  // Capture teacher's IP (even for retroactive sessions)
  const teacherIP = getClientIP(req);

  // Create retroactive session
  const session = await Session.create({
    classId,
    teacherId: req.user._id,
    startTime: sessionStartTime,
    endTime: sessionEndTime,
    active: false,
    isRetroactive: true,
    teacherIP,
    type: type || "Lecture",
  });

  // Populate class and teacher info
  await session.populate("classId", "name code department semester");
  await session.populate("teacherId", "name email");

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        session,
        "Retroactive session created successfully. You can now manually mark attendance.",
      ),
    );
});

/**
 * Get Active Session for a Class
 * GET /api/v1/session/class/:classId/active
 */
export const getActiveSessionByClass = asyncHandler(async (req, res) => {
  const { classId } = req.params;

  // Check if class exists
  const classDoc = await Class.findById(classId).select("teacher").lean();
  if (!classDoc) {
    throw ApiError.notFound("Class not found");
  }

  // Verify teacher owns this class
  if (classDoc.teacher.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden(
      "You are not authorized to access this class's sessions",
    );
  }

  // Find active session
  const activeSession = await Session.findOne({
    classId,
    active: true,
  })
    .populate("classId", "name code department semester")
    .populate("teacherId", "name email")
    .lean();

  if (!activeSession) {
    return res
      .status(200)
      .json(new ApiResponse(200, null, "No active session found"));
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        activeSession,
        "Active session retrieved successfully",
      ),
    );
});

/**
 * Get All Active Sessions
 * GET /api/v1/session/all/active
 */
export const getAllActiveSessions = asyncHandler(async (req, res) => {
  // Find active session
  const allActiveSessions = await Session.find({
    active: true,
  })
    .populate("classId", "name code department semester")
    .populate("teacherId", "name email")
    .lean();

  if (!allActiveSessions || allActiveSessions.length === 0) {
    return res
      .status(200)
      .json(new ApiResponse(200, null, "No active session found"));
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { allActiveSessions, count: allActiveSessions.length },
        "Active sessions retrieved successfully",
      ),
    );
});

/**
 * Get All Sessions for a Class
 * GET /api/v1/session/class/:classId
 */
export const getSessionsByClass = asyncHandler(async (req, res) => {
  const { classId } = req.params;

  // Check if class exists
  const classDoc = await Class.findById(classId)
    .select("teacher students")
    .lean();
  if (!classDoc) {
    throw ApiError.notFound("Class not found");
  }

  // Check if user has access to this class
  const isTeacher = classDoc.teacher.toString() === req.user._id.toString();
  const isStudent = classDoc.students.some(
    (student) => student.toString() === req.user._id.toString(),
  );
  const isAdmin = req.user.role === "admin";

  if (!isTeacher && !isStudent && !isAdmin) {
    throw ApiError.forbidden("You do not have access to this class");
  }

  // Get sessions
  const sessions = await Session.find({ classId })
    .populate("teacherId", "name email")
    .sort({ startTime: -1 })
    .lean();

  res.status(200).json(
    new ApiResponse(
      200,
      {
        count: sessions.length,
        sessions,
      },
      "Sessions retrieved successfully",
    ),
  );
});

/**
 * Get Session Details
 * GET /api/v1/session/:id
 */
export const getSessionDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const session = await Session.findById(id)
    .populate("classId", "name code department semester")
    .populate("teacherId", "name email")
    .lean();

  if (!session) {
    throw ApiError.notFound("Session not found");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, session, "Session details retrieved successfully"),
    );
});
