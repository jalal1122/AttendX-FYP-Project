import ExcelJS from "exceljs";
import moment from "moment";

/**
 * Enterprise Export Service
 * Generates beautifully styled Excel and CSV reports
 */
class ExportService {
  /**
   * Color scheme for reports
   */
  static COLORS = {
    headerBg: "4F46E5", // University Blue
    headerText: "FFFFFF", // White
    presentBg: "D1FAE5", // Light Green
    presentText: "065F46", // Dark Green
    absentBg: "FEE2E2", // Light Red
    absentText: "991B1B", // Dark Red
    pendingBg: "FEF3C7", // Light Yellow
    pendingText: "92400E", // Dark Orange
    metadataBg: "F3F4F6", // Light Gray
  };

  static toExcelColumnName(index) {
    let columnName = "";
    let currentIndex = index;
    while (currentIndex > 0) {
      const remainder = (currentIndex - 1) % 26;
      columnName = String.fromCharCode(65 + remainder) + columnName;
      currentIndex = Math.floor((currentIndex - 1) / 26);
    }
    return columnName;
  }

  static getStudentProfile(student = {}) {
    const info = student.info || {};

    return {
      rollNo:
        student.rollNumber ||
        student.rollNo ||
        info.rollNumber ||
        info.rollNo ||
        "N/A",
      department: student.department || info.department || "N/A",
      semester: student.semester || info.semester || "N/A",
    };
  }

  /**
   * Generate Class Attendance Matrix (Excel or CSV)
   * Rows = Students, Columns = Dates
   */
  static async generateClassMatrix(
    classData,
    sessions,
    attendanceMap,
    format = "xlsx",
  ) {
    if (format === "csv") {
      return this.generateClassMatrixCSV(classData, sessions, attendanceMap);
    } else {
      return this.generateClassMatrixExcel(classData, sessions, attendanceMap);
    }
  }

  /**
   * Generate Class Matrix as Excel with styling
   */
  static async generateClassMatrixExcel(classData, sessions, attendanceMap) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Attendance Register");

    // Sort sessions by date
    const sortedSessions = sessions.sort(
      (a, b) => new Date(a.startTime) - new Date(b.startTime),
    );

    const teacherName =
      typeof classData.teacher === "object"
        ? classData.teacher?.name || "N/A"
        : "N/A";
    const firstSession = sortedSessions[0];
    const lastSession = sortedSessions[sortedSessions.length - 1];
    const dateRange =
      sortedSessions.length > 0
        ? `${moment(firstSession.startTime).format("DD MMM YYYY")} - ${moment(
            lastSession.startTime,
          ).format("DD MMM YYYY")}`
        : "N/A";
    const lastColumn = this.toExcelColumnName(sortedSessions.length + 6);

