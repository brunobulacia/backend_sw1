import { Injectable, Logger } from '@nestjs/common';
import { ProjectMemberRole } from '@prisma/client';
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

  // En desarrollo, usar configuración por defecto si no está configurado SMTP
  const defaultHost = 'smtp.ethereal.email';
  const defaultUser = 'test@ethereal.email';
  const defaultPass = 'test123';

  const finalHost = host || defaultHost;
  const finalUser = user || defaultUser;
  const finalPass = pass || defaultPass;
  
  const from = process.env.SMTP_FROM || finalUser || 'no-reply@proyecto-sw1.com';

  return { 
    host: finalHost, 
    port, 
    secure, 
    user: finalUser, 
    pass: finalPass, 
    from 
  };
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

    // Log de configuración para desarrollo
    if (process.env.NODE_ENV === 'development') {
      this.logger.log(`Mailer configurado con host: ${this.config.host}`);
    }
  }

  private isNonCriticalEnvironment(): boolean {
    const env = (process.env.NODE_ENV ?? '').toLowerCase();
    return env === 'development' || env === 'test';
  }

  async sendPasswordResetEmail(to: string, resetLink: string) {
    const subject = 'Restablece tu contrasena';
    const text = [
      'Hola,',
      '',
      'Recibimos una solicitud para restablecer tu contrasena.',
      'Puedes crear una nueva contrasena usando el siguiente enlace (vigente por 30 minutos y de un solo uso):',
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

    const isDevEnvironment =
      (process.env.NODE_ENV ?? '').toLowerCase() === 'development';
    const isSoftFailEnv = this.isNonCriticalEnvironment();

    try {
      const result = await this.transporter.sendMail({
        to,
        from: this.config.from,
        subject,
        text,
        html,
      });

      if (isDevEnvironment) {
        this.logger.log(`Email enviado a ${to}`);
        this.logger.log(`Preview URL: ${nodemailer.getTestMessageUrl(result)}`);
      }
    } catch (error) {
      this.logger.error('Error sending password reset email', error as Error);
      if (isSoftFailEnv) {
        this.logger.warn(
          'Email no enviado en entorno de desarrollo/test, continuando...',
        );
        return;
      }
      throw error;
    }
  }

  async sendProjectInvitationEmail(params: {
    to: string;
    projectName: string;
    role: ProjectMemberRole;
    inviterName: string;
  }): Promise<void> {
    const roleLabels: Record<ProjectMemberRole, string> = {
      PRODUCT_OWNER: 'Product Owner',
      SCRUM_MASTER: 'Scrum Master',
      DEVELOPER: 'Developer',
    };

    const roleLabel = roleLabels[params.role] ?? params.role;

    const subject = `Invitacion al proyecto ${params.projectName}`;
    const text = [
      'Hola,',
      '',
      `${params.inviterName} te ha invitado a colaborar en el proyecto "${params.projectName}" como ${roleLabel}.`,
      'Puedes iniciar sesion en la plataforma para comenzar a trabajar con tu equipo.',
      '',
      'Si no esperabas esta invitacion, simplemente ignora este mensaje.',
    ].join('\n');

    const html = `
      <p>Hola,</p>
      <p><strong>${params.inviterName}</strong> te ha invitado a colaborar en el proyecto <strong>${params.projectName}</strong> como <strong>${roleLabel}</strong>.</p>
      <p>Puedes iniciar sesion en la plataforma para comenzar a trabajar con tu equipo.</p>
      <p>Si no esperabas esta invitacion, simplemente ignora este mensaje.</p>
    `;

    const isDevEnvironment =
      (process.env.NODE_ENV ?? '').toLowerCase() === 'development';
    const isSoftFailEnv = this.isNonCriticalEnvironment();

    try {
      const result = await this.transporter.sendMail({
        to: params.to,
        from: this.config.from,
        subject,
        text,
        html,
      });

      if (isDevEnvironment) {
        this.logger.log(`Invitacion enviada a ${params.to}`);
        this.logger.log(`Preview URL: ${nodemailer.getTestMessageUrl(result)}`);
      }
    } catch (error) {
      this.logger.error('Error sending project invitation email', error as Error);
      if (isSoftFailEnv) {
        this.logger.warn(
          'Error al enviar la invitacion en entorno de desarrollo/test, continuando...',
        );
        return;
      }
      throw error;
    }
  }
}
