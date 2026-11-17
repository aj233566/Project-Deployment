const nodemailer = require("nodemailer");

let transporter;
const hasEmailConfig = () => Boolean(
    process.env.GMAIL_OAUTH_USER
    && process.env.GMAIL_OAUTH_CLIENT_ID
    && process.env.GMAIL_OAUTH_CLIENT_SECRET
    && process.env.GMAIL_OAUTH_REFRESH_TOKEN
);

function getTransporter() {
    if (!hasEmailConfig()) {
        const error = new Error("Gmail OAuth email is not configured. Set GMAIL_OAUTH_USER, GMAIL_OAUTH_CLIENT_ID, GMAIL_OAUTH_CLIENT_SECRET and GMAIL_OAUTH_REFRESH_TOKEN on the backend.");
        error.code = "EMAIL_NOT_CONFIGURED";
        throw error;
    }
    if (!transporter) {
        transporter = nodemailer.createTransport({
            service: "gmail",
            connectionTimeout: 15000,
            greetingTimeout: 10000,
            socketTimeout: 20000,
            auth: {
                type: "OAuth2",
                user: process.env.GMAIL_OAUTH_USER,
                clientId: process.env.GMAIL_OAUTH_CLIENT_ID,
                clientSecret: process.env.GMAIL_OAUTH_CLIENT_SECRET,
                refreshToken: process.env.GMAIL_OAUTH_REFRESH_TOKEN,
                timeout: 15000
            }
        });
    }
    return transporter;
}

async function sendOtpEmail(to, code, purpose) {
    const descriptions = {
        login: "sign in to your SENETRY account",
        password_reset: "change your SENETRY password",
        unlock: "unlock your SENETRY account",
        revoke_sessions: "sign out all devices from your SENETRY account"
    };
    await getTransporter().sendMail({
        from: process.env.GMAIL_OAUTH_USER,
        to,
        subject: "Your SENETRY verification code",
        text: `Your code to ${descriptions[purpose]} is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`,
        html: `<p>Your code to ${descriptions[purpose]} is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${code}</p><p>It expires in 10 minutes. If you did not request this, ignore this email.</p>`
    });
}

module.exports = { hasEmailConfig, sendOtpEmail };
