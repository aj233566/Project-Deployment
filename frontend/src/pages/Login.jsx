import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { apiBaseUrl } from "../services/api";
import { fetchWithTimeout } from "../services/fetchWithTimeout";
import { setSession } from "../context/session";
import { applyTheme, getSavedTheme } from "../utils/theme.js";
import OAuthButtons from "../components/OAuthButtons";
function Login() {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(() => getSavedTheme() === "dark");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState("password");
  const [otpRequested, setOtpRequested] = useState(false);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const toggleTheme = () => {
    const nextTheme = isDark ? "light" : "dark";
    applyTheme(nextTheme);
    setIsDark(nextTheme === "dark");
  };
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
    setError("");
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!formData.email || !formData.password) {
      setError("Please enter your email and password.");
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Invalid email or password.");
      }
      setSession(data.token, data.user);
      if (data.user.role === "admin") {
        navigate("/admin", { replace: true });
      } else if (
        data.user.role === "authority" &&
        data.user.authorityStatus === "verified"
      ) {
        navigate("/dashboard/authority", { replace: true });
      } else {
        navigate("/dashboard/citizen", { replace: true });
      }
    } catch (error) {
      setError(error.message || "Unable to login. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  const handleOtpRequest = async () => {
    setError("");
    if (!formData.email) return setError("Enter your email address first.");
    try {
      setLoading(true);
      const response = await fetchWithTimeout(`${apiBaseUrl}/auth/otp/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, purpose: "login" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to send a code.");
      setOtpRequested(true);
      setNotice(data.message || "If the account is eligible, a code will be sent shortly.");
    } catch (requestError) {
      setError(requestError.message || "Unable to send a code. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  const handleOtpLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      setLoading(true);
      const response = await fetchWithTimeout(`${apiBaseUrl}/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, purpose: "login", code: otp }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to sign in with this code.");
      setSession(data.token, data.user);
      if (data.user.role === "admin") navigate("/admin", { replace: true });
      else if (data.user.role === "authority" && data.user.authorityStatus === "verified") navigate("/dashboard/authority", { replace: true });
      else navigate("/dashboard/citizen", { replace: true });
    } catch (requestError) {
      setError(requestError.message || "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  const handleProviderCredential = async (provider, credential) => {
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/auth/oauth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, credential }),
      });
      const data = await response.json();
      if (data.profileRequired) {
        navigate("/signup", {
          state: { oauthSignup: { provider, credential, profile: data.profile } },
        });
        return;
      }
      if (!response.ok) throw new Error(data.message || "Provider sign-in failed.");
      setSession(data.token, data.user);
      if (data.user.role === "admin") navigate("/admin", { replace: true });
      else if (data.user.role === "authority" && data.user.authorityStatus === "verified") {
        navigate("/dashboard/authority", { replace: true });
      } else navigate("/dashboard/citizen", { replace: true });
    } catch (providerError) {
      setError(providerError.message || "Provider sign-in failed. Please try again.");
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
                <div className="auth-card-toolbar">
                  <span className="section-label">SECURE ACCESS</span>
                  <button
                    type="button"
                    className="auth-theme-toggle"
                    onClick={toggleTheme}
                    aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
                    aria-pressed={isDark}
                    title={`Switch to ${isDark ? "light" : "dark"} mode`}
                  >
                    {isDark ? <Sun aria-hidden="true" size={19} /> : <Moon aria-hidden="true" size={19} />}
                  </button>
                </div>

                <h2>Welcome back</h2>

                <p>Sign in to access your disaster monitoring dashboard.</p>
              </div>

              {error && (
                <div className="auth-message auth-message-error" role="alert">
                  <span className="message-icon">!</span>

                  <span>{error}</span>
                </div>
              )}
              {notice && <div className="auth-message" role="status">{notice}</div>}

              <div className="auth-divider auth-divider-alt">
                <span>USE YOUR EMAIL</span>
              </div>

              <div className="d-flex gap-2 mb-3" role="group" aria-label="Sign-in method">
                <button type="button" className="secondary-auth-button" aria-pressed={loginMethod === "password"} onClick={() => { setLoginMethod("password"); setOtpRequested(false); setError(""); setNotice(""); }}>Password</button>
                <button type="button" className="secondary-auth-button" aria-pressed={loginMethod === "otp"} onClick={() => { setLoginMethod("otp"); setError(""); setNotice(""); }}>Email code</button>
              </div>
              <form onSubmit={loginMethod === "password" ? handleSubmit : handleOtpLogin}>
                <div className="mb-3">
                  <label htmlFor="login-email" className="form-label">
                    Email address
                  </label>

                  <input
                    id="login-email"
                    type="email"
                    name="email"
                    className="form-control auth-input"
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    autoComplete="email"
                    required
                  />
                </div>

                {loginMethod === "otp" && <div className="mb-3">
                  <label htmlFor="login-otp" className="form-label">Email verification code</label>
                  <div className="d-flex gap-2">
                    <input id="login-otp" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} className="form-control auth-input" placeholder="6-digit code" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} autoComplete="one-time-code" required={otpRequested} disabled={!otpRequested} />
                    <button type="button" className="secondary-auth-button" onClick={handleOtpRequest} disabled={loading}>{otpRequested ? "Resend" : "Send code"}</button>
                  </div>
                  <small className="d-block mt-2">The code expires after 10 minutes.</small>
                </div>}

                {loginMethod === "password" && <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <label htmlFor="login-password" className="form-label">
                      Password
                    </label>

                    <Link to="/forgot-password" className="text-button">
                      Forgot password?
                    </Link>
                  </div>

                  <div className="password-wrapper">
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      className="form-control auth-input"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleChange}
                      autoComplete="current-password"
                      required
                    />

                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? "HIDE" : "SHOW"}
                    </button>
                  </div>
                </div>}

                <div className="remember-row mb-4">
                  <span>You will remain signed in until you log out.</span>
                </div>

                {loginMethod === "password" && <button
                  type="submit"
                  className="auth-submit"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        aria-hidden="true"
                      />
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </button>}
                {loginMethod === "otp" && <button type="submit" className="auth-submit" disabled={loading || !otpRequested || otp.length !== 6}>
                  {loading ? "Verifying..." : "Sign in with email code"}
                </button>}
              </form>

              <div className="oauth-heading">Or sign in with</div>
              <OAuthButtons onCredential={handleProviderCredential} disabled={loading} googleTheme={isDark ? "filled_black" : "outline"} />

              <div className="auth-divider">
                <span>NEW TO SENETRY?</span>
              </div>

              <Link to="/signup" className="secondary-auth-button">
                Create an account
              </Link>

            </section>

            <div className="auth-security-note">
              <span className="security-dot"></span>

              <span>Protected operational access</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
export default Login;
