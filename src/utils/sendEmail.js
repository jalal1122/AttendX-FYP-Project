import nodemailer from "nodemailer";

/**
 * Send Email Utility
 * Works in both dev and production modes
 * In dev mode: Logs email to console
 * In prod mode: Sends actual email via SMTP
 */

const sendEmail = async ({ to, subject, text, html }) => {
  try {
    // Check if email credentials are configured
    const isEmailConfigured =
      process.env.EMAIL_HOST &&
      process.env.EMAIL_PORT &&
      process.env.EMAIL_USER &&
      process.env.EMAIL_PASS;

    if (!isEmailConfigured) {
      // Development mode - just log to console
      console.log("\n📧 ========== MOCK EMAIL ==========");
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Message:\n${text}`);
      console.log("===================================\n");
      return { success: true, mode: "mock" };
    }

    // Production mode - send actual email
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_PORT === "465", // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || "AttendX"}" <${
        process.env.EMAIL_USER
      }>`,
      to,
      subject,
      text,
      html: html || text,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log(`✅ Email sent successfully to ${to}: ${info.messageId}`);
    return { success: true, mode: "real", messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw error;
  }
};

export default sendEmail;
