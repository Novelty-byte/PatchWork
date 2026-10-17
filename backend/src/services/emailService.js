const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (!transporter) {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
      console.warn('⚠️ GMAIL_USER or GMAIL_APP_PASSWORD not set in .env. Emails will be logged to console.');
      return null;
    }

    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    });
  }
  return transporter;
}

/**
 * Sends an email with automatic retries and exponential backoff
 */
async function sendWithRetry(mailOptions, retries = 3, delayMs = 1500) {
  const mailer = getTransporter();

  // If no email configured, simulate sending for demo/development
  if (!mailer) {
    console.log(`\n📧 [SIMULATED EMAIL DISPATCH] To: ${mailOptions.to} | Subject: "${mailOptions.subject}"`);
    console.log(`Content Preview: ${mailOptions.text || '(HTML message)'}\n`);
    return { success: true, simulated: true };
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const info = await mailer.sendMail(mailOptions);
      console.log(`✅ Email sent successfully to ${mailOptions.to} (MessageID: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error(`❌ Email send attempt ${attempt}/${retries} failed:`, err.message);
      if (attempt === retries) {
        throw new Error(`Failed to send email to ${mailOptions.to} after ${retries} attempts: ${err.message}`);
      }
      await new Promise(res => setTimeout(res, delayMs * attempt));
    }
  }
}

/**
 * Sends confirmation email to the resident reporter
 */
async function sendReporterConfirmation(report) {
  if (!report.email) {
    console.log(`ℹ️ No email provided by reporter for ticket ${report.id}. Skipping confirmation email.`);
    return;
  }

  const statusUrl = `${process.env.FRONTEND_URL || 'https://patch-work-rho.vercel.app'}/status/${report.id}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #2b6cb0;">PatchWork Community Issue Reported</h2>
      <p>Hello <strong>${report.reporter_name}</strong>,</p>
      <p>Thank you for helping keep our community safe and well-maintained. Your report has been officially logged.</p>
      
      <div style="background-color: #f7fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p><strong>Ticket ID:</strong> <span style="color: #2b6cb0; font-weight: bold;">${report.id}</span></p>
        <p><strong>Category:</strong> ${report.category}</p>
        <p><strong>Location:</strong> ${report.location}</p>
        <p><strong>Description:</strong> ${report.description || 'N/A'}</p>
        <p><strong>Current Status:</strong> <span style="color: #d69e2e; font-weight: bold;">Recorded / In Review</span></p>
      </div>

      <p>You can track the progress of this ticket anytime using the link below:</p>
      <p><a href="${statusUrl}" style="background-color: #3182ce; color: white; padding: 10px 18px; text-decoration: none; border-radius: 5px; display: inline-block;">View Ticket Status</a></p>

      <p style="font-size: 12px; color: #718096; margin-top: 30px;">PatchWork Automated Community Notification System</p>
    </div>
  `;

  return sendWithRetry({
    from: `"PatchWork Alert" <${process.env.GMAIL_USER || 'no-reply@patchwork.local'}>`,
    to: report.email,
    subject: `[PatchWork] Report Received - Ticket #${report.id}`,
    text: `Your report #${report.id} for "${report.category}" at "${report.location}" has been recorded.`,
    html
  });
}

/**
 * Sends priority alert email to the Society Manager
 */
