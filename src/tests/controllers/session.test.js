import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import jwt from "jsonwebtoken";
import request from "supertest";

import Class from "../../models/class.model.js";
import Session from "../../models/session.model.js";
import User from "../../models/user.model.js";
import { clearDatabase } from "../setup/db.js";
import { generateAuthToken } from "../utils/authHelper.js";

const mockConnectDB = jest.fn();
const mockEmitToSession = jest.fn();

await jest.unstable_mockModule("../../../config/db.js", () => ({
  default: mockConnectDB,
}));

await jest.unstable_mockModule("../../../src/services/pusher.js", () => ({
  emitToSession: mockEmitToSession,
  default: {},
}));

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
let otherClassDoc;

beforeAll(async () => {
  ({ default: app } = await import("../../../server.js"));
});

beforeEach(async () => {
  await clearDatabase();
  jest.clearAllMocks();

  adminUser = await User.create({
    name: "Admin User",
    email: "admin.session@example.com",
    password: "Password123!",
    role: "admin",
    info: { department: "Administration" },
  });

  teacherUser = await User.create({
    name: "Teacher User",
    email: "teacher.session@example.com",
    password: "Password123!",
    role: "teacher",
    info: { department: "Computer Science", designation: "Lecturer" },
  });

  studentUser = await User.create({
    name: "Student User",
    email: "student.session@example.com",
    password: "Password123!",
    role: "student",
    info: {
      rollNo: "CS-101",
      semester: "6",
      department: "Computer Science",
      batch: "2022",
      year: "4",
    },
  });

  outsiderUser = await User.create({
    name: "Outsider User",
    email: "outsider.session@example.com",
    password: "Password123!",
    role: "student",
    info: {
      rollNo: "ME-999",
      semester: "2",
      department: "Mechanical Engineering",
      batch: "2024",
      year: "1",
    },
  });

  classDoc = await Class.create({
    name: "Algorithms",
    code: "CSE401",
    teacher: teacherUser._id,
    students: [studentUser._id],
    department: "Computer Science",
    semester: 6,
    batch: "2022",
    academicYear: "2025-2026",
  });

  otherClassDoc = await Class.create({
    name: "Networks",
    code: "CSE402",
    teacher: adminUser._id,
    students: [],
    department: "Computer Science",
    semester: 6,
    batch: "2022",
    academicYear: "2025-2026",
  });

  adminToken = generateAuthToken(adminUser);
  teacherToken = generateAuthToken(teacherUser);
  studentToken = generateAuthToken(studentUser);
  outsiderToken = generateAuthToken(outsiderUser);
});

const api = () => request(app);

const expectUnauthorized = (response) => {
  expect(response.statusCode).toBe(401);
  expect(response.body.success).toBe(false);
};

const expectForbidden = (response) => {
  expect(response.statusCode).toBe(403);
  expect(response.body.success).toBe(false);
};

describe("POST /api/v1/session/start", () => {
  test("starts a live session for the owning teacher", async () => {
    const response = await api()
      .post("/api/v1/session/start")
      .set("Authorization", `Bearer ${teacherToken}`)
      .set("x-forwarded-for", "10.10.10.10")
      .send({
        classId: classDoc._id.toString(),
        type: "Lecture",
        latitude: 23.8103,
        longitude: 90.4125,
        securityConfig: {
          radius: 999,
          qrRefreshRate: 2,
          ipMatchEnabled: false,
          manualApproval: true,
        },
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      classId: expect.any(Object),
      teacherId: expect.any(Object),
      active: true,
      isRetroactive: false,
      teacherIP: "10.10.10.10",
      type: "Lecture",
    });
    expect(response.body.data.location).toMatchObject({
      latitude: 23.8103,
      longitude: 90.4125,
    });
    expect(response.body.data.securityConfig).toMatchObject({
      radius: 500,
      ipMatchEnabled: false,
      deviceLockEnabled: true,
      qrRefreshRate: 5,
      manualApproval: true,
    });
    expect(mockEmitToSession).toHaveBeenCalledWith(
      response.body.data._id,
      "session:started",
      expect.objectContaining({
        sessionId: response.body.data._id,
        classId: classDoc._id.toString(),
      }),
    );

    const savedSession = await Session.findById(response.body.data._id);
    expect(savedSession).toBeTruthy();
    expect(savedSession.active).toBe(true);
  });

  test("returns 400 when classId is missing", async () => {
    const response = await api()
      .post("/api/v1/session/start")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({ type: "Lecture" });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("Class ID is required");
  });

  test("returns 403 when a non-owner or non-teacher tries to start the session", async () => {
    const response = await api()
      .post("/api/v1/session/start")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        classId: classDoc._id.toString(),
        type: "Lecture",
      });

    expectForbidden(response);
  });
});

