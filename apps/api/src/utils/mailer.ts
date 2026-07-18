import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import dns, { lookup as dnsLookup } from 'node:dns';

dns.setDefaultResultOrder('ipv4first');

type MailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

type ProviderResponse = {
  messageId?: string;
  id?: string;
};

type SmtpConfig = {
  host?: string;
  port: number;
  user?: string;
  password?: string;
  from?: string;
  family?: number;
  provider: string;
  resendApiKey?: string;
  brevoApiKey?: string;
};

function envValue(...keys: string[]) {
  for (const key of keys) {
    const raw = process.env[key];
    if (raw === undefined) continue;
    const value = raw.trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
    if (value) return value;
  }
  return undefined;
}

function smtpConfig(): SmtpConfig {
  return {
    provider: envValue('EMAIL_PROVIDER', 'MAIL_PROVIDER') || 'smtp',
    host: envValue('SMTP_HOST', 'MAIL_HOST', 'EMAIL_HOST'),
    port: Number(envValue('SMTP_PORT', 'MAIL_PORT', 'EMAIL_PORT') || 587),
    user: envValue('SMTP_USER', 'SMTP_USERNAME', 'MAIL_USER', 'MAIL_USERNAME', 'EMAIL_USER', 'GMAIL_USER'),
    password: envValue('SMTP_PASSWORD', 'SMTP_PASS', 'MAIL_PASSWORD', 'MAIL_PASS', 'EMAIL_PASSWORD', 'GMAIL_APP_PASSWORD'),
    from: envValue('SMTP_FROM', 'MAIL_FROM', 'EMAIL_FROM'),
    family: Number(envValue('SMTP_IP_FAMILY') || 4),
    resendApiKey: envValue('RESEND_API_KEY'),
    brevoApiKey: envValue('BREVO_API_KEY', 'SENDINBLUE_API_KEY'),
  };
}

function smtpConfigured() {
  const config = smtpConfig();
  return Boolean(config.host && config.port && config.user && config.password);
}

export function mailerConfigStatus() {
  const config = smtpConfig();
  const providerConfigured = config.provider === 'resend'
    ? Boolean(config.resendApiKey && config.from)
    : config.provider === 'brevo'
      ? Boolean(config.brevoApiKey && config.from)
      : Boolean(config.host && config.port && config.user && config.password);

  return {
    configured: providerConfigured,
    provider: config.provider,
    missing: [
      config.provider === 'resend' && !config.resendApiKey ? 'RESEND_API_KEY' : null,
      config.provider === 'brevo' && !config.brevoApiKey ? 'BREVO_API_KEY' : null,
      config.provider !== 'smtp' && !config.from ? 'SMTP_FROM' : null,
      config.provider === 'smtp' && !config.host ? 'SMTP_HOST' : null,
      config.provider === 'smtp' && !config.port ? 'SMTP_PORT' : null,
      config.provider === 'smtp' && !config.user ? 'SMTP_USER' : null,
      config.provider === 'smtp' && !config.password ? 'SMTP_PASSWORD' : null,
    ].filter(Boolean),
    host: config.host ? 'set' : 'missing',
    port: config.port ? 'set' : 'missing',
    user: config.user ? 'set' : 'missing',
    password: config.password ? 'set' : 'missing',
    from: config.from ? 'set' : 'default',
    resendApiKey: config.resendApiKey ? 'set' : 'missing',
    brevoApiKey: config.brevoApiKey ? 'set' : 'missing',
  };
}

async function resolveSmtpHost(host: string, family: number) {
  if (family !== 4 && family !== 6) return host;
  const result = await dns.promises.lookup(host, { family });
  return result.address;
}

async function createTransport() {
  const config = smtpConfig();
  if (!smtpConfigured()) {
    throw new Error('SMTP is not configured');
  }
  const host = config.host as string;
  const family = config.family || 4;
  const resolvedHost = await resolveSmtpHost(host, family);

  return nodemailer.createTransport({
    host: resolvedHost,
    port: config.port,
    secure: config.port === 465,
    name: host,
    family,
    lookup(hostname, _options, callback) {
      dnsLookup(hostname, { family, all: false }, callback);
    },
    connectionTimeout: Number(envValue('SMTP_CONNECTION_TIMEOUT_MS') || 10000),
    greetingTimeout: Number(envValue('SMTP_GREETING_TIMEOUT_MS') || 10000),
    socketTimeout: Number(envValue('SMTP_SOCKET_TIMEOUT_MS') || 15000),
    tls: {
      servername: host,
    },
    auth: {
      user: config.user,
      pass: config.password,
    },
  } as SMTPTransport.Options);
}

function parseSender(from: string) {
  const match = from.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  if (!match) return { email: from.trim() };
  return {
    name: match[1].trim() || undefined,
    email: match[2].trim(),
  };
}

async function sendViaResend(config: SmtpConfig, payload: MailPayload) {
  if (!config.resendApiKey || !config.from) {
    throw new Error('Resend email is not configured');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.from,
      to: [payload.to],
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Resend email failed: ${message || response.statusText}`);
  }

  const result = await response.json() as ProviderResponse;
  console.info('[Mailer] Resend accepted email', {
    messageId: result.messageId || result.id,
    to: payload.to,
    subject: payload.subject,
  });
  return result;
}

async function sendViaBrevo(config: SmtpConfig, payload: MailPayload) {
  if (!config.brevoApiKey || !config.from) {
    throw new Error('Brevo email is not configured');
  }

  const sender = parseSender(config.from);
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': config.brevoApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender,
      to: [{ email: payload.to }],
      subject: payload.subject,
      textContent: payload.text,
      htmlContent: payload.html,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Brevo email failed: ${message || response.statusText}`);
  }

  const result = await response.json() as ProviderResponse;
  console.info('[Mailer] Brevo accepted email', {
    messageId: result.messageId || result.id,
    to: payload.to,
    subject: payload.subject,
    sender: sender.email,
  });
  return result;
}

export async function sendMail(payload: MailPayload) {
  const config = smtpConfig();
  if (config.provider === 'resend') {
    return sendViaResend(config, payload);
  }
  if (config.provider === 'brevo') {
    return sendViaBrevo(config, payload);
  }

  const transporter = await createTransport();
  return transporter.sendMail({
    from: config.from || `"Matrix Shop" <${config.user}>`,
    ...payload,
  });
}

export function isMailerConfigured() {
  return smtpConfigured();
}

export function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
