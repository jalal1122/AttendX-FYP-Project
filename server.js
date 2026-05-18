import express from "express";
import { createServer } from "node:http";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import compression from "compression";
import connectDB from "./config/db.js";
import authRoutes from "./src/routes/auth.routes.js";
import classRoutes from "./src/routes/class.routes.js";
import sessionRoutes from "./src/routes/session.routes.js";
import attendanceRoutes from "./src/routes/attendance.routes.js";
import analyticsRoutes from "./src/routes/analytics.routes.js";
import userRoutes from "./src/routes/user.routes.js";
import { initSocketServer } from "./src/socket/socket.js";

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const isProduction = process.env.NODE_ENV === "production";
const allowedOrigins = new Set([
  process.env.CLIENT_URL || "http://localhost:5173",
  "http://10.213.94.254:5173",
]);
const bodySizeLimit = process.env.BODY_SIZE_LIMIT || "1mb";

// Slightly reduce runtime overhead + fingerprinting surface
app.disable("x-powered-by");
app.set("etag", "strong");

if (isProduction) {
  // Respect reverse proxy headers in production deployments
  app.set("trust proxy", 1);
}

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());
app.use(
  compression({
    level: 6,
    threshold: 1024,
  }),
);

// CORS configuration - Allow credentials
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    maxAge: 86400,
  }),
);

// Body parsing middleware
app.use(express.json({ limit: bodySizeLimit, strict: true }));
app.use(express.urlencoded({ extended: false, limit: bodySizeLimit }));
app.use(cookieParser());

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "AttendX Server is running",
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/class", classRoutes);
app.use("/api/v1/session", sessionRoutes);
app.use("/api/v1/attendance", attendanceRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/user", userRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    message,
    errors: err.errors || [],
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Start server (only if not in serverless environment)
const PORT = process.env.PORT || 5000;

// For Vercel serverless deployment
export default app;

// For local development
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  const httpServer = createServer(app);
  initSocketServer(httpServer, {
    allowedOrigins: [...allowedOrigins],
  });

  const server = httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
  });
  // Keep connections warm for better local/API gateway throughput
  server.keepAliveTimeout = Number(process.env.KEEP_ALIVE_TIMEOUT || 65000);
  server.headersTimeout = Number(process.env.HEADERS_TIMEOUT || 66000);
  server.requestTimeout = Number(process.env.REQUEST_TIMEOUT || 15000);
}
