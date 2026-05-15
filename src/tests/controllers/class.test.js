import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
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

await jest.unstable_mockModule("../../../config/db.js", () => ({
  default: mockConnectDB,
}));

await jest.unstable_mockModule("../../../src/socket/socket.js", () => ({
  initSocketServer: mockInitSocketServer,
  getSocketServer: jest.fn(() => null),
  emitToSession: jest.fn(),
}));

process.env.NODE_ENV = "production";
process.env.VERCEL = "1";
process.env.JWT_ACCESS_SECRET = "test-access-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
process.env.JWT_ACCESS_EXPIRY = "15m";
process.env.JWT_REFRESH_EXPIRY = "7d";
process.env.COOKIE_SECURE = "false";
process.env.COOKIE_SAME_SITE = "lax";

let app;
let adminUser;
let teacherUser;
let studentUser;
let outsiderUser;
let adminToken;
let teacherToken;
let studentToken;
let outsiderToken;
let teacherClass;
let studentClass;
let adminClass;
let joinableClass;
let activeSession;
let attendanceRecord;

beforeAll(async () => {
  ({ default: app } = await import("../../../server.js"));
});

beforeEach(async () => {
  await clearDatabase();
  jest.clearAllMocks();

  adminUser = await User.create({
    name: "Admin User",
    email: "admin.class@example.com",
    password: "Password123!",
    role: "admin",
    info: { department: "Administration" },
  });

  teacherUser = await User.create({
    name: "Teacher User",
    email: "teacher.class@example.com",
    password: "Password123!",
    role: "teacher",
    info: { department: "Computer Science", designation: "Lecturer" },
  });

  studentUser = await User.create({
    name: "Student User",
    email: "student.class@example.com",
    password: "Password123!",
    role: "student",
    info: {
      rollNo: "CS-101",
      semester: 5,
      department: "Computer Science",
      batch: "2022",
      year: "3",
    },
  });

  outsiderUser = await User.create({
    name: "Outsider User",
    email: "outsider.class@example.com",
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

  teacherClass = await Class.create({
    name: "Algorithms",
    code: "ALG401",
    teacher: teacherUser._id,
    students: [studentUser._id],
    department: "Computer Science",
    semester: 6,
    batch: "2022",
    academicYear: "2025-2026",
  });

  studentClass = await Class.create({
    name: "Data Structures",
    code: "DS401",
    teacher: adminUser._id,
    students: [studentUser._id],
    department: "Computer Science",
    semester: 5,
    batch: "2022",
    academicYear: "2025-2026",
  });

  adminClass = await Class.create({
    name: "Networks",
    code: "NET401",
    teacher: adminUser._id,
    students: [],
    department: "Computer Science",
    semester: 6,
    batch: "2022",
    academicYear: "2025-2026",
  });

  joinableClass = await Class.create({
    name: "Compilers",
    code: "CMP401",
    teacher: adminUser._id,
    students: [],
    department: "Computer Science",
    semester: 6,
    batch: "2022",
    academicYear: "2025-2026",
  });

  activeSession = await Session.create({
    classId: teacherClass._id,
    teacherId: teacherUser._id,
    startTime: new Date(),
    active: true,
    isRetroactive: false,
    teacherIP: "127.0.0.1",
    type: "Lecture",
  });

  attendanceRecord = await Attendance.create({
    sessionId: activeSession._id,
    studentId: studentUser._id,
    classId: teacherClass._id,
    status: "Present",
    verificationMethod: "QR",
    deviceId: "device-001",
    date: new Date(),
  });

  adminToken = generateAuthToken(adminUser);
  teacherToken = generateAuthToken(teacherUser);
  studentToken = generateAuthToken(studentUser);
  outsiderToken = generateAuthToken(outsiderUser);
});

const api = () => request(app);

const expectForbidden = (response) => {
  expect(response.statusCode).toBe(403);
  expect(response.body.success).toBe(false);
};

describe("POST /api/v1/class/create", () => {
  test("creates a class for the authenticated teacher", async () => {
    const response = await api()
      .post("/api/v1/class/create")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({
        name: "Operating Systems",
        department: "Computer Science",
        semester: 4,
        batch: "2023",
        academicYear: "2025-2026",
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      name: "Operating Systems",
      department: "Computer Science",
      semester: 4,
      batch: "2023",
      academicYear: "2025-2026",
      students: [],
      teacher: expect.objectContaining({
        _id: teacherUser._id.toString(),
        name: "Teacher User",
        email: "teacher.class@example.com",
      }),
    });
    expect(response.body.data.code).toMatch(/^[A-F0-9]{6}$/);

    const storedClass = await Class.findOne({ name: "Operating Systems" });
    expect(storedClass).toBeTruthy();
  });

  test("returns 400 when required fields are missing", async () => {
    const response = await api()
      .post("/api/v1/class/create")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({ department: "Computer Science", semester: 4 });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain(
      "Name, department, and semester are required",
    );
  });

  test("returns 403 when a student tries to create a class", async () => {
    const response = await api()
      .post("/api/v1/class/create")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        name: "Denied Class",
        department: "Computer Science",
        semester: 4,
      });

    expectForbidden(response);
  });
});

