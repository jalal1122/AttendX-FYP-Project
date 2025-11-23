import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import Session from "../models/session.model.js";
import Class from "../models/class.model.js";
import jwt from "jsonwebtoken";

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
  const { classId, type, latitude, longitude, radius } = req.body;

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
  const classDoc = await Class.findById(classId);
  if (!classDoc) {
    throw ApiError.notFound("Class not found");
  }

  // Verify teacher owns this class
  if (classDoc.teacher.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden(
      "You are not authorized to start a session for this class"
    );
  }

  // Check if there's already an active session for this class
  const existingActiveSession = await Session.findOne({
    classId,
    active: true,
  });

  if (existingActiveSession) {
    throw ApiError.conflict(
      "There is already an active session for this class. Please end it before starting a new one."
    );
  }

  // Capture teacher's IP
  const teacherIP = getClientIP(req);

  // Prepare location data
  const location = {};
  if (latitude !== undefined && longitude !== undefined) {
    location.latitude = parseFloat(latitude);
    location.longitude = parseFloat(longitude);
    location.radius = radius ? parseFloat(radius) : 50; // Default 50 meters
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
  });

  // Populate class and teacher info
  const populatedSession = await Session.findById(session._id)
    .populate("classId", "name code department semester")
    .populate("teacherId", "name email");

  res
    .status(201)
    .json(
      new ApiResponse(201, populatedSession, "Session started successfully")
    );
});

/**
 * Get QR Token (Rotating Token)
 * GET /api/v1/session/:id/qr-token
 */
export const getQRToken = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find session
  const session = await Session.findById(id);

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

  // Generate signed JWT with 20 seconds expiry
  const token = jwt.sign(
    {
      sessionId: session._id.toString(),
      classId: session.classId.toString(),
      teacherId: session.teacherId.toString(),
      timestamp: Date.now(),
    },
    process.env.QR_SECRET || process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: "20s",
    }
  );

  res.status(200).json(
    new ApiResponse(
      200,
      {
        token,
        expiresIn: 20,
        sessionId: session._id,
      },
      "QR token generated successfully"
    )
  );
});

/**
 * End Session
 * POST /api/v1/session/:id/end
 */
export const endSession = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find session
  const session = await Session.findById(id);

  if (!session) {
    throw ApiError.notFound("Session not found");
  }

  // Verify teacher owns this session
  if (session.teacherId.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden("You are not authorized to end this session");
  }

  // Check if session is already ended
  if (!session.active) {
    throw ApiError.badRequest("Session is already ended");
  }

  // Update session
  session.active = false;
  session.endTime = new Date();
  await session.save();

  res
    .status(200)
    .json(new ApiResponse(200, session, "Session ended successfully"));
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
      "Class ID, date, start time, and end time are required"
    );
  }

  // Check if class exists
  const classDoc = await Class.findById(classId);
  if (!classDoc) {
    throw ApiError.notFound("Class not found");
  }

  // Verify teacher owns this class
  if (classDoc.teacher.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden(
      "You are not authorized to create a session for this class"
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
      "Cannot create retroactive session for future date"
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
  const populatedSession = await Session.findById(session._id)
    .populate("classId", "name code department semester")
    .populate("teacherId", "name email");

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        populatedSession,
        "Retroactive session created successfully. You can now manually mark attendance."
      )
    );
});

/**
 * Get All Sessions for a Class
 * GET /api/v1/session/class/:classId
 */
export const getSessionsByClass = asyncHandler(async (req, res) => {
  const { classId } = req.params;

  // Check if class exists
  const classDoc = await Class.findById(classId);
  if (!classDoc) {
    throw ApiError.notFound("Class not found");
  }

  // Check if user has access to this class
  const isTeacher = classDoc.teacher.toString() === req.user._id.toString();
  const isStudent = classDoc.students.some(
    (student) => student.toString() === req.user._id.toString()
  );
  const isAdmin = req.user.role === "admin";

  if (!isTeacher && !isStudent && !isAdmin) {
    throw ApiError.forbidden("You do not have access to this class");
  }

  // Get sessions
  const sessions = await Session.find({ classId })
    .populate("teacherId", "name email")
    .sort({ startTime: -1 });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        count: sessions.length,
        sessions,
      },
      "Sessions retrieved successfully"
    )
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
    .populate("teacherId", "name email");

  if (!session) {
    throw ApiError.notFound("Session not found");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, session, "Session details retrieved successfully")
    );
});
