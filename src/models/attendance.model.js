import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: [true, 'Session ID is required'],
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student ID is required'],
      index: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class ID is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['Present', 'Absent', 'Late', 'Leave'],
      default: 'Present',
    },
    verificationMethod: {
      type: String,
      enum: ['QR', 'Manual'],
      required: [true, 'Verification method is required'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      index: true,
    },
    weekNumber: {
      type: Number,
      index: true,
    },
    month: {
      type: Number,
      min: 1,
      max: 12,
      index: true,
    },
    year: {
      type: Number,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index to prevent double marking
attendanceSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });

// Additional indexes for analytics queries
attendanceSchema.index({ classId: 1, date: 1 });
attendanceSchema.index({ studentId: 1, date: 1 });
attendanceSchema.index({ classId: 1, weekNumber: 1 });
attendanceSchema.index({ classId: 1, month: 1, year: 1 });

// Pre-save hook to calculate weekNumber, month, year from date
attendanceSchema.pre('save', function (next) {
  if (this.date) {
    const date = new Date(this.date);
    
    // Calculate ISO week number
    const startDate = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date - startDate) / (24 * 60 * 60 * 1000));
    this.weekNumber = Math.ceil((days + startDate.getDay() + 1) / 7);
    
    // Set month and year
    this.month = date.getMonth() + 1; // 1-12
    this.year = date.getFullYear();
  }
  next();
});

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;
