import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import Attendance from "../models/attendance.model.js";
import Session from "../models/session.model.js";
import Class from "../models/class.model.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";
import ExportService from "../services/export.service.js";

/**
 * Build a date filter object for attendance queries.
 * Supports startDate, endDate query params.
 */
const buildDateFilter = (startDate, endDate) => {
  const filter = {};
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      filter.date.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.date.$lte = end;
    }
  }
  return filter;
};

/**
 * Build pagination & sort options from query params.
 */
const buildPaginationSort = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 50));
  const sortBy = query.sortBy || "name";
  const sortOrder = query.sortOrder === "desc" ? -1 : 1;
  return { page, limit, skip: (page - 1) * limit, sortBy, sortOrder };
};

const buildArrayRegex = (val) => {
  if (!val) return undefined;
  let arr = Array.isArray(val) ? val : val.split(',').map(s => s.trim()).filter(Boolean);
  if (arr.length === 0) return undefined;
  if (arr.length === 1) return { $regex: new RegExp(`^${arr[0]}$`, 'i') };
  return { $in: arr.map(s => new RegExp(`^${s}$`, 'i')) };
};

const buildArrayObjectId = (val) => {
  if (!val) return undefined;
  let arr = Array.isArray(val) ? val : val.split(',').map(s => s.trim()).filter(Boolean);
  if (arr.length === 0) return undefined;
  if (arr.length === 1) return new mongoose.Types.ObjectId(arr[0]);
  return { $in: arr.map(s => new mongoose.Types.ObjectId(s)) };
};

const buildArrayNumber = (val) => {
  if (!val) return undefined;
  let arr = Array.isArray(val) ? val : val.split(',').map(s => s.trim()).filter(Boolean);
  if (arr.length === 0) return undefined;
  if (arr.length === 1) return parseInt(arr[0]);
  return { $in: arr.map(s => parseInt(s)) };
};

/**
 * Admin Student Reports
 * GET /api/v1/analytics/admin/students
 * Filters: name, email, phone, department, batch, section, semester, rollNo, classId
 * Returns table data with attendance aggregates per student
 */
export const getAdminStudentReports = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    throw ApiError.forbidden("Only admins can access admin reports");
  }

  const {
    name, email, phone, department, batch, section,
    semester, rollNo, classId, startDate, endDate, export: isExport
  } = req.query;
  const { page, limit, skip, sortBy, sortOrder } = buildPaginationSort(req.query);
  const dateFilter = buildDateFilter(startDate, endDate);

  // Build user filter
  const userFilter = { role: "student" };
  if (name) userFilter.name = buildArrayRegex(name);
  if (email) userFilter.email = buildArrayRegex(email);
  if (phone) userFilter.mobileNumber = buildArrayRegex(phone);
  if (department) userFilter["info.department"] = buildArrayRegex(department);
  if (batch) userFilter["info.batch"] = buildArrayRegex(batch);
  if (section) userFilter["info.section"] = buildArrayRegex(section);
  if (semester) userFilter["info.semester"] = buildArrayNumber(semester);
  if (rollNo) userFilter["info.rollNo"] = buildArrayRegex(rollNo);

  // Find matching students
  const totalCount = await User.countDocuments(userFilter);
  const query = User.find(userFilter)
    .select("_id name email mobileNumber info")
    .sort({ [sortBy]: sortOrder });
  
  if (isExport !== "true") {
    query.skip(skip).limit(limit);
  }
  
  const students = await query.lean();

  if (students.length === 0) {
    return res.status(200).json(
      new ApiResponse(200, {
        students: [],
        pagination: { page, limit, total: totalCount, pages: 0 },
      }, "No students found"),
    );
  }

  const studentIds = students.map((s) => s._id);

  // Build attendance match
  const attendanceMatch = { studentId: { $in: studentIds }, ...dateFilter };
  if (classId) {
    attendanceMatch.classId = buildArrayObjectId(classId);
  }

  // Aggregate attendance per student
  const attendanceAgg = await Attendance.aggregate([
    { $match: attendanceMatch },
    {
      $group: {
        _id: "$studentId",
        totalClasses: { $sum: 1 },
        presentCount: {
          $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] },
        },
        absentCount: {
          $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] },
        },
        lateCount: {
          $sum: { $cond: [{ $eq: ["$status", "Late"] }, 1, 0] },
        },
        leaveCount: {
          $sum: { $cond: [{ $eq: ["$status", "Leave"] }, 1, 0] },
        },
      },
    },
  ]);

  const attendanceMap = new Map(
    attendanceAgg.map((a) => [a._id.toString(), a]),
  );

  // Merge student info with attendance data
  const result = students.map((student) => {
    const att = attendanceMap.get(student._id.toString()) || {
      totalClasses: 0, presentCount: 0, absentCount: 0, lateCount: 0, leaveCount: 0,
    };
    const percentage = att.totalClasses > 0
      ? ((att.presentCount / att.totalClasses) * 100).toFixed(2)
      : 0;

    return {
      _id: student._id,
      name: student.name,
      email: student.email,
      phone: student.mobileNumber || student.info?.phone || "N/A",
      rollNo: student.info?.rollNo || "N/A",
      department: student.info?.department || "N/A",
      batch: student.info?.batch || "N/A",
      section: student.info?.section || "N/A",
      semester: student.info?.semester || "N/A",
      totalClasses: att.totalClasses,
      presentCount: att.presentCount,
      absentCount: att.absentCount,
      lateCount: att.lateCount,
      leaveCount: att.leaveCount,
      attendancePercentage: parseFloat(percentage),
    };
  });

  if (isExport === "true") {
    const buffer = await ExportService.generateAdminReport("students", result, "xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=admin_students_report.xlsx`);
    return res.status(200).send(buffer);
  }

  res.status(200).json(
    new ApiResponse(200, {
      students: result,
      pagination: {
        page, limit, total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    }, "Admin student reports retrieved"),
  );
});

