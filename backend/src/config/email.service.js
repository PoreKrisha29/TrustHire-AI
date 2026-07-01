/**
 * TrustHire AI — Email Service (SendGrid)
 *
 * All outbound emails go through this module.
 * If SENDGRID_API_KEY is not set, emails are logged to console (dev mode).
 *
 * Template IDs follow the pattern: th_<type>
 * Branded HTML templates are rendered inline here so no SendGrid dynamic templates
 * are required — keeping setup simple for MVP.
 */

const sgMail = require('@sendgrid/mail');
const { env } = require('../config/env');

const isConfigured = !!env.SENDGRID_API_KEY;

if (isConfigured) {
  sgMail.setApiKey(env.SENDGRID_API_KEY);
  console.log('✅ SendGrid email service configured');
} else {
  console.warn('⚠️  SENDGRID_API_KEY not set — emails will be logged to console only');
}

// ── Shared HTML wrapper ───────────────────────────────────────────

function htmlTemplate(title, bodyHtml) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background: #0f0f13; font-family: 'Inter', -apple-system, sans-serif; color: #e5e5ea; }
    .container { max-width: 580px; margin: 40px auto; background: #1a1a24; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); }
    .header { background: linear-gradient(135deg, #6c63ff 0%, #4f46e5 100%); padding: 32px 40px; text-align: center; }
    .header h1 { margin: 0; color: #fff; font-size: 22px; font-weight: 700; }
    .header p  { margin: 4px 0 0; color: rgba(255,255,255,0.75); font-size: 13px; }
    .body  { padding: 36px 40px; }
    .body p { line-height: 1.7; color: #b0b0c0; font-size: 15px; margin: 0 0 16px; }
    .cta   { display: inline-block; margin: 20px 0; padding: 14px 32px; background: linear-gradient(135deg, #6c63ff, #4f46e5); color: #fff; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px; }
    .footer { padding: 20px 40px; border-top: 1px solid rgba(255,255,255,0.06); text-align: center; font-size: 12px; color: #555568; }
    .footer a { color: #6c63ff; text-decoration: none; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; }
    .badge-green  { background: rgba(52,211,153,0.15); color: #34d399; }
    .badge-red    { background: rgba(239,68,68,0.15); color: #ef4444; }
    .badge-yellow { background: rgba(251,191,36,0.15); color: #fbbf24; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✦ TrustHire AI</h1>
      <p>Intelligent Hiring. Verified Trust.</p>
    </div>
    <div class="body">
      ${bodyHtml}
    </div>
    <div class="footer">
      <p>© 2026 TrustHire AI &nbsp;|&nbsp; <a href="${env.FRONTEND_URL}/settings/notifications">Manage notifications</a> &nbsp;|&nbsp; <a href="${env.FRONTEND_URL}">Visit platform</a></p>
      <p style="margin-top:8px; color:#3a3a4a">You're receiving this because you have an account on TrustHire AI.</p>
    </div>
  </div>
</body>
</html>`;
}

// ── Core sender ───────────────────────────────────────────────────

async function sendEmail({ to, subject, html, text }) {
  const msg = {
    to,
    from: { email: env.SENDGRID_FROM_EMAIL, name: env.SENDGRID_FROM_NAME },
    subject,
    html,
    text: text || subject,
  };

  if (!isConfigured) {
    console.log(`📧 [DEV EMAIL] To: ${to}`);
    console.log(`   Subject: ${subject}`);
    return { success: true, mode: 'dev_console' };
  }

  try {
    await sgMail.send(msg);
    return { success: true };
  } catch (err) {
    console.error('SendGrid error:', err?.response?.body || err.message);
    return { success: false, error: err.message };
  }
}

// ── Email templates ───────────────────────────────────────────────

/**
 * Send email verification link to new users.
 */
async function sendVerificationEmail({ to, fullName, verifyUrl }) {
  const html = htmlTemplate('Verify your TrustHire AI account', `
    <p>Hi ${fullName || 'there'},</p>
    <p>Welcome to <strong>TrustHire AI</strong>! Please verify your email address to activate your account and start exploring verified job listings.</p>
    <p style="text-align:center">
      <a href="${verifyUrl}" class="cta">Verify Email Address</a>
    </p>
    <p style="font-size:13px; color:#555568">This link expires in <strong>24 hours</strong>. If you didn't create an account, you can safely ignore this email.</p>
  `);
  return sendEmail({ to, subject: 'Verify your TrustHire AI account', html });
}

/**
 * Send password reset link.
 */
async function sendPasswordResetEmail({ to, fullName, resetUrl }) {
  const html = htmlTemplate('Reset your TrustHire AI password', `
    <p>Hi ${fullName || 'there'},</p>
    <p>We received a request to reset your password. Click the button below to choose a new one.</p>
    <p style="text-align:center">
      <a href="${resetUrl}" class="cta">Reset Password</a>
    </p>
    <p style="font-size:13px; color:#555568">This link expires in <strong>30 minutes</strong>. If you didn't request a reset, you can safely ignore this email — your password won't change.</p>
  `);
  return sendEmail({ to, subject: 'Reset your TrustHire AI password', html });
}

/**
 * Send company verification status update (approved or rejected).
 */
async function sendVerificationStatusEmail({ to, companyName, status, reason, nextStepsUrl }) {
  const isApproved = status === 'VERIFIED';
  const badgeClass = isApproved ? 'badge-green' : 'badge-red';
  const statusLabel = isApproved ? '✅ Approved' : '❌ Rejected';

  const html = htmlTemplate('Company Verification Update', `
    <p>Hi,</p>
    <p>Your company verification request for <strong>${companyName}</strong> has been reviewed.</p>
    <p>Status: <span class="badge ${badgeClass}">${statusLabel}</span></p>
    ${isApproved
      ? `<p>Congratulations! Your company now displays the <strong>Verified Badge ✅</strong> on all job listings. Candidates can see this badge and will trust your postings more.</p>`
      : `<p><strong>Rejection reason:</strong> ${reason || 'Please contact support for details.'}</p>
         <p>You can resubmit your verification request after addressing the issues.</p>`
    }
    <p style="text-align:center">
      <a href="${nextStepsUrl || env.FRONTEND_URL + '/employer/dashboard'}" class="cta">${isApproved ? 'View Dashboard' : 'Resubmit Verification'}</a>
    </p>
  `);

  return sendEmail({
    to,
    subject: `Company Verification ${isApproved ? 'Approved ✅' : 'Rejected ❌'} — ${companyName}`,
    html,
  });
}

/**
 * Send application status update to candidate.
 */
async function sendApplicationStatusEmail({ to, candidateName, jobTitle, companyName, status, dashboardUrl }) {
  const statusMap = {
    SHORTLISTED:         { label: '🎉 Shortlisted',          badge: 'badge-green',  message: "Great news! You've been shortlisted for the next round." },
    INTERVIEW_SCHEDULED: { label: '📅 Interview Scheduled',  badge: 'badge-yellow', message: 'An interview has been scheduled for your application.' },
    REJECTED:            { label: '❌ Not Selected',          badge: 'badge-red',    message: "We're sorry, but the employer has decided not to move forward with your application." },
    HIRED:               { label: '🏆 Offer Extended',       badge: 'badge-green',  message: "Congratulations! The employer wants to extend an offer to you." },
  };

  const info = statusMap[status] || { label: status, badge: 'badge-yellow', message: 'Your application status has been updated.' };

  const html = htmlTemplate('Application Status Update', `
    <p>Hi ${candidateName || 'there'},</p>
    <p>Your application for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been updated.</p>
    <p>Status: <span class="badge ${info.badge}">${info.label}</span></p>
    <p>${info.message}</p>
    <p style="text-align:center">
      <a href="${dashboardUrl || env.FRONTEND_URL + '/dashboard'}" class="cta">View Application</a>
    </p>
    <p style="font-size:13px; color:#555568">You can manage your notification preferences from your dashboard settings.</p>
  `);

  return sendEmail({
    to,
    subject: `Application Update: ${info.label} — ${jobTitle} at ${companyName}`,
    html,
  });
}

/**
 * Send welcome email after successful registration (no verification needed — e.g., OAuth).
 */
async function sendWelcomeEmail({ to, fullName, role }) {
  const roleLabel = role === 'EMPLOYER' ? 'employer' : 'job seeker';
  const ctaUrl    = role === 'EMPLOYER' ? `${env.FRONTEND_URL}/employer/dashboard` : `${env.FRONTEND_URL}/jobs`;
  const ctaLabel  = role === 'EMPLOYER' ? 'Post Your First Job' : 'Explore Jobs';

  const html = htmlTemplate('Welcome to TrustHire AI! 🎉', `
    <p>Hi ${fullName || 'there'},</p>
    <p>Welcome to <strong>TrustHire AI</strong> — the platform where every job listing is AI-verified for authenticity and every candidate is matched by intelligence, not just keywords.</p>
    <p>As a ${roleLabel}, here's what you can do:</p>
    ${role === 'EMPLOYER'
      ? `<ul style="color:#b0b0c0; line-height:2">
           <li>Post job listings — AI scores them for trust automatically</li>
           <li>Browse AI-matched candidates ranked by skill fit</li>
           <li>Get your company verified for the ✅ Verified Badge</li>
         </ul>`
      : `<ul style="color:#b0b0c0; line-height:2">
           <li>Browse AI-verified job listings with Trust Scores</li>
           <li>Get AI resume feedback in under 60 seconds</li>
           <li>See your Match Score for every job</li>
           <li>Chat with the AI Career Assistant anytime</li>
         </ul>`
    }
    <p style="text-align:center">
      <a href="${ctaUrl}" class="cta">${ctaLabel}</a>
    </p>
  `);

  return sendEmail({ to, subject: 'Welcome to TrustHire AI 🎉', html });
}

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendVerificationStatusEmail,
  sendApplicationStatusEmail,
  sendWelcomeEmail,
};
