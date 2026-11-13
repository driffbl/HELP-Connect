const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'sandbox.smtp.mailtrap.io',
  port: process.env.EMAIL_PORT || 2525,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendVerificationEmail(toEmail, otp) {
  console.log('');
  console.log('========================================');
  console.log(`EMAIL TO: ${toEmail}`);
  console.log(`CODE: ${otp}`);
  console.log('========================================');
  console.log('');

  try {
    const mailOptions = {
      from: '"HELP Connect" <noreply@helpconnect.com>',
      to: toEmail,
      subject: 'HELP Connect - Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #e63946;">HELP Connect</h2>
          <p>Your 6-digit verification code is:</p>
          <h1 style="letter-spacing: 5px; color: #333;">${otp}</h1>
          <p>This code will expire in 5 minutes.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('Real email sent successfully to Mailtrap!');
  } catch (error) {
    console.error('Email send failed:', error.message);
  }
}

module.exports = { sendVerificationEmail };