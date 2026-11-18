import { useState } from "react";
import { Link } from "react-router-dom";
import { apiBaseUrl } from "../services/api";
import { fetchWithTimeout } from "../services/fetchWithTimeout";

const actions = [
  { id: "password_reset", label: "Reset or change password" },
  { id: "unlock", label: "Unlock a locked account" },
  { id: "revoke_sessions", label: "Sign out all devices" },
];

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [purpose, setPurpose] = useState("password_reset");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [requested, setRequested] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const requestCode = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      setLoading(true);
      const response = await fetchWithTimeout(`${apiBaseUrl}/auth/otp/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to send a code.");
      setRequested(true);
      setMessage("If this account is eligible, a verification code has been sent to its email address.");
    } catch (requestError) {
      setError(requestError.message || "Unable to send a code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    if (purpose === "password_reset") {
      if (password.length < 6 || password.length > 128) return setError("Password must be between 6 and 128 characters.");
      if (password !== confirmPassword) return setError("Passwords do not match.");
    }
    try {
      setLoading(true);
      const response = await fetchWithTimeout(`${apiBaseUrl}/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose, code, ...(purpose === "password_reset" ? { newPassword: password } : {}) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Code verification failed.");
      setMessage(data.message || "Verification complete.");
      setRequested(false);
      setCode("");
      setPassword("");
      setConfirmPassword("");
    } catch (verifyError) {
      setError(verifyError.message || "Unable to verify the code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const changePurpose = (event) => {
    setPurpose(event.target.value);
    setRequested(false);
    setCode("");
    setMessage("");
    setError("");
  };

  return (
    <main className="auth-page">
      <div className="container-fluid">
        <div className="row min-vh-100 align-items-center justify-content-center">
          <div className="col-12 col-sm-10 col-md-8 col-lg-5 col-xl-4">
            <div className="auth-brand text-center">
              <div className="brand-mark" aria-hidden="true"><img className="logo-light" src="/senetry-logo-transparent.svg" alt="" /><img className="logo-dark" src="/senetry-logo-dark.svg" alt="" /></div>
              <h1>SENETRY</h1>
              <p>Multi-Hazard Disaster Intelligence<br />&amp; Early Warning System</p>
            </div>
            <section className="auth-card">
              <div className="auth-card-header">
                <span className="section-label">ACCOUNT RECOVERY</span>
                <h2>Verify your email</h2>
                <p>We’ll email a one-time code to the address on your account.</p>
              </div>

              {error && <div className="auth-message auth-message-error" role="alert"><span className="message-icon">!</span><span>{error}</span></div>}
              {message && <div role="status" className="auth-message">{message}</div>}

              <form onSubmit={requested ? verifyCode : requestCode}>
                <div className="mb-3">
                  <label htmlFor="recovery-action" className="form-label">What do you need to do?</label>
                  <select id="recovery-action" className="form-control auth-input" value={purpose} onChange={changePurpose} disabled={loading}>
                    {actions.map((action) => <option key={action.id} value={action.id}>{action.label}</option>)}
                  </select>
                </div>
                <div className="mb-3">
                  <label htmlFor="reset-email" className="form-label">Email address</label>
                  <input id="reset-email" type="email" className="form-control auth-input" placeholder="name@example.com" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required disabled={requested || loading} />
                </div>

                {requested && <>
                  <div className="mb-3">
                    <label htmlFor="recovery-code" className="form-label">Six-digit email code</label>
                    <input id="recovery-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} className="form-control auth-input" placeholder="Enter the code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} autoComplete="one-time-code" required />
                  </div>
                  {purpose === "password_reset" && <>
                    <div className="mb-3">
                      <label htmlFor="new-password" className="form-label">New password</label>
                      <input id="new-password" type="password" className="form-control auth-input" placeholder="Enter new password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={6} maxLength={128} required />
                    </div>
                    <div className="mb-4">
                      <label htmlFor="confirm-password" className="form-label">Confirm new password</label>
                      <input id="confirm-password" type="password" className="form-control auth-input" placeholder="Re-enter new password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={6} maxLength={128} required />
                    </div>
                  </>}
                </>}

                {!requested ? <button type="submit" className="auth-submit" disabled={loading}>{loading ? "Sending code..." : "Email me a code"}</button> : <>
                  <button type="submit" className="auth-submit" disabled={loading || code.length !== 6}>{loading ? "Verifying..." : "Verify and continue"}</button>
                  <button type="button" className="secondary-auth-button mt-2" disabled={loading} onClick={requestCode}>{loading ? "Sending..." : "Resend code"}</button>
                </>}
              </form>
              <Link to="/login" className="secondary-auth-button mt-3">Back to sign in</Link>
            </section>
            <div className="auth-security-note"><span className="security-dot"></span><span>SENETRY</span></div>
          </div>
        </div>
      </div>
    </main>
  );
}
export default ForgotPassword;
