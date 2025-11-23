import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import Attendance from "../models/attendance.model.js";
import Session from "../models/session.model.js";
import Class from "../models/class.model.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";

/**
 * Get Student Report (Overall + Subject-wise)
 * GET /api/v1/analytics/student/:studentId
 */
export const getStudentReport = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  // Validate student exists
  const student = await User.findById(studentId);
  if (!student) {
    throw ApiError.notFound("Student not found");
  }

  // Check authorization (only own data or admin)
  if (req.user._id.toString() !== studentId && req.user.role !== "admin") {
    throw ApiError.forbidden("You can only view your own attendance report");
  }

  // Aggregation pipeline for subject-wise attendance
  const subjectWiseReport = await Attendance.aggregate([
    {
      $match: {
        studentId: new mongoose.Types.ObjectId(studentId),
      },
    },
    {
      $group: {
        _id: "$classId",
        totalClasses: { $sum: 1 },
        presentCount: {
          $sum: {
            $cond: [{ $eq: ["$status", "Present"] }, 1, 0],
          },
        },
        lateCount: {
          $sum: {
            $cond: [{ $eq: ["$status", "Late"] }, 1, 0],
          },
        },
        absentCount: {
          $sum: {
            $cond: [{ $eq: ["$status", "Absent"] }, 1, 0],
          },
        },
        leaveCount: {
          $sum: {
            $cond: [{ $eq: ["$status", "Leave"] }, 1, 0],
          },
        },
      },
    },
    {
      $lookup: {
        from: "classes",
        localField: "_id",
        foreignField: "_id",
        as: "classDetails",
      },
    },
    {
      $unwind: "$classDetails",
    },
    {
      $project: {
        classId: "$_id",
        className: "$classDetails.name",
        classCode: "$classDetails.code",
        department: "$classDetails.department",
        semester: "$classDetails.semester",
        totalClasses: 1,
        presentCount: 1,
        lateCount: 1,
        absentCount: 1,
        leaveCount: 1,
        attendancePercentage: {
          $cond: [
            { $gt: ["$totalClasses", 0] },
            {
              $multiply: [{ $divide: ["$presentCount", "$totalClasses"] }, 100],
            },
            0,
          ],
        },
      },
    },
    {
      $sort: { attendancePercentage: -1 },
    },
  ]);

  // Calculate overall statistics
  let totalClassesOverall = 0;
  let totalPresentOverall = 0;

  subjectWiseReport.forEach((subject) => {
    totalClassesOverall += subject.totalClasses;
    totalPresentOverall += subject.presentCount;
  });

  const overallPercentage =
    totalClassesOverall > 0
      ? ((totalPresentOverall / totalClassesOverall) * 100).toFixed(2)
      : 0;

  // Flag low attendance subjects (< 75%)
  const lowAttendanceSubjects = subjectWiseReport.filter(
    (subject) => subject.attendancePercentage < 75
  );

  res.status(200).json(
    new ApiResponse(
      200,
      {
        student: {
          _id: student._id,
          name: student.name,
          email: student.email,
          info: student.info,
        },
        overall: {
          totalClasses: totalClassesOverall,
          presentCount: totalPresentOverall,
          attendancePercentage: parseFloat(overallPercentage),
        },
        subjectWise: subjectWiseReport,
        warnings: {
          hasLowAttendance: lowAttendanceSubjects.length > 0,
          lowAttendanceSubjects,
        },
      },
      "Student report generated successfully"
    )
  );
});

/**
 * Get Class Analytics (Temporal: Weekly + Monthly + Overall)
 * GET /api/v1/analytics/class/:classId?startDate=...&endDate=...
 */
