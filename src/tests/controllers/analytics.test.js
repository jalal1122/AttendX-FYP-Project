import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import request from "supertest";

import Attendance from "../../models/attendance.model.js";
import Class from "../../models/class.model.js";
import Session from "../../models/session.model.js";
import User from "../../models/user.model.js";
import { clearDatabase } from "../setup/db.js";
import { generateAuthToken } from "../utils/authHelper.js";

const mockConnectDB = jest.fn();
const mockInitSocketServer = jest.fn();
const mockSendLowAttendanceWarning = jest
  .fn()
  .mockResolvedValue({ success: true });

await jest.unstable_mockModule("../../../config/db.js", () => ({
  default: mockConnectDB,
}));

await jest.unstable_mockModule("../../../src/socket/socket.js", () => ({
  initSocketServer: mockInitSocketServer,
  getSocketServer: jest.fn(() => null),
  emitToSession: jest.fn(),
}));

await jest.unstable_mockModule(
  "../../../src/services/email.service.js",
  () => ({
    default: {
      sendLowAttendanceWarning: mockSendLowAttendanceWarning,
    },
  }),
);

process.env.NODE_ENV = "production";
process.env.VERCEL = "1";
process.env.JWT_ACCESS_SECRET = "test-access-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
process.env.JWT_ACCESS_EXPIRY = "15m";
process.env.JWT_REFRESH_EXPIRY = "7d";
process.env.COOKIE_SECURE = "false";
process.env.COOKIE_SAME_SITE = "lax";
process.env.QR_SECRET = "test-qr-secret";

let app;
let adminUser;
let teacherUser;
let teacherEmptyUser;
let studentUser;
let peerStudent;
let outsiderStudent;
let lonelyStudent;
let adminToken;
let teacherToken;
let teacherEmptyToken;
let studentToken;
let outsiderToken;
let lonelyToken;
let alphaClass;
let betaClass;
let gammaClass;
let alphaSessions;
let betaSessions;

const dayOffset = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

const api = () => request(app);

const binaryParser = (res, callback) => {
  const chunks = [];
  res.on("data", (chunk) => chunks.push(chunk));
  res.on("end", () => callback(null, Buffer.concat(chunks)));
};

const expectForbidden = (response) => {
  expect(response.statusCode).toBe(403);
  expect(response.body.success).toBe(false);
};

beforeAll(async () => {
  ({ default: app } = await import("../../../server.js"));
});

