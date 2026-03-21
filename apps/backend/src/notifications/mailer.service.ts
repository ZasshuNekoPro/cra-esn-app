import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env['SMTP_HOST'] ?? 'localhost',
      port: parseInt(process.env['SMTP_PORT'] ?? '1025', 10),
      secure: false,
      auth:
        process.env['SMTP_USER']
          ? { user: process.env['SMTP_USER'], pass: process.env['SMTP_PASS'] ?? '' }
          : undefined,
    });
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    const from = process.env['SMTP_FROM'] ?? 'ESN CRA App <noreply@esn-cra.app>';
    try {
      await this.transporter.sendMail({ from, to, subject, html });
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${String(err)}`);
      // Do not rethrow — email failure must not block the API response
    }
  }
}
