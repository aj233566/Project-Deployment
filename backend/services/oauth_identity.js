const crypto = require("crypto");
const JWKS_CACHE_MS = 60 * 60 * 1000;
const jwksCache = new Map();
const PROVIDERS = {
    google: {
        clientId: () => process.env.GOOGLE_CLIENT_ID,
        jwksUrl: "https://www.googleapis.com/oauth2/v3/certs",
        issuers: ["accounts.google.com", "https://accounts.google.com"]
    },
    microsoft: {
        clientId: () => process.env.MICROSOFT_CLIENT_ID,
        jwksUrl: "https://login.microsoftonline.com/common/discovery/v2.0/keys",
        issuerFor: (claims) => typeof claims.tid === "string"
            ? `https://login.microsoftonline.com/${claims.tid}/v2.0`
            : null
    }
};
function decodePart(part) {
    return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
}
function tokenError(code) {
    const error = new Error(code);
    error.code = code;
    error.status = 401;
    return error;
}
async function getJwks(url) {
    const cached = jwksCache.get(url);
    if (cached && cached.expiresAt > Date.now()) return cached.keys;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) {
        const error = new Error("Identity provider keys are unavailable.");
        error.status = 503;
        throw error;
    }
    const body = await response.json();
    if (!Array.isArray(body.keys)) {
        const error = new Error("Identity provider keys are invalid.");
        error.status = 503;
        throw error;
    }
    jwksCache.set(url, { keys: body.keys, expiresAt: Date.now() + JWKS_CACHE_MS });
    return body.keys;
}
async function verifyIdentityToken(providerName, token) {
    const provider = PROVIDERS[providerName];
    const clientId = provider?.clientId();
    if (!provider || !clientId) {
        const error = new Error(`${providerName} sign-in is not configured on this server.`);
        error.status = 503;
        throw error;
    }
    if (typeof token !== "string" || token.length > 12000) {
        const error = new Error("A valid provider identity token is required.");
        error.status = 400;
        throw error;
    }
    const parts = token.split(".");
    if (parts.length !== 3) throw tokenError("TOKEN_FORMAT_INVALID");
    const header = decodePart(parts[0]);
    const claims = decodePart(parts[1]);
    if (header.alg !== "RS256" || typeof header.kid !== "string") {
        throw tokenError("TOKEN_HEADER_INVALID");
    }
    const keys = await getJwks(provider.jwksUrl);
    const jwk = keys.find((key) => key.kid === header.kid && key.kty === "RSA");
    if (!jwk) {
        jwksCache.delete(provider.jwksUrl);
        throw tokenError("TOKEN_SIGNING_KEY_NOT_FOUND");
    }
    const publicKey = crypto.createPublicKey({ key: jwk, format: "jwk" });
    const verified = crypto.verify(
        "RSA-SHA256",
        Buffer.from(`${parts[0]}.${parts[1]}`),
        publicKey,
        Buffer.from(parts[2], "base64url")
    );
    const now = Math.floor(Date.now() / 1000);
    const issuerValid = provider.issuers
        ? provider.issuers.includes(claims.iss)
        : claims.iss === provider.issuerFor(claims);
    const audienceValid = claims.aud === clientId
        || (Array.isArray(claims.aud) && claims.aud.includes(clientId));
    if (!verified) throw tokenError("TOKEN_SIGNATURE_INVALID");
    if (!issuerValid) throw tokenError("TOKEN_ISSUER_MISMATCH");
    if (!audienceValid) throw tokenError("TOKEN_AUDIENCE_MISMATCH");
    if (!claims.sub || !Number.isFinite(claims.exp) || claims.exp <= now
        || (claims.nbf && claims.nbf > now + 60)) throw tokenError("TOKEN_CLAIMS_INVALID");
    const email = String(claims.email || claims.preferred_username || "")
        .trim().toLowerCase();
    if (!email.includes("@") || (providerName === "google" && claims.email_verified !== true)) {
        throw tokenError("TOKEN_EMAIL_MISSING_OR_UNVERIFIED");
    }
    return {
        provider: providerName,
        subject: String(claims.sub),
        email,
        name: String(claims.name || email.split("@")[0]).trim().slice(0, 120)
    };
}
module.exports = { verifyIdentityToken };
