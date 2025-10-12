import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';

type MailerConfig = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
};

function buildConfig(): MailerConfig {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const secureEnv = process.env.SMTP_SECURE?.toLowerCase();
  const secure = secureEnv === 'true' || secureEnv === '1' || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host) {
    throw new Error('SMTP_HOST is required to send emails.');
  }

  const from =
    process.env.SMTP_FROM || user || 'no-reply@example.com';

  return { host, port, secure, user, pass, from };
}

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly transporter: Transporter;
  private readonly config: MailerConfig;

  constructor() {
    this.config = buildConfig();

    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth:
        this.config.user && this.config.pass
          ? { user: this.config.user, pass: this.config.pass }
          : undefined,
    });
  }

  async sendPasswordResetEmail(to: string, resetLink: string) {
    const subject = 'Restablece tu contrasena';
    const text = [
      'Hola,',
      '',
      'Recibimos una solicitud para restablecer tu contrasena.',
      `Puedes crear una nueva contrasena usando el siguiente enlace (vigente por 30 minutos y de un solo uso):`,
      resetLink,
      '',
      'Si no solicitaste este cambio, puedes ignorar este mensaje.',
    ].join('\n');

    const html = `
      <p>Hola,</p>
      <p>Recibimos una solicitud para restablecer tu contrasena.</p>
      <p>
        Puedes crear una nueva contrasena usando el siguiente enlace
        (vigente por 30 minutos y de un solo uso):
      </p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
    `;

    try {
      await this.transporter.sendMail({
        to,
        from: this.config.from,
        subject,
        text,
        html,
      });
    } catch (error) {
      this.logger.error('Error sending password reset email', error as Error);
      throw error;
    }
  }
}
