import cron from "node-cron";
import mongoose from "mongoose";
import Class from "../models/class.model.js";
import Session from "../models/session.model.js";
import Attendance from "../models/attendance.model.js";
import EmailService from "../services/email.service.js";

/**
 * Weekly Defaulter Alerts Cron Job
 * Runs every Friday at 17:00 (5:00 PM)
 * Calculates attendance for all students across all classes and sends warning emails
 * if they are below 75% attendance.
 */
export const initCronJobs = () => {
  console.log("🕒 Initializing Cron Jobs...");

  cron.schedule("0 17 * * 5", async () => {
    console.log("🕒 Running Weekly Defaulter Alert Cron Job...");
    
    try {
      const classes = await Class.find().populate("students").lean();
      let totalNotified = 0;

      for (const classDoc of classes) {
        if (!classDoc.students || classDoc.students.length === 0) continue;

        const sessions = await Session.find({ classId: classDoc._id }).select("_id").lean();
        const totalSessions = sessions.length;

        if (totalSessions === 0) continue;

        const attendanceByStudent = await Attendance.aggregate([
          {
            $match: {
              classId: new mongoose.Types.ObjectId(classDoc._id),
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
          attendanceByStudent.map((row) => [row._id.toString(), row.attendedSessions])
        );

        const defaulters = classDoc.students
          .map((student) => {
            const attendedSessions = attendanceMap.get(student._id.toString()) || 0;
            const percentage = (attendedSessions / totalSessions) * 100;
            return { student, percentage };
          })
          .filter((item) => item.percentage < 75);

        for (const { student, percentage } of defaulters) {
          try {
            await EmailService.sendLowAttendanceWarning(student, classDoc, percentage);
            totalNotified++;
          } catch (err) {
            console.error(`Failed to send email to ${student.email}:`, err);
          }
        }
      }

      console.log(`✅ Weekly Defaulter Alert completed. Notified ${totalNotified} students.`);
    } catch (error) {
      console.error("❌ Error running Weekly Defaulter Alert Cron Job:", error);
    }
  });
};
