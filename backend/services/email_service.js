const crypto = require("node:crypto");

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
const REQUEST_TIMEOUT_MS = 15000;

const hasEmailConfig = () => Boolean(
    process.env.GMAIL_OAUTH_USER
    && process.env.GMAIL_OAUTH_CLIENT_ID
    && process.env.GMAIL_OAUTH_CLIENT_SECRET
    && process.env.GMAIL_OAUTH_REFRESH_TOKEN
);

function createTimeoutSignal() {
    return AbortSignal.timeout(REQUEST_TIMEOUT_MS);
}

async function getAccessToken() {
    const response = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: process.env.GMAIL_OAUTH_CLIENT_ID,
            client_secret: process.env.GMAIL_OAUTH_CLIENT_SECRET,
            refresh_token: process.env.GMAIL_OAUTH_REFRESH_TOKEN,
            grant_type: "refresh_token"
        }),
        signal: createTimeoutSignal()
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.access_token) {
        const error = new Error(`Google OAuth token request failed (${response.status}): ${payload.error || "no access token returned"}`);
        error.code = "GMAIL_OAUTH_FAILED";
        throw error;
    }
    return payload.access_token;
}

function encodeMimeMessage({ from, to, subject, text, html }) {
    const boundary = `senetry_${crypto.randomUUID().replace(/-/g, "")}`;
    const plainText = Buffer.from(text, "utf8").toString("base64");
    const htmlText = Buffer.from(html, "utf8").toString("base64");
    const mimeMessage = [
        `From: ${from}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        "MIME-Version: 1.0",
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        "",
        `--${boundary}`,
        "Content-Type: text/plain; charset=UTF-8",
        "Content-Transfer-Encoding: base64",
        "",
        plainText,
        `--${boundary}`,
        "Content-Type: text/html; charset=UTF-8",
        "Content-Transfer-Encoding: base64",
        "",
        htmlText,
        `--${boundary}--`,
        ""
    ].join("\r\n");

    return Buffer.from(mimeMessage, "utf8").toString("base64url");
}

async function sendOtpEmail(to, code, purpose) {
    if (!hasEmailConfig()) {
        const error = new Error("Gmail OAuth email is not configured. Set GMAIL_OAUTH_USER, GMAIL_OAUTH_CLIENT_ID, GMAIL_OAUTH_CLIENT_SECRET and GMAIL_OAUTH_REFRESH_TOKEN on the backend.");
        error.code = "EMAIL_NOT_CONFIGURED";
        throw error;
    }

    const descriptions = {
        login: "sign in to your SENETRY account",
        password_reset: "change your SENETRY password",
        unlock: "unlock your SENETRY account",
        revoke_sessions: "sign out all devices from your SENETRY account"
    };
    const description = descriptions[purpose];
    if (!description) {
        throw new Error("Unsupported verification email purpose.");
    }

    const text = `Your code to ${description} is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`;
    const html = `<p>Your code to ${description} is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${code}</p><p>It expires in 10 minutes. If you did not request this, ignore this email.</p>`;
    const accessToken = await getAccessToken();
    const response = await fetch(GMAIL_SEND_URL, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            raw: encodeMimeMessage({
                from: process.env.GMAIL_OAUTH_USER,
                to,
                subject: "Your SENETRY verification code",
                text,
                html
            })
        }),
        signal: createTimeoutSignal()
    });

    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const error = new Error(`Gmail API send failed (${response.status}): ${payload.error?.message || "request rejected"}`);
        error.code = "GMAIL_SEND_FAILED";
        throw error;
    }
}

module.exports = { hasEmailConfig, sendOtpEmail };