/**
 * Admin Teacher Reports
 * GET /api/v1/analytics/admin/teachers
 */
export const getAdminTeacherReports = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    throw ApiError.forbidden("Only admins can access admin reports");
  }

  const { name, email, phone, department, startDate, endDate, export: isExport } = req.query;
  const { page, limit, skip, sortBy, sortOrder } = buildPaginationSort(req.query);

  // Build teacher filter
  const userFilter = { role: "teacher" };
  if (name) userFilter.name = buildArrayRegex(name);
  if (email) userFilter.email = buildArrayRegex(email);
  if (phone) userFilter.mobileNumber = buildArrayRegex(phone);
  if (department) userFilter["info.department"] = buildArrayRegex(department);

  const totalCount = await User.countDocuments(userFilter);
  const query = User.find(userFilter)
    .select("_id name email mobileNumber info")
    .sort({ [sortBy]: sortOrder });
  
  if (isExport !== "true") {
    query.skip(skip).limit(limit);
  }
  
  const teachers = await query.lean();

  if (teachers.length === 0) {
    return res.status(200).json(
      new ApiResponse(200, {
        teachers: [],
        pagination: { page, limit, total: totalCount, pages: 0 },
      }, "No teachers found"),
    );
  }

  // For each teacher, get their classes and attendance stats
  const teacherIds = teachers.map((t) => t._id);

  // Build session date filter
  const sessionDateFilter = {};
  if (startDate || endDate) {
    sessionDateFilter.startTime = {};
    if (startDate) sessionDateFilter.startTime.$gte = new Date(startDate);
    if (endDate) sessionDateFilter.startTime.$lte = new Date(endDate);
  }

  const result = await Promise.all(
    teachers.map(async (teacher) => {
      const teacherClasses = await Class.find({ teacher: teacher._id })
        .select("_id name students")
        .lean();
      const classIds = teacherClasses.map((c) => c._id);
      const totalStudents = teacherClasses.reduce(
        (sum, c) => sum + (c.students?.length || 0), 0,
      );

      // Get sessions
      const sessionsQuery = { teacherId: teacher._id, active: false, ...sessionDateFilter };
      const totalSessions = await Session.countDocuments(sessionsQuery);

      // Get attendance stats across all teacher's classes
      const dateFilter = buildDateFilter(startDate, endDate);
      const attendanceMatch = { classId: { $in: classIds }, ...dateFilter };

      const attStats = classIds.length > 0
        ? await Attendance.aggregate([
            { $match: attendanceMatch },
            {
              $group: {
                _id: null,
                totalRecords: { $sum: 1 },
                presentCount: {
                  $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] },
                },
                absentCount: {
                  $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] },
                },
                leaveCount: {
                  $sum: { $cond: [{ $eq: ["$status", "Leave"] }, 1, 0] },
                },
              },
            },
          ])
        : [];

      const stats = attStats[0] || {
        totalRecords: 0, presentCount: 0, absentCount: 0, leaveCount: 0,
      };
      const avgAttendance = stats.totalRecords > 0
        ? ((stats.presentCount / stats.totalRecords) * 100).toFixed(2)
        : 0;

      return {
        _id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        phone: teacher.mobileNumber || teacher.info?.phone || "N/A",
        department: teacher.info?.department || "N/A",
        totalClasses: teacherClasses.length,
        totalStudents,
        totalSessions,
        totalPresent: stats.presentCount,
        totalAbsent: stats.absentCount,
        totalLeave: stats.leaveCount,
        attendancePercentage: parseFloat(avgAttendance),
      };
    }),
  );

  // Rank teachers by attendance percentage (performance ranking)
  result.sort((a, b) => b.attendancePercentage - a.attendancePercentage);

  if (isExport === "true") {
    const buffer = await ExportService.generateAdminReport("teachers", result, "xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=admin_teachers_report.xlsx`);
    return res.status(200).send(buffer);
  }

  res.status(200).json(
    new ApiResponse(200, {
      teachers: result,
      pagination: {
        page, limit, total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    }, "Admin teacher reports retrieved"),
  );
});

