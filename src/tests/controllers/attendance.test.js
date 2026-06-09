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
const mockEmitToSession = jest.fn();
const mockSendDeviceAlert = jest.fn().mockResolvedValue({ success: true });

await jest.unstable_mockModule("../../../config/db.js", () => ({
  default: mockConnectDB,
}));

await jest.unstable_mockModule("../../../src/services/socket.js", () => ({
  emitToSession: mockEmitToSession,
  default: {},
}));

await jest.unstable_mockModule(
  "../../../src/services/email.service.js",
  () => ({
    default: {
      sendDeviceAlert: mockSendDeviceAlert,
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
let studentUser;
let outsiderUser;
let adminToken;
let teacherToken;
let studentToken;
let outsiderToken;
let classDoc;
let inactiveClassDoc;
let activeSession;
let inactiveSession;
let qRToken;

beforeAll(async () => {
  ({ default: app } = await import("../../../server.js"));
});

beforeEach(async () => {
  await clearDatabase();
  jest.clearAllMocks();

  adminUser = await User.create({
    name: "Admin User",
    email: "admin.attendance@example.com",
    password: "Password123!",
    role: "admin",
    info: { department: "Administration" },
  });

  teacherUser = await User.create({
    name: "Teacher User",
    email: "teacher.attendance@example.com",
    password: "Password123!",
    role: "teacher",
    info: { department: "Computer Science", designation: "Lecturer" },
  });

  studentUser = await User.create({
    name: "Student User",
    email: "student.attendance@example.com",
    password: "Password123!",
    role: "student",
    info: {
      rollNo: "CS-101",
      semester: 6,
      department: "Computer Science",
      batch: "2022",
      year: "4",
    },
  });

  outsiderUser = await User.create({
    name: "Outsider User",
    email: "outsider.attendance@example.com",
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

  classDoc = await Class.create({
    name: "Algorithms",
    code: "ALG401",
    teacher: teacherUser._id,
    students: [studentUser._id],
    department: "Computer Science",
    semester: 6,
    batch: "2022",
    academicYear: "2025-2026",
  });

  inactiveClassDoc = await Class.create({
    name: "Databases",
    code: "DB401",
    teacher: teacherUser._id,
    students: [studentUser._id],
    department: "Computer Science",
    semester: 6,
    batch: "2022",
    academicYear: "2025-2026",
  });

  activeSession = await Session.create({
    classId: classDoc._id,
    teacherId: teacherUser._id,
    startTime: new Date(),
    active: true,
    isRetroactive: false,
    teacherIP: "10.0.0.1",
    type: "Lecture",
    location: undefined,
    securityConfig: {
      radius: 50,
      ipMatchEnabled: true,
      deviceLockEnabled: true,
      qrRefreshRate: 20,
      manualApproval: false,
    },
  });

  inactiveSession = await Session.create({
    classId: inactiveClassDoc._id,
    teacherId: teacherUser._id,
    startTime: new Date(Date.now() - 60 * 60 * 1000),
    endTime: new Date(),
    active: false,
    isRetroactive: false,
    teacherIP: "10.0.0.1",
    type: "Lecture",
  });

  await Attendance.create({
    sessionId: activeSession._id,
    studentId: studentUser._id,
    classId: classDoc._id,
    status: "Present",
    verificationMethod: "Manual",
    deviceId: "device-existing",
    date: new Date(activeSession.startTime),
  });

  adminToken = generateAuthToken(adminUser);
  teacherToken = generateAuthToken(teacherUser);
  studentToken = generateAuthToken(studentUser);
  outsiderToken = generateAuthToken(outsiderUser);

  qRToken = jwt.sign(
    {
      sessionId: activeSession._id.toString(),
      classId: classDoc._id.toString(),
      teacherId: teacherUser._id.toString(),
      timestamp: Date.now(),
    },
    process.env.QR_SECRET,
    { expiresIn: "20s" },
  );
});

const api = () => request(app);

const expectForbidden = (response) => {
  expect(response.statusCode).toBe(403);
  expect(response.body.success).toBe(false);
};

describe("POST /api/v1/attendance/scan", () => {
  test("marks attendance successfully for an enrolled student", async () => {
    const scanStudent = await User.create({
      name: "Scan Student",
      email: "scan.student@example.com",
      password: "Password123!",
      role: "student",
      info: {
        rollNo: "CS-102",
        semester: 6,
        department: "Computer Science",
        batch: "2022",
        year: "4",
      },
      deviceId: null,
    });

    await Class.findByIdAndUpdate(classDoc._id, {
      $addToSet: { students: scanStudent._id },
    });

    const scanToken = generateAuthToken(scanStudent);
    const response = await api()
      .post("/api/v1/attendance/scan")
      .set("Authorization", `Bearer ${scanToken}`)
      .set("x-forwarded-for", "10.0.0.1")
      .send({
        token: qRToken,
        latitude: undefined,
        longitude: undefined,
        deviceId: "device-scan-001",
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain("Attendance marked successfully");
    expect(response.body.data.attendance).toMatchObject({
      status: "Present",
      verificationMethod: "QR",
      deviceId: "device-scan-001",
    });
    expect(response.body.data.ipMatch).toBe(true);
    expect(response.body.data.requiresApproval).toBe(false);
    expect(mockEmitToSession).toHaveBeenCalledWith(
      activeSession._id.toString(),
      "attendance:updated",
      expect.objectContaining({
        sessionId: activeSession._id.toString(),
        classId: classDoc._id.toString(),
        studentId: scanStudent._id.toString(),
      }),
    );
    expect(mockSendDeviceAlert).toHaveBeenCalledTimes(1);

    const savedAttendance = await Attendance.findOne({
      sessionId: activeSession._id,
      studentId: scanStudent._id,
    });
    expect(savedAttendance).toBeTruthy();
    expect(
      await User.findById(scanStudent._id).select("deviceId"),
    ).toBeTruthy();
  });

  test("returns 400 when the QR token is missing", async () => {
    const response = await api()
      .post("/api/v1/attendance/scan")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ deviceId: "device-scan-001" });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("QR token is required");
  });

  test("returns 403 when a teacher tries to mark attendance", async () => {
    const response = await api()
      .post("/api/v1/attendance/scan")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({ token: qRToken, deviceId: "device-scan-001" });

    expectForbidden(response);
    expect(response.body.message).toContain("Required roles: student");
  });

  test("returns 403 when the student is not enrolled in the class", async () => {
    const response = await api()
      .post("/api/v1/attendance/scan")
      .set("Authorization", `Bearer ${outsiderToken}`)
      .send({
        token: qRToken,
        deviceId: "device-outsider-001",
      });

    expectForbidden(response);
    expect(response.body.message).toContain("not enrolled in this class");
  });
});

describe("POST /api/v1/attendance/mark", () => {
  test("aliases the QR scan route and marks attendance", async () => {
    const aliasStudent = await User.create({
      name: "Alias Student",
      email: "alias.student@example.com",
      password: "Password123!",
      role: "student",
      info: {
        rollNo: "CS-103",
        semester: 6,
        department: "Computer Science",
        batch: "2022",
        year: "4",
      },
    });

    await Class.findByIdAndUpdate(classDoc._id, {
      $addToSet: { students: aliasStudent._id },
    });

    const aliasToken = generateAuthToken(aliasStudent);
    const aliasQrToken = jwt.sign(
      {
        sessionId: activeSession._id.toString(),
        classId: classDoc._id.toString(),
        teacherId: teacherUser._id.toString(),
        timestamp: Date.now(),
      },
      process.env.QR_SECRET,
      { expiresIn: "20s" },
    );

    const response = await api()
      .post("/api/v1/attendance/mark")
      .set("Authorization", `Bearer ${aliasToken}`)
      .send({ token: aliasQrToken, deviceId: "device-alias-001" });

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.attendance.status).toBe("Present");
  });

  test("returns 400 when the QR token is missing", async () => {
    const response = await api()
      .post("/api/v1/attendance/mark")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ deviceId: "device-alias-001" });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toContain("QR token is required");
  });

  test("returns 403 when the authenticated user is not a student", async () => {
    const response = await api()
      .post("/api/v1/attendance/mark")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({ token: qRToken, deviceId: "device-alias-001" });

    expectForbidden(response);
  });
});

describe("PATCH /api/v1/attendance/update", () => {
  test("updates attendance manually for the session teacher", async () => {
    const response = await api()
      .patch("/api/v1/attendance/update")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({
        sessionId: activeSession._id.toString(),
        studentId: studentUser._id.toString(),
        status: "Late",
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      status: "Late",
      verificationMethod: "Manual",
    });
    expect(mockEmitToSession).toHaveBeenCalledWith(
      activeSession._id.toString(),
      "attendance:updated",
      expect.objectContaining({
        sessionId: activeSession._id.toString(),
        studentId: studentUser._id.toString(),
        status: "Late",
      }),
    );
  });

  test("returns 400 when required fields are missing", async () => {
    const response = await api()
      .patch("/api/v1/attendance/update")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({ sessionId: activeSession._id.toString() });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toContain(
      "Session ID, student ID, and status are required",
    );
  });

  test("returns 403 when a student tries to update attendance", async () => {
    const response = await api()
      .patch("/api/v1/attendance/update")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        sessionId: activeSession._id.toString(),
        studentId: studentUser._id.toString(),
        status: "Late",
      });

    expectForbidden(response);
    expect(response.body.message).toContain("Required roles: teacher, admin");
  });
});

describe("GET /api/v1/attendance/session/:sessionId", () => {
  test("returns attendance for a session to the teacher", async () => {
    const response = await api()
      .get(`/api/v1/attendance/session/${activeSession._id}`)
      .set("Authorization", `Bearer ${teacherToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.session._id).toBe(activeSession._id.toString());
    expect(response.body.data.stats.total).toBe(1);
    expect(response.body.data.stats.present).toBe(1);
    expect(response.body.data.attendance).toHaveLength(1);
  });

  test("returns 404 when the session does not exist", async () => {
    const missingSessionId = new mongoose.Types.ObjectId();

    const response = await api()
      .get(`/api/v1/attendance/session/${missingSessionId}`)
      .set("Authorization", `Bearer ${teacherToken}`);

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toContain("Session not found");
  });

  test("returns 403 when a user without access requests the session", async () => {
    const response = await api()
      .get(`/api/v1/attendance/session/${activeSession._id}`)
      .set("Authorization", `Bearer ${outsiderToken}`);

    expectForbidden(response);
    expect(response.body.message).toContain(
      "do not have access to this session",
    );
  });
});

describe("GET /api/v1/attendance/student/:studentId", () => {
  test("returns a student's own attendance history", async () => {
    const response = await api()
      .get(`/api/v1/attendance/student/${studentUser._id}`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.count).toBeGreaterThanOrEqual(1);
    expect(response.body.data.attendance[0]).toMatchObject({
      studentId: studentUser._id.toString(),
    });
  });

  test("returns 403 when a student requests another student's records", async () => {
    const response = await api()
      .get(`/api/v1/attendance/student/${studentUser._id}`)
      .set("Authorization", `Bearer ${outsiderToken}`);

    expectForbidden(response);
    expect(response.body.message).toContain(
      "only view your own attendance records",
    );
  });

  test("returns 401 when the JWT is invalid", async () => {
    const response = await api()
      .get(`/api/v1/attendance/student/${studentUser._id}`)
      .set("Authorization", "Bearer invalid-token");

    expect(response.statusCode).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(
      /invalid access token|jwt malformed/i,
    );
  });
});

describe("GET /api/v1/attendance/my-attendance/:classId", () => {
  test("returns the current student's attendance for a class", async () => {
    const response = await api()
      .get(`/api/v1/attendance/my-attendance/${classDoc._id}`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.classId).toBe(classDoc._id.toString());
    expect(response.body.data.studentId).toBe(studentUser._id.toString());
    expect(response.body.data.summary.totalSessions).toBeGreaterThanOrEqual(1);
  });

  test("returns 200 with an empty summary when the class has no attendance records", async () => {
    const response = await api()
      .get(`/api/v1/attendance/my-attendance/${inactiveClassDoc._id}`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.data.summary).toMatchObject({
      totalSessions: 0,
      present: 0,
      attendancePercentage: 0,
    });
  });

  test("returns 401 when the JWT is invalid", async () => {
    const response = await api()
      .get(`/api/v1/attendance/my-attendance/${classDoc._id}`)
      .set("Authorization", "Bearer invalid-token");

    expect(response.statusCode).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(
      /invalid access token|jwt malformed/i,
    );
  });
});

describe("GET /api/v1/attendance/class/:classId/detailed", () => {
  test("returns a detailed class attendance export for the teacher", async () => {
    const response = await api()
      .get(`/api/v1/attendance/class/${classDoc._id}/detailed`)
      .set("Authorization", `Bearer ${teacherToken}`)
      .query({
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.class).toMatchObject({
      name: "Algorithms",
      code: classDoc.code,
      teacher: "Teacher User",
    });
    expect(response.body.data.sessions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ _id: activeSession._id.toString() }),
      ]),
    );
    expect(response.body.data.attendance).toHaveLength(1);
  });

  test("returns 404 when the class is missing", async () => {
    const missingClassId = new mongoose.Types.ObjectId();

    const response = await api()
      .get(`/api/v1/attendance/class/${missingClassId}/detailed`)
      .set("Authorization", `Bearer ${teacherToken}`);

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toContain("Class not found");
  });

  test("returns 403 when a student tries to export class attendance", async () => {
    const response = await api()
      .get(`/api/v1/attendance/class/${classDoc._id}/detailed`)
      .set("Authorization", `Bearer ${studentToken}`);

    expectForbidden(response);
    expect(response.body.message).toContain("Required roles: teacher, admin");
  });
});

describe("POST /api/v1/attendance/approve", () => {
  test("approves pending attendance records for the session teacher", async () => {
    const approveStudent = await User.create({
      name: "Approve Student",
      email: "approve.student@example.com",
      password: "Password123!",
      role: "student",
      info: {
        rollNo: "CS-104",
        semester: 6,
        department: "Computer Science",
        batch: "2022",
        year: "4",
      },
    });

    await Class.findByIdAndUpdate(classDoc._id, {
      $addToSet: { students: approveStudent._id },
    });

    await Attendance.create({
      sessionId: activeSession._id,
      studentId: approveStudent._id,
      classId: classDoc._id,
      status: "Pending",
      verificationMethod: "QR",
      deviceId: "device-pending-001",
      date: new Date(activeSession.startTime),
    });

    const response = await api()
      .post("/api/v1/attendance/approve")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({
        sessionId: activeSession._id.toString(),
        studentIds: [approveStudent._id.toString()],
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.approvedCount).toBe(1);
    expect(response.body.data.attendance[0].status).toBe("Present");
    expect(mockEmitToSession).toHaveBeenCalledWith(
      activeSession._id.toString(),
      "attendance:approved",
      expect.objectContaining({
        sessionId: activeSession._id.toString(),
        approvedCount: 1,
      }),
    );
  });

  test("returns 400 when required fields are missing", async () => {
    const response = await api()
      .post("/api/v1/attendance/approve")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({ sessionId: activeSession._id.toString() });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toContain(
      "Session ID and student IDs array are required",
    );
  });

  test("returns 403 when a student tries to approve attendance", async () => {
    const response = await api()
      .post("/api/v1/attendance/approve")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        sessionId: activeSession._id.toString(),
        studentIds: [studentUser._id.toString()],
      });

    expectForbidden(response);
    expect(response.body.message).toContain("Required roles: teacher, admin");
  });
});
