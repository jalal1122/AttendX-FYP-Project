import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: [true, "Class ID is required"],
      index: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Teacher ID is required"],
      index: true,
    },
    startTime: {
      type: Date,
      required: [true, "Start time is required"],
    },
    endTime: {
      type: Date,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    isRetroactive: {
      type: Boolean,
      default: false,
    },
    qrCodeHash: {
      type: String,
    },
    teacherIP: {
      type: String,
      required: [true, "Teacher IP is required"],
    },
    type: {
      type: String,
      enum: ["Lecture", "Lab", "Exam"],
      default: "Lecture",
    },
    location: {
      latitude: {
        type: Number,
      },
      longitude: {
        type: Number,
      },
    },
    securityConfig: {
      radius: {
        type: Number,
        default: 5, // meters
      },
      ipMatchEnabled: {
        type: Boolean,
        default: true,
      },
      deviceLockEnabled: {
        type: Boolean,
        default: false, // One ID per device (anti-buddy punching)
      },
      qrRefreshRate: {
        type: Number,
        default: 20, // seconds
      },
      manualApproval: {
        type: Boolean,
        default: false, // Teacher must approve
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
sessionSchema.index({ classId: 1, active: 1 });
sessionSchema.index({ teacherId: 1, createdAt: -1 });

const Session = mongoose.model("Session", sessionSchema);

export default Session;
