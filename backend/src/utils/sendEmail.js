// Mocked email sender — prints OTP to console.
// Replace with AWS SES or Nodemailer when ready.
async function sendVerificationEmail(toEmail, otp) {
  console.log('');
  console.log('========================================');
  console.log(`📧 EMAIL TO: ${toEmail}`);
  console.log(`📝 SUBJECT: Your HELP Connect verification code`);
  console.log(`🔑 CODE: ${otp}`);
  console.log('========================================');
  console.log('');
}

module.exports = { sendVerificationEmail };