/**
 * Admin Department Reports
 * GET /api/v1/analytics/admin/departments
 */
export const getAdminDepartmentReports = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    throw ApiError.forbidden("Only admins can access admin reports");
  }

  const { startDate, endDate, export: isExport } = req.query;
  const dateFilter = buildDateFilter(startDate, endDate);

  // Get all unique departments
  const departments = await Class.distinct("department");

  const result = await Promise.all(
    departments.map(async (dept) => {
      const deptClasses = await Class.find({ department: dept })
        .select("_id students")
        .lean();
      const classIds = deptClasses.map((c) => c._id);
      const totalStudents = new Set(
        deptClasses.flatMap((c) => (c.students || []).map((s) => s.toString())),
      ).size;

      // Session count
      const sessionQuery = { classId: { $in: classIds }, active: false };
      if (startDate || endDate) {
        sessionQuery.startTime = {};
        if (startDate) sessionQuery.startTime.$gte = new Date(startDate);
        if (endDate) sessionQuery.startTime.$lte = new Date(endDate);
      }
      const totalSessions = await Session.countDocuments(sessionQuery);

      // Attendance stats
      const attendanceMatch = { classId: { $in: classIds }, ...dateFilter };
      const attStats = classIds.length > 0
        ? await Attendance.aggregate([
            { $match: attendanceMatch },
            {
              $group: {
                _id: null,
                totalRecords: { $sum: 1 },
                presentCount: {
                  $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] },
                },
                absentCount: {
                  $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] },
                },
                leaveCount: {
                  $sum: { $cond: [{ $eq: ["$status", "Leave"] }, 1, 0] },
                },
              },
            },
          ])
        : [];

      const stats = attStats[0] || {
        totalRecords: 0, presentCount: 0, absentCount: 0, leaveCount: 0,
      };
      const avgAttendance = stats.totalRecords > 0
        ? ((stats.presentCount / stats.totalRecords) * 100).toFixed(2)
        : 0;

      // Teachers count in this department
      const teacherIds = await Class.distinct("teacher", { department: dept });

      return {
        name: dept,
        totalClasses: deptClasses.length,
        totalStudents,
        totalTeachers: teacherIds.length,
        totalSessions,
        totalPresent: stats.presentCount,
        totalAbsent: stats.absentCount,
        totalLeave: stats.leaveCount,
        attendancePercentage: parseFloat(avgAttendance),
      };
    }),
  );

  if (isExport === "true") {
    const buffer = await ExportService.generateAdminReport("departments", result, "xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=admin_departments_report.xlsx`);
    return res.status(200).send(buffer);
  }

  res.status(200).json(
    new ApiResponse(200, { departments: result }, "Admin department reports retrieved"),
  );
});

