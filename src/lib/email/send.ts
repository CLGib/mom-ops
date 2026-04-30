/**
 * Server-only: send a single outbound email from a queue row. Resolves to_email from payload.member_id if needed.
 * Copy follows Mom Ops brand: calm, competent, warm authority, relief-oriented. Short and skimmable.
 */
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { sanitizeMessageBody } from "@/lib/sanitize-html";
import { getMemberDisplayNameForMacro } from "@/lib/member-display-name";

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "support@themomops.com";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://themomops.com";
/** Domain for reply-by-email (e.g. inbound receiving). When set, VA-reply emails use Reply-To: reply+{ticket_id}@this domain. */
const INBOUND_REPLY_DOMAIN = process.env.INBOUND_REPLY_DOMAIN ?? "";

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase URL or service role key not set");
  return createClient(url, key);
}

export type OutboxRow = {
  id: string;
  to_email: string | null;
  template: string;
  payload: Record<string, unknown>;
  status: string;
  attempts: number;
  last_error: string | null;
};

/** Build a task identifier for emails: task name and/or ticket number so members can tell which task an email is about. */
function getTaskLabel(payload: Record<string, unknown>): {
  shortLabel: string;
  subjectSuffix: string;
} {
  const subject = typeof payload.subject === "string" ? payload.subject.trim() : "";
  const ticketNumber =
    typeof payload.ticket_number === "number" && payload.ticket_number > 0
      ? payload.ticket_number
      : null;
  const partSubject = subject ? escapeHtml(subject).slice(0, 50) : "";
  const partNumber = ticketNumber != null ? `#${ticketNumber}` : "";
  if (partSubject && partNumber) {
    return {
      shortLabel: `${partSubject} (${partNumber})`,
      subjectSuffix: `: ${partSubject} (${partNumber})`,
    };
  }
  if (partSubject) {
    return { shortLabel: partSubject, subjectSuffix: `: ${partSubject}` };
  }
  if (partNumber) {
    return {
      shortLabel: `Task ${partNumber}`,
      subjectSuffix: `: Task ${partNumber}`,
    };
  }
  return { shortLabel: "your task", subjectSuffix: "" };
}

