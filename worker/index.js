export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/quote' && request.method === 'POST') {
      return handleFormSubmission(request, env, 'quote');
    }

    if (url.pathname === '/api/contact' && request.method === 'POST') {
      return handleFormSubmission(request, env, 'contact');
    }

    return env.ASSETS.fetch(request);
  }
};

async function handleFormSubmission(request, env, formType) {
  try {
    if (!env.RESEND_API_KEY) {
      return Response.json(
        {
          success: false,
          message: 'Missing Resend API key'
        },
        {
          status: 500
        }
      );
    }

    const formData = await request.formData();
    const data = Object.fromEntries(formData.entries());

    const isQuote = formType === 'quote';

    const subject = isQuote
      ? 'New Quote Request from Website'
      : 'New Contact Message from Website';

    const emailHtml = buildEmailHtml(data, subject);
    const emailText = buildEmailText(data, subject);

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM || 'Website <noreply@aafacilitymanagementservices.com>',
        to: [env.EMAIL_TO || 'info@aafacilitymanagementservices.com'],
        reply_to: getReplyToEmail(data),
        subject,
        html: emailHtml,
        text: emailText
      })
    });

    const result = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend error:', result);

      return Response.json(
        {
          success: false,
          message: 'Email sending failed',
          details: result
        },
        {
          status: resendResponse.status
        }
      );
    }

    return Response.json({
      success: true,
      message: 'Form submitted successfully',
      id: result.id
    });
  } catch (error) {
    console.error('Worker form submission error:', error);

    return Response.json(
      {
        success: false,
        message: 'Form submission failed',
        details: error.message || String(error)
      },
      {
        status: 500
      }
    );
  }
}

function getReplyToEmail(data) {
  return (
    data.email ||
    data['quote-email'] ||
    'info@aafacilitymanagementservices.com'
  );
}

function buildEmailHtml(data, title) {
  const rows = Object.entries(data)
    .filter(([key]) => key !== 'subject')
    .map(([key, value]) => {
      return `
        <tr>
          <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 700; text-transform: capitalize;">
            ${escapeHtml(formatLabel(key))}
          </td>
          <td style="padding: 10px; border: 1px solid #e5e7eb;">
            ${escapeHtml(value)}
          </td>
        </tr>
      `;
    })
    .join('');

  return `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
      <h2 style="color: #0f766e;">${escapeHtml(title)}</h2>
      <p>A new form submission was received from the website.</p>

      <table style="border-collapse: collapse; width: 100%; max-width: 700px;">
        ${rows}
      </table>
    </div>
  `;
}

function buildEmailText(data, title) {
  const lines = Object.entries(data)
    .filter(([key]) => key !== 'subject')
    .map(([key, value]) => `${formatLabel(key)}: ${value}`)
    .join('\n');

  return `${title}\n\n${lines}`;
}

function formatLabel(key) {
  return key.replace(/-/g, ' ').replace(/_/g, ' ');
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