beforeEach(async () => {
  await clearDatabase();
  jest.clearAllMocks();

  adminUser = await User.create({
    name: "Admin User",
    email: "admin.analytics@example.com",
    password: "Password123!",
    role: "admin",
    info: { department: "Administration" },
  });

  teacherUser = await User.create({
    name: "Teacher User",
    email: "teacher.analytics@example.com",
    password: "Password123!",
    role: "teacher",
    info: { department: "Computer Science", designation: "Lecturer" },
  });

  teacherEmptyUser = await User.create({
    name: "Empty Teacher",
    email: "empty.teacher@example.com",
    password: "Password123!",
    role: "teacher",
    info: { department: "Mathematics", designation: "Assistant Professor" },
  });

  studentUser = await User.create({
    name: "Student User",
    email: "student.analytics@example.com",
    password: "Password123!",
    role: "student",
    info: {
      rollNo: "CS-001",
      semester: 6,
      department: "Computer Science",
      batch: "2022",
      year: "4",
    },
  });

  peerStudent = await User.create({
    name: "Peer Student",
    email: "peer.analytics@example.com",
    password: "Password123!",
    role: "student",
    info: {
      rollNo: "CS-002",
      semester: 6,
      department: "Computer Science",
      batch: "2022",
      year: "4",
    },
  });

  outsiderStudent = await User.create({
    name: "Outsider Student",
    email: "outsider.analytics@example.com",
    password: "Password123!",
    role: "student",
    info: {
      rollNo: "ME-999",
      semester: 2,
      department: "Mechanical Engineering",
      batch: "2024",
      year: "1",
    },
  });

  lonelyStudent = await User.create({
    name: "Lonely Student",
    email: "lonely.analytics@example.com",
    password: "Password123!",
    role: "student",
    info: {
      rollNo: "CS-999",
      semester: 6,
      department: "Computer Science",
      batch: "2022",
      year: "4",
    },
  });

  alphaClass = await Class.create({
    name: "Algorithms",
    code: "ALG401",
    teacher: teacherUser._id,
    students: [studentUser._id, peerStudent._id],
    department: "Computer Science",
    semester: 6,
    batch: "2022",
    academicYear: "2025-2026",
  });

  betaClass = await Class.create({
    name: "Databases",
    code: "DB401",
    teacher: teacherUser._id,
    students: [studentUser._id],
    department: "Computer Science",
    semester: 6,
    batch: "2022",
    academicYear: "2025-2026",
  });

  gammaClass = await Class.create({
    name: "Mechanics",
    code: "MEC401",
    teacher: adminUser._id,
    students: [],
    department: "Mechanical Engineering",
    semester: 5,
    batch: "2023",
    academicYear: "2025-2026",
  });

  alphaSessions = await Session.create([
    {
      classId: alphaClass._id,
      teacherId: teacherUser._id,
      startTime: dayOffset(1),
      active: false,
      isRetroactive: false,
      teacherIP: "10.0.0.1",
      type: "Lecture",
    },
    {
      classId: alphaClass._id,
      teacherId: teacherUser._id,
      startTime: dayOffset(2),
      active: false,
      isRetroactive: false,
      teacherIP: "10.0.0.1",
      type: "Lab",
    },
    {
      classId: alphaClass._id,
      teacherId: teacherUser._id,
      startTime: dayOffset(3),
      active: false,
      isRetroactive: false,
      teacherIP: "10.0.0.1",
      type: "Exam",
    },
  ]);

  betaSessions = await Session.create([
    {
      classId: betaClass._id,
      teacherId: teacherUser._id,
      startTime: dayOffset(4),
      active: false,
      isRetroactive: false,
      teacherIP: "10.0.0.1",
      type: "Lecture",
    },
    {
      classId: betaClass._id,
      teacherId: teacherUser._id,
      startTime: dayOffset(5),
      active: false,
      isRetroactive: false,
      teacherIP: "10.0.0.1",
      type: "Lab",
    },
  ]);

  await Attendance.create([
    {
      sessionId: alphaSessions[0]._id,
      studentId: studentUser._id,
      classId: alphaClass._id,
      status: "Present",
      verificationMethod: "Manual",
      deviceId: "device-s1",
      date: dayOffset(1),
    },
    {
      sessionId: alphaSessions[0]._id,
      studentId: peerStudent._id,
      classId: alphaClass._id,
      status: "Absent",
      verificationMethod: "Manual",
      deviceId: "device-p1",
      date: dayOffset(1),
    },
    {
      sessionId: alphaSessions[1]._id,
      studentId: studentUser._id,
      classId: alphaClass._id,
      status: "Present",
      verificationMethod: "Manual",
      deviceId: "device-s2",
      date: dayOffset(2),
    },
    {
      sessionId: alphaSessions[1]._id,
      studentId: peerStudent._id,
      classId: alphaClass._id,
      status: "Absent",
      verificationMethod: "Manual",
      deviceId: "device-p2",
      date: dayOffset(2),
    },
    {
      sessionId: alphaSessions[2]._id,
      studentId: studentUser._id,
      classId: alphaClass._id,
      status: "Late",
      verificationMethod: "Manual",
      deviceId: "device-s3",
      date: dayOffset(3),
    },
    {
      sessionId: alphaSessions[2]._id,
      studentId: peerStudent._id,
      classId: alphaClass._id,
      status: "Present",
      verificationMethod: "Manual",
      deviceId: "device-p3",
      date: dayOffset(3),
    },
    {
      sessionId: betaSessions[0]._id,
      studentId: studentUser._id,
      classId: betaClass._id,
      status: "Present",
      verificationMethod: "Manual",
      deviceId: "device-b1",
      date: dayOffset(4),
    },
    {
      sessionId: betaSessions[1]._id,
      studentId: studentUser._id,
      classId: betaClass._id,
      status: "Absent",
      verificationMethod: "Manual",
      deviceId: "device-b2",
      date: dayOffset(5),
    },
  ]);

  adminToken = generateAuthToken(adminUser);
  teacherToken = generateAuthToken(teacherUser);
  teacherEmptyToken = generateAuthToken(teacherEmptyUser);
  studentToken = generateAuthToken(studentUser);
  outsiderToken = generateAuthToken(outsiderStudent);
  lonelyToken = generateAuthToken(lonelyStudent);
});