/** Full HTML for VA onboarding welcome email. bookingUrl is used for the "Book Your Sessions" CTA. */
function getVaWelcomeHtml(bookingUrl: string): string {
  const escapedUrl = bookingUrl.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mom Ops VA Onboarding</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif; background-color: #f5f5f5; color: #5C5955; line-height: 1.6; }
    .email-container { max-width: 600px; margin: 0 auto; background: #FFFFFF; box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06); }
    .header { background: #FFFFFF; padding: 40px 40px 24px; border-bottom: 3px solid #B8860B; text-align: left; }
    .logo { font-family: Georgia, 'Times New Roman', serif; font-size: 14px; font-weight: 600; color: #B8860B; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 30px; }
    .confidential { font-size: 11px; color: #8A8681; margin-bottom: 20px; font-style: italic; }
    .content { padding: 40px; background: #FFFFFF; }
    h1 { font-family: Georgia, 'Times New Roman', serif; font-size: 32px; color: #1A1917; margin-bottom: 10px; line-height: 1.2; font-weight: normal; }
    .subtitle { font-size: 16px; color: #5C5955; margin-bottom: 30px; font-style: italic; }
    .divider { height: 2px; background: #B8860B; margin: 30px 0; }
    .step-section { margin-bottom: 35px; }
    h2 { font-family: Georgia, 'Times New Roman', serif; font-size: 20px; color: #1A1917; margin-bottom: 8px; font-weight: normal; }
    .step-number { display: inline-block; width: 28px; height: 28px; background: #B8860B; color: #FFFFFF; border-radius: 50%; text-align: center; line-height: 28px; font-size: 13px; font-weight: bold; margin-right: 10px; vertical-align: middle; }
    .step-title { margin-bottom: 15px; }
    .step-title h2 { margin: 0; display: inline; vertical-align: middle; }
    ul { list-style: none; padding-left: 0; margin-bottom: 20px; }
    li { padding: 8px 0 8px 28px; position: relative; color: #5C5955; font-size: 15px; line-height: 1.5; }
    li:before { content: "•"; position: absolute; left: 0; color: #B8860B; font-weight: bold; }
    .highlight-box { background: #F8F5ED; border-left: 4px solid #B8860B; padding: 20px; margin: 25px 0; border-radius: 2px; }
    .highlight-box h3 { color: #1A1917; font-size: 14px; font-weight: 600; margin-bottom: 8px; font-family: Georgia, serif; }
    .highlight-box p { color: #5C5955; font-size: 14px; line-height: 1.5; margin: 0; }
    .philosophy-section { background: #FAF9F7; padding: 30px; border-radius: 2px; margin: 30px 0; }
    .philosophy-section h3 { font-family: Georgia, serif; font-size: 18px; color: #1A1917; margin-bottom: 15px; font-weight: normal; }
    .philosophy-item { color: #5C5955; font-size: 15px; margin-bottom: 10px; padding-left: 25px; position: relative; }
    .philosophy-item:before { content: "◆"; position: absolute; left: 0; color: #B8860B; }
    .closing-box { background: linear-gradient(135deg, #F8F5ED 0%, #F2F0EC 100%); padding: 40px; text-align: center; margin: 40px 0 0 0; border-top: 2px solid #B8860B; }
    .closing-box h2 { font-family: Georgia, serif; font-size: 22px; color: #1A1917; margin-bottom: 15px; }
    .closing-box p { color: #5C5955; font-size: 15px; line-height: 1.6; margin-bottom: 15px; }
    .signature { font-style: italic; color: #8A8681; font-size: 14px; margin-top: 20px; }
    .cta-button { display: inline-block; background: #B8860B; color: #FFFFFF; padding: 12px 28px; text-decoration: none; border-radius: 2px; font-weight: 600; font-size: 14px; margin: 20px 0; }
    .footer { background: #FFFFFF; padding: 30px 40px; border-top: 2px solid #B8860B; text-align: center; font-size: 12px; color: #8A8681; }
    .emoji { font-size: 20px; margin: 0 5px; }
    @media (max-width: 600px) { .email-container { max-width: 100%; } .header, .content, .footer { padding: 25px; } h1 { font-size: 26px; } h2 { font-size: 18px; } }
  </style>
</head>
<body style="background-color: #f5f5f5; color: #5C5955;">
  <div class="email-container">
    <div class="header" style="background: #FFFFFF; border-bottom: 3px solid #B8860B;">
      <div class="logo" style="font-family: Georgia, serif; font-size: 14px; font-weight: 600; color: #B8860B; letter-spacing: 1px; text-transform: uppercase;">MOM OPS, LLC</div>
      <div class="confidential" style="font-size: 11px; color: #8A8681; font-style: italic;">Mom Ops, LLC Confidential</div>
    </div>
    <div class="content">
      <h1 style="font-family: Georgia, serif; font-size: 32px; color: #1A1917;">Welcome to Mom Ops! <span class="emoji">💛</span></h1>
      <p class="subtitle" style="font-size: 16px; color: #5C5955; font-style: italic;">We are so excited to have you.</p>
      <div class="divider" style="height: 2px; background: #B8860B; margin: 30px 0;"></div>
      <div class="step-section">
        <div class="step-title"><span class="step-number" style="background: #B8860B; color: #FFFFFF;">1</span><h2 style="font-family: Georgia, serif; color: #1A1917;">Account Setup</h2></div>
        <p style="color: #5C5955;">Before beginning training, please complete your <a href="https://themomops.com/va/profile" style="color: #B8860B; font-weight: 600; text-decoration: none; border-bottom: 2px solid #B8860B;"><strong style="color: #B8860B;">account setup</strong></a>.</p>
        <h3 style="color: #1A1917; font-size: 14px; font-weight: 600; margin: 15px 0 10px 0;">Tasks to Complete</h3>
        <ul>
          <li>Log in to your Mom Ops account</li>
          <li>Complete your profile (including photo, name &amp; bio)</li>
          <li>Confirm your payment method</li>
        </ul>
      </div>
      <div class="step-section">
        <div class="step-title"><span class="step-number">2</span><h2>Complete Onboarding</h2></div>
        <p style="color: #5C5955;">Next, complete <a href="https://themomops.com/va/onboarding" style="color: #B8860B; font-weight: 600; text-decoration: none; border-bottom: 2px solid #B8860B;"><strong>the Mom Ops onboarding module</strong></a>. This gives you the vision of the company.</p>
      </div>
      <div class="step-section">
        <div class="step-title"><span class="step-number">3</span><h2>Training Course</h2></div>
        <p style="color: #5C5955;">After onboarding, you will complete <a href="https://themomops.com/va/training" style="color: #B8860B; font-weight: 600; text-decoration: none; border-bottom: 2px solid #B8860B;">the Mom Ops training course</a>.</p>
        <p><strong>This course teaches:</strong></p>
        <ul>
          <li>Our quality standards</li>
          <li>How to complete common task types</li>
          <li>How to use AI tools and prompts</li>
          <li>How to use templates and research methods</li>
          <li>How to submit work correctly</li>
        </ul>
        <p><em>Once completed, you will move to live training.</em></p>
      </div>
      <div class="step-section">
        <div class="step-title"><span class="step-number">4</span><h2>Live Training with Chrissy</h2></div>
        <p>After finishing the training course, you will begin live training with Chrissy.</p>
        <p><strong>Training includes:</strong></p>
        <ul>
          <li>Real task walkthroughs</li>
          <li>Feedback on your work</li>
          <li>Quality standards coaching</li>
          <li>Best practices for efficiency</li>
        </ul>
        <div class="highlight-box">
          <h3>Before Working Independently</h3>
          <p>You must complete one of the following:</p>
          <ul style="margin-top: 10px;">
            <li>5 hours of training with Chrissy, OR</li>
            <li>Chrissy confirms that you are ready to answer tickets independently</li>
          </ul>
          <p style="margin-top: 15px;"><em>Once you are ready, you will graduate to independent task work.</em></p>
        </div>
      </div>
      <div class="step-section">
        <div class="step-title"><span class="step-number">5</span><h2>Book Your Training Sessions</h2></div>
        <p>Please schedule your training sessions with Chrissy using the link below. You may schedule multiple sessions until your required training hours are completed.</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${escapedUrl}" class="cta-button">Book Your Sessions →</a>
        </div>
      </div>
      <div class="step-section">
        <div class="step-title"><span class="step-number">6</span><h2>VA Toolbox</h2></div>
        <p>You will also have access to the <strong>Mom Ops VA Toolbox</strong>, which includes:</p>
        <ul>
          <li>AI prompts for common tasks</li>
          <li>Mock-up generator</li>
          <li>Branding assistant</li>
          <li>Pre-built templates</li>
          <li>Short how-to videos</li>
        </ul>
        <p><em>The toolbox is designed to help you complete tasks faster and maintain high quality.</em></p>
      </div>
      <div class="divider"></div>
      <div class="highlight-box" style="background: #F2F0EC; border-left: 4px solid #6B7C5E;">
        <h3 style="color: #6B7C5E;">Weekly Operations Meeting</h3>
        <p>Every week, you'll get a virtual weekly review from Chrissy -a Loom where I'll cover:</p>
        <ul style="margin-top: 12px;">
          <li>New tools</li>
          <li>Updated workflows</li>
          <li>Platform improvements</li>
          <li>Common mistakes to avoid</li>
          <li>Tips for completing tasks faster</li>
        </ul>
      </div>
      <div class="step-section">
        <h2 style="font-family: Georgia, serif;">Performance Standards</h2>
        <p>Mom Ops maintains high-quality standards for our clients. All work is rated by customers.</p>
        <div class="highlight-box">
          <h3>Rating Expectations</h3>
          <p><strong>You must maintain a rating of 4.0 or higher</strong> (after training).</p>
          <p style="margin-top: 15px;"><strong>If your rating drops below 4.0, the following will happen:</strong></p>
          <ol style="list-style: none; padding: 0; margin-top: 10px;">
            <li style="padding: 6px 0 6px 28px; position: relative;"><span style="position: absolute; left: 0; color: #B8860B; font-weight: bold;">1.</span> Your account will receive a full quality audit</li>
            <li style="padding: 6px 0 6px 28px; position: relative;"><span style="position: absolute; left: 0; color: #B8860B; font-weight: bold;">2.</span> We will review recent work and feedback</li>
            <li style="padding: 6px 0 6px 28px; position: relative;"><span style="position: absolute; left: 0; color: #B8860B; font-weight: bold;">3.</span> Additional training or coaching may be required</li>
          </ol>
        </div>
      </div>
      <div class="philosophy-section">
        <h3>You're Going to Love This <span class="emoji">💛</span></h3>
        <p style="color: #5C5955; margin-bottom: 20px;">Working with Mom Ops is different from traditional VA work.</p>
        <p style="color: #5C5955; margin-bottom: 20px;"><strong style="color: #1A1917;">You're not just completing tasks.</strong></p>
        <p style="color: #5C5955; margin-bottom: 20px;">You're <strong style="color: #1A1917;">helping moms breathe again</strong>. Every ticket you complete removes something from a mom's mental load. Something she was carrying in her head all day while juggling kids, work, schedules, and a million invisible responsibilities.</p>
        <p style="color: #5C5955; margin-bottom: 20px;">When you finish a task well, you'll often hear things like:</p>
        <div style="padding-left: 20px; border-left: 3px solid #B8860B; margin: 15px 0;">
          <p style="color: #8A8681; font-style: italic; margin: 8px 0;">"This saved me so much time."</p>
          <p style="color: #8A8681; font-style: italic; margin: 8px 0;">"I can't believe you thought of that."</p>
          <p style="color: #8A8681; font-style: italic; margin: 8px 0;">"This was exactly what I needed."</p>
        </div>
        <p style="color: #5C5955; margin-top: 20px;">And that feeling never gets old.</p>
      </div>
      <div class="step-section">
        <h2 style="font-family: Georgia, serif;">What Makes Mom Ops Special</h2>
        <p>At Mom Ops:</p>
        <ul>
          <li><strong>You get to use your brain</strong> — research, problem solve, and create solutions.</li>
          <li><strong>You get to help real people</strong> in meaningful ways.</li>
          <li><strong>You get to build real relationships</strong> with members who request you again and again.</li>
          <li><strong>And you get to grow your skills</strong> along the way.</li>
        </ul>
        <p style="margin-top: 20px;"><em>The better you get at removing mental load, the more valuable you become.</em></p>
      </div>
      <div class="step-section">
        <h2 style="font-family: Georgia, serif;">Our Philosophy</h2>
        <p style="margin-bottom: 20px;">We believe great VAs are not just assistants. They are:</p>
        <div style="background: #F8F5ED; padding: 20px; border-radius: 2px;">
          <div class="philosophy-item">Researchers</div>
          <div class="philosophy-item">Organizers</div>
          <div class="philosophy-item">Problem solvers</div>
          <div class="philosophy-item">Calm thinkers</div>
          <div class="philosophy-item">Quiet superheroes</div>
        </div>
        <p style="margin-top: 20px; text-align: center; font-style: italic; color: #8A8681;">You are the person who turns chaos into clarity.</p>
      </div>
      <div class="divider"></div>
      <div class="closing-box">
        <h2>We're Really Glad You're Here</h2>
        <p>Mom Ops is growing, and the people who join early have the opportunity to grow with us.</p>
        <p>If you care about doing thoughtful work, helping moms, and continuously getting better at your craft…</p>
        <p><strong>You're in exactly the right place.</strong></p>
        <p style="margin-top: 25px;">We're so excited to work with you. <span class="emoji">💛</span></p>
        <p style="margin-top: 30px; color: #1A1917; font-weight: 600;">Now let's get started.</p>
        <div class="signature" style="text-align: left;">Chrissy<br>Founder, Mom Ops</div>
      </div>
    </div>
    <div class="footer">
      <p>Mom Ops, LLC · Prepared for New VA</p>
      <p style="margin-top: 8px; color: #8A8681;">Chrissy@themomops.com</p>
    </div>
  </div>
</body>
</html>`;
}

function getTemplate(
  template: string,
  payload: Record<string, unknown>
): { subject: string; html: string } {
  const memberDashboard = `${SITE_URL}/member`;
  const taskLink = payload.ticket_id
    ? `${SITE_URL}/member/${payload.ticket_id}`
    : memberDashboard;
  const templates: Record<string, () => { subject: string; html: string }> = {
    welcome_v1: () => ({
      subject: "Welcome to Mom Ops",
      html: `
        <p>You're in. Complete checkout to get started.</p>
        <p><a href="${memberDashboard}">Go to your dashboard</a></p>
        <p>- Mom Ops</p>
      `.trim(),
    }),
    welcome_after_signup_v1: () => ({
      subject: "You're in. Here's how it works",
      html: `
        <p>Send us a task by email or from your dashboard. We assign the right specialist and keep you updated.</p>
        <p>When you're in a rush, you can send a voice note. We've got it.</p>
        <p><a href="${memberDashboard}">Open your dashboard</a></p>
        <p>Mom's got you.</p>
        <p>- Mom Ops</p>
      `.trim(),
    }),
    task_submitted_v1: () => {
      const { shortLabel, subjectSuffix } = getTaskLabel(payload);
      return {
        subject: `It's in motion${subjectSuffix}`,
        html: `
        <p>We received your task${shortLabel === "your task" ? "" : ` &ldquo;${shortLabel}&rdquo;`}. It's already being assigned to the right specialist.</p>
        <p>If we need clarification, we'll reach out. Otherwise, expect an update soon.</p>
        <p><a href="${taskLink}">View your task</a></p>
        <p>You don't need to think about this anymore.</p>
        <p>Mom's got you.</p>
        <p>- Mom Ops</p>
      `.trim(),
      };
    },
    va_claimed_v1: () => {
      const vaName = escapeHtml(String(payload.va_display_name ?? "Your specialist"));
      const { shortLabel, subjectSuffix } = getTaskLabel(payload);
      return {
        subject: `${vaName} has your task${subjectSuffix}`,
        html: `
          <p>${vaName} has your task${shortLabel === "your task" ? "" : ` &ldquo;${shortLabel}&rdquo;`} and is working on it.</p>
          <p>You'll get an update in the thread. No need to do anything else right now.</p>
          <p><a href="${taskLink}">View task</a></p>
          <p>We're on it.</p>
          <p>- Mom Ops</p>
        `.trim(),
      };
    },
    va_new_task_available_v1: () => {
      const { shortLabel, subjectSuffix } = getTaskLabel(payload);
      const vaTasksUrl = `${SITE_URL}/va/tasks`;
      return {
        subject: `New task available${subjectSuffix}`,
        html: `
          <p>A new task is available to claim.</p>
          <p><strong>${shortLabel === "your task" ? "New task" : escapeHtml(shortLabel)}</strong></p>
          <p><a href="${vaTasksUrl}">View tasks and claim</a></p>
          <p>- Mom Ops</p>
        `.trim(),
      };
    },
    va_member_replied_v1: () => {
      const { shortLabel, subjectSuffix } = getTaskLabel(payload);
      const vaTaskLink =
        typeof payload.ticket_id === "string"
          ? `${SITE_URL}/va/${payload.ticket_id}`
          : `${SITE_URL}/va/tasks`;
      const messageBody =
        typeof payload.message_body === "string" && payload.message_body.trim()
          ? sanitizeMessageBody(payload.message_body.trim())
          : "";
      return {
        subject: `Member replied${subjectSuffix}`,
        html: `
          <p>A member replied on a task you're assigned to.</p>
          <p><strong>${shortLabel === "your task" ? "Task" : escapeHtml(shortLabel)}</strong></p>
          ${messageBody ? `<div style="margin: 1rem 0; padding: 0.75rem; background: #f5f5f5; border-radius: 4px;">${messageBody}</div>` : ""}
          <p><a href="${vaTaskLink}">Open task</a></p>
          <p>- Mom Ops</p>
        `.trim(),
      };
    },
    new_message_v1: () => {
      const messageBody = typeof payload.message_body === "string" && payload.message_body.trim()
        ? sanitizeMessageBody(payload.message_body.trim())
        : "";
      return {
        subject: `Update on your task: ${String(payload.subject ?? "New message").slice(0, 50)}`,
        html: `
          <p>Your specialist replied on a task.</p>
          ${messageBody ? `<div style="margin: 1rem 0; padding: 0.75rem; background: #f5f5f5; border-radius: 4px;">${messageBody}</div>` : ""}
          <p><a href="${taskLink}">View task</a></p>
          <p>- Mom Ops</p>
        `.trim(),
      };
    },
    task_complete_v1: () => {
      const { shortLabel, subjectSuffix } = getTaskLabel(payload);
      const surveyLink = `${taskLink}#rate`;
      return {
        subject: `Task complete${subjectSuffix}`,
        html: `
          <p>Your task${shortLabel === "your task" ? "" : ` &ldquo;${shortLabel}&rdquo;`} is done.</p>
          <p>We'd love a quick rating so we can keep improving. It takes a few seconds.</p>
          <p><a href="${surveyLink}">Rate this task</a></p>
          <p>Consider it handled.</p>
          <p>- Mom Ops</p>
        `.trim(),
      };
    },
    survey_reminder_v1: () => {
      const { shortLabel, subjectSuffix } = getTaskLabel(payload);
      const surveyLink = `${taskLink}#rate`;
      return {
        subject: `Quick reminder: rate your task and earn 2 credits${subjectSuffix}`,
        html: `
          <p>Just a nudge: if you haven't yet, take a few seconds to rate your completed task${shortLabel === "your task" ? "" : ` &ldquo;${shortLabel}&rdquo;`}.</p>
          <p>Complete the survey and we'll add <strong>2 Task Credits</strong> to your account.</p>
          <p><a href="${surveyLink}">Rate this task</a></p>
          <p>- Mom Ops</p>
        `.trim(),
      };
    },
    payment_success_v1: () => ({
      subject: "Payment received. Mom Ops",
      html: `
        <p>We received your payment. Your Task Credits are ready to use.</p>
        <p><a href="${memberDashboard}">Go to dashboard</a></p>
        <p>- The Mom Ops Team</p>
      `.trim(),
    }),
    subscription_canceled_v1: () => ({
      subject: "Your Mom Ops subscription has been canceled",
      html: `
        <p>Your subscription has been canceled. We're sorry to see you go.</p>
        <p>- The Mom Ops Team</p>
      `.trim(),
    }),
    payment_failed_v1: () => ({
      subject: "Payment issue. Mom Ops",
      html: `
        <p>There was a problem with your payment. Please update your payment method in your account to avoid interruption.</p>
        <p><a href="${memberDashboard}">Update payment method</a></p>
        <p>- The Mom Ops Team</p>
      `.trim(),
    }),
    account_ready_magic_link_v1: () => {
      const link = typeof payload.magic_link === "string" ? payload.magic_link : memberDashboard;
      return {
        subject: "Your Mom Ops account is ready",
        html: `
          <p>Your payment was successful. Click the link below to access your dashboard and set your password.</p>
          <p><a href="${link}">Access your dashboard</a></p>
          <p>- The Mom Ops Team</p>
        `.trim(),
      };
    },
    member_invite_v1: () => {
      const link = typeof payload.magic_link === "string" ? payload.magic_link : memberDashboard;
      const credits = typeof payload.credits === "number" ? payload.credits : 35;
      return {
        subject: "Your invite to the Mom Ops + PBI partnership",
        html: `
          <p>Welcome to Mom Ops. Your Peak membership now includes ${credits} credits per month, starting today.</p>
          <p>Here is what you need to do.</p>
          <p style="margin: 16px 0;">
            <a
              href="${link}"
              style="display: inline-block; background: #111111; color: #ffffff; text-decoration: none; padding: 10px 16px; border-radius: 8px; font-weight: 600;"
            >
              Start onboarding
            </a>
          </p>
          <p>It takes about 10 minutes. We use it to learn where the mental load is heaviest right now so we can put your first credits where they create the most relief.</p>
          <p>What happens after that - you start handing things off, and you feel it within the first day.</p>
          <p>A few things to know upfront. Credits are based on complexity, not hours, so you can spend them on a deep multi-step project or a handful of smaller asks. Most members start with kids logistics, travel planning, or whatever research has been sitting half-finished for weeks. There is no wrong place to start.</p>
          <p style="margin-bottom: 8px;">What 35 credits can look like:</p>
          <ul style="margin-top: 0; padding-left: 18px; line-height: 1.6;">
            <li><strong>Meal planning (~15-30 credits/task):</strong> Weekly plans with grocery coordination.</li>
            <li><strong>Summer camp research (~12-54 credits/task):</strong> Vetted options with a clear recommendation.</li>
            <li><strong>Vacation planning (~24-30 credits/task):</strong> Itinerary support, reservations, and packing lists.</li>
          </ul>
          <p>If you want more support in a heavy month, you can buy additional credits any time.</p>
          <p>- Mom Ops</p>
        `.trim(),
      };
    },
    tip_received_v1: () => {
      const amount = escapeHtml(String(payload.amount ?? "0"));
      const taskName = escapeHtml(String(payload.task_name ?? "Your task"));
      return {
        subject: "You got a tip ☕",
        html: `
          <p>A member sent you a $${amount} tip for the task: ${taskName}.</p>
          <p>Nice work.</p>
          <p>- Mom Ops</p>
        `.trim(),
      };
    },
    feature_bug_done_v1: () => {
      const title = escapeHtml(String(payload.title ?? "Your request"));
      const typeLabel = payload.type === "bug" ? "Bug report" : "Feature request";
      return {
        subject: `Resolved: ${title}`,
        html: `
          <p>Your ${typeLabel} has been resolved.</p>
          <p><strong>${title}</strong></p>
          <p>Thanks for helping us improve Mom Ops.</p>
          <p>- Mom Ops</p>
        `.trim(),
      };
    },
    task_cancelled_v1: () => {
      const subject = escapeHtml(String(payload.subject ?? "Your task"));
      const reasonLabel = formatCancellationReason(String(payload.cancellation_reason ?? ""));
      const taskLink = typeof payload.task_link === "string" ? payload.task_link : "";
      return {
        subject: "Task canceled",
        html: `
          <p>Your task &ldquo;${subject}&rdquo; was canceled by your specialist.</p>
          <p><strong>Reason:</strong> ${reasonLabel}</p>
          ${payload.cancellation_notes ? `<p><strong>Note:</strong> ${escapeHtml(String(payload.cancellation_notes)).replace(/\n/g, "<br>")}</p>` : ""}
          <p>You may resubmit this task from your dashboard if you&apos;d like.</p>
          ${taskLink ? `<p><a href="${taskLink}">View your tasks</a></p>` : ""}
          <p>- Mom Ops</p>
        `.trim(),
      };
    },
    task_cancelled_admin_v1: () => {
      const subject = escapeHtml(String(payload.subject ?? "Task"));
      const reasonLabel = formatCancellationReason(String(payload.cancellation_reason ?? ""));
      const cancelledBy = payload.cancelled_by === "admin" ? "Admin" : "VA";
      return {
        subject: `Task canceled by ${cancelledBy}: ${subject.slice(0, 50)}`,
        html: `
          <p>A task was canceled.</p>
          <p><strong>Task:</strong> ${subject}</p>
          <p><strong>Canceled by:</strong> ${cancelledBy}</p>
          <p><strong>Reason:</strong> ${reasonLabel}</p>
          ${payload.cancellation_notes ? `<p><strong>Notes:</strong> ${escapeHtml(String(payload.cancellation_notes)).replace(/\n/g, "<br>")}</p>` : ""}
          <p>- Mom Ops</p>
        `.trim(),
      };
    },
    low_rating_alert_v1: () => {
      const rating = typeof payload.rating === "number" ? payload.rating : 0;
      const subject = escapeHtml(String(payload.subject ?? "Task"));
      const ticketId = typeof payload.ticket_id === "string" ? payload.ticket_id : "";
      const adminTaskLink = ticketId ? `${SITE_URL}/admin/${ticketId}` : "";
      const feedback = payload.feedback && String(payload.feedback).trim() ? escapeHtml(String(payload.feedback)).replace(/\n/g, "<br>") : null;
      return {
        subject: `Low task rating received – ${rating} star${rating !== 1 ? "s" : ""}`,
        html: `
          <p>A member submitted a task review with a rating below 4 stars.</p>
          <p><strong>Rating:</strong> ${rating} of 5</p>
          <p><strong>Task:</strong> ${subject}</p>
          ${feedback ? `<p><strong>Feedback:</strong> ${feedback}</p>` : ""}
          ${adminTaskLink ? `<p><a href="${adminTaskLink}">View task in admin</a></p>` : ""}
          <p>- Mom Ops</p>
        `.trim(),
      };
    },
    va_tier1_milestone_ceo_v1: () => {
      const vaName = escapeHtml(String(payload.va_display_name ?? "A VA"));
      const vaId = typeof payload.va_id === "string" ? payload.va_id : "";
      const vaProfileLink = vaId ? `${SITE_URL}/admin/va/${vaId}/profile` : `${SITE_URL}/admin`;
      return {
        subject: "VA reached 50 tickets – Tier 1 complete (please reach out)",
        html: `
          <p>${vaName} has completed 50 tickets and earned the Task Cadet (Tier 1) badge.</p>
          <p>Please reach out with next steps for Tier 2 (Ops Navigator).</p>
          ${vaProfileLink ? `<p><a href="${vaProfileLink}">View VA profile</a></p>` : ""}
          <p>- Mom Ops</p>
        `.trim(),
      };
    },
    va_welcome_v1: () => {
      const bookingUrl =
        typeof payload.booking_url === "string" && payload.booking_url
          ? payload.booking_url
          : process.env.VA_TRAINING_BOOKING_URL || "https://calendly.com/christina-cg-co/discovery-interviews";
      return {
        subject: "Welcome to Mom Ops – VA Onboarding",
        html: getVaWelcomeHtml(bookingUrl),
      };
    },
    founding_member_welcome_v1: () => {
      const name = escapeHtml(String(payload.member_name ?? "there"));
      return {
        subject: "Thank You for Being a Mom Ops Founding Member 💛 - Chrissy",
        html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mom Ops Email</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 8px;
        }
        h2 {
            color: #2c3e50;
            font-size: 18px;
            margin-top: 28px;
            margin-bottom: 12px;
        }
        p {
            margin: 12px 0;
        }
        ul {
            margin: 16px 0;
            padding-left: 24px;
        }
        li {
            margin: 8px 0;
        }
        .highlight {
            background-color: #f0f4f8;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .phone {
            font-size: 20px;
            font-weight: 600;
            margin: 16px 0;
        }
        .emoji {
            margin-right: 8px;
        }
        .signature {
            margin-top: 32px;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="container">
        <p>Hi ${name},</p>

        <p>First, I want to say thank you for being a founding member of Mom Ops. Truly. You took a chance on something brand new, and that means more than you probably realize.</p>

        <h2>Why Mom Ops Exists</h2>

        <p>I'm a working mom who wants to say yes to everything:</p>
        <ul>
            <li>Help plan the classroom party</li>
            <li>Volunteer at RMHC</li>
            <li>Help plan the piano recital</li>
        </ul>

        <p>But the reality was that I kept failing to show up for all of it.</p>

        <h2>The Turning Point</h2>

        <p>In January 2026, I hired my first VA to help with a project. I quickly realized I was giving her tasks like:</p>
        <ul>
            <li>Designing my daughter's piano recital invitations</li>
            <li>Researching classroom crafts</li>
            <li>Small things I could do myself, I just didn't have the time</li>
        </ul>

        <p>Two things happened almost immediately:</p>
        <ul>
            <li><strong>My work got better</strong> because my mind finally had space again</li>
            <li><strong>I could start saying yes</strong> to more of the things that mattered to me as a mom</li>
        </ul>

        <p>And honestly, it felt like I'd discovered something every mom deserves to know about. More moms need exactly this kind of support.</p>

        <p><strong>That's why Mom Ops exists.</strong></p>

        <h2>What to Expect Right Now</h2>

        <p>Over the next two weeks, we're actively training our VA team, so some tasks may take a little longer than our standard 1 business day turnaround. After these two weeks, that faster turnaround will be our baseline.</p>

        <p>The fun part of being a founding member is that you get behind-the-scenes insight as we build this. Your feedback and experiences help shape how Mom Ops grows, improves, and supports moms.</p>

        <h2>Your Direct Line</h2>

        <p><strong>If you ever have ideas, feedback, or concerns, please text me directly:</strong></p>
        <p class="phone"><span class="emoji">📱</span>251-605-1436</p>
        <p><em>Just promise me you won't write it on a bathroom stall somewhere.</em></p>

        <p>Full transparency: I'm heads down in first-launch mode right now. I promise I'll read every message, think about it, and act on it. It just might take me a little time to respond while we get everything running smoothly.</p>

        <h2>One Small Favor That Helps Us A Lot</h2>

        <p><strong>Please leave reviews on completed tasks.</strong> Reviews help us:</p>
        <ul>
            <li>Train our VAs</li>
            <li>Improve the service</li>
            <li>Add social proof to our homepage so more moms feel confident trying Mom Ops</li>
        </ul>

        <h2>Good Vibes Matter Too</h2>

        <p>Launching something new is a wild ride, and knowing I have an amazing group of people cheering us on means everything.</p>

        <h2>Our Promise to You</h2>

        <ul>
            <li>We will always put the member first</li>
            <li>We will build an ecosystem where moms get the extra support they deserve</li>
            <li>We will create fair, flexible work opportunities for other moms</li>
            <li>We will keep working incredibly hard to build an amazing product</li>
        </ul>

        <h2>One Last Small Ask</h2>

        <p>When you start seeing Mom Ops ads on Facebook (coming very soon), please like or comment on them if you can. It helps the algorithm more than you could imagine and helps us reach more moms who need support.</p>

        <p>Also, please take a moment to <strong><a href="https://www.facebook.com/profile.php?id=61585808027157" style="color: #0066cc; text-decoration: none;">like our Facebook page</a></strong>. It means the world and helps us build momentum as we launch!</p>

        <p><strong>Share the Love</strong></p>
        <p>If you know someone who would love their own Mom VA, we have 32 remaining Founding Member spots left. Send them here: <a href="https://themomops.com/founders" style="color: #0066cc; text-decoration: none;">themomops.com/founders</a></p>
        <p>Then let me know and I'll add an extra special thank you to your account!</p>

        <p>Thank you again for being here at the very beginning. You are an important part of building Mom Ops, and I'm so grateful you're here.</p>

        <div class="signature">
            <p>Warmly,</p>
            <p>Chrissy<br>Founder, Mom Ops</p>
        </div>
    </div>
</body>
</html>`,
      };
    },
  };
  const fn = templates[template];
  if (!fn) throw new Error(`Unknown template: ${template}`);
  return fn();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const CANCELLATION_REASON_LABELS: Record<string, string> = {
  customer_request: "Customer request",
  medical_emergency: "Medical / emergency",
  personal_emergency: "Personal emergency",
  scope_outside_skillset: "Scope outside skillset",
  duplicate_task: "Duplicate task",
  incomplete_details: "Incomplete task details",
  system_technical: "System / technical issue",
  other: "Other",
};

function formatCancellationReason(code: string): string {
  return (CANCELLATION_REASON_LABELS[code] ?? code) || "Not specified";
}

/** Resolve recipient email: use row.to_email or look up by payload.member_id via Auth Admin. */
async function resolveToEmail(
  supabase: ReturnType<typeof getServiceSupabase>,
  row: OutboxRow
): Promise<string | null> {
  if (row.to_email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.to_email))
    return row.to_email;
  const memberId = row.payload?.member_id;
  if (typeof memberId !== "string") return null;
  const { data } = await supabase.auth.admin.getUserById(memberId);
  const email = data?.user?.email;
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

const MAX_ATTEMPTS = 3;

/** Process one queue row: resolve to_email, render template, send via Resend, update row. */
export async function sendOne(row: OutboxRow): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY not set" };

  const supabase = getServiceSupabase();

  if (row.template === "survey_reminder_v1") {
    const ticketId = row.payload?.ticket_id;
    if (typeof ticketId === "string") {
      const { data: ticket } = await supabase
        .from("tickets")
        .select("rating")
        .eq("id", ticketId)
        .single();
      if (ticket?.rating != null) {
        await supabase.from("email_outbox").update({ status: "sent" }).eq("id", row.id);
        return { ok: true };
      }
    }
  }

  const toEmail = await resolveToEmail(supabase, row);
  if (!toEmail) {
    await supabase
      .from("email_outbox")
      .update({
        status: "failed",
        last_error: "Could not resolve to_email",
        attempts: row.attempts + 1,
      })
      .eq("id", row.id);
    return { ok: false, error: "Could not resolve to_email" };
  }

  // Enrich payload with ticket subject/number for task_complete and survey_reminder (trigger-queued emails don't include them)
  let payload = { ...row.payload };
  if (
    (row.template === "task_complete_v1" || row.template === "survey_reminder_v1") &&
    typeof row.payload?.ticket_id === "string"
  ) {
    const { data: ticket } = await supabase
      .from("tickets")
      .select("subject, ticket_number")
      .eq("id", row.payload.ticket_id)
      .single();
    if (ticket) {
      payload = {
        ...payload,
        subject: (ticket.subject && String(ticket.subject).trim()) || "",
        ticket_number: ticket.ticket_number ?? null,
      };
    }
  }
  if (
    row.template === "founding_member_welcome_v1" &&
    typeof row.payload?.member_id === "string"
  ) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("preferred_name, full_name")
      .eq("id", row.payload.member_id)
      .single();
    let memberName = profile
      ? getMemberDisplayNameForMacro(profile.preferred_name, profile.full_name)
      : "there";
    // Fallback: profile often empty at first purchase; use auth user_metadata or email
    if (!memberName || memberName === "Member" || memberName === "there") {
      const { data: authData } = await supabase.auth.admin.getUserById(row.payload.member_id as string);
      const meta = authData?.user?.user_metadata as Record<string, unknown> | undefined;
      const fromMeta = typeof meta?.full_name === "string"
        ? meta.full_name.trim()
        : typeof meta?.name === "string"
          ? meta.name.trim()
          : "";
      if (fromMeta) {
        const first = fromMeta.split(/\s+/)[0];
        memberName = first || memberName;
      } else if (authData?.user?.email) {
        const local = authData.user.email.split("@")[0];
        if (local && /^[a-zA-Z]/.test(local)) {
          memberName = local.replace(/[._0-9]+$/, "").slice(0, 30) || memberName;
        }
      }
    }
    payload = { ...payload, member_name: memberName };
  }

  let subject: string;
  let html: string;
  try {
    const t = getTemplate(row.template, payload);
    subject = t.subject;
    html = t.html;
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    await supabase
      .from("email_outbox")
      .update({
        status: "failed",
        last_error: err,
        attempts: row.attempts + 1,
      })
      .eq("id", row.id);
    return { ok: false, error: err };
  }

  let replyTo = FROM_EMAIL;
  if (row.template === "new_message_v1" && INBOUND_REPLY_DOMAIN && typeof row.payload?.ticket_id === "string") {
    replyTo = `reply+${row.payload.ticket_id}@${INBOUND_REPLY_DOMAIN}`;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: toEmail,
    replyTo,
    subject,
    html,
  });

  if (error) {
    const attempts = row.attempts + 1;
    const status = attempts >= MAX_ATTEMPTS ? "failed" : "queued";
    await supabase
      .from("email_outbox")
      .update({
        status,
        attempts,
        last_error: error.message,
      })
      .eq("id", row.id);
    return { ok: false, error: error.message };
  }

  await supabase
    .from("email_outbox")
    .update({ status: "sent" })
    .eq("id", row.id);
  return { ok: true };
}