/**
 * Admin Batch Reports
 * GET /api/v1/analytics/admin/batches
 */
export const getAdminBatchReports = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    throw ApiError.forbidden("Only admins can access admin reports");
  }

  const { department, startDate, endDate, export: isExport } = req.query;
  const dateFilter = buildDateFilter(startDate, endDate);

  const classFilter = {};
  if (department) classFilter.department = buildArrayRegex(department);

  const batches = await Class.distinct("batch", classFilter);

  const result = await Promise.all(
    batches.filter(Boolean).map(async (batch) => {
      const batchFilter = { batch, ...classFilter };
      const batchClasses = await Class.find(batchFilter)
        .select("_id students department")
        .lean();
      const classIds = batchClasses.map((c) => c._id);
      const totalStudents = new Set(
        batchClasses.flatMap((c) => (c.students || []).map((s) => s.toString())),
      ).size;
      const deptSet = new Set(batchClasses.map((c) => c.department));

      const attendanceMatch = { classId: { $in: classIds }, ...dateFilter };
      const attStats = classIds.length > 0
        ? await Attendance.aggregate([
            { $match: attendanceMatch },
            {
              $group: {
                _id: null,
                totalRecords: { $sum: 1 },
                presentCount: {
                  $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] },
                },
                absentCount: {
                  $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] },
                },
                leaveCount: {
                  $sum: { $cond: [{ $eq: ["$status", "Leave"] }, 1, 0] },
                },
              },
            },
          ])
        : [];

      const stats = attStats[0] || {
        totalRecords: 0, presentCount: 0, absentCount: 0, leaveCount: 0,
      };
      const avgAttendance = stats.totalRecords > 0
        ? ((stats.presentCount / stats.totalRecords) * 100).toFixed(2)
        : 0;

      return {
        name: batch,
        departments: [...deptSet],
        totalClasses: batchClasses.length,
        totalStudents,
        totalPresent: stats.presentCount,
        totalAbsent: stats.absentCount,
        totalLeave: stats.leaveCount,
        attendancePercentage: parseFloat(avgAttendance),
      };
    }),
  );

  if (isExport === "true") {
    const buffer = await ExportService.generateAdminReport("batches", result, "xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=admin_batches_report.xlsx`);
    return res.status(200).send(buffer);
  }

  res.status(200).json(
    new ApiResponse(200, { batches: result }, "Admin batch reports retrieved"),
  );
});

/**
 * Admin Section Reports
 * GET /api/v1/analytics/admin/sections
 */
export const getAdminSectionReports = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    throw ApiError.forbidden("Only admins can access admin reports");
  }

  const { department, batch, startDate, endDate, export: isExport } = req.query;
  const dateFilter = buildDateFilter(startDate, endDate);

  const classFilter = {};
  if (department) classFilter.department = buildArrayRegex(department);
  if (batch) classFilter.batch = buildArrayRegex(batch);

  const sections = await Class.distinct("section", classFilter);

  const result = await Promise.all(
    sections.filter(Boolean).map(async (section) => {
      const sectionFilter = { section, ...classFilter };
      const sectionClasses = await Class.find(sectionFilter)
        .select("_id students department batch")
        .lean();
      const classIds = sectionClasses.map((c) => c._id);
      const totalStudents = new Set(
        sectionClasses.flatMap((c) => (c.students || []).map((s) => s.toString())),
      ).size;
      const deptSet = new Set(sectionClasses.map((c) => c.department));
      const batchSet = new Set(sectionClasses.map((c) => c.batch));

      const attendanceMatch = { classId: { $in: classIds }, ...dateFilter };
      const attStats = classIds.length > 0
        ? await Attendance.aggregate([
            { $match: attendanceMatch },
            {
              $group: {
                _id: null,
                totalRecords: { $sum: 1 },
                presentCount: {
                  $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] },
                },
                absentCount: {
                  $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] },
                },
                leaveCount: {
                  $sum: { $cond: [{ $eq: ["$status", "Leave"] }, 1, 0] },
                },
              },
            },
          ])
        : [];

      const stats = attStats[0] || {
        totalRecords: 0, presentCount: 0, absentCount: 0, leaveCount: 0,
      };
      const avgAttendance = stats.totalRecords > 0
        ? ((stats.presentCount / stats.totalRecords) * 100).toFixed(2)
        : 0;

      return {
        name: section,
        departments: [...deptSet],
        batches: [...batchSet],
        totalClasses: sectionClasses.length,
        totalStudents,
        totalPresent: stats.presentCount,
        totalAbsent: stats.absentCount,
        totalLeave: stats.leaveCount,
        attendancePercentage: parseFloat(avgAttendance),
      };
    }),
  );

  if (isExport === "true") {
    const buffer = await ExportService.generateAdminReport("sections", result, "xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=admin_sections_report.xlsx`);
    return res.status(200).send(buffer);
  }

  res.status(200).json(
    new ApiResponse(200, { sections: result }, "Admin section reports retrieved"),
  );
});

