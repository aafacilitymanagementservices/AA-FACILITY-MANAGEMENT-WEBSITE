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

const MAX_BODY_BYTES = 24 * 1024;
const MIN_FORM_AGE_MS = 2500;
const MAX_FORM_AGE_MS = 4 * 60 * 60 * 1000;
const IP_RATE_LIMIT = {
  max: 5,
  windowSeconds: 10 * 60
};
const EMAIL_RATE_LIMIT = {
  max: 2,
  windowSeconds: 15 * 60
};
const INTERNAL_FIELDS = new Set(['subject', 'website', 'form-started-at']);
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

async function handleFormSubmission(request, env, formType) {
  try {
    const requestGuard = validateRequestEnvelope(request, env);

    if (requestGuard) {
      return requestGuard;
    }

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
    const validationGuard = validateSubmission(data, formType);

    if (validationGuard) {
      return validationGuard;
    }

    const rateLimitGuard = await enforceRateLimits(request, data, formType);

    if (rateLimitGuard) {
      return rateLimitGuard;
    }

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

function validateRequestEnvelope(request, env) {
  const contentType = request.headers.get('content-type') || '';

  if (!contentType.toLowerCase().includes('multipart/form-data')) {
    return jsonError('Unsupported submission type', 415);
  }

  const contentLength = Number(request.headers.get('content-length') || 0);

  if (contentLength > MAX_BODY_BYTES) {
    return jsonError('Submission is too large', 413);
  }

  if (!hasAllowedOrigin(request, env)) {
    return jsonError('Submission origin was not accepted', 403);
  }

  return null;
}

function validateSubmission(data, formType) {
  if (String(data.website || '').trim() !== '') {
    return acceptedWithoutSending();
  }

  if (!hasValidFormAge(data['form-started-at'])) {
    return acceptedWithoutSending();
  }

  const entries = Object.entries(data);

  if (entries.length > 25) {
    return jsonError('Submission has too many fields', 400);
  }

  for (const [key, value] of entries) {
    if (String(key).length > 80 || String(value || '').length > 3000) {
      return jsonError('Submission field is too long', 400);
    }
  }

  const email = getSubmittedEmail(data);
  const phone = getSubmittedPhone(data);

  if (email && !isValidEmail(email)) {
    return jsonError('Please enter a valid email address', 400);
  }

  if (phone && !isReasonablePhone(phone)) {
    return jsonError('Please enter a valid phone number', 400);
  }

  if (hasSuspiciousContent(data)) {
    return acceptedWithoutSending();
  }

  if (formType === 'quote') {
    if (!hasValue(data['quote-name']) || !hasValue(data['quote-email']) || !hasValue(data['quote-service'])) {
      return jsonError('Please complete the required quote fields', 400);
    }
  }

  if (formType === 'contact') {
    if (!email && !phone) {
      return jsonError('Please include an email address or phone number', 400);
    }

    if (!hasValue(data.name) && !hasValue(data.message)) {
      return jsonError('Please include your name or message', 400);
    }
  }

  return null;
}

async function enforceRateLimits(request, data, formType) {
  const clientIp = getClientIp(request);
  const email = getSubmittedEmail(data);
  const checks = [
    {
      key: `ip:${formType}:${clientIp}`,
      ...IP_RATE_LIMIT
    }
  ];

  if (email) {
    checks.push({
      key: `email:${formType}:${email.toLowerCase()}`,
      ...EMAIL_RATE_LIMIT
    });
  }

  for (const check of checks) {
    const result = await incrementRateLimit(check.key, check.windowSeconds, check.max);

    if (!result.allowed) {
      return Response.json(
        {
          success: false,
          message: 'Too many submissions. Please try again later.'
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(result.retryAfter)
          }
        }
      );
    }
  }

  return null;
}

async function incrementRateLimit(rawKey, windowSeconds, max) {
  const key = await sha256(rawKey);
  const cacheKey = new Request(`https://form-rate-limit.local/${key}`);
  const cached = await caches.default.match(cacheKey);
  const now = Date.now();
  let record = {
    count: 0,
    resetAt: now + windowSeconds * 1000
  };

  if (cached) {
    try {
      record = await cached.json();
    } catch {
      record = {
        count: 0,
        resetAt: now + windowSeconds * 1000
      };
    }
  }

  if (record.resetAt <= now) {
    record = {
      count: 0,
      resetAt: now + windowSeconds * 1000
    };
  }

  record.count += 1;

  await caches.default.put(
    cacheKey,
    new Response(JSON.stringify(record), {
      headers: {
        'Cache-Control': `max-age=${windowSeconds}`,
        'Content-Type': 'application/json'
      }
    })
  );

  return {
    allowed: record.count <= max,
    retryAfter: Math.max(1, Math.ceil((record.resetAt - now) / 1000))
  };
}

function hasAllowedOrigin(request, env) {
  const requestUrl = new URL(request.url);
  const allowedHosts = getAllowedHosts(requestUrl.hostname, env);
  const origin = request.headers.get('origin');

  if (origin) {
    return allowedHosts.has(getHostname(origin));
  }

  const referer = request.headers.get('referer');

  if (referer) {
    return allowedHosts.has(getHostname(referer));
  }

  return LOCAL_HOSTS.has(requestUrl.hostname);
}

function getAllowedHosts(requestHost, env) {
  const hosts = new Set([requestHost]);
  const configuredOrigins = String(env.ALLOWED_FORM_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  for (const origin of configuredOrigins) {
    const host = getHostname(origin);

    if (host) {
      hosts.add(host);
    }
  }

  return hosts;
}

function getHostname(value) {
  try {
    return new URL(value).hostname;
  } catch {
    return String(value || '').trim().replace(/^\/+|\/+$/g, '');
  }
}

function hasValidFormAge(value) {
  const startedAt = Number(value);
  const age = Date.now() - startedAt;

  return Number.isFinite(startedAt) && age >= MIN_FORM_AGE_MS && age <= MAX_FORM_AGE_MS;
}

function hasSuspiciousContent(data) {
  const content = Object.entries(data)
    .filter(([key]) => !INTERNAL_FIELDS.has(key))
    .map(([, value]) => String(value || ''))
    .join('\n');
  const urlCount = (content.match(/https?:\/\//gi) || []).length;

  if (urlCount > 1) {
    return true;
  }

  return [
    /\[url=/i,
    /<\/?a\s/i,
    /\b(?:casino|crypto|forex|loan|viagra)\b/i
  ].some((pattern) => pattern.test(content));
}

function getClientIp(request) {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for') ||
    'unknown'
  )
    .split(',')[0]
    .trim();
}

function getReplyToEmail(data) {
  const email = getSubmittedEmail(data);

  return email || 'info@aafacilitymanagementservices.com';
}

function getSubmittedEmail(data) {
  return String(data.email || data['quote-email'] || '').trim();
}

function getSubmittedPhone(data) {
  return String(data.phone || data['quote-phone'] || '').trim();
}

function buildEmailHtml(data, title) {
  const rows = Object.entries(data)
    .filter(([key]) => !INTERNAL_FIELDS.has(key))
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
    .filter(([key]) => !INTERNAL_FIELDS.has(key))
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

function hasValue(value) {
  return String(value || '').trim() !== '';
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function isReasonablePhone(value) {
  return /^[+\d][\d\s().-]{6,24}$/.test(String(value || '').trim());
}

function acceptedWithoutSending() {
  return Response.json(
    {
      success: true,
      message: 'Form submitted successfully'
    },
    {
      status: 202
    }
  );
}

function jsonError(message, status) {
  return Response.json(
    {
      success: false,
      message
    },
    {
      status
    }
  );
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);

  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