describe("GET /api/v1/session/:id/qr-token", () => {
  test("returns a rotating QR token for the active session owner", async () => {
    const session = await Session.create({
      classId: classDoc._id,
      teacherId: teacherUser._id,
      startTime: new Date(),
      active: true,
      isRetroactive: false,
      teacherIP: "127.0.0.1",
      type: "Lecture",
      securityConfig: {
        qrRefreshRate: 12,
        radius: 50,
        ipMatchEnabled: true,
        deviceLockEnabled: true,
        manualApproval: false,
      },
    });

    const response = await api()
      .get(`/api/v1/session/${session._id}/qr-token`)
      .set("Authorization", `Bearer ${teacherToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.expiresIn).toBe(12);
    expect(response.body.data.token).toBeTruthy();
    expect(response.body.data.sessionId).toBe(session._id.toString());

    const decoded = jwt.verify(response.body.data.token, process.env.QR_SECRET);
    expect(decoded).toMatchObject({
      sessionId: session._id.toString(),
      classId: classDoc._id.toString(),
      teacherId: teacherUser._id.toString(),
    });
  });

  test("returns 400 when the session is inactive", async () => {
    const session = await Session.create({
      classId: classDoc._id,
      teacherId: teacherUser._id,
      startTime: new Date(),
      active: false,
      isRetroactive: false,
      teacherIP: "127.0.0.1",
      type: "Lecture",
    });

    const response = await api()
      .get(`/api/v1/session/${session._id}/qr-token`)
      .set("Authorization", `Bearer ${teacherToken}`);

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("Session is not active");
  });

  test("returns 403 when a different teacher or role accesses the session", async () => {
    const session = await Session.create({
      classId: classDoc._id,
      teacherId: teacherUser._id,
      startTime: new Date(),
      active: true,
      isRetroactive: false,
      teacherIP: "127.0.0.1",
      type: "Lecture",
    });

    const response = await api()
      .get(`/api/v1/session/${session._id}/qr-token`)
      .set("Authorization", `Bearer ${adminToken}`);

    expectForbidden(response);
  });
});

describe("POST /api/v1/session/:id/end", () => {
  test("ends an active session", async () => {
    const session = await Session.create({
      classId: classDoc._id,
      teacherId: teacherUser._id,
      startTime: new Date(),
      active: true,
      isRetroactive: false,
      teacherIP: "127.0.0.1",
      type: "Lecture",
    });

    const response = await api()
      .post(`/api/v1/session/${session._id}/end`)
      .set("Authorization", `Bearer ${teacherToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.active).toBe(false);
    expect(response.body.data.endTime).toBeTruthy();
    expect(mockEmitToSession).toHaveBeenCalledWith(
      session._id.toString(),
      "session:ended",
      expect.objectContaining({ sessionId: session._id.toString() }),
    );
  });

  test("returns 400 when the session has already ended", async () => {
    const session = await Session.create({
      classId: classDoc._id,
      teacherId: teacherUser._id,
      startTime: new Date(),
      endTime: new Date(),
      active: false,
      isRetroactive: false,
      teacherIP: "127.0.0.1",
      type: "Lecture",
    });

    const response = await api()
      .post(`/api/v1/session/${session._id}/end`)
      .set("Authorization", `Bearer ${teacherToken}`);

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("Session is already ended");
  });

  test("returns 403 when a non-owner tries to end the session", async () => {
    const session = await Session.create({
      classId: classDoc._id,
      teacherId: teacherUser._id,
      startTime: new Date(),
      active: true,
      isRetroactive: false,
      teacherIP: "127.0.0.1",
      type: "Lecture",
    });

    const response = await api()
      .post(`/api/v1/session/${session._id}/end`)
      .set("Authorization", `Bearer ${adminToken}`);

    expectForbidden(response);
  });
});

describe("POST /api/v1/session/create-retroactive", () => {
  test("creates a retroactive session in the past", async () => {
    const response = await api()
      .post("/api/v1/session/create-retroactive")
      .set("Authorization", `Bearer ${teacherToken}`)
      .set("x-forwarded-for", "192.168.1.99")
      .send({
        classId: classDoc._id.toString(),
        date: "2025-01-15",
        startTime: "09:00",
        endTime: "10:00",
        type: "Lab",
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      classId: expect.any(Object),
      teacherId: expect.any(Object),
      active: false,
      isRetroactive: true,
      teacherIP: "192.168.1.99",
      type: "Lab",
    });

    const savedSession = await Session.findById(response.body.data._id);
    expect(savedSession).toBeTruthy();
    expect(savedSession.isRetroactive).toBe(true);
  });

  test("returns 400 when required fields are missing", async () => {
    const response = await api()
      .post("/api/v1/session/create-retroactive")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({
        classId: classDoc._id.toString(),
        date: "2025-01-15",
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain(
      "Class ID, date, start time, and end time are required",
    );
  });

  test("returns 400 when the retroactive session would be in the future", async () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const response = await api()
      .post("/api/v1/session/create-retroactive")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({
        classId: classDoc._id.toString(),
        date: futureDate,
        startTime: "09:00",
        endTime: "10:00",
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain(
      "Cannot create retroactive session for future date",
    );
  });
});

describe("GET /api/v1/session/class/:classId/active", () => {
  test("returns the active session for an owned class", async () => {
    const session = await Session.create({
      classId: classDoc._id,
      teacherId: teacherUser._id,
      startTime: new Date(),
      active: true,
      isRetroactive: false,
      teacherIP: "127.0.0.1",
      type: "Lecture",
    });

    const response = await api()
      .get(`/api/v1/session/class/${classDoc._id}/active`)
      .set("Authorization", `Bearer ${teacherToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data._id).toBe(session._id.toString());
  });

  test("returns 200 with null when no active session exists", async () => {
    const response = await api()
      .get(`/api/v1/session/class/${classDoc._id}/active`)
      .set("Authorization", `Bearer ${teacherToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeNull();
    expect(response.body.message).toContain("No active session found");
  });

  test("returns 403 when a different user accesses the class session", async () => {
    const response = await api()
      .get(`/api/v1/session/class/${classDoc._id}/active`)
      .set("Authorization", `Bearer ${studentToken}`);

    expectForbidden(response);
  });
});

describe("GET /api/v1/session/all/active", () => {
  test("returns all active sessions for a teacher or admin", async () => {
    const firstSession = await Session.create({
      classId: classDoc._id,
      teacherId: teacherUser._id,
      startTime: new Date(),
      active: true,
      isRetroactive: false,
      teacherIP: "127.0.0.1",
      type: "Lecture",
    });

    const secondSession = await Session.create({
      classId: otherClassDoc._id,
      teacherId: adminUser._id,
      startTime: new Date(),
      active: true,
      isRetroactive: false,
      teacherIP: "127.0.0.2",
      type: "Lab",
    });

    const response = await api()
      .get("/api/v1/session/all/active")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.count).toBe(2);
    expect(response.body.data.allActiveSessions).toHaveLength(2);
    expect(response.body.data.allActiveSessions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ _id: firstSession._id.toString() }),
        expect.objectContaining({ _id: secondSession._id.toString() }),
      ]),
    );
  });

  test("returns 200 with null when there are no active sessions", async () => {
    const response = await api()
      .get("/api/v1/session/all/active")
      .set("Authorization", `Bearer ${teacherToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeNull();
    expect(response.body.message).toContain("No active session found");
  });

  test("returns 403 when a student tries to access the route", async () => {
    const response = await api()
      .get("/api/v1/session/all/active")
      .set("Authorization", `Bearer ${studentToken}`);

    expectForbidden(response);
  });
});

describe("GET /api/v1/session/class/:classId", () => {
  test("returns all sessions for a class to an enrolled student", async () => {
    const activeSession = await Session.create({
      classId: classDoc._id,
      teacherId: teacherUser._id,
      startTime: new Date(),
      active: true,
      isRetroactive: false,
      teacherIP: "127.0.0.1",
      type: "Lecture",
    });
    const retroSession = await Session.create({
      classId: classDoc._id,
      teacherId: teacherUser._id,
      startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() - 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
      active: false,
      isRetroactive: true,
      teacherIP: "127.0.0.1",
      type: "Lab",
    });

    const response = await api()
      .get(`/api/v1/session/class/${classDoc._id}`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.count).toBe(2);
    expect(response.body.data.sessions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ _id: activeSession._id.toString() }),
        expect.objectContaining({ _id: retroSession._id.toString() }),
      ]),
    );
  });

  test("returns 404 when the class does not exist", async () => {
    const missingClassId = new (
      await import("mongoose")
    ).default.Types.ObjectId();

    const response = await api()
      .get(`/api/v1/session/class/${missingClassId}`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(response.statusCode).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("Class not found");
  });

  test("returns 403 when the user does not have access to the class", async () => {
    const response = await api()
      .get(`/api/v1/session/class/${classDoc._id}`)
      .set("Authorization", `Bearer ${outsiderToken}`);

    expectForbidden(response);
  });
});

describe("GET /api/v1/session/:id", () => {
  test("returns populated session details for any authenticated user", async () => {
    const session = await Session.create({
      classId: classDoc._id,
      teacherId: teacherUser._id,
      startTime: new Date(),
      active: true,
      isRetroactive: false,
      teacherIP: "127.0.0.1",
      type: "Lecture",
    });

    const response = await api()
      .get(`/api/v1/session/${session._id}`)
      .set("Authorization", `Bearer ${outsiderToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      _id: session._id.toString(),
      teacherIP: "127.0.0.1",
      active: true,
      isRetroactive: false,
    });
    expect(response.body.data.classId).toMatchObject({
      _id: classDoc._id.toString(),
      name: "Algorithms",
    });
    expect(response.body.data.teacherId).toMatchObject({
      _id: teacherUser._id.toString(),
      name: "Teacher User",
    });
  });

  test("returns 404 when the session is missing", async () => {
    const missingSessionId = new (
      await import("mongoose")
    ).default.Types.ObjectId();

    const response = await api()
      .get(`/api/v1/session/${missingSessionId}`)
      .set("Authorization", `Bearer ${outsiderToken}`);

    expect(response.statusCode).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("Session not found");
  });

  test("returns 401 when the JWT is invalid", async () => {
    const response = await api()
      .get(`/api/v1/session/${classDoc._id}`)
      .set("Authorization", "Bearer invalid-token");

    expectUnauthorized(response);
    expect(response.body.message).toMatch(
      /invalid access token|jwt malformed/i,
    );
  });
});
