import { useState } from "react";
import { Link } from "react-router-dom";
import { apiBaseUrl } from "../services/api";
function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6 || password.length > 128) {
      setError("Password must be between 6 and 128 characters.");
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(
        `${apiBaseUrl}/auth/reset-password-prototype`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            newPassword: password,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Password reset failed.");
      }
      setMessage(
        "Password updated successfully. You can now sign in with your new password."
      );
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(
        err.message || "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="auth-page">
      <div className="container-fluid">
        <div className="row min-vh-100 align-items-center justify-content-center">
          <div className="col-12 col-sm-10 col-md-8 col-lg-5 col-xl-4">
            <div className="auth-brand text-center">
              <div className="brand-mark" aria-hidden="true"><img src="/senetry-logo-transparent.svg" alt="" /></div>

              <h1>SENETRY</h1>

              <p>
                Multi-Hazard Disaster Intelligence
                <br />
                &amp; Early Warning System
              </p>
            </div>

            <section className="auth-card">
              <div className="auth-card-header">
                <span className="section-label">ACCOUNT RECOVERY</span>

                <h2>Reset password</h2>

                <p>
                  Enter your registered email address and choose a new password.
                </p>
              </div>

              {error && (
                <div className="auth-message auth-message-error" role="alert">
                  <span className="message-icon">!</span>
                  <span>{error}</span>
                </div>
              )}

              {message && (
                <div
                  role="status"
                  style={{
                    padding: "12px",
                    marginBottom: "16px",
                    border: "1px solid #26976a",
                    borderRadius: "8px",
                    color: "#a7f3d0",
                  }}
                >
                  {message}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="reset-email" className="form-label">
                    Email address
                  </label>

                  <input
                    id="reset-email"
                    type="email"
                    className="form-control auth-input"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="new-password" className="form-label">
                    New password
                  </label>

                  <input
                    id="new-password"
                    type="password"
                    className="form-control auth-input"
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    maxLength={128}
                    required
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="confirm-password" className="form-label">
                    Confirm new password
                  </label>

                  <input
                    id="confirm-password"
                    type="password"
                    className="form-control auth-input"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    maxLength={128}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="auth-submit"
                  disabled={loading}
                >
                  {loading ? "Updating password..." : "Reset password"}
                </button>
              </form>

              <Link to="/login" className="secondary-auth-button">
                Back to sign in
              </Link>
            </section>

            <div className="auth-security-note">
              <span className="security-dot"></span>
              <span>SENETRY</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
export default ForgotPassword;