async function sendManagerAlert(report) {
  const managerEmail = process.env.SOCIETY_MANAGER_EMAIL || process.env.GMAIL_USER;
  if (!managerEmail) {
    console.warn('⚠️ SOCIETY_MANAGER_EMAIL not configured. Skipping manager alert.');
    return;
  }

  const dashboardUrl = `${process.env.FRONTEND_URL || 'https://patch-work-rho.vercel.app'}/dashboard`;

  const mediaListHtml = (report.media_urls && report.media_urls.length > 0)
    ? report.media_urls.map((url, i) => `<li><a href="${url}" target="_blank">Attachment ${i + 1}</a></li>`).join('')
    : '<li>None attached</li>';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #fed7d7; border-radius: 8px;">
      <div style="background-color: #e53e3e; color: white; padding: 10px 15px; border-radius: 6px;">
        <h3 style="margin: 0;">🚨 New Community Problem Reported</h3>
      </div>
      
      <p style="margin-top: 15px;">A new resident issue requires attention:</p>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr><td style="padding: 6px; font-weight: bold; width: 30%;">Ticket ID:</td><td style="padding: 6px;">${report.id}</td></tr>
        <tr><td style="padding: 6px; font-weight: bold;">Category:</td><td style="padding: 6px; color: #c53030;"><strong>${report.category}</strong></td></tr>
        <tr><td style="padding: 6px; font-weight: bold;">Location:</td><td style="padding: 6px;">${report.location}</td></tr>
        <tr><td style="padding: 6px; font-weight: bold;">Reporter:</td><td style="padding: 6px;">${report.reporter_name}</td></tr>
        <tr><td style="padding: 6px; font-weight: bold;">Contact Phone:</td><td style="padding: 6px;">${report.contact}</td></tr>
        <tr><td style="padding: 6px; font-weight: bold;">Reporter Email:</td><td style="padding: 6px;">${report.email || 'N/A'}</td></tr>
        <tr><td style="padding: 6px; font-weight: bold;">Description:</td><td style="padding: 6px;">${report.description || 'N/A'}</td></tr>
        <tr><td style="padding: 6px; font-weight: bold;">AI Verification:</td><td style="padding: 6px;">${report.verification?.status || 'Pending'}</td></tr>
      </table>

      <p><strong>Media Attachments:</strong></p>
      <ul>${mediaListHtml}</ul>

      <p style="margin-top: 20px;">
        <a href="${dashboardUrl}" style="background-color: #2b6cb0; color: white; padding: 10px 18px; text-decoration: none; border-radius: 5px; display: inline-block;">Open Manager Dashboard</a>
      </p>

      <p style="font-size: 11px; color: #a0aec0; margin-top: 30px;">
        * Note: This open report will automatically expire in 24 hours.
      </p>
    </div>
  `;

  return sendWithRetry({
    from: `"PatchWork Urgent Alerts" <${process.env.GMAIL_USER || 'no-reply@patchwork.local'}>`,
    to: managerEmail,
    subject: `🚨 [Action Required] New Report: ${report.category} at ${report.location} (#${report.id})`,
    text: `New Report #${report.id}: ${report.category} at ${report.location} by ${report.reporter_name} (${report.contact}).`,
    html
  });
}


/**
 * Sends report data to Make.com webhook for automated Gmail/email workflows
 */
async function sendToMakeWebhook(report) {
  const makeUrl = process.env.MAKE_WEBHOOK_URL;
  if (!makeUrl) return false;

  try {
    const payload = {
      ticket_id: report.id,
      reporter_name: report.reporter_name,
      reporter_email: report.email,
      reporter_contact: report.contact,
      location: report.location,
      category: report.category,
      description: report.description,
      severity: report.severity,
      status: report.status,
      media_urls: report.media_urls || [],
      verification_status: report.verification?.status || 'unverified',
      manager_email: process.env.SOCIETY_MANAGER_EMAIL || 'manager@patchwork.local',
      created_at: report.created_at,
      status_url: `${process.env.FRONTEND_URL || 'https://patch-work-rho.vercel.app'}/status/${report.id}`
    };


    const response = await fetch(makeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log(`✅ Report #${report.id} sent to Make.com automation webhook successfully!`);
      return true;
    } else {
      console.error(`⚠️ Make.com webhook responded with status: ${response.status}`);
      return false;
    }
  } catch (err) {
    console.error(`❌ Failed to send to Make.com webhook:`, err.message);
    return false;
  }
}

/**
 * Triggers asynchronous dual-email notification pipeline
 */
function dispatchReportNotifications(report) {
  // Run asynchronously in the background so API returns immediately to the user/bot
  setImmediate(async () => {
    try {
      if (process.env.MAKE_WEBHOOK_URL) {
        await sendToMakeWebhook(report);
      } else {
        await Promise.allSettled([
          sendReporterConfirmation(report),
          sendManagerAlert(report)
        ]);
      }
    } catch (err) {
      console.error('Background email dispatch error:', err);
    }
  });
}

module.exports = {
  dispatchReportNotifications,
  sendReporterConfirmation,
  sendManagerAlert,
  sendToMakeWebhook
};

