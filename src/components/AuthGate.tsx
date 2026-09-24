"use client";

import dynamic from "next/dynamic";
import { FormEvent, useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";

const DataNestApp = dynamic(() => import("@/components/DataNestApp"), {
  ssr: false,
  loading: () => (
    <main className="authShell" aria-live="polite">
      <div className="bootPulse" aria-hidden="true" />
      <p>Loading Resonance DataNest workspace…</p>
    </main>
  )
});

type StartupState = "loading" | "signed-out" | "signed-in" | "config-error" | "connection-error";
const STARTUP_TIMEOUT_MS = 10000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error("Authentication service did not respond in time.")), timeoutMs);
    })
  ]);
}

export default function AuthGate() {
  const [startup, setStartup] = useState<StartupState>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [startupMessage, setStartupMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

      if (result.error) {
        throw result.error;
      }

      setSession(result.data.session);
      setStartup(result.data.session ? "signed-in" : "signed-out");
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

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setStartup(nextSession ? "signed-in" : "signed-out");
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
          <div className="brandMark">RD</div>
          <p className="eyebrow">RESONANCE APPDEV</p>
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
          <div className="brandMark">RD</div>
          <p className="eyebrow">RESONANCE APPDEV</p>
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
          <div className="brandMark">RD</div>
          <p className="eyebrow">RESONANCE APPDEV</p>
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

  if (startup === "signed-in" && session) {
    return <DataNestApp session={session} />;
  }

  return (
    <main className="authShell">
      <section className="authCard">
        <div className="brandMark">RD</div>
        <p className="eyebrow">RESONANCE APPDEV</p>
        <h1>Resonance DataNest</h1>
        <p className="lede">UNIFI project orchestration and TranScheduler capability-aware execution in one control plane.</p>

        <form onSubmit={signIn} className="authForm" aria-busy={busy}>
          <label>
            Email
            <input
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
        <p className="securityNote">Access is restricted to existing Supabase Auth users. This screen does not create accounts.</p>
      </section>
    </main>
  );
}