    // Metadata Row (Merged)
    worksheet.mergeCells(`A1:${lastColumn}1`);
    const titleCell = worksheet.getCell("A1");
    titleCell.value = `${classData.name} (${classData.code}) - Attendance Register`;
    titleCell.font = {
      size: 16,
      bold: true,
      color: { argb: "FF" + this.COLORS.headerBg },
    };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF" + this.COLORS.metadataBg },
    };
    worksheet.getRow(1).height = 30;

    // Generated Date Row
    worksheet.mergeCells(`A2:${lastColumn}2`);
    const dateCell = worksheet.getCell("A2");
    dateCell.value = `Generated on: ${moment().format("MMMM DD, YYYY [at] HH:mm")}`;
    dateCell.font = { size: 10, italic: true };
    dateCell.alignment = { horizontal: "center" };
    worksheet.getRow(2).height = 20;

    worksheet.addRow([
      "Teacher",
      teacherName,
      "Department",
      classData.department || "N/A",
    ]);
    worksheet.addRow([
      "Class",
      classData.name || "N/A",
      "Class Code",
      classData.code || "N/A",
      "Section",
      classData.section || "N/A",
    ]);
    worksheet.addRow([
      "Semester",
      classData.semester || "N/A",
      "Batch",
      classData.batch || "N/A",
      "Academic Year",
      classData.academicYear || "N/A",
    ]);
    worksheet.addRow([
      "Session Count",
      sortedSessions.length,
      "Date Range",
      dateRange,
      "Room",
      classData.room || "N/A",
    ]);
    worksheet.addRow([]);

    // Header Row
    const headerRow = worksheet.addRow([
      "Roll No",
      "Student Name",
      ...sortedSessions.map((s, index) => {
        const type = s.type || "Session";
        const date = moment(s.startTime).format("DD MMM");
        const time = moment(s.startTime).format("HH:mm");
        return `S${index + 1} ${type} ${date} ${time}`;
      }),
      "Present",
      "Absent",
      "Attendance %",
    ]);

    // Style header
    headerRow.eachCell((cell) => {
      cell.font = {
        bold: true,
        color: { argb: "FF" + this.COLORS.headerText },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF" + this.COLORS.headerBg },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
    headerRow.height = 25;

    // Data Rows
    classData.students.forEach((student) => {
      const { rollNo } = this.getStudentProfile(student);
      const studentAttendance = sortedSessions.map((session) => {
        const key = `${session._id}_${student._id}`;
        const record = attendanceMap[key];
        return record ? record.status : "Absent";
      });

      const presentCount = studentAttendance.filter(
        (s) => s === "Present",
      ).length;
      const absentCount = studentAttendance.filter(
        (s) => s === "Absent",
      ).length;
      const attendancePercentage =
        sortedSessions.length > 0
          ? ((presentCount / sortedSessions.length) * 100).toFixed(2)
          : 0;

      const dataRow = worksheet.addRow([
        rollNo,
        student.name,
        ...studentAttendance,
        presentCount,
        absentCount,
        attendancePercentage + "%",
      ]);

      // Style data cells
      dataRow.eachCell((cell, colNumber) => {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE5E7EB" } },
          left: { style: "thin", color: { argb: "FFE5E7EB" } },
          bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
          right: { style: "thin", color: { argb: "FFE5E7EB" } },
        };

        // Color code attendance status
        if (colNumber > 2 && colNumber <= sortedSessions.length + 2) {
          const status = cell.value;
          if (status === "Present") {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FF" + this.COLORS.presentBg },
            };
            cell.font = {
              color: { argb: "FF" + this.COLORS.presentText },
              bold: true,
            };
          } else if (status === "Absent") {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FF" + this.COLORS.absentBg },
            };
            cell.font = {
              color: { argb: "FF" + this.COLORS.absentText },
              bold: true,
            };
          } else if (status === "Pending") {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FF" + this.COLORS.pendingBg },
            };
            cell.font = {
              color: { argb: "FF" + this.COLORS.pendingText },
              bold: true,
            };
          }
        }

        // Highlight percentage column
        if (colNumber === sortedSessions.length + 5) {
          const percentage = parseFloat(cell.value);
          if (percentage < 75) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FF" + this.COLORS.absentBg },
            };
            cell.font = {
              color: { argb: "FF" + this.COLORS.absentText },
              bold: true,
            };
          } else {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FF" + this.COLORS.presentBg },
            };
            cell.font = {
              color: { argb: "FF" + this.COLORS.presentText },
              bold: true,
            };
          }
        }
      });
    });

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(Math.max(maxLength + 2, 12), 30);
    });

    // Return buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  /**
   * Generate Class Matrix as CSV
   */
  static generateClassMatrixCSV(classData, sessions, attendanceMap) {
    const sortedSessions = sessions.sort(
      (a, b) => new Date(a.startTime) - new Date(b.startTime),
    );
    const teacherName =
      typeof classData.teacher === "object"
        ? classData.teacher?.name || "N/A"
        : "N/A";
    const firstSession = sortedSessions[0];
    const lastSession = sortedSessions[sortedSessions.length - 1];
    const dateRange =
      sortedSessions.length > 0
        ? `${moment(firstSession.startTime).format("DD MMM YYYY")} - ${moment(
            lastSession.startTime,
          ).format("DD MMM YYYY")}`
        : "N/A";

    // Header
    let csv = `${classData.name} (${classData.code}) - Attendance Register\n`;
    csv += `Generated on: ${moment().format("MMMM DD, YYYY [at] HH:mm")}\n\n`;
    csv += `Teacher,${teacherName}\n`;
    csv += `Department,${classData.department || "N/A"}\n`;
    csv += `Class,${classData.name || "N/A"}\n`;
    csv += `Class Code,${classData.code || "N/A"}\n`;
    csv += `Section,${classData.section || "N/A"}\n`;
    csv += `Semester,${classData.semester || "N/A"}\n`;
    csv += `Batch,${classData.batch || "N/A"}\n`;
    csv += `Academic Year,${classData.academicYear || "N/A"}\n`;
    csv += `Session Count,${sortedSessions.length}\n`;
    csv += `Date Range,${dateRange}\n\n`;

    // Column headers
    csv += `Roll No,Student Name,${sortedSessions
      .map((s, index) => {
        const type = s.type || "Session";
        const date = moment(s.startTime).format("DD MMM");
        const time = moment(s.startTime).format("HH:mm");
        return `S${index + 1} ${type} ${date} ${time}`;
      })
      .join(",")},Present,Absent,Attendance %\n`;

    // Data rows
    classData.students.forEach((student) => {
      const { rollNo } = this.getStudentProfile(student);
      const studentAttendance = sortedSessions.map((session) => {
        const key = `${session._id}_${student._id}`;
        const record = attendanceMap[key];
        return record ? record.status : "Absent";
      });

      const presentCount = studentAttendance.filter(
        (s) => s === "Present",
      ).length;
      const absentCount = studentAttendance.filter(
        (s) => s === "Absent",
      ).length;
      const attendancePercentage =
        sortedSessions.length > 0
          ? ((presentCount / sortedSessions.length) * 100).toFixed(2)
          : 0;

      csv += `${rollNo},${student.name},${studentAttendance.join(",")},${presentCount},${absentCount},${attendancePercentage}%\n`;
    });

    return csv;
  }

  /**
   * Generate Student Transcript (All classes)
   */
  static async generateStudentTranscript(
    student,
    classesData,
    format = "xlsx",
  ) {
    if (format === "csv") {
      return this.generateStudentTranscriptCSV(student, classesData);
    } else {
      return this.generateStudentTranscriptExcel(student, classesData);
    }
  }

  /**
   * Generate Student Transcript as Excel
   */
  static async generateStudentTranscriptExcel(student, classesData) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Student Transcript");
    const profile = this.getStudentProfile(student);

    // Title Row
    worksheet.mergeCells("A1:F1");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = `Student Attendance Transcript`;
    titleCell.font = {
      size: 16,
      bold: true,
      color: { argb: "FF" + this.COLORS.headerBg },
    };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF" + this.COLORS.metadataBg },
    };
    worksheet.getRow(1).height = 30;

    // Student Info
    worksheet.addRow([]);
    worksheet.addRow(["Student Name:", student.name]);
    worksheet.addRow(["Roll Number:", profile.rollNo]);
    worksheet.addRow(["Department:", profile.department]);
    worksheet.addRow(["Semester:", profile.semester]);
    worksheet.addRow([
      "Generated on:",
      moment().format("MMMM DD, YYYY [at] HH:mm"),
    ]);
    worksheet.addRow([]);

    // Header Row
    const headerRow = worksheet.addRow([
      "Class Name",
      "Class Code",
      "Total Sessions",
      "Present",
      "Absent",
      "Attendance %",
    ]);

    headerRow.eachCell((cell) => {
      cell.font = {
        bold: true,
        color: { argb: "FF" + this.COLORS.headerText },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF" + this.COLORS.headerBg },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Data rows
    let totalSessions = 0;
    let totalPresent = 0;
    let totalAbsent = 0;

    classesData.forEach((classInfo) => {
      const dataRow = worksheet.addRow([
        classInfo.className,
        classInfo.classCode,
        classInfo.totalSessions,
        classInfo.presentCount,
        classInfo.absentCount,
        classInfo.percentage.toFixed(2) + "%",
      ]);

      totalSessions += classInfo.totalSessions;
      totalPresent += classInfo.presentCount;
      totalAbsent += classInfo.absentCount;

      dataRow.eachCell((cell, colNumber) => {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE5E7EB" } },
          left: { style: "thin", color: { argb: "FFE5E7EB" } },
          bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
          right: { style: "thin", color: { argb: "FFE5E7EB" } },
        };

        if (colNumber === 6) {
          const percentage = parseFloat(cell.value);
          if (percentage < 75) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FF" + this.COLORS.absentBg },
            };
            cell.font = {
              color: { argb: "FF" + this.COLORS.absentText },
              bold: true,
            };
          } else {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FF" + this.COLORS.presentBg },
            };
            cell.font = {
              color: { argb: "FF" + this.COLORS.presentText },
              bold: true,
            };
          }
        }
      });
    });

    // Summary row
    worksheet.addRow([]);
    const overallPercentage =
      totalSessions > 0 ? (totalPresent / totalSessions) * 100 : 0;
    const summaryRow = worksheet.addRow([
      "Overall",
      "",
      totalSessions,
      totalPresent,
      totalAbsent,
      overallPercentage.toFixed(2) + "%",
    ]);

    summaryRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF" + this.COLORS.metadataBg },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "double" },
        left: { style: "thin" },
        bottom: { style: "double" },
        right: { style: "thin" },
      };
    });

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(Math.max(maxLength + 2, 15), 40);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  /**
   * Generate Student Transcript as CSV
   */
  static generateStudentTranscriptCSV(student, classesData) {
    let csv = `Student Attendance Transcript\n\n`;
    csv += `Student Name:,${student.name}\n`;
    const profile = this.getStudentProfile(student);
    csv += `Roll Number:,${profile.rollNo}\n`;
    csv += `Department:,${profile.department}\n`;
    csv += `Semester:,${profile.semester}\n`;
    csv += `Generated on:,${moment().format("MMMM DD, YYYY [at] HH:mm")}\n\n`;

    csv += `Class Name,Class Code,Total Sessions,Present,Absent,Attendance %\n`;

    let totalSessions = 0;
    let totalPresent = 0;
    let totalAbsent = 0;

    classesData.forEach((classInfo) => {
      csv += `${classInfo.className},${classInfo.classCode},${classInfo.totalSessions},${classInfo.presentCount},${classInfo.absentCount},${classInfo.percentage.toFixed(2)}%\n`;
      totalSessions += classInfo.totalSessions;
      totalPresent += classInfo.presentCount;
      totalAbsent += classInfo.absentCount;
    });

    const overallPercentage =
      totalSessions > 0 ? (totalPresent / totalSessions) * 100 : 0;
    csv += `\nOverall,,${totalSessions},${totalPresent},${totalAbsent},${overallPercentage.toFixed(2)}%\n`;

    return csv;
  }

  /**
   * Generate Department Summary
   */
  static async generateDepartmentSummary(departmentData, format = "xlsx") {
    if (format === "csv") {
      return this.generateDepartmentSummaryCSV(departmentData);
    } else {
      return this.generateDepartmentSummaryExcel(departmentData);
    }
  }

  /**
   * Generate Department Summary as Excel
   */
  static async generateDepartmentSummaryExcel(departmentData) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Department Summary");

    // Title
    worksheet.mergeCells("A1:G1");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = `Department-wise Attendance Summary`;
    titleCell.font = {
      size: 16,
      bold: true,
      color: { argb: "FF" + this.COLORS.headerBg },
    };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF" + this.COLORS.metadataBg },
    };
    worksheet.getRow(1).height = 30;

    worksheet.addRow([]);
    worksheet.addRow([
      "Generated on:",
      moment().format("MMMM DD, YYYY [at] HH:mm"),
    ]);
    worksheet.addRow([]);

    // Header
    const headerRow = worksheet.addRow([
      "Department",
      "Total Classes",
      "Total Students",
      "Total Sessions",
      "Avg Attendance %",
      "Defaulters (<75%)",
      "Status",
    ]);

    headerRow.eachCell((cell) => {
      cell.font = {
        bold: true,
        color: { argb: "FF" + this.COLORS.headerText },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF" + this.COLORS.headerBg },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Data rows
    departmentData.forEach((dept) => {
      const status =
        dept.avgAttendance >= 75
          ? "Good"
          : dept.avgAttendance >= 60
            ? "Fair"
            : "Poor";

      const dataRow = worksheet.addRow([
        dept.department,
        dept.totalClasses,
        dept.totalStudents,
        dept.totalSessions,
        dept.avgAttendance.toFixed(2) + "%",
        dept.defaulters,
        status,
      ]);

      dataRow.eachCell((cell, colNumber) => {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE5E7EB" } },
          left: { style: "thin", color: { argb: "FFE5E7EB" } },
          bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
          right: { style: "thin", color: { argb: "FFE5E7EB" } },
        };

        if (colNumber === 5) {
          const percentage = parseFloat(cell.value);
          if (percentage < 60) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FF" + this.COLORS.absentBg },
            };
            cell.font = {
              color: { argb: "FF" + this.COLORS.absentText },
              bold: true,
            };
          } else if (percentage < 75) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FF" + this.COLORS.pendingBg },
            };
            cell.font = {
              color: { argb: "FF" + this.COLORS.pendingText },
              bold: true,
            };
          } else {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FF" + this.COLORS.presentBg },
            };
            cell.font = {
              color: { argb: "FF" + this.COLORS.presentText },
              bold: true,
            };
          }
        }

        if (colNumber === 7) {
          if (status === "Good") {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FF" + this.COLORS.presentBg },
            };
            cell.font = {
              color: { argb: "FF" + this.COLORS.presentText },
              bold: true,
            };
          } else if (status === "Fair") {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FF" + this.COLORS.pendingBg },
            };
            cell.font = {
              color: { argb: "FF" + this.COLORS.pendingText },
              bold: true,
            };
          } else {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FF" + this.COLORS.absentBg },
            };
            cell.font = {
              color: { argb: "FF" + this.COLORS.absentText },
              bold: true,
            };
          }
        }
      });
    });

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(Math.max(maxLength + 2, 15), 40);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  /**
   * Generate Department Summary as CSV
   */
  static generateDepartmentSummaryCSV(departmentData) {
    let csv = `Department-wise Attendance Summary\n\n`;
    csv += `Generated on:,${moment().format("MMMM DD, YYYY [at] HH:mm")}\n\n`;
    csv += `Department,Total Classes,Total Students,Total Sessions,Avg Attendance %,Defaulters (<75%),Status\n`;

    departmentData.forEach((dept) => {
      const status =
        dept.avgAttendance >= 75
          ? "Good"
          : dept.avgAttendance >= 60
            ? "Fair"
            : "Poor";
      csv += `${dept.department},${dept.totalClasses},${dept.totalStudents},${dept.totalSessions},${dept.avgAttendance.toFixed(2)}%,${dept.defaulters},${status}\n`;
    });

    return csv;
  }

  /**
   * Generate Defaulters Report (Students below attendance threshold)
   */
  static async generateDefaultersReport(
    classData,
    defaulters,
    totalSessions,
    threshold = 75,
    format = "xlsx",
  ) {
    if (format === "csv") {
      return this.generateDefaultersReportCSV(
        classData,
        defaulters,
        totalSessions,
        threshold,
      );
    } else {
      return this.generateDefaultersReportExcel(
        classData,
        defaulters,
        totalSessions,
        threshold,
      );
    }
  }

  /**
   * Generate Defaulters Report as Excel
   */
  static async generateDefaultersReportExcel(
    classData,
    defaulters,
    totalSessions,
    threshold,
  ) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Defaulters Report");

    const teacherName =
      typeof classData.teacher === "object"
        ? classData.teacher?.name || "N/A"
        : "N/A";

    // Title Row
    worksheet.mergeCells("A1:I1");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = `${classData.name} (${classData.code}) - Defaulters Report`;
    titleCell.font = {
      size: 16,
      bold: true,
      color: { argb: "FF" + this.COLORS.headerBg },
    };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF" + this.COLORS.metadataBg },
    };
    worksheet.getRow(1).height = 30;

    // Generated Date
    worksheet.mergeCells("A2:I2");
    const dateCell = worksheet.getCell("A2");
    dateCell.value = `Generated on: ${moment().format("MMMM DD, YYYY [at] HH:mm")}`;
    dateCell.font = { size: 10, italic: true };
    dateCell.alignment = { horizontal: "center" };
    worksheet.getRow(2).height = 20;

    // Metadata
    worksheet.addRow([
      "Teacher",
      teacherName,
      "Department",
      classData.department || "N/A",
    ]);
    worksheet.addRow([
      "Class",
      classData.name || "N/A",
      "Class Code",
      classData.code || "N/A",
    ]);
    worksheet.addRow([
      "Semester",
      classData.semester || "N/A",
      "Batch",
      classData.batch || "N/A",
    ]);
    worksheet.addRow([
      "Total Sessions",
      totalSessions,
      "Threshold",
      `${threshold}%`,
    ]);
    worksheet.addRow([
      "Total Defaulters",
      defaulters.length,
    ]);
    worksheet.addRow([]);

    // Header Row
    const headerRow = worksheet.addRow([
      "Roll No",
      "Student Name",
      "Email",
      "Department",
      "Total Classes",
      "Present",
      "Absent",
      "Leave",
      "Attendance %",
    ]);

    // Style header
    headerRow.eachCell((cell) => {
      cell.font = {
        bold: true,
        color: { argb: "FF" + this.COLORS.headerText },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF" + this.COLORS.headerBg },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
    headerRow.height = 25;

    // Data Rows
    defaulters.forEach((student) => {
      const { rollNo, department } = this.getStudentProfile({
        ...student,
        info: student.info,
      });

      const dataRow = worksheet.addRow([
        rollNo,
        student.name,
        student.email || "N/A",
        department,
        student.totalClasses,
        student.presentCount,
        student.absentCount,
        student.leaveCount || 0,
        student.attendancePercentage + "%",
      ]);

      // Style data cells
      dataRow.eachCell((cell, colNumber) => {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE5E7EB" } },
          left: { style: "thin", color: { argb: "FFE5E7EB" } },
          bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
          right: { style: "thin", color: { argb: "FFE5E7EB" } },
        };

        // Highlight percentage column in red (all defaulters are below threshold)
        if (colNumber === 9) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF" + this.COLORS.absentBg },
          };
          cell.font = {
            color: { argb: "FF" + this.COLORS.absentText },
            bold: true,
          };
        }
      });
    });

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(Math.max(maxLength + 2, 12), 35);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  /**
   * Generate Defaulters Report as CSV
   */
  static generateDefaultersReportCSV(
    classData,
    defaulters,
    totalSessions,
    threshold,
  ) {
    const teacherName =
      typeof classData.teacher === "object"
        ? classData.teacher?.name || "N/A"
        : "N/A";

    let csv = `${classData.name} (${classData.code}) - Defaulters Report\n`;
    csv += `Generated on: ${moment().format("MMMM DD, YYYY [at] HH:mm")}\n\n`;
    csv += `Teacher,${teacherName}\n`;
    csv += `Department,${classData.department || "N/A"}\n`;
    csv += `Semester,${classData.semester || "N/A"}\n`;
    csv += `Batch,${classData.batch || "N/A"}\n`;
    csv += `Total Sessions,${totalSessions}\n`;
    csv += `Threshold,${threshold}%\n`;
    csv += `Total Defaulters,${defaulters.length}\n\n`;

    csv += `Roll No,Student Name,Email,Department,Total Classes,Present,Absent,Leave,Attendance %\n`;

    defaulters.forEach((student) => {
      const { rollNo, department } = this.getStudentProfile({
        ...student,
        info: student.info,
      });

      csv += `${rollNo},${student.name},${student.email || "N/A"},${department},${student.totalClasses},${student.presentCount},${student.absentCount},${student.leaveCount || 0},${student.attendancePercentage}%\n`;
    });

    return csv;
  }
  /**
   * Generic Admin Report Export
   */
  static async generateAdminReport(reportType, data, format = "xlsx") {
    if (format === "csv") {
      return this.generateAdminReportCSV(reportType, data);
    } else {
      return this.generateAdminReportExcel(reportType, data);
    }
  }

  static async generateAdminReportExcel(reportType, data) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(reportType + " Report");
    
    // Configs for different report types
    const columnsConfig = {
      students: [
        { header: "Roll No", key: "rollNo", width: 15 },
        { header: "Student Name", key: "name", width: 25 },
        { header: "Email", key: "email", width: 30 },
        { header: "Phone", key: "phone", width: 15 },
        { header: "Department", key: "department", width: 20 },
        { header: "Batch", key: "batch", width: 15 },
        { header: "Section", key: "section", width: 15 },
        { header: "Semester", key: "semester", width: 10 },
        { header: "Total Classes", key: "totalClasses", width: 15 },
        { header: "Present", key: "presentCount", width: 10 },
        { header: "Absent", key: "absentCount", width: 10 },
        { header: "Leave", key: "leaveCount", width: 10 },
        { header: "Attendance %", key: "attendancePercentage", width: 15 },
      ],
      teachers: [
        { header: "Teacher Name", key: "name", width: 25 },
        { header: "Email", key: "email", width: 30 },
        { header: "Phone", key: "phone", width: 15 },
        { header: "Department", key: "department", width: 20 },
        { header: "Total Classes", key: "totalClasses", width: 15 },
        { header: "Total Students", key: "totalStudents", width: 15 },
        { header: "Total Sessions", key: "totalSessions", width: 15 },
        { header: "Present", key: "totalPresent", width: 10 },
        { header: "Absent", key: "totalAbsent", width: 10 },
        { header: "Leave", key: "totalLeave", width: 10 },
        { header: "Attendance %", key: "attendancePercentage", width: 15 },
      ],
      departments: [
        { header: "Department", key: "name", width: 25 },
        { header: "Total Classes", key: "totalClasses", width: 15 },
        { header: "Total Students", key: "totalStudents", width: 15 },
        { header: "Total Teachers", key: "totalTeachers", width: 15 },
        { header: "Total Sessions", key: "totalSessions", width: 15 },
        { header: "Present", key: "totalPresent", width: 10 },
        { header: "Absent", key: "totalAbsent", width: 10 },
        { header: "Leave", key: "totalLeave", width: 10 },
        { header: "Attendance %", key: "attendancePercentage", width: 15 },
      ],
      batches: [
        { header: "Batch", key: "name", width: 20 },
        { header: "Departments", key: "departments", width: 30 },
        { header: "Total Classes", key: "totalClasses", width: 15 },
        { header: "Total Students", key: "totalStudents", width: 15 },
        { header: "Present", key: "totalPresent", width: 10 },
        { header: "Absent", key: "totalAbsent", width: 10 },
        { header: "Leave", key: "totalLeave", width: 10 },
        { header: "Attendance %", key: "attendancePercentage", width: 15 },
      ],
      sections: [
        { header: "Section", key: "name", width: 15 },
        { header: "Batches", key: "batches", width: 20 },
        { header: "Departments", key: "departments", width: 30 },
        { header: "Total Classes", key: "totalClasses", width: 15 },
        { header: "Total Students", key: "totalStudents", width: 15 },
        { header: "Present", key: "totalPresent", width: 10 },
        { header: "Absent", key: "totalAbsent", width: 10 },
        { header: "Leave", key: "totalLeave", width: 10 },
        { header: "Attendance %", key: "attendancePercentage", width: 15 },
      ],
      subjects: [
        { header: "Subject", key: "name", width: 25 },
        { header: "Batches", key: "batches", width: 20 },
        { header: "Departments", key: "departments", width: 30 },
        { header: "Total Classes", key: "totalClasses", width: 15 },
        { header: "Total Students", key: "totalStudents", width: 15 },
        { header: "Present", key: "totalPresent", width: 10 },
        { header: "Absent", key: "totalAbsent", width: 10 },
        { header: "Leave", key: "totalLeave", width: 10 },
        { header: "Attendance %", key: "attendancePercentage", width: 15 },
      ],
      classes: [
        { header: "Class Name", key: "name", width: 25 },
        { header: "Code", key: "code", width: 15 },
        { header: "Department", key: "department", width: 20 },
        { header: "Semester", key: "semester", width: 10 },
        { header: "Batch", key: "batch", width: 15 },
        { header: "Teacher", key: "teacher", width: 25 },
        { header: "Total Students", key: "totalStudents", width: 15 },
        { header: "Total Sessions", key: "totalSessions", width: 15 },
        { header: "Present", key: "totalPresent", width: 10 },
        { header: "Absent", key: "totalAbsent", width: 10 },
        { header: "Leave", key: "totalLeave", width: 10 },
        { header: "Attendance %", key: "attendancePercentage", width: 15 },
      ],
      defaulters: [
        { header: "Roll No", key: "rollNo", width: 15 },
        { header: "Student Name", key: "name", width: 25 },
        { header: "Email", key: "email", width: 30 },
        { header: "Phone", key: "phone", width: 15 },
        { header: "Department", key: "department", width: 20 },
        { header: "Batch", key: "batch", width: 15 },
        { header: "Section", key: "section", width: 15 },
        { header: "Semester", key: "semester", width: 10 },
        { header: "Total Classes", key: "totalClasses", width: 15 },
        { header: "Present", key: "presentCount", width: 10 },
        { header: "Absent", key: "absentCount", width: 10 },
        { header: "Leave", key: "leaveCount", width: 10 },
        { header: "Attendance %", key: "attendancePercentage", width: 15 },
      ]
    };

    const columns = columnsConfig[reportType] || [{ header: "Name", key: "name", width: 20 }];
    worksheet.columns = columns;

    // Title Row
    worksheet.insertRow(1, [`AttendX Admin Report: ${reportType.toUpperCase()}`]);
    worksheet.mergeCells(1, 1, 1, columns.length);
    const titleCell = worksheet.getCell("A1");
    titleCell.font = { size: 16, bold: true, color: { argb: "FF" + this.COLORS.headerBg } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getRow(1).height = 30;

    worksheet.insertRow(2, [`Generated on: ${moment().format("MMMM DD, YYYY [at] HH:mm")}`]);
    worksheet.mergeCells(2, 1, 2, columns.length);
    worksheet.getCell("A2").alignment = { horizontal: "center" };
    worksheet.insertRow(3, []);

    // Re-assign columns starting from row 4
    worksheet.getRow(4).values = columns.map(c => c.header);
    worksheet.getRow(4).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FF" + this.COLORS.headerText } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + this.COLORS.headerBg } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });

    data.forEach(item => {
      const rowData = columns.map(col => {
        let val = item[col.key];
        if (Array.isArray(val)) val = val.join(", ");
        if (col.key === "attendancePercentage") return val + "%";
        return val;
      });
      const row = worksheet.addRow(rowData);
      
      row.eachCell((cell, colNumber) => {
        if (columns[colNumber - 1].key === "attendancePercentage") {
          const percentage = parseFloat(cell.value);
          if (percentage < 75) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + this.COLORS.absentBg } };
            cell.font = { color: { argb: "FF" + this.COLORS.absentText }, bold: true };
          } else {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + this.COLORS.presentBg } };
            cell.font = { color: { argb: "FF" + this.COLORS.presentText }, bold: true };
          }
        }
      });
    });

    return await workbook.xlsx.writeBuffer();
  }

  static generateAdminReportCSV(reportType, data) {
    return "CSV Export Not fully implemented yet for Admin Reports. Use XLSX.";
  }
}

export default ExportService;