/**
 * Admin Subject Reports
 * GET /api/v1/analytics/admin/subjects
 */
export const getAdminSubjectReports = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    throw ApiError.forbidden("Only admins can access admin reports");
  }

  const { department, batch, section, startDate, endDate, export: isExport } = req.query;
  const dateFilter = buildDateFilter(startDate, endDate);

  const classFilter = {};
  if (department) classFilter.department = buildArrayRegex(department);
  if (batch) classFilter.batch = buildArrayRegex(batch);
  if (section) classFilter.section = buildArrayRegex(section);

  const subjects = await Class.distinct("name", classFilter);

  const result = await Promise.all(
    subjects.filter(Boolean).map(async (subjectName) => {
      const subjectFilter = { name: subjectName, ...classFilter };
      const subjectClasses = await Class.find(subjectFilter)
        .select("_id students department batch section")
        .lean();
      const classIds = subjectClasses.map((c) => c._id);
      const totalStudents = new Set(
        subjectClasses.flatMap((c) => (c.students || []).map((s) => s.toString())),
      ).size;
      const deptSet = new Set(subjectClasses.map((c) => c.department));
      const batchSet = new Set(subjectClasses.map((c) => c.batch));

      const attendanceMatch = { classId: { $in: classIds }, ...dateFilter };
      const attStats = classIds.length > 0
        ? await Attendance.aggregate([
            { $match: attendanceMatch },
            {
              $group: {
                _id: null,
                totalRecords: { $sum: 1 },
                presentCount: {
                  $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] },
                },
                absentCount: {
                  $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] },
                },
                leaveCount: {
                  $sum: { $cond: [{ $eq: ["$status", "Leave"] }, 1, 0] },
                },
              },
            },
          ])
        : [];

      const stats = attStats[0] || {
        totalRecords: 0, presentCount: 0, absentCount: 0, leaveCount: 0,
      };
      const avgAttendance = stats.totalRecords > 0
        ? ((stats.presentCount / stats.totalRecords) * 100).toFixed(2)
        : 0;

      return {
        name: subjectName,
        departments: [...deptSet],
        batches: [...batchSet],
        totalClasses: subjectClasses.length,
        totalStudents,
        totalPresent: stats.presentCount,
        totalAbsent: stats.absentCount,
        totalLeave: stats.leaveCount,
        attendancePercentage: parseFloat(avgAttendance),
      };
    }),
  );

  if (isExport === "true") {
    const buffer = await ExportService.generateAdminReport("subjects", result, "xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=admin_subjects_report.xlsx`);
    return res.status(200).send(buffer);
  }

  res.status(200).json(
    new ApiResponse(200, { subjects: result }, "Admin subject reports retrieved"),
  );
});

/**
 * Admin Class Reports
 * GET /api/v1/analytics/admin/classes
 */
