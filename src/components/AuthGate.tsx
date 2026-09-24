"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import DataNestApp from "@/components/DataNestApp";

export default function AuthGate() {
  const [session, setSession] = useState<Session | null>(null);
  const [booting, setBooting] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setBooting(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setBooting(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    setBusy(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setMessage(error.message);
  }

  async function sendMagicLink() {
    const supabase = getSupabase();
    if (!supabase || !email) {
      setMessage("Enter your authorized email first.");
      return;
    }
    setBusy(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: window.location.origin
      }
    });
    setBusy(false);
    setMessage(error ? error.message : "Magic sign-in link sent.");
  }

  if (booting) {
    return <main className="authShell"><div className="bootPulse" /><p>Booting Resonance DataNest…</p></main>;
  }

  if (!getSupabase()) {
    return (
      <main className="authShell">
        <section className="authCard">
          <div className="brandMark">RD</div>
          <p className="eyebrow">RESONANCE APPDEV</p>
          <h1>Resonance DataNest</h1>
          <p className="lede">The UI is built, but this deployment is missing its public Supabase environment values.</p>
          <div className="setupBox">
            <b>Required environment variables</b>
            <code>NEXT_PUBLIC_SUPABASE_URL</code>
            <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>
          </div>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="authShell">
        <section className="authCard">
          <div className="brandMark">RD</div>
          <p className="eyebrow">RESONANCE APPDEV</p>
          <h1>Resonance DataNest</h1>
          <p className="lede">UNIFI project orchestration and TranScheduler capability-aware execution in one control plane.</p>
          <form onSubmit={signIn} className="authForm">
            <label>Email<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Authorized email" /></label>
            <label>Password<input type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" /></label>
            <button className="primaryButton" disabled={busy} type="submit">{busy ? "Signing in…" : "Sign in"}</button>
            <button className="secondaryButton" disabled={busy} type="button" onClick={sendMagicLink}>Send magic link</button>
          </form>
          {message && <div className="authMessage">{message}</div>}
          <p className="securityNote">Access is restricted to existing Supabase Auth users. This screen does not create accounts.</p>
        </section>
      </main>
    );
  }

  return <DataNestApp session={session} />;
}
