"use client";

import dynamic from "next/dynamic";
import CollaborationVisual from "./CollaborationVisual";
import MotionControl from "./MotionControl";
import { FormEvent, useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import { DATANEST_LOGO_SRC } from "@/lib/brand";

const DataNestApp = dynamic(() => import("@/components/DataNestApp"), {
  ssr: false,
  loading: () => (
    <main className="authShell" aria-live="polite">
      <div className="bootPulse" aria-hidden="true" />
      <p>Loading Resonance DataNest workspace…</p>
    </main>
  )
});

type StartupState = "loading" | "signed-out" | "signed-in" | "set-password" | "config-error" | "connection-error";
const STARTUP_TIMEOUT_MS = 10000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error("Authentication service did not respond in time.")), timeoutMs);
    })
  ]);
}

function AuthBrand() {
  return (
    <div className="authBrand" aria-label="Resonance DataNest brand">
      <span className="authLogo" aria-hidden="true"><img src={DATANEST_LOGO_SRC} alt="" /></span>
      <span className="authBrandCopy"><small>RESONANCE</small><strong>DataNest</strong></span>
    </div>
  );
}

export default function AuthGate() {
  const [startup, setStartup] = useState<StartupState>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [startupMessage, setStartupMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPasswordValue] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const initialize = useCallback(async () => {
    const supabase = getSupabase();

    if (!supabase) {
      setStartup("config-error");
      setStartupMessage("Public Supabase runtime configuration is missing.");
      return;
    }

    setStartup("loading");
    setStartupMessage("");

    try {
      const result = await withTimeout(supabase.auth.getSession(), STARTUP_TIMEOUT_MS);
      const flowType = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("type")
        || new URLSearchParams(window.location.search).get("type");

      if (result.error) {
        throw result.error;
      }

      setSession(result.data.session);
      setStartup(result.data.session
        ? (flowType === "invite" || flowType === "recovery" ? "set-password" : "signed-in")
        : "signed-out");
    } catch (error) {
      setSession(null);
      setStartup("connection-error");
      setStartupMessage(error instanceof Error ? error.message : "Unable to initialize authentication.");
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
    void initialize();

    if (!supabase) return;

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      const flowType = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("type")
        || new URLSearchParams(window.location.search).get("type");
      setStartup(nextSession && (event === "PASSWORD_RECOVERY" || flowType === "invite" || flowType === "recovery")
        ? "set-password"
        : nextSession ? "signed-in" : "signed-out");
      setStartupMessage("");
    });

    return () => listener.subscription.unsubscribe();
  }, [initialize]);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;

    setBusy(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  async function submitNewPassword(event: FormEvent) {
    event.preventDefault();
    const supabase = getSupabase();
    if (!supabase || !session) return;
    if (newPassword.length < 8) {
      setMessage("Use a password with at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("The passwords do not match.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      window.history.replaceState({}, document.title, window.location.pathname);
      setPassword("");
      setNewPasswordValue("");
      setConfirmPassword("");
      setStartup("signed-in");
      setMessage("Password created. Your DataNest session is ready.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to set your password.");
    } finally {
      setBusy(false);
    }
  }

  async function sendMagicLink() {
    const supabase = getSupabase();

    if (!supabase || !email) {
      setMessage("Enter your authorized email first.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const redirect = window.location.href.split("#")[0].split("?")[0];
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: redirect
        }
      });

      if (error) throw error;
      setMessage("Magic sign-in link sent.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to send a magic link.");
    } finally {
      setBusy(false);
    }
  }

  if (startup === "loading") {
    return (
      <main className="authShell" role="status" aria-live="polite" aria-busy="true">
        <section className="authCard">
          <AuthBrand />
          <h1>Resonance DataNest</h1>
          <div className="bootRow">
            <div className="bootPulse" aria-hidden="true" />
            <p className="lede">Checking your secure DataNest session…</p>
          </div>
          <noscript>
            <p className="authMessage">JavaScript is required to sign in to Resonance DataNest.</p>
          </noscript>
        </section>
      </main>
    );
  }

  if (startup === "config-error") {
    return (
      <main className="authShell">
        <section className="authCard" role="alert">
          <AuthBrand />
          <h1>Resonance DataNest</h1>
          <p className="lede">{startupMessage}</p>
          <div className="setupBox">
            <b>Required public runtime values</b>
            <code>SUPABASE_URL</code>
            <code>SUPABASE_PUBLISHABLE_KEY</code>
          </div>
        </section>
      </main>
    );
  }

  if (startup === "connection-error") {
    return (
      <main className="authShell">
        <section className="authCard" role="alert">
          <AuthBrand />
          <h1>Connection problem</h1>
          <p className="lede">{startupMessage || "DataNest could not reach the authentication service."}</p>
          <button className="primaryButton" type="button" onClick={() => void initialize()}>
            Retry startup
          </button>
          <p className="securityNote">Your session was not changed. Retry when connectivity is restored.</p>
        </section>
      </main>
    );
  }

  if (startup === "set-password" && session) {
    return (
      <main className="authShell">
        <section className="authCard">
          <AuthBrand />
          <h1>Create your DataNest password</h1>
          <p className="lede">Your invitation has been accepted. Set a password to use normal email-and-password sign-in.</p>
          <form onSubmit={submitNewPassword} className="authForm" aria-busy={busy}>
            <label>
              New password
              <input type="password" required minLength={8} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPasswordValue(event.target.value)} placeholder="At least 8 characters" />
            </label>
            <label>
              Confirm password
              <input type="password" required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Re-enter your password" />
            </label>
            <button className="primaryButton" disabled={busy} type="submit">{busy ? "Saving…" : "Create password"}</button>
          </form>
          <div className="authMessageSlot" aria-live="polite" role="status">{message && <div className="authMessage">{message}</div>}</div>
        </section>
      </main>
    );
  }

  if (startup === "signed-in" && session) {
    return <DataNestApp session={session} />;
  }

  return (
    <main className="authShell authLanding">
      <a className="skipLink" href="#sign-in-email">Skip to sign in</a>
      <header className="landingHeader">
        <a className="landingBrand" href="#" aria-label="Resonance DataNest home"><span className="landingLogo" aria-hidden="true"><img src={DATANEST_LOGO_SRC} alt="" /></span><span className="landingBrandText"><small>RESONANCE</small><b>DataNest</b></span></a>
        <MotionControl/>
      </header>
      <div className="landingLayout">
      <section className="landingStory" aria-labelledby="landing-title">
        <p className="aiIEyebrow">AI &amp; I · A SHARED WORKSPACE</p>
        <h2 id="landing-title">Your intent.<br/><span>Amplified.</span></h2>
        <p className="landingLede">Bring human direction and AI intelligence together. Turn ideas into governed work, with a clear path from first spark to execution.</p>
        <CollaborationVisual/>
        <ol className="landingSteps" aria-label="The Resonance workflow">
          <li><span>01</span><b>Spark</b><small>Capture intent</small></li>
          <li><span>02</span><b>Think</b><small>Explore with AI</small></li>
          <li><span>03</span><b>Govern</b><small>Review decisions</small></li>
          <li><span>04</span><b>Execute</b><small>Track the work</small></li>
        </ol>
      </section>
      <section className="authCard landingSignIn" aria-labelledby="sign-in-title">
        <AuthBrand />
        <h1 id="sign-in-title">Resonance DataNest</h1>
        <p className="lede">Welcome to your workspace. Sign in to continue.</p>

        <form onSubmit={signIn} className="authForm" aria-busy={busy}>
          <label>
            Email
            <input
              id="sign-in-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Authorized email"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
            />
          </label>
          <button className="primaryButton" disabled={busy} type="submit">
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <button className="secondaryButton" disabled={busy} type="button" onClick={sendMagicLink}>
            Send magic link
          </button>
        </form>

        <div className="authMessageSlot" aria-live="polite" role="status">
          {message && <div className="authMessage">{message}</div>}
        </div>
        <p className="securityNote">Sign in with your authorized account. Need access? Ask your project administrator for an invitation.</p>
      </section>
      </div>
      <footer className="landingFooter"><span>Human direction. Governed intelligence.</span><span>Project access by invitation</span></footer>
    </main>
  );
}