describe("GET /api/v1/analytics/student/:studentId", () => {
  test("returns the student's overall and subject-wise report", async () => {
    const response = await api()
      .get(`/api/v1/analytics/student/${studentUser._id}`)
      .set("Authorization", `Bearer ${studentToken}`)
      .query({ range: "all" });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.student).toMatchObject({
      _id: studentUser._id.toString(),
      name: "Student User",
      email: "student.analytics@example.com",
    });
    expect(response.body.data.overall).toMatchObject({
      totalClasses: 5,
      presentCount: 3,
      absentCount: 1,
      lateCount: 1,
      attendancePercentage: 60,
    });
    expect(response.body.data.subjectWise).toHaveLength(2);
    expect(response.body.data.warnings.hasLowAttendance).toBe(true);
    expect(response.body.data.recentSessions).toHaveLength(5);
    expect(response.body.data.chartData.length).toBeGreaterThanOrEqual(1);
  });

  test("returns 404 when the student does not exist", async () => {
    const missingStudentId = new mongoose.Types.ObjectId();

    const response = await api()
      .get(`/api/v1/analytics/student/${missingStudentId}`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(response.statusCode).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("Student not found");
  });

  test("returns 403 when a different student tries to access the report", async () => {
    const response = await api()
      .get(`/api/v1/analytics/student/${studentUser._id}`)
      .set("Authorization", `Bearer ${outsiderToken}`);

    expect(response.statusCode).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain(
      "You can only view your own attendance report",
    );
  });
});

describe("GET /api/v1/analytics/class/:classId", () => {
  test("returns class analytics for the owning teacher", async () => {
    const response = await api()
      .get(`/api/v1/analytics/class/${alphaClass._id}`)
      .set("Authorization", `Bearer ${teacherToken}`)
      .query({ period: "weekly" });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.class).toMatchObject({
      _id: alphaClass._id.toString(),
      name: "Algorithms",
      code: "ALG401",
      department: "Computer Science",
      semester: 6,
    });
    expect(response.body.data.totalSessions).toBe(3);
    expect(response.body.data.overallStats).toMatchObject({
      totalPresent: 3,
      totalAbsent: 2,
      totalLate: 1,
      totalLeave: 0,
      averageAttendance: 50,
    });
    expect(response.body.data.trends.length).toBeGreaterThanOrEqual(1);
    expect(response.body.data.weeklyTrends.length).toBeGreaterThanOrEqual(1);
    expect(response.body.data.monthlyTrends.length).toBeGreaterThanOrEqual(1);
  });

  test("returns the same attendance totals when filtered by the current month range", async () => {
    const startDate = dayOffset(7).toISOString().split("T")[0];
    const endDate = dayOffset(0).toISOString().split("T")[0];

    const response = await api()
      .get(`/api/v1/analytics/class/${alphaClass._id}`)
      .set("Authorization", `Bearer ${teacherToken}`)
      .query({
        period: "monthly",
        startDate,
        endDate,
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.overallStats).toMatchObject({
      totalPresent: 3,
      totalAbsent: 2,
      totalLate: 1,
      totalLeave: 0,
    });
    expect(response.body.data.trends.length).toBeGreaterThanOrEqual(1);
  });

  test("returns 404 when the class does not exist", async () => {
    const missingClassId = new mongoose.Types.ObjectId();

    const response = await api()
      .get(`/api/v1/analytics/class/${missingClassId}`)
      .set("Authorization", `Bearer ${teacherToken}`);

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toContain("Class not found");
  });

  test("returns 403 when a student tries to access class analytics", async () => {
    const response = await api()
      .get(`/api/v1/analytics/class/${alphaClass._id}`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(response.statusCode).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain(
      "You do not have access to this class analytics",
    );
  });
});

describe("GET /api/v1/analytics/class/:classId/defaulters", () => {
  test("returns students below the attendance threshold", async () => {
    const response = await api()
      .get(`/api/v1/analytics/class/${betaClass._id}/defaulters`)
      .set("Authorization", `Bearer ${teacherToken}`)
      .query({ minPercentage: 75 });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.class).toMatchObject({
      _id: betaClass._id.toString(),
      name: "Databases",
      code: "DB401",
    });
    expect(response.body.data.totalSessions).toBe(2);
    expect(response.body.data.defaultersCount).toBe(1);
    expect(response.body.data.defaulters[0]).toMatchObject({
      studentId: studentUser._id.toString(),
      name: "Student User",
    });
  });

  test("returns 200 with no sessions found when the class has no sessions", async () => {
    const response = await api()
      .get(`/api/v1/analytics/class/${gammaClass._id}/defaulters`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      totalSessions: 0,
      defaulters: [],
    });
  });

  test("returns 403 when a student tries to view defaulters", async () => {
    const response = await api()
      .get(`/api/v1/analytics/class/${betaClass._id}/defaulters`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(response.statusCode).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain(
      "You do not have access to this class",
    );
  });
});

