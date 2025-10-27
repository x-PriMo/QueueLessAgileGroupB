import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

export async function getMailer() {
  if (transporter) {
    return transporter;
  }

  // Try to use SMTP configuration from environment
  if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Fallback to Ethereal Email for development
    const testAccount = await nodemailer.createTestAccount();
    
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }

  return transporter;
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
}) {
  const mailer = await getMailer();
  
  const info = await mailer!.sendMail({
    from: process.env.SMTP_FROM || 'noreply@queueless.local',
    to: options.to,
    subject: options.subject,
    html: options.html,
    attachments: options.attachments,
  });

  // Log preview URL for Ethereal
  if (!process.env.SMTP_HOST) {
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  }

  return info;
}