describe("POST /api/v1/class/join", () => {
  test("joins a class and returns a semester mismatch warning when needed", async () => {
    const response = await api()
      .post("/api/v1/class/join")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ code: joinableClass.code });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain("semester mismatch warning");
    expect(response.body.data.warning).toContain(
      "does not match the class semester",
    );
    expect(response.body.data.class.students).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ _id: studentUser._id.toString() }),
      ]),
    );

    const updatedClass = await Class.findById(joinableClass._id);
    expect(updatedClass.students.map((id) => id.toString())).toContain(
      studentUser._id.toString(),
    );
  });

  test("returns 400 when class code is missing", async () => {
    const response = await api()
      .post("/api/v1/class/join")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({});

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("Class code is required");
  });

  test("returns 403 when a teacher tries to join", async () => {
    const response = await api()
      .post("/api/v1/class/join")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({ code: teacherClass.code });

    expectForbidden(response);
  });
});

describe("GET /api/v1/class", () => {
  test("returns classes owned by a teacher", async () => {
    const response = await api()
      .get("/api/v1/class")
      .set("Authorization", `Bearer ${teacherToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.count).toBe(1);
    expect(response.body.data.classes[0]).toMatchObject({
      _id: teacherClass._id.toString(),
      name: "Algorithms",
    });
  });

  test("returns classes joined by a student", async () => {
    const response = await api()
      .get("/api/v1/class")
      .set("Authorization", `Bearer ${studentToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.count).toBe(2);
    expect(response.body.data.classes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ _id: teacherClass._id.toString() }),
        expect.objectContaining({ _id: studentClass._id.toString() }),
      ]),
    );
  });

  test("returns all classes for an admin", async () => {
    const response = await api()
      .get("/api/v1/class")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.count).toBe(4);
  });

  test("returns 401 when the JWT is invalid", async () => {
    const response = await api()
      .get("/api/v1/class")
      .set("Authorization", "Bearer invalid-token");

    expect(response.statusCode).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(
      /invalid access token|jwt malformed/i,
    );
  });

  test("returns 403 when the authenticated user has an invalid role", async () => {
    const rawUser = {
      _id: new mongoose.Types.ObjectId(),
      name: "Guest User",
      email: "guest.class@example.com",
      password: "Password123!",
      role: "guest",
      info: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await User.collection.insertOne(rawUser);

    const guestToken = generateAuthToken({
      _id: rawUser._id,
      email: rawUser.email,
      role: rawUser.role,
    });

    const response = await api()
      .get("/api/v1/class")
      .set("Authorization", `Bearer ${guestToken}`);

    expectForbidden(response);
    expect(response.body.message).toContain("Invalid role");
  });
});

describe("GET /api/v1/class/:id", () => {
  test("returns class details for an enrolled student", async () => {
    const response = await api()
      .get(`/api/v1/class/${teacherClass._id}`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      _id: teacherClass._id.toString(),
      name: "Algorithms",
      code: teacherClass.code,
    });
    expect(response.body.data.teacher).toMatchObject({
      _id: teacherUser._id.toString(),
      name: "Teacher User",
    });
  });

  test("returns 404 when the class is missing", async () => {
    const missingClassId = new mongoose.Types.ObjectId();

    const response = await api()
      .get(`/api/v1/class/${missingClassId}`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(response.statusCode).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("Class not found");
  });

  test("returns 403 when a user without access requests the class", async () => {
    const response = await api()
      .get(`/api/v1/class/${teacherClass._id}`)
      .set("Authorization", `Bearer ${outsiderToken}`);

    expectForbidden(response);
    expect(response.body.message).toContain("do not have access");
  });
});

