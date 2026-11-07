// Who may use the "reset password" prototype. The prototype changes a password knowing only the e-mail address (nothing is sent to the
// mailbox to prove the person owns it), so on its own it is an account takeover. Until a real e-mailed link or code exists:
//   - authority and admin accounts can never be reset this way (an administrator does it);
//   - in production it is off unless ALLOW_PASSWORD_RESET_PROTOTYPE=true is set on purpose.

const PRIVILEGED_ROLES = ["authority", "admin"];

// Returns { allowed: true } or { allowed: false, status, message }.
function checkPrototypeReset({ user, env = process.env } = {}) {
    if (env.NODE_ENV === "production" && env.ALLOW_PASSWORD_RESET_PROTOTYPE !== "true") {
        return {
            allowed: false,
            status: 403,
            message: "Password reset by e-mail address alone is switched off on this server. Contact an administrator."
        };
    }
    if (user && PRIVILEGED_ROLES.includes(user.role)) {
        return {
            allowed: false,
            status: 403,
            message: "Passwords of authority and admin accounts can only be reset by an administrator."
        };
    }
    return { allowed: true };
}

module.exports = { PRIVILEGED_ROLES, checkPrototypeReset };
