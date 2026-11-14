const fs = require('fs');
const { google } = require('googleapis');
require('dotenv').config();

async function sendVerificationEmail(toEmail, otp) {
  console.log('');
  console.log('========================================');
  console.log(`EMAIL TO: ${toEmail}`);
  console.log(`CODE: ${otp}`);
  console.log('========================================');
  console.log('');

  try {
    const credentials = JSON.parse(fs.readFileSync('credentials.json'));
    const token = JSON.parse(fs.readFileSync('token.json'));
    
    const keys = credentials.installed || credentials.web || credentials;
    const { client_secret, client_id } = keys;
    const redirect_uris = ['http://localhost:3000'];
    
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    oAuth2Client.setCredentials(token);
    
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    
    const emailLines = [
      `To: ${toEmail}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      'Subject: HELP Connect - Verification Code',
      '',
      `<div style="font-family: Arial, sans-serif; padding: 20px;">`,
      `<h2 style="color: #e63946;">HELP Connect</h2>`,
      `<p>Your 6-digit verification code is:</p>`,
      `<h1 style="letter-spacing: 5px; color: #333;">${otp}</h1>`,
      `<p>This code will expire in 5 minutes.</p>`,
      `</div>`
    ];
    
    const email = emailLines.join('\r\n').trim();
    const base64Email = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
    
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: base64Email },
    });
    
    console.log(' Real email sent successfully via Gmail API!');
  } catch (error) {
    console.error(' Email send failed:', error.message);
  }
}

module.exports = { sendVerificationEmail };