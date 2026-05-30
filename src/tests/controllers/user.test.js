import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import request from "supertest";
import XLSX from "xlsx";

import User from "../../models/user.model.js";
import { clearDatabase } from "../setup/db.js";
import { generateAuthToken } from "../utils/authHelper.js";

const mockSendWelcomeEmail = jest.fn().mockResolvedValue({ success: true });
const mockUploadToCloudinary = jest
  .fn()
  .mockResolvedValue("https://cdn.example.com/avatar.png");
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

await jest.unstable_mockModule("../../services/email.service.js", () => ({
  default: {
    sendWelcomeEmail: mockSendWelcomeEmail,
  },
}));

await jest.unstable_mockModule("../../../config/cloudinary.js", () => ({
  uploadToCloudinary: mockUploadToCloudinary,
  deleteFromCloudinary: jest.fn(),
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
process.env.ADMIN_SECRET = "test-admin-secret";

let app;
let adminUser;
let teacherUser;
let studentUser;
let adminToken;
let teacherToken;
let studentToken;

beforeAll(async () => {
  ({ default: app } = await import("../../../server.js"));
});

beforeEach(async () => {
  await clearDatabase();
  jest.clearAllMocks();

  adminUser = await User.create({
    name: "Admin One",
    email: "admin.one@example.com",
    password: "Password123!",
    role: "admin",
    info: { department: "Administration" },
  });

  teacherUser = await User.create({
    name: "Teacher One",
    email: "teacher.one@example.com",
    password: "Password123!",
    role: "teacher",
    info: { department: "Computer Science", designation: "Lecturer" },
    deviceId: "device-teacher-001",
  });

  studentUser = await User.create({
    name: "Student One",
    email: "student.one@example.com",
    password: "Password123!",
    role: "student",
    info: {
      rollNo: "CS-001",
      semester: "6",
      department: "Computer Science",
      batch: "2022",
      year: "4",
    },
    deviceId: "device-student-001",
  });

  adminToken = generateAuthToken(adminUser);
  teacherToken = generateAuthToken(teacherUser);
  studentToken = generateAuthToken(studentUser);
});

const api = () => request(app);

const expectForbidden = (response) => {
  expect(response.statusCode).toBe(403);
  expect(response.body.success).toBe(false);
  expect(response.body.message).toMatch(/Access denied/i);
};

describe("GET /api/v1/user/all", () => {
  test("returns filtered users for an admin", async () => {
    const response = await api()
      .get("/api/v1/user/all")
      .query({ role: "student", search: "Student" })
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.count).toBe(1);
    expect(response.body.data.users).toHaveLength(1);
    expect(response.body.data.users[0]).toMatchObject({
      email: studentUser.email,
      role: "student",
    });
    expect(response.body.data.users[0]).not.toHaveProperty("password");
    expect(response.body.data.users[0]).not.toHaveProperty("refreshToken");
  });

  test("filters users by name, email, and student profile fields", async () => {
    const response = await api()
      .get("/api/v1/user/all")
      .query({
        role: "student",
        name: "Student",
        email: "student.one@example.com",
        rollNo: "CS-001",
        department: "Computer Science",
        semester: "6",
        batch: "2022",
        year: "4",
      })
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.data.count).toBe(1);
    expect(response.body.data.users).toHaveLength(1);
    expect(response.body.data.users[0]).toMatchObject({
      email: studentUser.email,
      role: "student",
    });
  });

  test("returns an empty list when the search matches nothing", async () => {
    const response = await api()
      .get("/api/v1/user/all")
      .query({ search: "NoSuchUser" })
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.data.count).toBe(0);
    expect(response.body.data.users).toEqual([]);
  });

  test("returns 403 for a non-admin user", async () => {
    const response = await api()
      .get("/api/v1/user/all")
      .set("Authorization", `Bearer ${studentToken}`);

    expectForbidden(response);
  });
});

describe("GET /api/v1/user/stats", () => {
  test("returns user statistics including recent users", async () => {
    const oldTeacher = await User.create({
      name: "Old Teacher",
      email: "old.teacher@example.com",
      password: "Password123!",
      role: "teacher",
      info: { department: "History" },
    });

    await User.collection.updateOne(
      { _id: oldTeacher._id },
      { $set: { createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000) } },
    );

    const response = await api()
      .get("/api/v1/user/stats")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      totalUsers: 4,
      totalStudents: 1,
      totalTeachers: 2,
      totalAdmins: 1,
      recentUsers: 3,
    });
  });

  test("still returns valid statistics with no extra query parameters", async () => {
    const response = await api()
      .get("/api/v1/user/stats")
      .query({ anything: "ignored" })
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.data.totalUsers).toBe(3);
  });

  test("returns 403 for a non-admin user", async () => {
    const response = await api()
      .get("/api/v1/user/stats")
      .set("Authorization", `Bearer ${teacherToken}`);

    expectForbidden(response);
  });
});