describe("POST /api/v1/class/unjoin", () => {
  test("removes the student from the class and preserves attendance records", async () => {
    const response = await api()
      .post("/api/v1/class/unjoin")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ classId: teacherClass._id.toString() });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeNull();

    const updatedClass = await Class.findById(teacherClass._id);
    expect(updatedClass.students.map((id) => id.toString())).not.toContain(
      studentUser._id.toString(),
    );

    const preservedAttendance = await Attendance.findById(attendanceRecord._id);
    expect(preservedAttendance).toBeTruthy();
  });

  test("returns 400 when classId is missing", async () => {
    const response = await api()
      .post("/api/v1/class/unjoin")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({});

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("Class ID is required");
  });

  test("returns 400 when the student is not enrolled", async () => {
    const response = await api()
      .post("/api/v1/class/unjoin")
      .set("Authorization", `Bearer ${outsiderToken}`)
      .send({ classId: teacherClass._id.toString() });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("not enrolled in this class");
  });

  test("returns 403 when a teacher tries to unjoin", async () => {
    const response = await api()
      .post("/api/v1/class/unjoin")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({ classId: teacherClass._id.toString() });

    expectForbidden(response);
  });
});

describe("POST /api/v1/class/remove-student", () => {
  test("removes an enrolled student from the class", async () => {
    const response = await api()
      .post("/api/v1/class/remove-student")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({
        classId: teacherClass._id.toString(),
        studentId: studentUser._id.toString(),
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeNull();

    const updatedClass = await Class.findById(teacherClass._id);
    expect(updatedClass.students.map((id) => id.toString())).not.toContain(
      studentUser._id.toString(),
    );
  });

  test("returns 400 when classId or studentId is missing", async () => {
    const response = await api()
      .post("/api/v1/class/remove-student")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({ classId: teacherClass._id.toString() });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain(
      "Class ID and Student ID are required",
    );
  });

  test("returns 400 when the student is not enrolled", async () => {
    const response = await api()
      .post("/api/v1/class/remove-student")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        classId: teacherClass._id.toString(),
        studentId: outsiderUser._id.toString(),
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("not enrolled in this class");
  });

  test("returns 403 when a non-owner teacher tries to remove a student", async () => {
    const response = await api()
      .post("/api/v1/class/remove-student")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        classId: teacherClass._id.toString(),
        studentId: studentUser._id.toString(),
      });

    expectForbidden(response);
  });
});

describe("PUT /api/v1/class/:id", () => {
  test("updates class details for the owning teacher", async () => {
    const response = await api()
      .put(`/api/v1/class/${teacherClass._id}`)
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({
        name: "Advanced Algorithms",
        semester: 7,
        department: "Software Engineering",
        batch: "2023",
        academicYear: "2026-2027",
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      _id: teacherClass._id.toString(),
      name: "Advanced Algorithms",
      semester: 7,
      department: "Software Engineering",
      batch: "2023",
      academicYear: "2026-2027",
    });
  });

  test("returns 400 when semester is invalid", async () => {
    const response = await api()
      .put(`/api/v1/class/${teacherClass._id}`)
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({ semester: 9 });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("Semester must be between 1 and 8");
  });

  test("returns 404 when the class is missing", async () => {
    const missingClassId = new mongoose.Types.ObjectId();

    const response = await api()
      .put(`/api/v1/class/${missingClassId}`)
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({ name: "Missing Class" });

    expect(response.statusCode).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("Class not found");
  });

  test("returns 403 when a non-owner tries to update the class", async () => {
    const response = await api()
      .put(`/api/v1/class/${teacherClass._id}`)
      .set("Authorization", `Bearer ${outsiderToken}`)
      .send({ name: "Denied Update" });

    expectForbidden(response);
  });
});

describe("DELETE /api/v1/class/:id", () => {
  test("deletes the class and cascades sessions and attendance", async () => {
    const response = await api()
      .delete(`/api/v1/class/${teacherClass._id}`)
      .set("Authorization", `Bearer ${teacherToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      deletedSessions: 1,
      deletedAttendance: 1,
    });

    expect(await Class.findById(teacherClass._id)).toBeNull();
    expect(await Session.find({ classId: teacherClass._id })).toHaveLength(0);
    expect(await Attendance.find({ classId: teacherClass._id })).toHaveLength(
      0,
    );
  });

  test("returns 404 when the class is missing", async () => {
    const missingClassId = new mongoose.Types.ObjectId();

    const response = await api()
      .delete(`/api/v1/class/${missingClassId}`)
      .set("Authorization", `Bearer ${teacherToken}`);

    expect(response.statusCode).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("Class not found");
  });

  test("returns 403 when a student tries to delete the class", async () => {
    const response = await api()
      .delete(`/api/v1/class/${teacherClass._id}`)
      .set("Authorization", `Bearer ${studentToken}`);

    expectForbidden(response);
  });
});