export const getAdminClassReports = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    throw ApiError.forbidden("Only admins can access admin reports");
  }

  const { department, batch, semester, teacher, startDate, endDate, export: isExport } = req.query;
  const { page, limit, skip, sortBy, sortOrder } = buildPaginationSort(req.query);
  const dateFilter = buildDateFilter(startDate, endDate);

  const classFilter = {};
  if (department) classFilter.department = buildArrayRegex(department);
  if (batch) classFilter.batch = buildArrayRegex(batch);
  if (semester) classFilter.semester = buildArrayNumber(semester);
  if (teacher) classFilter.teacher = buildArrayObjectId(teacher);

  const totalCount = await Class.countDocuments(classFilter);
  const query = Class.find(classFilter)
    .populate("teacher", "name email")
    .select("_id name code department semester batch students teacher")
    .sort({ [sortBy]: sortOrder });
  
  if (isExport !== "true") {
    query.skip(skip).limit(limit);
  }
  
  const classes = await query.lean();

  const result = await Promise.all(
    classes.map(async (cls) => {
      const attendanceMatch = {
        classId: cls._id,
        ...dateFilter,
      };

      const attStats = await Attendance.aggregate([
        { $match: attendanceMatch },
        {
          $group: {
            _id: null,
            totalRecords: { $sum: 1 },
            presentCount: {
              $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] },
            },
            absentCount: {
              $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] },
            },
            leaveCount: {
              $sum: { $cond: [{ $eq: ["$status", "Leave"] }, 1, 0] },
            },
          },
        },
      ]);

      const stats = attStats[0] || {
        totalRecords: 0, presentCount: 0, absentCount: 0, leaveCount: 0,
      };
      const avgAttendance = stats.totalRecords > 0
        ? ((stats.presentCount / stats.totalRecords) * 100).toFixed(2)
        : 0;

      const sessionCount = await Session.countDocuments({
        classId: cls._id,
        active: false,
      });

      return {
        _id: cls._id,
        name: cls.name,
        code: cls.code,
        department: cls.department,
        semester: cls.semester,
        batch: cls.batch || "N/A",
        teacher: cls.teacher?.name || "N/A",
        teacherEmail: cls.teacher?.email || "N/A",
        totalStudents: cls.students?.length || 0,
        totalSessions: sessionCount,
        totalPresent: stats.presentCount,
        totalAbsent: stats.absentCount,
        totalLeave: stats.leaveCount,
        attendancePercentage: parseFloat(avgAttendance),
      };
    }),
  );

  if (isExport === "true") {
    const buffer = await ExportService.generateAdminReport("classes", result, "xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=admin_classes_report.xlsx`);
    return res.status(200).send(buffer);
  }

  res.status(200).json(
    new ApiResponse(200, {
      classes: result,
      pagination: {
        page, limit, total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    }, "Admin class reports retrieved"),
  );
});

/**
 * Admin Cross-Class Defaulters
 * GET /api/v1/analytics/admin/defaulters
 * Returns students below threshold across all classes, with filters
 */
