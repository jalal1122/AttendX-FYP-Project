import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { faker } from "@faker-js/faker";

// Load env variables
dotenv.config();

import User from "../models/user.model.js";
import Class from "../models/class.model.js";
import Session from "../models/session.model.js";
import Attendance from "../models/attendance.model.js";

const NUM_ADMINS = 2;
const NUM_TEACHERS = 10;
const NUM_STUDENTS = 100;
const NUM_CLASSES = 15;
const MONTHS_OF_DATA = 14;

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

const seedDB = async () => {
  await connectDB();
  
  console.log("Clearing database...");
  await User.deleteMany({});
  await Class.deleteMany({});
  await Session.deleteMany({});
  await Attendance.deleteMany({});
  console.log("Database cleared.");

  const accounts = [];
  const addAccount = (role, name, email, password) => {
    accounts.push(`${role.toUpperCase().padEnd(7)} | Name: ${name.padEnd(25)} | Email: ${email.padEnd(35)} | Password: ${password}`);
  };

  const password = "password123";

  // Shared generic user data generator
  const generateUserData = (role) => {
    const baseUser = {
      name: faker.person.fullName(),
      email: faker.internet.email().toLowerCase(),
      password,
      role,
      avatar: faker.image.avatar(),
      refreshToken: faker.string.alphanumeric(32),
      isTwoFactorEnabled: false,
      twoFactorSecret: null,
      mobileNumber: faker.phone.number(),
      deviceId: null,
      info: { phone: faker.phone.number() }
    };

    const validDepts = ["Computer Science", "Data Science", "IT", "Software Engineering"];

    if (role === "student") {
      baseUser.info.rollNo = faker.string.numeric(8);
      baseUser.info.semester = faker.number.int({ min: 1, max: 8 });
      baseUser.info.batch = faker.helpers.arrayElement(["2022", "2023", "2024"]);
      baseUser.info.enrollmentYear = parseInt(baseUser.info.batch);
      baseUser.info.department = faker.helpers.arrayElement(validDepts);
      baseUser.info.section = faker.helpers.arrayElement(["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]);
    } else if (role === "teacher") {
      baseUser.info.designation = faker.person.jobTitle();
      baseUser.info.department = faker.helpers.arrayElement(validDepts);
    }
    
    return baseUser;
  };

  console.log("Creating Admins...");
  for (let i = 0; i < NUM_ADMINS; i++) {
    const admin = await User.create(generateUserData("admin"));
    addAccount("admin", admin.name, admin.email, password);
  }

  console.log("Creating Teachers...");
  const teachers = [];
  for (let i = 0; i < NUM_TEACHERS; i++) {
    const teacher = await User.create(generateUserData("teacher"));
    teachers.push(teacher);
    addAccount("teacher", teacher.name, teacher.email, password);
  }

  console.log("Creating Students...");
  const students = [];
  for (let i = 0; i < NUM_STUDENTS; i++) {
    const student = await User.create(generateUserData("student"));
    students.push(student);
    addAccount("student", student.name, student.email, password);
  }

  console.log("Saving accounts to accounts.txt...");
  await fs.writeFile(path.resolve(process.cwd(), "accounts.txt"), "================ ACCOUNTS =================\n" + accounts.join("\n"));

  console.log("Creating Classes...");
  const classes = [];
  const departments = ["Computer Science", "Software Engineering", "IT", "Data Science"];
  const departmentSubjects = {
    "Computer Science": ["Data Structures", "Algorithms", "Operating Systems", "Computer Architecture", "Theory of Automata"],
    "Software Engineering": ["Software Architecture", "Requirements Engineering", "Software Testing", "Agile Methodologies", "Human Computer Interaction"],
    "IT": ["Networking", "Cyber Security", "Database Systems", "Cloud Computing", "Web Technologies"],
    "Data Science": ["Machine Learning", "Data Mining", "Big Data", "Artificial Intelligence", "Deep Learning"]
  };
  const sectionsList = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];

  const combinations = [];
  for (const dept of departments) {
    for (const subject of departmentSubjects[dept]) {
      for (const batch of ["2022", "2023", "2024"]) {
        combinations.push({ dept, subject, batch });
      }
    }
  }
  faker.helpers.shuffle(combinations);

  for (let i = 0; i < NUM_CLASSES && i < combinations.length; i++) {
    const teacher = faker.helpers.arrayElement(teachers);
    const classStudents = faker.helpers.arrayElements(students, faker.number.int({ min: 20, max: 30 }));
    
    const { dept, subject, batch } = combinations[i];
    const sectionName = sectionsList[i % sectionsList.length];

    const newClass = await Class.create({
      name: `${subject} Section ${sectionName}`,
      code: faker.string.alphanumeric({ length: 6, casing: 'upper' }),
      teacher: teacher._id,
      students: classStudents.map(s => s._id),
      department: dept,
      semester: faker.number.int({ min: 1, max: 8 }),
      batch: batch,
      academicYear: "2023-2024",
      room: faker.location.buildingNumber(),
      allowRetroactiveSessions: faker.datatype.boolean(),
      sections: [{
         name: sectionName,
         code: `SEC-${sectionName}`,
         students: classStudents.map(s => s._id)
      }]
    });
    classes.push({ classObj: newClass, students: classStudents });
  }

  console.log("Creating Sessions and Attendance spanning 14 months...");
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - MONTHS_OF_DATA);
  const SESSIONS_PER_CLASS = 40; 
  
  let totalSessions = 0;
  let totalAttendance = 0;

  for (const { classObj, students } of classes) {
    for (let i = 0; i < SESSIONS_PER_CLASS; i++) {
      const sessionDate = faker.date.between({ from: startDate, to: new Date() });
      const endDate = new Date(sessionDate);
      endDate.setHours(endDate.getHours() + 1);

      const session = await Session.create({
        classId: classObj._id,
        teacherId: classObj.teacher,
        startTime: sessionDate,
        endTime: endDate,
        active: false,
        isRetroactive: false,
        qrCodeHash: faker.string.uuid(),
        teacherIP: faker.internet.ipv4(),
        type: faker.helpers.arrayElement(["Lecture", "Lab", "Exam"]),
        location: {
          latitude: faker.location.latitude(),
          longitude: faker.location.longitude()
        },
        securityConfig: {
           radius: faker.number.int({ min: 10, max: 100 }),
           ipMatchEnabled: faker.datatype.boolean(),
           deviceLockEnabled: faker.datatype.boolean(),
           qrRefreshRate: faker.number.int({ min: 10, max: 60 }),
           manualApproval: faker.datatype.boolean()
        }
      });
      totalSessions++;

      const attendanceDocs = students.map(student => {
        const status = faker.helpers.weightedArrayElement([
          { weight: 70, value: "Present" },
          { weight: 10, value: "Absent" },
          { weight: 10, value: "Late" },
          { weight: 10, value: "Leave" }
        ]);

        return {
          sessionId: session._id,
          studentId: student._id,
          classId: classObj._id,
          status,
          verificationMethod: faker.helpers.arrayElement(["QR", "Manual"]),
          deviceId: faker.string.uuid(),
          section: faker.helpers.arrayElement(["SEC-A", "SEC-B", "SEC-C"]),
          isSuspicious: faker.datatype.boolean(),
          metadata: {
            ipAddress: faker.internet.ipv4(),
            distanceFromTeacher: faker.number.int({ min: 1, max: 150 }),
            flagReason: "Spoofed IP or outside range"
          },
          date: sessionDate
        };
      });

      await Attendance.insertMany(attendanceDocs);
      totalAttendance += attendanceDocs.length;
    }
  }

  console.log(`Generated ${totalSessions} sessions and ${totalAttendance} attendance records.`);
  console.log("Database seeded successfully!");
  process.exit(0);
};

seedDB().catch(err => {
  console.error("Seeding error:", err);
  process.exit(1);
});
