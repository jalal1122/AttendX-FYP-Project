import nodemailer from "nodemailer";
import moment from "moment";

/**
 * Email Service with Beautiful HTML Templates
 * Sky Blue Theme (#0EA5E9)
 */
class EmailService {
  static transporter = null;

  /**
   * Initialize email transporter
   */
  static async initTransporter() {
    if (this.transporter) return this.transporter;

    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || "smtp.gmail.com",
        port: process.env.EMAIL_PORT || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });

      // Verify connection
      await this.transporter.verify();
      console.log("✅ Email service ready");
      return this.transporter;
    } catch (error) {
      console.error("❌ Email service error:", error);
      return null;
    }
  }

  /**
   * Base HTML Template with Sky Blue Theme
   */
  static getBaseTemplate(content) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AttendX Notification</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f8fafc;
      color: #1e293b;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    .header {
      background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: #ffffff;
      margin: 0;
      letter-spacing: -0.5px;
    }
    .tagline {
      color: #e0f2fe;
      font-size: 14px;
      margin: 8px 0 0 0;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 24px;
      font-weight: 600;
      color: #0f172a;
      margin: 0 0 20px 0;
    }
    .message {
      font-size: 16px;
      line-height: 1.6;
      color: #475569;
      margin: 0 0 20px 0;
    }
    .info-box {
      background-color: #f1f5f9;
      border-left: 4px solid #0ea5e9;
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
    }
    .info-box.warning {
      background-color: #fef2f2;
      border-left-color: #ef4444;
    }
    .info-box.success {
      background-color: #f0fdf4;
      border-left-color: #10b981;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      font-weight: 600;
      color: #475569;
    }
    .info-value {
      color: #0f172a;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
    }
    .button:hover {
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
    }
    .footer {
      background-color: #f8fafc;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer-text {
      font-size: 14px;
      color: #64748b;
      margin: 5px 0;
    }
    .divider {
      height: 1px;
      background-color: #e2e8f0;
      margin: 30px 0;
    }
    .highlight {
      color: #0ea5e9;
      font-weight: 600;
    }
    .warning-text {
      color: #ef4444;
      font-weight: 600;
    }
    .success-text {
      color: #10b981;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">AttendX</h1>
      <p class="tagline">Smart Attendance Management</p>
    </div>
    ${content}
    <div class="footer">
      <p class="footer-text">This is an automated message from AttendX</p>
      <p class="footer-text">© ${new Date().getFullYear()} AttendX. All rights reserved.</p>
      <p class="footer-text">
        <a href="#" style="color: #0ea5e9; text-decoration: none;">Privacy Policy</a> •
        <a href="#" style="color: #0ea5e9; text-decoration: none;">Terms of Service</a>
      </p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Send Welcome Email
   */
  static async sendWelcomeEmail(user, tempPassword) {
    const content = `
<div class="content">
  <h2 class="greeting">Welcome to AttendX! 👋</h2>
  <p class="message">
    Hello <strong>${user.name}</strong>,
  </p>
  <p class="message">
    Your account has been successfully created. You can now access the AttendX attendance management system.
  </p>
  
  <div class="info-box success">
    <div class="info-row">
      <span class="info-label">Email:</span>
      <span class="info-value">${user.email}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Role:</span>
      <span class="info-value">${user.role.charAt(0).toUpperCase() + user.role.slice(1)}</span>
    </div>
    ${user.rollNumber ? `
    <div class="info-row">
      <span class="info-label">Roll Number:</span>
      <span class="info-value">${user.rollNumber}</span>
    </div>
    ` : ''}
    ${user.department ? `
    <div class="info-row">
      <span class="info-label">Department:</span>
      <span class="info-value">${user.department}</span>
    </div>
    ` : ''}
    ${tempPassword ? `
    <div class="info-row">
      <span class="info-label">Temporary Password:</span>
      <span class="info-value"><code style="background: #e0f2fe; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${tempPassword}</code></span>
    </div>
    ` : ''}
  </div>

  ${tempPassword ? `
  <p class="message">
    <strong>⚠️ Important:</strong> Please change your password after your first login for security.
  </p>
  ` : ''}

  <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/login" class="button">
    Login to AttendX
  </a>

  <div class="divider"></div>

  <p class="message">
    <strong>Getting Started:</strong>
  </p>
  <ul style="color: #475569; line-height: 1.8;">
    ${user.role === 'student' ? `
    <li>Join your classes using the class code</li>
    <li>Scan QR codes to mark attendance</li>
    <li>Track your attendance percentage</li>
    ` : user.role === 'teacher' ? `
    <li>Create and manage your classes</li>
    <li>Start live attendance sessions</li>
    <li>View real-time attendance tracking</li>
    <li>Generate attendance reports</li>
    ` : `
    <li>Manage users and classes</li>
    <li>View system-wide analytics</li>
    <li>Generate comprehensive reports</li>
    `}
  </ul>
</div>
    `;

    const mailOptions = {
      from: `"AttendX" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Welcome to AttendX! 🎉",
      html: this.getBaseTemplate(content),
    };

    return this.sendEmail(mailOptions);
  }

  /**
   * Send Low Attendance Warning
   */
  static async sendLowAttendanceWarning(student, classData, attendancePercentage) {
    const content = `
<div class="content">
  <h2 class="greeting">⚠️ Low Attendance Alert</h2>
  <p class="message">
    Hello <strong>${student.name}</strong>,
  </p>
  <p class="message">
    This is an automated notification regarding your attendance in <strong>${classData.name}</strong>.
  </p>
  
  <div class="info-box warning">
    <div class="info-row">
      <span class="info-label">Class:</span>
      <span class="info-value">${classData.name} (${classData.code})</span>
    </div>
    <div class="info-row">
      <span class="info-label">Current Attendance:</span>
      <span class="info-value warning-text">${attendancePercentage.toFixed(2)}%</span>
    </div>
    <div class="info-row">
      <span class="info-label">Required:</span>
      <span class="info-value">75%</span>
    </div>
    <div class="info-row">
      <span class="info-label">Status:</span>
      <span class="info-value warning-text">Below Threshold</span>
    </div>
  </div>

  <p class="message">
    Your attendance is currently <span class="warning-text">${(75 - attendancePercentage).toFixed(2)}%</span> below the required 75% threshold. Please ensure you attend upcoming sessions regularly.
  </p>

  <div class="info-box">
    <p style="margin: 0; color: #475569; font-size: 14px;">
      <strong>💡 Tip:</strong> Regular attendance is crucial for your academic progress. Contact your teacher if you have any concerns.
    </p>
  </div>

  <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/student/attendance" class="button">
    View Attendance Details
  </a>
</div>
    `;

    const mailOptions = {
      from: `"AttendX Alerts" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: student.email,
      subject: `⚠️ Low Attendance Alert: ${classData.name}`,
      html: this.getBaseTemplate(content),
    };

    return this.sendEmail(mailOptions);
  }

  /**
   * Send Device Security Alert
   */
  static async sendDeviceAlert(user, action, deviceId) {
    const isBinding = action === "bind";
    const isReset = action === "reset";

    const content = `
<div class="content">
  <h2 class="greeting">🔒 Device Security Alert</h2>
  <p class="message">
    Hello <strong>${user.name}</strong>,
  </p>
  <p class="message">
    ${isBinding ? 
      "A new device has been bound to your AttendX account." : 
      "Your device binding has been reset by an administrator."
    }
  </p>
  
  <div class="info-box ${isBinding ? '' : 'warning'}">
    <div class="info-row">
      <span class="info-label">Action:</span>
      <span class="info-value">${isBinding ? "Device Bound" : "Device Reset"}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Device ID:</span>
      <span class="info-value"><code style="background: #e0f2fe; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 12px;">${deviceId || "N/A"}</code></span>
    </div>
    <div class="info-row">
      <span class="info-label">Time:</span>
      <span class="info-value">${moment().format("MMMM DD, YYYY [at] HH:mm")}</span>
    </div>
  </div>

  ${isBinding ? `
  <p class="message">
    This device will now be used for marking attendance. You can only use one device at a time for security purposes.
  </p>
  ` : `
  <p class="message">
    You can now bind a new device when you mark attendance next time. If you didn't request this reset, please contact your administrator immediately.
  </p>
  `}

  <div class="info-box ${isBinding ? 'success' : ''}>
    <p style="margin: 0; color: #475569; font-size: 14px;">
      <strong>🛡️ Security Note:</strong> ${isBinding ? 
        "Your account is now secured to this device. This prevents unauthorized attendance marking." :
        "If you didn't request this change, please contact support immediately."
      }
    </p>
  </div>

  ${!isBinding ? `
  <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/profile" class="button">
    View Account Settings
  </a>
  ` : ''}
</div>
    `;

    const mailOptions = {
      from: `"AttendX Security" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `🔒 Device Security Alert - ${isBinding ? "New Device Bound" : "Device Reset"}`,
      html: this.getBaseTemplate(content),
    };

    return this.sendEmail(mailOptions);
  }

  /**
   * Send Session Started Notification (to students)
   */
  static async sendSessionStartedNotification(students, classData, teacher) {
    const content = `
<div class="content">
  <h2 class="greeting">📱 Attendance Session Started</h2>
  <p class="message">
    A new attendance session has been started for your class.
  </p>
  
  <div class="info-box">
    <div class="info-row">
      <span class="info-label">Class:</span>
      <span class="info-value">${classData.name} (${classData.code})</span>
    </div>
    <div class="info-row">
      <span class="info-label">Teacher:</span>
      <span class="info-value">${teacher.name}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Time:</span>
      <span class="info-value">${moment().format("MMMM DD, YYYY [at] HH:mm")}</span>
    </div>
  </div>

  <p class="message">
    <span class="highlight">Please scan the QR code displayed by your teacher to mark your attendance.</span>
  </p>

  <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/student/scan" class="button">
    Open Scanner
  </a>
</div>
    `;

    const mailOptions = {
      from: `"AttendX Notifications" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: students.map(s => s.email).join(", "),
      subject: `📱 Attendance Session: ${classData.name}`,
      html: this.getBaseTemplate(content),
    };

    return this.sendEmail(mailOptions);
  }

  /**
   * Generic send email method
   */
  static async sendEmail(mailOptions) {
    try {
      const transporter = await this.initTransporter();
      
      if (!transporter) {
        console.warn("⚠️ Email service not configured. Skipping email.");
        return { success: false, message: "Email service not configured" };
      }

      const info = await transporter.sendMail(mailOptions);
      console.log("✅ Email sent:", info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("❌ Email error:", error);
      return { success: false, error: error.message };
    }
  }
}

export default EmailService;