export const getAdminDefaulters = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    throw ApiError.forbidden("Only admins can access admin reports");
  }

  const {
    department, batch, semester, classId,
    startDate, endDate, threshold: thresholdStr, export: isExport
  } = req.query;
  const { page, limit, skip } = buildPaginationSort(req.query);
  const dateFilter = buildDateFilter(startDate, endDate);
  const threshold = parseFloat(thresholdStr) || 75;

  // Build class filter
  const classFilter = {};
  if (department) classFilter.department = buildArrayRegex(department);
  if (batch) classFilter.batch = buildArrayRegex(batch);
  if (semester) classFilter.semester = buildArrayNumber(semester);
  if (classId) classFilter._id = buildArrayObjectId(classId);

  const matchingClasses = await Class.find(classFilter).select("_id name code department").lean();
  const classIds = matchingClasses.map((c) => c._id);

  if (classIds.length === 0) {
    return res.status(200).json(
      new ApiResponse(200, {
        defaulters: [],
        pagination: { page, limit, total: 0, pages: 0 },
      }, "No matching classes found"),
    );
  }

  const attendanceMatch = { classId: { $in: classIds }, ...dateFilter };

  // Aggregate per student across all matching classes
  const allStudentStats = await Attendance.aggregate([
    { $match: attendanceMatch },
    {
      $group: {
        _id: "$studentId",
        totalClasses: { $sum: 1 },
        presentCount: {
          $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] },
        },
        absentCount: {
          $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] },
        },
        leaveCount: {
          $sum: { $cond: [{ $eq: ["$status", "Leave"] }, 1, 0] },
        },
      },
    },
    {
      $project: {
        studentId: "$_id",
        totalClasses: 1,
        presentCount: 1,
        absentCount: 1,
        leaveCount: 1,
        attendancePercentage: {
          $cond: [
            { $gt: ["$totalClasses", 0] },
            {
              $round: [
                { $multiply: [{ $divide: ["$presentCount", "$totalClasses"] }, 100] },
                2,
              ],
            },
            0,
          ],
        },
      },
    },
    {
      $match: { attendancePercentage: { $lt: threshold } },
    },
    {
      $sort: { attendancePercentage: 1 },
    },
  ]);

  const totalDefaulters = allStudentStats.length;

  // Paginate
  const statsToProcess = isExport === "true" ? allStudentStats : allStudentStats.slice(skip, skip + limit);
  const studentIds = statsToProcess.map((s) => s.studentId);

  // Fetch student details
  const studentDetails = await User.find({ _id: { $in: studentIds } })
    .select("_id name email mobileNumber info")
    .lean();

  const studentMap = new Map(studentDetails.map((s) => [s._id.toString(), s]));

  const defaulters = statsToProcess.map((stat) => {
    const student = studentMap.get(stat.studentId.toString()) || {};
    return {
      _id: stat.studentId,
      name: student.name || "N/A",
      email: student.email || "N/A",
      phone: student.mobileNumber || student.info?.phone || "N/A",
      rollNo: student.info?.rollNo || "N/A",
      department: student.info?.department || "N/A",
      batch: student.info?.batch || "N/A",
      section: student.info?.section || "N/A",
      semester: student.info?.semester || "N/A",
      totalClasses: stat.totalClasses,
      presentCount: stat.presentCount,
      absentCount: stat.absentCount,
      leaveCount: stat.leaveCount,
      attendancePercentage: stat.attendancePercentage,
    };
  });

  if (isExport === "true") {
    const buffer = await ExportService.generateAdminReport("defaulters", defaulters, "xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=admin_defaulters_report.xlsx`);
    return res.status(200).send(buffer);
  }

  res.status(200).json(
    new ApiResponse(200, {
      threshold,
      defaulters,
      pagination: {
        page, limit, total: totalDefaulters,
        pages: Math.ceil(totalDefaulters / limit),
      },
    }, `Found ${totalDefaulters} defaulters below ${threshold}%`),
  );
});

/**
 * Admin Student Attendance Detail
 * GET /api/v1/analytics/admin/students/:studentId/attendance
 * Returns per-session attendance records for drill-down modal
 */
export const getStudentAttendanceDetail = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin" && req.user.role !== "teacher") {
    throw ApiError.forbidden("Only admins and teachers can access this");
  }

  const { studentId } = req.params;
  const { classId, startDate, endDate } = req.query;

  const student = await User.findById(studentId)
    .select("_id name email info")
    .lean();

  if (!student) {
    throw ApiError.notFound("Student not found");
  }

  const dateFilter = buildDateFilter(startDate, endDate);
  const attendanceMatch = {
    studentId: new mongoose.Types.ObjectId(studentId),
    ...dateFilter,
  };
  if (classId) {
    attendanceMatch.classId = new mongoose.Types.ObjectId(classId);
  }

  const records = await Attendance.find(attendanceMatch)
    .populate("classId", "name code")
    .populate("sessionId", "startTime endTime type")
    .sort({ date: -1 })
    .lean();

  const formattedRecords = records.map((r) => ({
    date: r.date,
    time: r.sessionId?.startTime || null,
    status: r.status,
    className: r.classId?.name || "N/A",
    classCode: r.classId?.code || "N/A",
    sessionType: r.sessionId?.type || "N/A",
    verificationMethod: r.verificationMethod,
  }));

  res.status(200).json(
    new ApiResponse(200, {
      student: {
        _id: student._id,
        name: student.name,
        email: student.email,
        rollNo: student.info?.rollNo || "N/A",
      },
      records: formattedRecords,
      total: formattedRecords.length,
    }, "Student attendance detail retrieved"),
  );
});
