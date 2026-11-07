import { useCallback, useEffect, useRef, useState } from "react";
import { PublicClientApplication } from "@azure/msal-browser";
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const microsoftClientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID;
let microsoftClientPromise;
let googleScriptPromise;
const getMicrosoftRedirectUri = () => new URL("/redirect.html", window.location.origin).toString();
function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!googleScriptPromise) googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-identity="true"]');
    const script = existing || document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = "true";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Google sign-in could not be loaded."));
    if (!existing) document.head.appendChild(script);
  });
  return googleScriptPromise;
}
function getMicrosoftClient() {
  if (!microsoftClientPromise) {
    microsoftClientPromise = (async () => {
      const client = new PublicClientApplication({
        auth: {
          clientId: microsoftClientId,
          authority: "https://login.microsoftonline.com/common",
          redirectUri: getMicrosoftRedirectUri(),
        },
        cache: { cacheLocation: "sessionStorage" },
      });
      await client.initialize();
      return client;
    })();
  }
  return microsoftClientPromise;
}
export default function OAuthButtons({ onCredential, disabled = false }) {
  const googleHost = useRef(null);
  const callbackRef = useRef(onCredential);
  const microsoftInteractionInProgress = useRef(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);
  useEffect(() => {
    if (!googleClientId || !googleHost.current) return undefined;
    let active = true;
    let buttonCheckTimer;
    loadGoogleScript().then(() => {
      if (!active || !googleHost.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => {
          if (response.credential) callbackRef.current("google", response.credential);
        },
      });
      googleHost.current.replaceChildren();
      window.google.accounts.id.renderButton(googleHost.current, {
        type: "standard",
        theme: "outline_dark",
        size: "large",
        text: "signin_with",
        shape: "rectangular",
        logo_alignment: "left",
        width: Math.min(360, googleHost.current.clientWidth || 360),
      });
      buttonCheckTimer = window.setTimeout(() => {
        if (!active || !googleHost.current) return;
        if (googleHost.current.querySelector("iframe")) {
          setGoogleReady(true);
        } else {
          setError(`Google sign-in is not enabled for ${window.location.origin}. Add this exact origin to the Google OAuth client's Authorized JavaScript origins.`);
        }
      }, 1000);
    }).catch((loadError) => {
      if (active) setError(loadError.message);
    });
    return () => {
      active = false;
      if (buttonCheckTimer) window.clearTimeout(buttonCheckTimer);
    };
  }, []);
  const handleMicrosoft = useCallback(async () => {
    if (!microsoftClientId || microsoftInteractionInProgress.current) return;
    microsoftInteractionInProgress.current = true;
    setError("");
    setBusy(true);
    try {
      const client = await getMicrosoftClient();
      const result = await client.loginPopup({
        scopes: ["openid", "profile", "email"],
        prompt: "select_account",
        overrideInteractionInProgress: true,
      });
      if (!result.idToken) throw new Error("Microsoft did not return an identity token.");
      await callbackRef.current("microsoft", result.idToken);
    } catch (loginError) {
      if (loginError?.errorCode !== "user_cancelled") {
        const message = `${loginError?.message || ""} ${loginError?.subError || ""}`;
        setError(loginError?.errorCode === "interaction_in_progress"
          ? "Another Microsoft sign-in is still open. Close its popup, refresh this page, then try again."
          : loginError?.errorCode === "invalid_request" && /redirect_uri/i.test(message)
            ? `Microsoft rejected this redirect address. Register ${getMicrosoftRedirectUri()} as a Single-page application redirect URI for this Microsoft client ID, then try again.`
            : loginError.message || "Microsoft sign-in failed. Please try again.");
      }
    } finally {
      microsoftInteractionInProgress.current = false;
      setBusy(false);
    }
  }, []);
  return (
    <div className="oauth-options">
      {googleClientId && (
        <div className={`oauth-google-host${disabled || !googleReady ? " oauth-disabled" : ""}`}>
          <div ref={googleHost} aria-label="Sign in with Google" />
          {!googleReady && <button type="button" className="oauth-fallback-button" disabled>Loading Google sign-in…</button>}
        </div>
      )}
      {!googleClientId && (
        <button type="button" className="oauth-google-placeholder" disabled>
          <span className="google-mark" aria-hidden="true">G</span>
          Sign in with Google
        </button>
      )}
      {microsoftClientId && (
        <button
          type="button"
          className="oauth-microsoft-button"
          onClick={handleMicrosoft}
          disabled={disabled || busy}
        >
          <span className="microsoft-mark" aria-hidden="true"><i /><i /><i /><i /></span>
          {busy ? "Connecting to Microsoft…" : "Sign in with Microsoft"}
        </button>
      )}
      {!microsoftClientId && (
        <button type="button" className="oauth-microsoft-button" disabled>
          <span className="microsoft-mark" aria-hidden="true"><i /><i /><i /><i /></span>
          Sign in with Microsoft
        </button>
      )}
      {(!googleClientId || !microsoftClientId) && (
        <p className="oauth-setup-note">Add the provider client IDs to the environment files to enable these buttons.</p>
      )}
      {error && <p className="oauth-error" role="alert">{error}</p>}
    </div>
  );
}
