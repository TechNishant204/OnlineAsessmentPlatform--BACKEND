const nodemailer = require("nodemailer");

// Create transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
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
    from: process.env.EMAIL_USER,
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
    from: process.env.EMAIL_USER,
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
  sendExamEnrollmentEmail,
  sendExamReminderEmail,
};
