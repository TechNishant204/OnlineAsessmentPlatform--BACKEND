const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();
// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// Format date and time
// Output: "Sunday, April 6, 2025, 05:18 PM"
const formatDateTime = (date) => {
  return new Date(date).toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Send signup confirmation email
const sendSignupConfirmationEmail = async (email, username) => {
  const mailOptions = {
    from: `EduAssess <no-reply@eduAssess.com>`,
    to: email,
    subject: "Welcome to Our Platform - Account Created Successfully",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Congratulations, ${username}!</h2>
        <p>Your account has been successfully created.</p>
        <p>You can now log in to your account.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p>If you have any questions or need assistance, please contact our support team.</p>
        </div>
        
        <p>Welcome aboard!</p>
        
        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd;">
          <p style="font-size: 12px; color: #777;">This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Signup confirmation email sent to ${email}`);
    return true;
  } catch (error) {
    console.error("Error sending signup confirmation email:", error);
    return false;
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetLink) => {
  const mailOptions = {
    from: `EduAssess <no-reply@eduAssess.com>`,
    to: email,
    subject: "Password Reset Request",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>We received a request to reset your password.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p>Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 20px 0;">
            <a href="${resetLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
          </div>
          <p style="font-size: 13px;">If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="font-size: 13px; word-break: break-all;"><a href="${resetLink}">${resetLink}</a></p>
        </div>
        
        <p><strong>This link will expire in 1 hour.</strong></p>
        <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
        
        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd;">
          <p style="font-size: 12px; color: #777;">This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}`);
    return true;
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return false;
  }
};

// Send exam enrollment email
const sendExamEnrollmentEmail = async (
  email,
  name,
  examTitle,
  duration,
  startTime,
  questionCount
) => {
  const mailOptions = {
    from: `EduAssess <no-reply@eduAssess.com>`,
    to: email,
    subject: `Enrollment Confirmation: ${examTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Exam Enrollment Confirmation</h2>
        <p>Hello ${name},</p>
        <p>You have successfully enrolled in the following exam:</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${examTitle}</h3>
          <p><strong>Date & Time:</strong> ${formatDateTime(startTime)}</p>
          <p><strong>Duration:</strong> ${duration} minutes</p>
          <p><strong>Questions:</strong> ${questionCount}</p>
        </div>
        
        <p>Please log in to the assessment platform a few minutes before the exam starts. Make sure your internet connection is stable and your browser is up to date.</p>
        
        <p>Good luck!</p>
        
        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd;">
          <p style="font-size: 12px; color: #777;">This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Enrollment email sent to ${email}`);
    return true;
  } catch (error) {
    console.error("Error sending enrollment email:", error);
    return false;
  }
};

// Send exam reminder email
const sendExamReminderEmail = async (email, name, examTitle, startTime) => {
  const mailOptions = {
    from: `EduAssess <no-reply@eduAssess.com>`,
    to: email,
    subject: `Reminder: ${examTitle} starts soon`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Exam Reminder</h2>
        <p>Hello ${name},</p>
        <p>This is a reminder that your exam <strong>${examTitle}</strong> starts in 1 hour at ${formatDateTime(
      startTime
    )}.</p>
        
        <p>Please log in to the assessment platform a few minutes before the exam starts to ensure you have enough time to prepare.</p>
        
        <p>Good luck!</p>
        
        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd;">
          <p style="font-size: 12px; color: #777;">This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Reminder email sent to ${email}`);
    return true;
  } catch (error) {
    console.error("Error sending reminder email:", error);
    return false;
  }
};

module.exports = {
  sendSignupConfirmationEmail,
  sendPasswordResetEmail,
  sendExamEnrollmentEmail,
  sendExamReminderEmail,
};