describe("GET /api/v1/analytics/teacher/stats", () => {
  test("returns aggregated teacher statistics", async () => {
    const response = await api()
      .get("/api/v1/analytics/teacher/stats")
      .set("Authorization", `Bearer ${teacherToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.teacher).toMatchObject({
      _id: teacherUser._id.toString(),
      name: "Teacher User",
      email: "teacher.analytics@example.com",
    });
    expect(response.body.data.summary).toMatchObject({
      totalClasses: 2,
      totalSessions: 5,
      activeSessions: 0,
      totalStudents: 3,
      averageStudentsPerClass: 1.5,
    });
    expect(response.body.data.sessionBreakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ _id: "Lecture", count: 2 }),
        expect.objectContaining({ _id: "Lab", count: 2 }),
      ]),
    );
    expect(response.body.data.classesWithStats).toHaveLength(2);
    expect(response.body.data.attendanceStats.totalRecords).toBe(8);
  });

  test("returns zeroed statistics for a teacher with no classes", async () => {
    const response = await api()
      .get("/api/v1/analytics/teacher/stats")
      .set("Authorization", `Bearer ${teacherEmptyToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.summary).toMatchObject({
      totalClasses: 0,
      totalSessions: 0,
      activeSessions: 0,
      totalStudents: 0,
      averageStudentsPerClass: 0,
    });
    expect(response.body.data.classesWithStats).toEqual([]);
  });

  test("returns 403 when a student accesses teacher stats", async () => {
    const response = await api()
      .get("/api/v1/analytics/teacher/stats")
      .set("Authorization", `Bearer ${studentToken}`);

    expect(response.statusCode).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("Required roles: teacher, admin");
  });
});

describe("GET /api/v1/analytics/comprehensive", () => {
  test("returns a comprehensive admin report filtered by semester and department", async () => {
    const response = await api()
      .get("/api/v1/analytics/comprehensive")
      .set("Authorization", `Bearer ${adminToken}`)
      .query({ semester: 6, department: "Computer Science" });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.filters).toMatchObject({
      semester: "6",
      department: "Computer Science",
    });
    expect(response.body.data.totalClasses).toBe(2);
    expect(response.body.data.report).toHaveLength(2);
    expect(response.body.data.report).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "ALG401" }),
        expect.objectContaining({ code: "DB401" }),
      ]),
    );
  });

  test("returns an empty report when filters match nothing", async () => {
    const response = await api()
      .get("/api/v1/analytics/comprehensive")
      .set("Authorization", `Bearer ${adminToken}`)
      .query({ semester: 9, department: "Physics" });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.totalClasses).toBe(0);
    expect(response.body.data.report).toEqual([]);
  });

  test("returns 403 when a student tries to access the comprehensive report", async () => {
    const response = await api()
      .get("/api/v1/analytics/comprehensive")
      .set("Authorization", `Bearer ${studentToken}`);

    expect(response.statusCode).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("Required roles: admin");
  });
});