export const getClassAnalytics = asyncHandler(async (req, res) => {
  const { classId } = req.params;
  const { startDate, endDate } = req.query;

  // Validate class exists
  const classDoc = await Class.findById(classId).populate(
    "teacher",
    "name email"
  );
  if (!classDoc) {
    throw ApiError.notFound("Class not found");
  }

  // Check authorization
  const isTeacher = classDoc.teacher._id.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";

  if (!isTeacher && !isAdmin) {
    throw ApiError.forbidden("You do not have access to this class analytics");
  }

  // Build date filter
  const dateFilter = {};
  if (startDate || endDate) {
    dateFilter.createdAt = {};
    if (startDate) {
      dateFilter.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.createdAt.$lte = new Date(endDate);
    }
  }

  // Overall Statistics
  const overallStats = await Attendance.aggregate([
    {
      $match: {
        classId: new mongoose.Types.ObjectId(classId),
        ...dateFilter,
      },
    },
    {
      $group: {
        _id: null,
        totalRecords: { $sum: 1 },
        presentCount: {
          $sum: {
            $cond: [{ $eq: ["$status", "Present"] }, 1, 0],
          },
        },
        absentCount: {
          $sum: {
            $cond: [{ $eq: ["$status", "Absent"] }, 1, 0],
          },
        },
        lateCount: {
          $sum: {
            $cond: [{ $eq: ["$status", "Late"] }, 1, 0],
          },
        },
        leaveCount: {
          $sum: {
            $cond: [{ $eq: ["$status", "Leave"] }, 1, 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalRecords: 1,
        presentCount: 1,
        absentCount: 1,
        lateCount: 1,
        leaveCount: 1,
        averageAttendance: {
          $cond: [
            { $gt: ["$totalRecords", 0] },
            {
              $multiply: [{ $divide: ["$presentCount", "$totalRecords"] }, 100],
            },
            0,
          ],
        },
      },
    },
  ]);

  // Weekly Trends
  const weeklyTrends = await Attendance.aggregate([
    {
      $match: {
        classId: new mongoose.Types.ObjectId(classId),
        ...dateFilter,
      },
    },
    {
      $group: {
        _id: { weekNumber: "$weekNumber", year: "$year" },
        totalRecords: { $sum: 1 },
        presentCount: {
          $sum: {
            $cond: [{ $eq: ["$status", "Present"] }, 1, 0],
          },
        },
        absentCount: {
          $sum: {
            $cond: [{ $eq: ["$status", "Absent"] }, 1, 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        weekNumber: "$_id.weekNumber",
        year: "$_id.year",
        totalRecords: 1,
        presentCount: 1,
        absentCount: 1,
        attendancePercentage: {
          $cond: [
            { $gt: ["$totalRecords", 0] },
            {
              $multiply: [{ $divide: ["$presentCount", "$totalRecords"] }, 100],
            },
            0,
          ],
        },
      },
    },
    {
      $sort: { year: 1, weekNumber: 1 },
    },
  ]);

  // Monthly Trends
  const monthlyTrends = await Attendance.aggregate([
    {
      $match: {
        classId: new mongoose.Types.ObjectId(classId),
      },
    },
    {
      $group: {
        _id: { month: "$month", year: "$year" },
        totalRecords: { $sum: 1 },
        presentCount: {
          $sum: {
            $cond: [{ $eq: ["$status", "Present"] }, 1, 0],
          },
        },
        absentCount: {
          $sum: {
            $cond: [{ $eq: ["$status", "Absent"] }, 1, 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        month: "$_id.month",
        year: "$_id.year",
        totalRecords: 1,
        presentCount: 1,
        absentCount: 1,
        attendancePercentage: {
          $cond: [
            { $gt: ["$totalRecords", 0] },
            {
              $multiply: [{ $divide: ["$presentCount", "$totalRecords"] }, 100],
            },
            0,
          ],
        },
      },
    },
    {
      $sort: { year: 1, month: 1 },
    },
  ]);

  // Get total sessions count
  const totalSessions = await Session.countDocuments({ classId });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        class: {
          _id: classDoc._id,
          name: classDoc.name,
          code: classDoc.code,
          department: classDoc.department,
          semester: classDoc.semester,
          teacher: classDoc.teacher,
        },
        totalSessions,
        overallStats: overallStats[0] || {
          totalRecords: 0,
          presentCount: 0,
          absentCount: 0,
          lateCount: 0,
          leaveCount: 0,
          averageAttendance: 0,
        },
        weeklyTrends,
        monthlyTrends,
      },
      "Class analytics retrieved successfully"
    )
  );
});

/**
 * Get Defaulters List (Students with attendance < threshold)
 * GET /api/v1/analytics/class/:classId/defaulters
 */
export const getDefaulters = asyncHandler(async (req, res) => {
  const { classId } = req.params;
  const minPercentage = parseFloat(req.query.minPercentage) || 75;

  // Validate class exists
  const classDoc = await Class.findById(classId).populate(
    "students",
    "name email info"
  );
  if (!classDoc) {
    throw ApiError.notFound("Class not found");
  }

  // Check authorization
  const isTeacher = classDoc.teacher.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";

  if (!isTeacher && !isAdmin) {
    throw ApiError.forbidden("You do not have access to this class");
  }

  // Get total sessions for this class
  const totalSessions = await Session.countDocuments({ classId });

  if (totalSessions === 0) {
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          totalSessions: 0,
          defaulters: [],
          message: "No sessions conducted yet for this class",
        },
        "No sessions found"
      )
    );
  }

  // Aggregation pipeline to find defaulters
  const defaulters = await Attendance.aggregate([
    {
      $match: {
        classId: new mongoose.Types.ObjectId(classId),
      },
    },
    {
      $group: {
        _id: "$studentId",
        totalClasses: { $sum: 1 },
        presentCount: {
          $sum: {
            $cond: [{ $eq: ["$status", "Present"] }, 1, 0],
          },
        },
      },
    },
    {
      $project: {
        studentId: "$_id",
        totalClasses: 1,
        presentCount: 1,
        attendancePercentage: {
          $multiply: [{ $divide: ["$presentCount", "$totalClasses"] }, 100],
        },
      },
    },
    {
      $match: {
        attendancePercentage: { $lt: minPercentage },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "studentId",
        foreignField: "_id",
        as: "studentDetails",
      },
    },
    {
      $unwind: "$studentDetails",
    },
    {
      $project: {
        _id: 0,
        studentId: "$studentDetails._id",
        name: "$studentDetails.name",
        email: "$studentDetails.email",
        info: "$studentDetails.info",
        totalClasses: 1,
        presentCount: 1,
        attendancePercentage: { $round: ["$attendancePercentage", 2] },
      },
    },
    {
      $sort: { attendancePercentage: 1 },
    },
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        class: {
          _id: classDoc._id,
          name: classDoc.name,
          code: classDoc.code,
        },
        threshold: minPercentage,
        totalSessions,
        totalEnrolled: classDoc.students.length,
        defaultersCount: defaulters.length,
        defaulters,
      },
      `Found ${defaulters.length} students with attendance below ${minPercentage}%`
    )
  );
});

/**
 * Get Teacher Statistics
 * GET /api/v1/analytics/teacher/stats
 */
export const getTeacherStats = asyncHandler(async (req, res) => {
  const teacherId = req.user._id;

  // Count total classes created
  const totalClasses = await Class.countDocuments({ teacher: teacherId });

  // Count total sessions conducted
  const totalSessions = await Session.countDocuments({ teacherId });

  // Count active sessions
  const activeSessions = await Session.countDocuments({
    teacherId,
    active: true,
  });

  // Get classes with student count
  const classesWithStats = await Class.aggregate([
    {
      $match: {
        teacher: new mongoose.Types.ObjectId(teacherId),
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        code: 1,
        department: 1,
        semester: 1,
        studentCount: { $size: "$students" },
      },
    },
  ]);

  // Calculate average students per class
  const totalStudents = classesWithStats.reduce(
    (sum, cls) => sum + cls.studentCount,
    0
  );
  const averageStudentsPerClass =
    totalClasses > 0 ? (totalStudents / totalClasses).toFixed(2) : 0;

  // Get session statistics
  const sessionStats = await Session.aggregate([
    {
      $match: {
        teacherId: new mongoose.Types.ObjectId(teacherId),
      },
    },
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 },
      },
    },
  ]);

  // Calculate average attendance in teacher's classes
  const attendanceStats = await Attendance.aggregate([
    {
      $lookup: {
        from: "sessions",
        localField: "sessionId",
        foreignField: "_id",
        as: "session",
      },
    },
    {
      $unwind: "$session",
    },
    {
      $match: {
        "session.teacherId": new mongoose.Types.ObjectId(teacherId),
      },
    },
    {
      $group: {
        _id: null,
        totalRecords: { $sum: 1 },
        presentCount: {
          $sum: {
            $cond: [{ $eq: ["$status", "Present"] }, 1, 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalRecords: 1,
        presentCount: 1,
        averageAttendance: {
          $cond: [
            { $gt: ["$totalRecords", 0] },
            {
              $multiply: [{ $divide: ["$presentCount", "$totalRecords"] }, 100],
            },
            0,
          ],
        },
      },
    },
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        teacher: {
          _id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          info: req.user.info,
        },
        summary: {
          totalClasses,
          totalSessions,
          activeSessions,
          totalStudents,
          averageStudentsPerClass: parseFloat(averageStudentsPerClass),
        },
        sessionBreakdown: sessionStats,
        classesWithStats,
        attendanceStats: attendanceStats[0] || {
          totalRecords: 0,
          presentCount: 0,
          averageAttendance: 0,
        },
      },
      "Teacher statistics retrieved successfully"
    )
  );
});

/**
 * Get Comprehensive Class Report (for semester/department analysis)
 * GET /api/v1/analytics/comprehensive
 */
export const getComprehensiveReport = asyncHandler(async (req, res) => {
  const { semester, department } = req.query;

  // Only admin can access comprehensive reports
  if (req.user.role !== "admin") {
    throw ApiError.forbidden(
      "Only administrators can access comprehensive reports"
    );
  }

  // Build match criteria
  const matchCriteria = {};
  if (semester) matchCriteria.semester = parseInt(semester);
  if (department) matchCriteria.department = department;

  // Get all classes matching criteria
  const classes = await Class.find(matchCriteria)
    .populate("teacher", "name email")
    .select("name code department semester");

  // Get statistics for each class
  const classIds = classes.map((cls) => cls._id);

  const classStats = await Attendance.aggregate([
    {
      $match: {
        classId: { $in: classIds },
      },
    },
    {
      $group: {
        _id: "$classId",
        totalRecords: { $sum: 1 },
        presentCount: {
          $sum: {
            $cond: [{ $eq: ["$status", "Present"] }, 1, 0],
          },
        },
      },
    },
    {
      $project: {
        classId: "$_id",
        totalRecords: 1,
        presentCount: 1,
        attendancePercentage: {
          $multiply: [{ $divide: ["$presentCount", "$totalRecords"] }, 100],
        },
      },
    },
  ]);

  // Merge class details with stats
  const report = classes.map((cls) => {
    const stats = classStats.find(
      (s) => s.classId.toString() === cls._id.toString()
    );
    return {
      ...cls.toObject(),
      stats: stats || {
        totalRecords: 0,
        presentCount: 0,
        attendancePercentage: 0,
      },
    };
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        filters: { semester, department },
        totalClasses: classes.length,
        report,
      },
      "Comprehensive report generated successfully"
    )
  );
});
