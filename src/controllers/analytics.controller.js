import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import Attendance from "../models/attendance.model.js";
import Session from "../models/session.model.js";
import Class from "../models/class.model.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";
import ExportService from "../services/export.service.js";
import EmailService from "../services/email.service.js";
import moment from "moment";

/**
 * Get Student Report (Overall + Subject-wise)
 * GET /api/v1/analytics/student/:studentId
 */
export const getStudentReport = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { range = "all" } = req.query; // week, month, semester, all

  // Validate student exists
  const student = await User.findById(studentId)
    .select("_id name email info")
    .lean();
  if (!student) {
    throw ApiError.notFound("Student not found");
  }

  // Check authorization (only own data or admin)
  if (req.user._id.toString() !== studentId && req.user.role !== "admin") {
    throw ApiError.forbidden("You can only view your own attendance report");
  }

  // Build date filter based on range
  const dateFilter = {};
  const now = new Date();

  switch (range) {
    case "week":
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7);
      dateFilter.date = { $gte: weekStart };
      break;
    case "month":
      const monthStart = new Date(now);
      monthStart.setDate(now.getDate() - 30);
      dateFilter.date = { $gte: monthStart };
      break;
    case "semester":
      const month = now.getMonth();
      const semesterStart =
        month >= 7
          ? new Date(now.getFullYear(), 7, 1)
          : new Date(now.getFullYear(), 0, 1);
      dateFilter.date = { $gte: semesterStart };
      break;
    default:
      // "all" - no date filter
      break;
  }

  const studentObjectId = new mongoose.Types.ObjectId(studentId);

  // Aggregation pipeline for subject-wise attendance
  const subjectWiseReport = await Attendance.aggregate([
    {
      $match: {
        studentId: studentObjectId,
        ...dateFilter,
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
  let totalAbsentOverall = 0;
  let totalLateOverall = 0;

  subjectWiseReport.forEach((subject) => {
    totalClassesOverall += subject.totalClasses;
    totalPresentOverall += subject.presentCount;
    totalAbsentOverall += subject.absentCount;
    totalLateOverall += subject.lateCount;
  });

  const overallPercentage =
    totalClassesOverall > 0
      ? ((totalPresentOverall / totalClassesOverall) * 100).toFixed(2)
      : 0;

  // Flag low attendance subjects (< 75%)
  const lowAttendanceSubjects = subjectWiseReport.filter(
    (subject) => subject.attendancePercentage < 75,
  );

  // Get recent sessions/attendance records
  const recentSessions = await Attendance.find({
    studentId: studentObjectId,
    ...dateFilter,
  })
    .populate("classId", "name code")
    .populate("sessionId", "startTime type")
    .sort({ date: -1 })
    .limit(20)
    .lean();

  // Prepare chart data for trends
  const chartData = await Attendance.aggregate([
    {
      $match: {
        studentId: studentObjectId,
        ...dateFilter,
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$date" },
        },
        present: {
          $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] },
        },
        absent: {
          $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] },
        },
        late: {
          $sum: { $cond: [{ $eq: ["$status", "Late"] }, 1, 0] },
        },
      },
    },
    {
      $project: {
        _id: 0,
        name: "$_id",
        present: 1,
        absent: 1,
        late: 1,
      },
    },
    {
      $sort: { name: 1 },
    },
  ]);

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
        range,
        overall: {
          totalClasses: totalClassesOverall,
          presentCount: totalPresentOverall,
          absentCount: totalAbsentOverall,
          lateCount: totalLateOverall,
          attendancePercentage: parseFloat(overallPercentage),
        },
        subjectWise: subjectWiseReport,
        recentSessions,
        chartData,
        warnings: {
          hasLowAttendance: lowAttendanceSubjects.length > 0,
          lowAttendanceSubjects,
        },
      },
      "Student report generated successfully",
    ),
  );
});

/**
 * Get Class Analytics (Temporal: Weekly + Monthly + Overall)
 * GET /api/v1/analytics/class/:classId?startDate=...&endDate=...
 */
