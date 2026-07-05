import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

export interface EmailPayload {
  to: string;
  toName: string;
  subject: string;
  body: string;
  category: string;
  timestamp: Date;
}

const getTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    connectionTimeout: 5000, // 5 seconds
    socketTimeout: 5000      // 5 seconds
  });
};

export class MailerService {
  private static logFilePath = path.join(__dirname, '../../logs/sent_emails.json');

  static async sendEmail(to: string, toName: string, subject: string, body: string, category: string): Promise<boolean> {
    const email: EmailPayload = {
      to,
      toName,
      subject,
      body,
      category,
      timestamp: new Date()
    };

    // Console logging with nice styling
    console.log(`\n==================================================`);
    console.log(`✉️ [MAIL SERVICE] Processing Email...`);
    console.log(`   To: ${toName} <${to}>`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Category: [${category.toUpperCase()}]`);
    console.log(`   Body: ${body.replace(/<[^>]*>/g, '').substring(0, 150)}...`);
    console.log(`==================================================\n`);

    // Check if SMTP is configured with real credentials
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const isRealSMTPEnabled = smtpUser && smtpPass && 
                              smtpUser !== 'your_email@gmail.com' && 
                              smtpPass !== 'your_app_password';

    if (isRealSMTPEnabled) {
      try {
        const transporter = getTransporter();
        await transporter.sendMail({
          from: process.env.SMTP_FROM || `"ThesisFlow" <${smtpUser}>`,
          to,
          subject,
          html: body
        });
        console.log(`✉️ [SMTP] Real Email Sent successfully to ${toName} <${to}>`);
      } catch (smtpErr) {
        console.error(`❌ [SMTP] Failed to send real email to ${to}:`, smtpErr);
      }
    }

    try {
      // Ensure logs directory exists
      const dir = path.dirname(this.logFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Read current logs
      let emails: EmailPayload[] = [];
      if (fs.existsSync(this.logFilePath)) {
        try {
          const raw = fs.readFileSync(this.logFilePath, 'utf8');
          emails = JSON.parse(raw);
        } catch (e) {
          emails = [];
        }
      }

      // Add to array and write back (limit to 100 for storage efficiency)
      emails.unshift(email);
      if (emails.length > 100) {
        emails = emails.slice(0, 100);
      }
      fs.writeFileSync(this.logFilePath, JSON.stringify(emails, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error('Error writing to email simulator log:', err);
      return false;
    }
  }

  static getSentEmails(): EmailPayload[] {
    try {
      if (fs.existsSync(this.logFilePath)) {
        const raw = fs.readFileSync(this.logFilePath, 'utf8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Error reading emails log:', e);
    }
    return [];
  }

  static clearSentEmails(): void {
    try {
      if (fs.existsSync(this.logFilePath)) {
        fs.unlinkSync(this.logFilePath);
      }
    } catch (e) {
      console.error(e);
    }
  }
}