describe("GET /api/v1/user/:id", () => {
  test("returns the requested user details for an admin", async () => {
    const response = await api()
      .get(`/api/v1/user/${studentUser._id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      email: studentUser.email,
      role: "student",
      name: "Student One",
    });
    expect(response.body.data).not.toHaveProperty("password");
    expect(response.body.data).not.toHaveProperty("refreshToken");
  });

  test("returns 404 when the user does not exist", async () => {
    const tempUser = await User.create({
      name: "Temp User",
      email: "temp.user@example.com",
      password: "Password123!",
      role: "student",
    });
    await User.deleteOne({ _id: tempUser._id });

    const response = await api()
      .get(`/api/v1/user/${tempUser._id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("User not found");
  });

  test("returns 403 for a non-admin user", async () => {
    const response = await api()
      .get(`/api/v1/user/${studentUser._id}`)
      .set("Authorization", `Bearer ${studentToken}`);

    expectForbidden(response);
  });
});

describe("POST /api/v1/user/create", () => {
  test("creates a new user, uploads the avatar, and sends a welcome email", async () => {
    const response = await api()
      .post("/api/v1/user/create")
      .set("Authorization", `Bearer ${adminToken}`)
      .field("name", "Created User")
      .field("email", "created.user@example.com")
      .field("password", "Password123!")
      .field("role", "student")
      .field(
        "info",
        JSON.stringify({
          rollNo: "CS-101",
          semester: "5",
          department: "Computer Science",
          batch: "2021",
          year: "3",
        }),
      )
      .attach("avatar", Buffer.from("fake-image"), {
        filename: "avatar.png",
        contentType: "image/png",
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      name: "Created User",
      email: "created.user@example.com",
      role: "student",
      avatar: "https://cdn.example.com/avatar.png",
    });
    expect(response.body.data).not.toHaveProperty("password");
    expect(response.body.data).not.toHaveProperty("refreshToken");
    expect(mockUploadToCloudinary).toHaveBeenCalledTimes(1);
    expect(mockSendWelcomeEmail).toHaveBeenCalledTimes(1);

    const createdUser = await User.findOne({
      email: "created.user@example.com",
    });
    expect(createdUser).toBeTruthy();
    expect(createdUser.info).toMatchObject({
      rollNo: "CS-101",
      semester: "5",
      department: "Computer Science",
      batch: "2021",
      year: "3",
    });
    expect(await createdUser.isPasswordCorrect("Password123!")).toBe(true);
  });

  test("returns 400 when required fields are missing", async () => {
    const response = await api()
      .post("/api/v1/user/create")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        email: "missing.fields@example.com",
        password: "Password123!",
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain(
      "All fields are required: name, email, password, role",
    );
  });

  test("returns 403 for a non-admin user", async () => {
    const response = await api()
      .post("/api/v1/user/create")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        name: "Denied User",
        email: "denied.user@example.com",
        password: "Password123!",
        role: "student",
      });

    expectForbidden(response);
  });
});

