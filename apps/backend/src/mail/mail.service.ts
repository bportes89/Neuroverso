import { Inject, Injectable } from "@nestjs/common";
import nodemailer, { type Transporter } from "nodemailer";
import { ENV } from "../config/env.token";
import { type Env } from "../config/env";

@Injectable()
export class MailService {
  private transporter: Transporter | null = null;

  constructor(@Inject(ENV) private env: Env) {
    if (this.env.SMTP_HOST && this.env.SMTP_PORT && this.env.SMTP_USER && this.env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: this.env.SMTP_HOST,
        port: this.env.SMTP_PORT,
        secure: this.env.SMTP_PORT === 465,
        auth: { user: this.env.SMTP_USER, pass: this.env.SMTP_PASS }
      });
    }
  }

  async send(input: { to: string; subject: string; text: string }): Promise<void> {
    if (!this.transporter) return;
    await this.transporter.sendMail({
      from: this.env.SMTP_FROM ?? this.env.SMTP_USER!,
      to: input.to,
      subject: input.subject,
      text: input.text
    });
  }
}

