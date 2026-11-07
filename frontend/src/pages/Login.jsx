import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiBaseUrl } from "../services/api";
import { setSession } from "../context/session";
import OAuthButtons from "../components/OAuthButtons";
function Login({ expectedRole = null }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
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
      if (expectedRole && data.user?.role !== expectedRole) {
        await fetch(`${apiBaseUrl}/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${data.token}`,
          },
        }).catch(() => {});
        const roleName = expectedRole === "citizen" ? "citizen" : "authority";
        setError(`This is the ${roleName} sign-in page. Use the matching role login.`);
        return;
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
      if (expectedRole && data.user?.role !== expectedRole) {
        await fetch(`${apiBaseUrl}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${data.token}` },
        }).catch(() => {});
        const roleName = expectedRole === "citizen" ? "citizen" : "authority";
        setError(`This is the ${roleName} sign-in page. Use the matching role login.`);
        return;
      }
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
                <span className="section-label">
                  {expectedRole === "citizen"
                    ? "CITIZEN ACCESS"
                    : expectedRole === "authority"
                      ? "AUTHORITY ACCESS"
                      : "SECURE ACCESS"}
                </span>

                <h2>Welcome back</h2>

                <p>Sign in to access your disaster monitoring dashboard.</p>
              </div>

              {error && (
                <div className="auth-message auth-message-error" role="alert">
                  <span className="message-icon">!</span>

                  <span>{error}</span>
                </div>
              )}

              <div className="auth-divider auth-divider-alt">
                <span>USE YOUR EMAIL</span>
              </div>

              <form onSubmit={handleSubmit}>
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

                <div className="mb-3">
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
                </div>

                <div className="remember-row mb-4">
                  <span>You will remain signed in until you log out.</span>
                </div>

                <button
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
                </button>
              </form>

              <div className="oauth-heading">Or sign in with</div>
              <OAuthButtons onCredential={handleProviderCredential} disabled={loading} />

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