describe("POST /api/v1/user/bulk-students", () => {
  const buildWorkbookBuffer = (rows) => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
    return XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
  };

  test("creates multiple student accounts from a spreadsheet", async () => {
    const response = await api()
      .post("/api/v1/user/bulk-students")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach(
        "sheet",
        buildWorkbookBuffer([
          {
            name: "Bulk Student One",
            email: "bulk.student1@example.com",
            password: "Password123!",
            rollNo: "CS-201",
            semester: 5,
            department: "Computer Science",
            batch: "2021-2025",
            year: "3",
          },
          {
            name: "Bulk Student Two",
            email: "bulk.student2@example.com",
            password: "Password123!",
            rollNo: "CS-202",
            section: "B",
            semester: 6,
            department: "Computer Science",
            batch: "2021-2025",
            year: "3",
          },
        ]),
        {
          filename: "students.xlsx",
          contentType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      );

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.createdCount).toBe(2);
    expect(response.body.data.users).toHaveLength(2);
    expect(response.body.data.users[0]).toMatchObject({
      email: "bulk.student1@example.com",
      role: "student",
    });
    expect(response.body.data.users[1]).toMatchObject({
      email: "bulk.student2@example.com",
      role: "student",
    });

    const createdUsers = await User.find({
      email: {
        $in: ["bulk.student1@example.com", "bulk.student2@example.com"],
      },
    });

    expect(createdUsers).toHaveLength(2);
    expect(await createdUsers[0].isPasswordCorrect("Password123!")).toBe(true);
    expect(mockSendWelcomeEmail).toHaveBeenCalledTimes(2);
  });

  test("rejects a spreadsheet when one of the emails already exists", async () => {
    const response = await api()
      .post("/api/v1/user/bulk-students")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach(
        "sheet",
        buildWorkbookBuffer([
          {
            name: "Existing Student",
            email: studentUser.email,
            password: "Password123!",
            rollNo: "CS-301",
            semester: 5,
            department: "Computer Science",
            batch: "2021-2025",
            year: "3",
          },
        ]),
        {
          filename: "students.xlsx",
          contentType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      );

    expect(response.statusCode).toBe(409);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("already exist");
  });

  test("returns 403 for a non-admin user", async () => {
    const response = await api()
      .post("/api/v1/user/bulk-students")
      .set("Authorization", `Bearer ${studentToken}`)
      .attach(
        "sheet",
        buildWorkbookBuffer([
          {
            name: "Denied Student",
            email: "denied.bulk@example.com",
            password: "Password123!",
            rollNo: "CS-401",
            semester: 5,
            department: "Computer Science",
            batch: "2021-2025",
            year: "3",
          },
        ]),
        {
          filename: "students.xlsx",
          contentType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      );

    expectForbidden(response);
  });
});

describe("PUT /api/v1/user/:id", () => {
  test("updates allowed user fields and merges info", async () => {
    const response = await api()
      .put(`/api/v1/user/${studentUser._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Student Updated",
        mobileNumber: "+15550000001",
        info: {
          semester: "7",
          year: "4",
        },
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      name: "Student Updated",
      mobileNumber: "+15550000001",
      role: "student",
    });
    expect(response.body.data.info).toMatchObject({
      rollNo: "CS-001",
      semester: "7",
      department: "Computer Science",
      batch: "2022",
      year: "4",
    });

    const updatedUser = await User.findById(studentUser._id);
    expect(updatedUser.name).toBe("Student Updated");
    expect(updatedUser.mobileNumber).toBe("+15550000001");
  });

  test("returns 400 when email or password is supplied", async () => {
    const response = await api()
      .put(`/api/v1/user/${studentUser._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        email: "blocked.change@example.com",
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain(
      "Email and password cannot be changed through this endpoint",
    );
  });

  test("returns 404 when the user is missing", async () => {
    const tempUser = await User.create({
      name: "Temp Update",
      email: "temp.update@example.com",
      password: "Password123!",
      role: "student",
    });
    await User.deleteOne({ _id: tempUser._id });

    const response = await api()
      .put(`/api/v1/user/${tempUser._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Should Not Work" });

    expect(response.statusCode).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("User not found");
  });

  test("returns 403 for a non-admin user", async () => {
    const response = await api()
      .put(`/api/v1/user/${studentUser._id}`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ name: "Denied Update" });

    expectForbidden(response);
  });
});

describe("PATCH /api/v1/user/:id/role", () => {
  test("updates a user's role", async () => {
    const response = await api()
      .patch(`/api/v1/user/${studentUser._id}/role`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "teacher" });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      _id: studentUser._id.toString(),
      role: "teacher",
    });

    const updatedUser = await User.findById(studentUser._id);
    expect(updatedUser.role).toBe("teacher");
  });

  test("returns 400 when an invalid role is supplied", async () => {
    const response = await api()
      .patch(`/api/v1/user/${studentUser._id}/role`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "superadmin" });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain(
      "Invalid role. Must be student, teacher, or admin",
    );
  });

  test("returns 400 when trying to change your own role", async () => {
    const response = await api()
      .patch(`/api/v1/user/${adminUser._id}/role`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "teacher" });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("Cannot change your own role");
  });

  test("returns 403 for a non-admin user", async () => {
    const response = await api()
      .patch(`/api/v1/user/${studentUser._id}/role`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ role: "teacher" });

    expectForbidden(response);
  });
});

describe("POST /api/v1/user/:id/reset-device", () => {
  test("clears the user's device binding", async () => {
    const response = await api()
      .post(`/api/v1/user/${teacherUser._id}/reset-device`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      _id: teacherUser._id.toString(),
      deviceId: null,
    });

    const updatedUser = await User.findById(teacherUser._id);
    expect(updatedUser.deviceId).toBeNull();
  });

  test("returns 404 when the user does not exist", async () => {
    const tempUser = await User.create({
      name: "Temp Device User",
      email: "temp.device@example.com",
      password: "Password123!",
      role: "student",
      deviceId: "device-temp-001",
    });
    await User.deleteOne({ _id: tempUser._id });

    const response = await api()
      .post(`/api/v1/user/${tempUser._id}/reset-device`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("User not found");
  });

  test("returns 403 for a non-admin user", async () => {
    const response = await api()
      .post(`/api/v1/user/${teacherUser._id}/reset-device`)
      .set("Authorization", `Bearer ${teacherToken}`);

    expectForbidden(response);
  });
});

describe("DELETE /api/v1/user/:id", () => {
  test("deletes the requested user", async () => {
    const response = await api()
      .delete(`/api/v1/user/${teacherUser._id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain("User deleted successfully");

    const deletedUser = await User.findById(teacherUser._id);
    expect(deletedUser).toBeNull();
  });

  test("returns 400 when attempting to delete your own account", async () => {
    const response = await api()
      .delete(`/api/v1/user/${adminUser._id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("Cannot delete your own account");
  });

  test("returns 404 when the user does not exist", async () => {
    const tempUser = await User.create({
      name: "Temp Delete User",
      email: "temp.delete@example.com",
      password: "Password123!",
      role: "student",
    });
    await User.deleteOne({ _id: tempUser._id });

    const response = await api()
      .delete(`/api/v1/user/${tempUser._id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("User not found");
  });

  test("returns 403 for a non-admin user", async () => {
    const response = await api()
      .delete(`/api/v1/user/${studentUser._id}`)
      .set("Authorization", `Bearer ${studentToken}`);

    expectForbidden(response);
  });
});