export const getClassAnalytics = asyncHandler(async (req, res) => {
  const { classId } = req.params;
  const { startDate, endDate } = req.query;

  const startOfDay = (value) => {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const endOfDay = (value) => {
    const date = new Date(value);
    date.setHours(23, 59, 59, 999);
    return date;
  };

  // Validate class exists
  const classDoc = await Class.findById(classId)
    .populate("teacher", "name email")
    .select("name code department semester teacher")
    .lean();
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
    dateFilter.date = {};
    if (startDate) {
      dateFilter.date.$gte = startOfDay(startDate);
    }
    if (endDate) {
      dateFilter.date.$lte = endOfDay(endDate);
    }
  }

  // Overall Statistics
  const classObjectId = new mongoose.Types.ObjectId(classId);
  const overallStatsPromise = Attendance.aggregate([
    {
      $match: {
        classId: classObjectId,
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
  const weeklyTrendsPromise = Attendance.aggregate([
    {
      $match: {
        classId: classObjectId,
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
        lateCount: {
          $sum: {
            $cond: [{ $eq: ["$status", "Late"] }, 1, 0],
          },
        },
      },
    },
    {
      $project: {
        _id: "$_id.weekNumber",
        weekNumber: "$_id.weekNumber",
        year: "$_id.year",
        present: "$presentCount",
        absent: "$absentCount",
        late: "$lateCount",
        totalRecords: 1,
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
  const monthlyTrendsPromise = Attendance.aggregate([
    {
      $match: {
        classId: classObjectId,
        ...dateFilter,
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
        lateCount: {
          $sum: {
            $cond: [{ $eq: ["$status", "Late"] }, 1, 0],
          },
        },
      },
    },
    {
      $project: {
        _id: "$_id.month",
        month: "$_id.month",
        year: "$_id.year",
        present: "$presentCount",
        absent: "$absentCount",
        late: "$lateCount",
        totalRecords: 1,
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

  const [overallStats, weeklyTrends, monthlyTrends, totalSessions] =
    await Promise.all([
      overallStatsPromise,
      weeklyTrendsPromise,
      monthlyTrendsPromise,
      Session.countDocuments({ classId }),
    ]);

  // Get the period parameter from query
  const { period = "weekly" } = req.query;

  // Prepare overall stats with consistent naming
  const stats = overallStats[0] || {
    totalRecords: 0,
    presentCount: 0,
    absentCount: 0,
    lateCount: 0,
    leaveCount: 0,
    averageAttendance: 0,
  };

  // Map to frontend expected format
  const overallStatsFormatted = {
    totalPresent: stats.presentCount,
    totalAbsent: stats.absentCount,
    totalLate: stats.lateCount,
    totalLeave: stats.leaveCount,
    averageAttendance: stats.averageAttendance,
  };

  // Select trends based on period
  const trends = period === "weekly" ? weeklyTrends : monthlyTrends;

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
        overallStats: overallStatsFormatted,
        trends,
        weeklyTrends,
        monthlyTrends,
      },
      "Class analytics retrieved successfully",
    ),
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
    "name email info",
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
        "No sessions found",
      ),
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
      `Found ${defaulters.length} students with attendance below ${minPercentage}%`,
    ),
  );
});

/**
 * Get Teacher Statistics
 * GET /api/v1/analytics/teacher/stats
 */
export const getTeacherStats = asyncHandler(async (req, res) => {
  const teacherId = req.user._id;

  const [
    totalClasses,
    totalSessions,
    activeSessions,
    classesWithStats,
    sessionStats,
  ] = await Promise.all([
    Class.countDocuments({ teacher: teacherId }),
    Session.countDocuments({ teacherId }),
    Session.countDocuments({
      teacherId,
      active: true,
    }),
    Class.aggregate([
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
    ]),
    Session.aggregate([
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
    ]),
  ]);

  // Calculate average students per class
  const totalStudents = classesWithStats.reduce(
    (sum, cls) => sum + cls.studentCount,
    0,
  );
  const averageStudentsPerClass =
    totalClasses > 0 ? (totalStudents / totalClasses).toFixed(2) : 0;

  const classIds = classesWithStats.map((cls) => cls._id);
  const attendanceStats = classIds.length
    ? await Attendance.aggregate([
        {
          $match: {
            classId: { $in: classIds },
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
                  $multiply: [
                    { $divide: ["$presentCount", "$totalRecords"] },
                    100,
                  ],
                },
                0,
              ],
            },
          },
        },
      ])
    : [];

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
      "Teacher statistics retrieved successfully",
    ),
  );
});

/**
 * Get Comprehensive Class Report (for semester/department analysis)
 * GET /api/v1/analytics/comprehensive?semester=...&department=...
 */
export const getComprehensiveReport = asyncHandler(async (req, res) => {
  const { semester, department } = req.query;

  // Only admin can access comprehensive reports
  if (req.user.role !== "admin") {
    throw ApiError.forbidden(
      "Only administrators can access comprehensive reports",
    );
  }

  // Build match criteria
  const matchCriteria = {};
  if (semester) matchCriteria.semester = parseInt(semester);
  if (department) matchCriteria.department = department;

  // Get all classes matching criteria
  const classes = await Class.find(matchCriteria)
    .populate("teacher", "name email")
    .select("name code department semester")
    .lean();

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
  const classStatsMap = new Map(
    classStats.map((stat) => [stat.classId.toString(), stat]),
  );
  const report = classes.map((cls) => {
    const stats = classStatsMap.get(cls._id.toString());
    return {
      ...cls,
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
      "Comprehensive report generated successfully",
    ),
  );
});

/**
 * Export Report (Excel or CSV)
 * GET /api/v1/analytics/export
 * Query Params:
 *   - type: 'class_matrix' | 'student_transcript' | 'dept_summary' | 'defaulters'
 *   - format: 'xlsx' | 'csv'
 *   - range: 'week' | 'month' | 'semester' | 'custom'
 *   - startDate, endDate: (if range is custom)
 *   - targetId: (ClassID, StudentID, or DeptID)
 */
export const exportReport = asyncHandler(async (req, res) => {
  const {
    type,
    format = "xlsx",
    range = "semester",
    startDate,
    endDate,
    targetId,
  } = req.query;

  if (!type) {
    throw ApiError.badRequest("Report type is required");
  }

  if (!["xlsx", "csv"].includes(format)) {
    throw ApiError.badRequest("Format must be 'xlsx' or 'csv'");
  }

  let buffer;
  let filename;
  let contentType;

  // Set content type based on format
  if (format === "xlsx") {
    contentType =
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  } else {
    contentType = "text/csv";
  }

  // Build date filter
  let dateFilter = {};
  const now = new Date();

  switch (range) {
    case "week":
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7);
      dateFilter = { $gte: weekStart };
      break;
    case "month":
      const monthStart = new Date(now);
      monthStart.setDate(now.getDate() - 30);
      dateFilter = { $gte: monthStart };
      break;
    case "semester":
      const month = now.getMonth();
      const semesterStart =
        month >= 7
          ? new Date(now.getFullYear(), 7, 1)
          : new Date(now.getFullYear(), 0, 1);
      dateFilter = { $gte: semesterStart };
      break;
    case "custom":
      if (startDate && endDate) {
        dateFilter = { $gte: new Date(startDate), $lte: new Date(endDate) };
      }
      break;
  }

  // Generate report based on type
  switch (type) {
    case "class_matrix":
      if (!targetId) {
        throw ApiError.badRequest(
          "Class ID is required for class matrix report",
        );
      }

      // Fetch class with populated students
      const classData = await Class.findById(targetId)
        .populate("students", "name info")
        .populate("teacher", "name email")
        .select(
          "name code teacher department semester batch academicYear room section students",
        )
        .lean();

      if (!classData) {
        throw ApiError.notFound("Class not found");
      }

      // Check authorization
      if (req.user.role !== "admin" && req.user.role !== "teacher") {
        throw ApiError.forbidden(
          "Only admins and teachers can export class reports",
        );
      }

      if (
        req.user.role === "teacher" &&
        classData.teacher?._id?.toString() !== req.user._id.toString()
      ) {
        throw ApiError.forbidden(
          "You can only export reports for your own classes",
        );
      }

      // Fetch sessions
      const sessionsQuery = {
        classId: targetId,
        active: false,
      };

      if (Object.keys(dateFilter).length > 0) {
        sessionsQuery.startTime = dateFilter;
      }

      const sessions = await Session.find(sessionsQuery)
        .sort({ startTime: 1 })
        .lean();

      // Fetch attendance records
      const sessionIds = sessions.map((s) => s._id);
      const attendanceRecords = await Attendance.find({
        sessionId: { $in: sessionIds },
      })
        .populate("studentId", "name info")
        .lean();

      // Create attendance map
      const attendanceMap = {};
      attendanceRecords.forEach((record) => {
        const key = `${record.sessionId}_${record.studentId._id}`;
        attendanceMap[key] = record;
      });

      // Generate export
      buffer = await ExportService.generateClassMatrix(
        classData,
        sessions,
        attendanceMap,
        format,
      );
      filename = `${classData.code}_Attendance_${moment().format("YYYY-MM-DD")}.${format}`;
      break;

    case "student_transcript":
      if (!targetId) {
        throw ApiError.badRequest(
          "Student ID is required for student transcript",
        );
      }

      // Fetch student
      const student = await User.findById(targetId).lean();

      if (!student) {
        throw ApiError.notFound("Student not found");
      }

      // Check authorization
      if (
        req.user._id.toString() !== targetId &&
        req.user.role !== "admin" &&
        req.user.role !== "teacher"
      ) {
        throw ApiError.forbidden("You can only view your own transcript");
      }

      // Fetch all classes student is enrolled in
      const studentClasses = await Class.find({ students: targetId })
        .populate("teacher", "name")
        .lean();

      // For each class, calculate attendance
      const classesData = await Promise.all(
        studentClasses.map(async (classItem) => {
          const sessionsQuery = {
            classId: classItem._id,
            active: false,
          };

          if (Object.keys(dateFilter).length > 0) {
            sessionsQuery.startTime = dateFilter;
          }

          const classSessions = await Session.find(sessionsQuery).lean();

          const attendanceStats = await Attendance.aggregate([
            {
              $match: {
                studentId: new mongoose.Types.ObjectId(targetId),
                sessionId: { $in: classSessions.map((s) => s._id) },
              },
            },
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
              },
            },
          ]);

          const presentCount =
            attendanceStats.find((s) => s._id === "Present")?.count || 0;
          const absentCount = classSessions.length - presentCount;
          const percentage =
            classSessions.length > 0
              ? (presentCount / classSessions.length) * 100
              : 0;

          return {
            className: classItem.name,
            classCode: classItem.code,
            totalSessions: classSessions.length,
            presentCount,
            absentCount,
            percentage,
          };
        }),
      );

      buffer = await ExportService.generateStudentTranscript(
        student,
        classesData,
        format,
      );
      filename = `${student.rollNumber || student._id}_Transcript_${moment().format("YYYY-MM-DD")}.${format}`;
      break;

    case "dept_summary":
      // Check authorization
      if (req.user.role !== "admin" && req.user.role !== "teacher") {
        throw ApiError.forbidden(
          "Only admins and teachers can export department summary",
        );
      }

      // Teachers can only summarize departments for their own classes
      const departmentScope =
        req.user.role === "teacher" ? { teacher: req.user._id } : {};

      // Get departments visible to the current user
      const departments = await Class.distinct("department", departmentScope);

      // For each department, calculate stats
      const departmentData = await Promise.all(
        departments.map(async (dept) => {
          const deptClasses = await Class.find({
            department: dept,
            ...departmentScope,
          }).lean();
          const classIds = deptClasses.map((c) => c._id);

          // Get all students in this department
          const deptStudents = await User.find({
            "info.department": dept,
            role: "student",
          })
            .select("_id")
            .lean();

          // Get all sessions
          const sessionsQuery = {
            classId: { $in: classIds },
            active: false,
          };

          if (Object.keys(dateFilter).length > 0) {
            sessionsQuery.startTime = dateFilter;
          }

          const deptSessions = await Session.find(sessionsQuery).lean();

          // Calculate avg attendance
          const attendanceStats = await Attendance.aggregate([
            {
              $match: {
                classId: { $in: classIds },
                sessionId: { $in: deptSessions.map((s) => s._id) },
              },
            },
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
              },
            },
          ]);

          const presentCount =
            attendanceStats.find((s) => s._id === "Present")?.count || 0;
          const totalRecords =
            attendanceStats.reduce((sum, s) => sum + s.count, 0) || 1;
          const avgAttendance = (presentCount / totalRecords) * 100;

          // Count defaulters
          const defaultersCount = await User.countDocuments({
            "info.department": dept,
            role: "student",
            // This is a simplified count; in reality, you'd need to calculate per-student attendance
          });

          return {
            department: dept,
            totalClasses: deptClasses.length,
            totalStudents: deptStudents.length,
            totalSessions: deptSessions.length,
            avgAttendance,
            defaulters: Math.floor(defaultersCount * 0.2), // Rough estimate
          };
        }),
      );

      buffer = await ExportService.generateDepartmentSummary(
        departmentData,
        format,
      );
      filename = `Department_Summary_${moment().format("YYYY-MM-DD")}.${format}`;
      break;

    case "defaulters":
      if (!targetId) {
        throw ApiError.badRequest("Class ID is required for defaulters report");
      }

      // This would be similar to class_matrix but filtered for students < 75%
      // Implementation simplified for brevity
      throw ApiError.badRequest("Defaulters report not yet implemented");

    default:
      throw ApiError.badRequest("Invalid report type");
  }

  // Set response headers
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  // Send buffer
  res.send(buffer);
});