describe("GET /api/v1/analytics/export", () => {
  test("exports a class matrix as XLSX for an admin", async () => {
    const response = await api()
      .get("/api/v1/analytics/export")
      .set("Authorization", `Bearer ${adminToken}`)
      .query({
        type: "class_matrix",
        format: "xlsx",
        targetId: alphaClass._id.toString(),
        range: "semester",
      })
      .buffer(true)
      .parse(binaryParser);

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(response.headers["content-disposition"]).toContain(
      `filename="${alphaClass.code}_Attendance_`,
    );
    expect(response.body.length).toBeGreaterThan(0);
  });

  test("exports a class matrix as XLSX for the owning teacher", async () => {
    const response = await api()
      .get("/api/v1/analytics/export")
      .set("Authorization", `Bearer ${teacherToken}`)
      .query({
        type: "class_matrix",
        format: "xlsx",
        targetId: alphaClass._id.toString(),
        range: "semester",
      })
      .buffer(true)
      .parse(binaryParser);

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(response.headers["content-disposition"]).toContain(
      `filename="${alphaClass.code}_Attendance_`,
    );
    expect(response.body.length).toBeGreaterThan(0);
  });

  test("exports a student transcript as CSV for the student themselves", async () => {
    const response = await api()
      .get("/api/v1/analytics/export")
      .set("Authorization", `Bearer ${studentToken}`)
      .query({
        type: "student_transcript",
        format: "csv",
        targetId: studentUser._id.toString(),
        range: "all",
      })
      .buffer(true);

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/csv");
    const csvText = response.text || response.body.toString("utf8");
    expect(csvText).toContain("Student Attendance Transcript");
    expect(csvText).toContain("Roll Number:,CS-001");
    expect(csvText).toContain("Department:,Computer Science");
    expect(csvText).toContain("Algorithms");
    expect(csvText).toContain("Databases");
  });

  test("exports a department summary as XLSX for an admin", async () => {
    const response = await api()
      .get("/api/v1/analytics/export")
      .set("Authorization", `Bearer ${adminToken}`)
      .query({
        type: "dept_summary",
        format: "xlsx",
        range: "semester",
      })
      .buffer(true)
      .parse(binaryParser);

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(response.headers["content-disposition"]).toContain(
      "Department_Summary_",
    );
    expect(response.body.length).toBeGreaterThan(0);
  });

  test("exports a department summary as XLSX for the owning teacher", async () => {
    const response = await api()
      .get("/api/v1/analytics/export")
      .set("Authorization", `Bearer ${teacherToken}`)
      .query({
        type: "dept_summary",
        format: "xlsx",
        range: "semester",
      })
      .buffer(true)
      .parse(binaryParser);

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(response.headers["content-disposition"]).toContain(
      "Department_Summary_",
    );
    expect(response.body.length).toBeGreaterThan(0);
  });

  test("returns 400 when the report type is missing", async () => {
    const response = await api()
      .get("/api/v1/analytics/export")
      .set("Authorization", `Bearer ${adminToken}`)
      .query({ format: "xlsx" });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("Report type is required");
  });

  test("returns 400 when the format is invalid", async () => {
    const response = await api()
      .get("/api/v1/analytics/export")
      .set("Authorization", `Bearer ${adminToken}`)
      .query({
        type: "class_matrix",
        format: "pdf",
        targetId: alphaClass._id.toString(),
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("Format must be 'xlsx' or 'csv'");
  });

  test("returns 400 when the defaulters report type is requested", async () => {
    const response = await api()
      .get("/api/v1/analytics/export")
      .set("Authorization", `Bearer ${adminToken}`)
      .query({
        type: "defaulters",
        targetId: alphaClass._id.toString(),
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain(
      "Defaulters report not yet implemented",
    );
  });

  test("returns 403 when a student tries to export a class matrix", async () => {
    const response = await api()
      .get("/api/v1/analytics/export")
      .set("Authorization", `Bearer ${studentToken}`)
      .query({
        type: "class_matrix",
        targetId: alphaClass._id.toString(),
      });

    expect(response.statusCode).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain(
      "Only admins and teachers can export class reports",
    );
  });
});

describe("POST /api/v1/analytics/check-defaulters", () => {
  test("notifies students below the attendance threshold", async () => {
    const response = await api()
      .post("/api/v1/analytics/check-defaulters")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({ classId: betaClass._id.toString() });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.notified).toBe(1);
    expect(response.body.data.defaulters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Student User",
          email: "student.analytics@example.com",
        }),
      ]),
    );
    expect(mockSendLowAttendanceWarning).toHaveBeenCalledTimes(1);
  });

  test("returns 400 when classId is missing", async () => {
    const response = await api()
      .post("/api/v1/analytics/check-defaulters")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({});

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("Class ID is required");
  });

  test("returns 403 when a student tries to send defaulter notifications", async () => {
    const response = await api()
      .post("/api/v1/analytics/check-defaulters")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ classId: betaClass._id.toString() });

    expect(response.statusCode).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("Required roles: teacher, admin");
  });
});
