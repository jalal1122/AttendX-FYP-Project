import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import jwt from "jsonwebtoken";
import { authenticator } from "otplib";
import request from "supertest";

import OTP from "../../models/otp.model.js";
import User from "../../models/user.model.js";
import { clearDatabase } from "../setup/db.js";
import { generateAuthToken } from "../utils/authHelper.js";

const mockSendEmail = jest.fn().mockResolvedValue({ success: true });
const mockUploadToCloudinary = jest
  .fn()
  .mockResolvedValue("https://cdn.example.com/avatar.png");
const mockConnectDB = jest.fn();

await jest.unstable_mockModule("../../../config/db.js", () => ({
  default: mockConnectDB,
}));

await jest.unstable_mockModule("../../../src/services/pusher.js", () => ({
  emitToSession: jest.fn(),
  default: {},
}));

await jest.unstable_mockModule("../../../src/utils/sendEmail.js", () => ({
  default: mockSendEmail,
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

beforeAll(async () => {
  ({ default: app } = await import("../../../server.js"));
});

beforeEach(async () => {
  await clearDatabase();
  jest.clearAllMocks();
});

const createUser = async (overrides = {}) => {
  return User.create({
    name: "Test User",
    email: "test.user@example.com",
    password: "Password123!",
    role: "student",
    info: {
      rollNo: "23-001",
      semester: "6",
      department: "CSE",
      batch: "2022",
      year: "4",
    },
    ...overrides,
  });
};

const api = () => request(app);

const expectUnauthorized = (res) => {
  expect([401, 403]).toContain(res.statusCode);
  expect(res.body.success).toBe(false);
};

describe("POST /api/v1/auth/register", () => {
  test("creates a new user and returns tokens", async () => {
    const response = await api()
      .post("/api/v1/auth/register")
      .field("name", "Alice Admin")
      .field("email", "alice.admin@example.com")
      .field("password", "Password123!")
      .field("role", "admin")
      .attach("avatar", Buffer.from("fake-image"), {
        filename: "avatar.png",
        contentType: "image/png",
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user).toMatchObject({
      name: "Alice Admin",
      email: "alice.admin@example.com",
      role: "admin",
      avatar: "https://cdn.example.com/avatar.png",
    });
    expect(response.body.data).toHaveProperty("accessToken");
    expect(response.headers["set-cookie"]).toEqual(
      expect.arrayContaining([expect.stringContaining("refreshToken=")]),
    );
    expect(mockUploadToCloudinary).toHaveBeenCalledTimes(1);

    const storedUser = await User.findOne({ email: "alice.admin@example.com" });
    expect(storedUser).toBeTruthy();
    expect(storedUser.avatar).toBe("https://cdn.example.com/avatar.png");
    expect(storedUser.password).not.toBe("Password123!");
  });

  test("returns 400 when required fields are missing", async () => {
    const response = await api().post("/api/v1/auth/register").send({
      email: "missing.fields@example.com",
      password: "Password123!",
      role: "student",
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("All fields are required");
  });

  test("returns 409 when the email already exists", async () => {
    await createUser({ email: "duplicate@example.com" });

    const response = await api()
      .post("/api/v1/auth/register")
      .send({
        name: "Duplicate User",
        email: "duplicate@example.com",
        password: "Password123!",
        role: "student",
        info: {
          rollNo: "23-002",
          semester: "6",
          department: "CSE",
          batch: "2022",
          year: "4",
        },
      });

    expect(response.statusCode).toBe(409);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("already exists");
  });
});

describe("POST /api/v1/auth/login", () => {
  test("returns access and refresh tokens for a normal user", async () => {
    const user = await createUser({ email: "login.user@example.com" });

    const response = await api().post("/api/v1/auth/login").send({
      email: user.email,
      password: "Password123!",
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user).toMatchObject({
      email: user.email,
      role: "student",
    });
    expect(response.body.data).toHaveProperty("accessToken");
    expect(response.headers["set-cookie"]).toEqual(
      expect.arrayContaining([expect.stringContaining("refreshToken=")]),
    );

    const decoded = jwt.verify(
      response.body.data.accessToken,
      process.env.JWT_ACCESS_SECRET,
    );
    expect(decoded).toMatchObject({
      _id: user._id.toString(),
      email: user.email,
      role: user.role,
    });
  });

  test("returns a 2FA temp token when the account has 2FA enabled", async () => {
    const secret = authenticator.generateSecret();
    const user = await createUser({
      email: "login.2fa@example.com",
      isTwoFactorEnabled: true,
      twoFactorSecret: secret,
    });

    const response = await api().post("/api/v1/auth/login").send({
      email: user.email,
      password: "Password123!",
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.require2FA).toBe(true);
    expect(response.body.data.tempToken).toBeTruthy();

    const decoded = jwt.verify(
      response.body.data.tempToken,
      process.env.JWT_ACCESS_SECRET,
    );
    expect(decoded).toMatchObject({
      _id: user._id.toString(),
      temp2FA: true,
    });
  });

  test("returns 400 when email or password is missing", async () => {
    const response = await api().post("/api/v1/auth/login").send({
      email: "missing.password@example.com",
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("Email and password are required");
  });

  test("returns 401 for invalid credentials", async () => {
    await createUser({ email: "bad.password@example.com" });

    const response = await api().post("/api/v1/auth/login").send({
      email: "bad.password@example.com",
      password: "WrongPassword!",
    });

    expect(response.statusCode).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("Invalid email or password");
  });
});

describe("POST /api/v1/auth/refresh", () => {
  test("returns a new access token when a valid refresh token is provided", async () => {
    const user = await createUser({ email: "refresh.user@example.com" });
    const refreshToken = jwt.sign(
      { _id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRY },
    );
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    const response = await api()
      .post("/api/v1/auth/refresh")
      .set("Cookie", [`refreshToken=${refreshToken}`]);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty("accessToken");
    expect(response.headers["set-cookie"]).toEqual(
      expect.arrayContaining([expect.stringContaining("refreshToken=")]),
    );

    const refreshedUser = await User.findById(user._id);
    expect(refreshedUser.refreshToken).toBeTruthy();
    expect(
      jwt.verify(refreshedUser.refreshToken, process.env.JWT_REFRESH_SECRET),
    ).toMatchObject({
      _id: user._id.toString(),
    });
  });

  test("returns 401 when no refresh token is supplied", async () => {
    const response = await api().post("/api/v1/auth/refresh").send({});

    expect(response.statusCode).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("Refresh token is required");
  });

  test("returns 401 when the refresh token is invalid or stale", async () => {
    const user = await createUser({ email: "refresh.invalid@example.com" });
    const invalidToken = jwt.sign(
      { _id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRY },
    );

    const response = await api()
      .post("/api/v1/auth/refresh")
      .set("Cookie", [`refreshToken=${invalidToken}`]);

    expect(response.statusCode).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("expired or used");
  });
});

describe("GET /api/v1/auth/me", () => {
  test("returns the current authenticated user", async () => {
    const user = await createUser({ email: "me.user@example.com" });
    const token = generateAuthToken(user);

    const response = await api()
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user).toMatchObject({
      email: user.email,
      role: user.role,
    });
    expect(response.body.data.user).not.toHaveProperty("password");
    expect(response.body.data.user).not.toHaveProperty("refreshToken");
  });

  test("returns 401 when the access token is missing", async () => {
    const response = await api().get("/api/v1/auth/me");

    expectUnauthorized(response);
    expect(response.body.message).toContain("Access token is required");
  });

  test("returns 401 when the access token is invalid", async () => {
    const response = await api()
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer invalid-token");

    expectUnauthorized(response);
    expect(response.body.message).toMatch(
      /invalid access token|jwt malformed/i,
    );
  });
});

describe("POST /api/v1/auth/logout", () => {
  test("logs out the current user and clears the refresh token", async () => {
    const user = await createUser({ email: "logout.user@example.com" });
    user.refreshToken = jwt.sign(
      { _id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRY },
    );
    await user.save({ validateBeforeSave: false });

    const response = await api()
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${generateAuthToken(user)}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.headers["set-cookie"]).toEqual(
      expect.arrayContaining([expect.stringContaining("refreshToken=")]),
    );

    const updatedUser = await User.findById(user._id);
    expect(updatedUser.refreshToken).toBeUndefined();
  });

  test("returns 401 when the access token is missing", async () => {
    const response = await api().post("/api/v1/auth/logout");

    expectUnauthorized(response);
    expect(response.body.message).toContain("Access token is required");
  });

  test("returns 401 when the access token does not map to a user", async () => {
    const ghostToken = generateAuthToken({
      _id: new Date().getTime().toString(16).padEnd(24, "0"),
      email: "ghost@example.com",
      role: "student",
    });

    const response = await api()
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${ghostToken}`);

    expectUnauthorized(response);
    expect(response.body.message).toMatch(
      /invalid access token|jwt malformed/i,
    );
  });
});

describe("POST /api/v1/auth/2fa/enable", () => {
  test("returns a QR code and secret for the authenticated user", async () => {
    const user = await createUser({ email: "enable.2fa@example.com" });

    const response = await api()
      .post("/api/v1/auth/2fa/enable")
      .set("Authorization", `Bearer ${generateAuthToken(user)}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe(user.email);
    expect(response.body.data.secret).toBeTruthy();
    expect(response.body.data.qrCode).toContain("data:image");
  });

  test("returns 401 when no JWT is provided", async () => {
    const response = await api().post("/api/v1/auth/2fa/enable");

    expectUnauthorized(response);
    expect(response.body.message).toContain("Access token is required");
  });

  test("returns 401 when the JWT is invalid", async () => {
    const response = await api()
      .post("/api/v1/auth/2fa/enable")
      .set("Authorization", "Bearer invalid-token");

    expectUnauthorized(response);
    expect(response.body.message).toMatch(
      /invalid access token|jwt malformed/i,
    );
  });
});

describe("POST /api/v1/auth/2fa/verify", () => {
  test("enables 2FA after a valid verification code is submitted", async () => {
    const secret = authenticator.generateSecret();
    const user = await createUser({
      email: "verify.2fa@example.com",
      twoFactorSecret: null,
      isTwoFactorEnabled: false,
    });
    const token = authenticator.generate(secret);

    const response = await api()
      .post("/api/v1/auth/2fa/verify")
      .set("Authorization", `Bearer ${generateAuthToken(user)}`)
      .send({ token, secret });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.isTwoFactorEnabled).toBe(true);

    const updatedUser = await User.findById(user._id);
    expect(updatedUser.isTwoFactorEnabled).toBe(true);
    expect(updatedUser.twoFactorSecret).toBe(secret);
  });

  test("returns 400 when the token or secret is missing", async () => {
    const user = await createUser({ email: "verify.missing@example.com" });

    const response = await api()
      .post("/api/v1/auth/2fa/verify")
      .set("Authorization", `Bearer ${generateAuthToken(user)}`)
      .send({ secret: authenticator.generateSecret() });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("Token and secret are required");
  });

  test("returns 401 when the JWT is invalid", async () => {
    const response = await api()
      .post("/api/v1/auth/2fa/verify")
      .set("Authorization", "Bearer invalid-token")
      .send({ token: "123456", secret: "secret" });

    expectUnauthorized(response);
    expect(response.body.message).toMatch(
      /invalid access token|jwt malformed/i,
    );
  });
});

describe("POST /api/v1/auth/2fa/disable", () => {
  test("disables 2FA when the verification code is valid", async () => {
    const secret = authenticator.generateSecret();
    const user = await createUser({
      email: "disable.2fa@example.com",
      isTwoFactorEnabled: true,
      twoFactorSecret: secret,
    });
    const token = authenticator.generate(secret);

    const response = await api()
      .post("/api/v1/auth/2fa/disable")
      .set("Authorization", `Bearer ${generateAuthToken(user)}`)
      .send({ token });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.isTwoFactorEnabled).toBe(false);

    const updatedUser = await User.findById(user._id);
    expect(updatedUser.isTwoFactorEnabled).toBe(false);
    expect(updatedUser.twoFactorSecret).toBeNull();
  });

  test("returns 400 when the verification code is missing", async () => {
    const user = await createUser({
      email: "disable.missing@example.com",
      isTwoFactorEnabled: true,
      twoFactorSecret: authenticator.generateSecret(),
    });

    const response = await api()
      .post("/api/v1/auth/2fa/disable")
      .set("Authorization", `Bearer ${generateAuthToken(user)}`)
      .send({});

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("Verification code is required");
  });

  test("returns 401 when the JWT is missing", async () => {
    const response = await api().post("/api/v1/auth/2fa/disable").send({
      token: "123456",
    });

    expectUnauthorized(response);
    expect(response.body.message).toContain("Access token is required");
  });
});

describe("POST /api/v1/auth/2fa/validate", () => {
  test("logs in a 2FA-enabled user with a valid temporary token and OTP", async () => {
    const secret = authenticator.generateSecret();
    const user = await createUser({
      email: "validate.2fa@example.com",
      isTwoFactorEnabled: true,
      twoFactorSecret: secret,
    });
    const tempToken = jwt.sign(
      { _id: user._id, temp2FA: true },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "5m" },
    );
    const otp = authenticator.generate(secret);

    const response = await api().post("/api/v1/auth/2fa/validate").send({
      tempToken,
      otp,
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe(user.email);
    expect(response.body.data).toHaveProperty("accessToken");
    expect(response.body.data).toHaveProperty("refreshToken");
    expect(response.headers["set-cookie"]).toEqual(
      expect.arrayContaining([expect.stringContaining("refreshToken=")]),
    );
  });

  test("returns 400 when the temp token or OTP is missing", async () => {
    const response = await api().post("/api/v1/auth/2fa/validate").send({
      otp: "123456",
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain(
      "Temporary token and OTP are required",
    );
  });

  test("returns 401 when the temp token is invalid", async () => {
    const response = await api().post("/api/v1/auth/2fa/validate").send({
      tempToken: "invalid-token",
      otp: "123456",
    });

    expect(response.statusCode).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain(
      "Invalid or expired temporary token",
    );
  });
});

describe("POST /api/v1/auth/forgot-password", () => {
  test("creates an OTP record and triggers the email sender", async () => {
    const user = await createUser({ email: "forgot.user@example.com" });

    const response = await api().post("/api/v1/auth/forgot-password").send({
      email: user.email,
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe(user.email);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);

    const otpRecord = await OTP.findOne({ email: user.email });
    expect(otpRecord).toBeTruthy();
    expect(otpRecord.otp).toHaveLength(6);
  });

  test("returns 400 when the email is missing", async () => {
    const response = await api().post("/api/v1/auth/forgot-password").send({});

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("Email is required");
  });

  test("returns 404 when the email does not exist", async () => {
    const response = await api().post("/api/v1/auth/forgot-password").send({
      email: "missing@example.com",
    });

    expect(response.statusCode).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("No account found");
  });
});

describe("POST /api/v1/auth/reset-password", () => {
  test("resets the password when a valid OTP is supplied", async () => {
    const user = await createUser({ email: "reset.user@example.com" });
    const otp = "123456";

    await OTP.create({
      email: user.email,
      otp,
    });

    const response = await api().post("/api/v1/auth/reset-password").send({
      email: user.email,
      otp,
      newPassword: "NewPassword123!",
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain("Password reset successful");

    const updatedUser = await User.findById(user._id);
    expect(await updatedUser.isPasswordCorrect("NewPassword123!")).toBe(true);

    const remainingOtp = await OTP.findOne({ email: user.email, otp });
    expect(remainingOtp).toBeNull();
  });

  test("returns 400 when required inputs are missing", async () => {
    const response = await api().post("/api/v1/auth/reset-password").send({
      email: "reset.missing@example.com",
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain(
      "Email, OTP, and new password are required",
    );
  });

  test("returns 400 when the OTP is invalid or expired", async () => {
    await createUser({ email: "reset.invalid@example.com" });

    const response = await api().post("/api/v1/auth/reset-password").send({
      email: "reset.invalid@example.com",
      otp: "999999",
      newPassword: "NewPassword123!",
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("Invalid or expired OTP");
  });
});

describe("POST /api/v1/auth/create-admin", () => {
  test("creates a bootstrap admin account", async () => {
    const response = await api().post("/api/v1/auth/create-admin").send({
      name: "Bootstrap Admin",
      email: "bootstrap.admin@example.com",
      password: "Password123!",
      adminSecret: process.env.ADMIN_SECRET,
    });

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user).toMatchObject({
      name: "Bootstrap Admin",
      email: "bootstrap.admin@example.com",
      role: "admin",
    });

    const createdAdmin = await User.findOne({
      email: "bootstrap.admin@example.com",
    });
    expect(createdAdmin).toBeTruthy();
    expect(createdAdmin.role).toBe("admin");
  });

  test("returns 400 when required fields are missing", async () => {
    const response = await api().post("/api/v1/auth/create-admin").send({
      email: "missing.admin@example.com",
      password: "Password123!",
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain(
      "All fields are required: name, email, password, adminSecret",
    );
  });

  test("returns 403 when the admin secret is incorrect", async () => {
    const response = await api().post("/api/v1/auth/create-admin").send({
      name: "Wrong Secret Admin",
      email: "wrong.secret@example.com",
      password: "Password123!",
      adminSecret: "incorrect-secret",
    });

    expect(response.statusCode).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("Invalid admin secret key");
  });
});