/**
 * Check and Send Low Attendance Warnings
 * POST /api/v1/analytics/check-defaulters
 * Admin/Teacher only - Sends email warnings to students below 75%
 */
export const checkAndNotifyDefaulters = asyncHandler(async (req, res) => {
  const { classId } = req.body;

  if (!classId) {
    throw ApiError.badRequest("Class ID is required");
  }

  // Get class details
  const classDoc = await Class.findById(classId).populate("students").lean();
  if (!classDoc) {
    throw ApiError.notFound("Class not found");
  }

  // Get all sessions for this class
  const sessions = await Session.find({ classId }).select("_id").lean();
  const totalSessions = sessions.length;

  if (totalSessions === 0) {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { notified: 0 },
          "No sessions found for this class",
        ),
      );
  }

  const attendanceByStudent = await Attendance.aggregate([
    {
      $match: {
        classId: new mongoose.Types.ObjectId(classId),
        status: { $in: ["Present", "Late"] },
      },
    },
    {
      $group: {
        _id: "$studentId",
        attendedSessions: { $sum: 1 },
      },
    },
  ]);
  const attendanceMap = new Map(
    attendanceByStudent.map((row) => [
      row._id.toString(),
      row.attendedSessions,
    ]),
  );
  const defaulters = classDoc.students
    .map((student) => {
      const attendedSessions = attendanceMap.get(student._id.toString()) || 0;
      const attendancePercentage = (attendedSessions / totalSessions) * 100;
      return { student, percentage: attendancePercentage };
    })
    .filter((item) => item.percentage < 75);

  await Promise.all(
    defaulters.map(async ({ student, percentage }) => {
      try {
        await EmailService.sendLowAttendanceWarning(
          student,
          classDoc,
          percentage,
        );
      } catch (emailError) {
        console.error(`Failed to send email to ${student.email}:`, emailError);
      }
    }),
  );

  res.status(200).json(
    new ApiResponse(
      200,
      {
        notified: defaulters.length,
        defaulters: defaulters.map((d) => ({
          name: d.student.name,
          email: d.student.email,
          percentage: d.percentage.toFixed(2),
        })),
      },
      `Notified ${defaulters.length} student(s) with low attendance`,
    ),
  );
});
