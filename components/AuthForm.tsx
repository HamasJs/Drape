"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Scissors, ArrowRight, LoaderCircle, CheckCircle2 } from "lucide-react";
import { browserAuth } from "../lib/supabase/browser";
import {
  authErrorMessage,
  validEmail,
  validateAuthFields,
  type AuthMode,
  type AuthFieldErrors,
} from "../lib/auth-feedback";
import PasswordField from "./PasswordField";
export default function AuthForm({
  mode,
  configured,
}: {
  mode: AuthMode;
  configured: boolean;
}) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [pending, setPending] = useState<"submit" | "resend" | null>(null),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({}),
    [cooldown, setCooldown] = useState(0),
    [complete, setComplete] = useState(false);
  const mounted = useRef(true);
  const submitting = useRef(false),
    alertRef = useRef<HTMLDivElement>(null),
    formRef = useRef<HTMLFormElement>(null);
  const busy = pending !== null;
  const title = {
    "sign-in": "Back to your studio.",
    "sign-up": "A space for your business.",
    "forgot-password": "Let’s get you back in.",
    "reset-password": "A fresh password.",
  }[mode];
  const description = {
    "sign-in": "Sign in to securely save your work across devices.",
    "sign-up": "Create your account, verify your email, then start quoting.",
    "forgot-password":
      "Enter your account email and we’ll send a recovery link.",
    "reset-password": "Choose a new password to secure your account.",
  }[mode];
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (error) alertRef.current?.focus();
  }, [error]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(
      () => setCooldown((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [cooldown]);
  function clearField(field: keyof AuthFieldErrors) {
    setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
    setError("");
  }
  function validateEmailOnly() {
    if (!validEmail(email)) {
      setFieldErrors((previous) => ({
        ...previous,
        email: "Enter a valid email address.",
      }));
      formRef.current
        ?.querySelector<HTMLInputElement>("#account-email")
        ?.focus();
      return false;
    }
    return true;
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current || !configured || complete) return;
    const errors = validateAuthFields(mode, { email, password, confirm });
    setFieldErrors(errors);
    setError("");
    setMessage("");
    if (Object.keys(errors).length) {
      const field = errors.email
        ? "account-email"
        : errors.password
          ? "account-password"
          : "account-confirm";
      formRef.current?.querySelector<HTMLInputElement>(`#${field}`)?.focus();
      return;
    }
    submitting.current = true;
    setPending("submit");
    try {
      const auth = browserAuth();
      if (mode === "sign-in") {
        const result = await auth.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (!mounted.current) return;
        if (result.error) throw result.error;
        if (!result.data.user) {
          setError(authErrorMessage({ code: "invalid_credentials" }, mode));
          return;
        }
        if (!result.data.user.email_confirmed_at) {
          await auth.auth.signOut();
          setError(authErrorMessage({ code: "email_not_confirmed" }, mode));
          return;
        }
        window.location.assign("/studio");
        return;
      }
      if (mode === "sign-up") {
        const { error } = await auth.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/confirm`,
          },
        });
        if (error) throw error;
        setMessage(
          "Check your inbox and spam folder to verify your email. If you already registered, sign in or reset your password.",
        );
        setPassword("");
        setConfirm("");
        setComplete(true);
        setCooldown(60);
      }
      if (mode === "forgot-password") {
        const { error } = await auth.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
        });
        if (error) throw error;
        setMessage(
          "If an account exists for that email, a password-reset link will arrive shortly. Check your inbox and spam folder.",
        );
        setCooldown(60);
      }
      if (mode === "reset-password") {
        const { error } = await auth.auth.updateUser({ password });
        if (error) throw error;
        setMessage(
          "Your password has been updated. You can now return to your studio.",
        );
        setPassword("");
        setConfirm("");
        setComplete(true);
      }
    } catch (error) {
      setError(authErrorMessage(error, mode));
    } finally {
      submitting.current = false;
      setPending(null);
    }
  }
  async function resendVerification() {
    if (
      submitting.current ||
      !configured ||
      cooldown > 0 ||
      !validateEmailOnly()
    )
      return;
    submitting.current = true;
    setPending("resend");
    setError("");
    setMessage("");
    try {
      const { error } = await browserAuth().auth.resend({
        type: "signup",
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
      });
      if (error) throw error;
      setMessage(
        "If verification is pending for that email, a new link will arrive shortly. Check your spam folder too.",
      );
      setCooldown(60);
    } catch (error) {
      setError(authErrorMessage(error, "forgot-password"));
    } finally {
      submitting.current = false;
      setPending(null);
    }
  }
  return (
    <main className="auth-shell">
      <Link className="brand" href="/">
        <Scissors size={22} />
        drape<span>✳</span>
      </Link>
      <div className="auth-grid">
        <div className="auth-story">
          <span className="eyebrow">YOUR BUSINESS, BEAUTIFULLY ORGANIZED</span>
          <h1>
            More creating.
            <br />
            <em>Less chasing.</em>
          </h1>
          <p>
            Private jobs. Precise quotes. One place to pick up where you left
            off.
          </p>
          <div className="auth-art" aria-hidden="true">
            ✳
          </div>
        </div>
        <section className="card auth-card">
          <h2>
            {complete && mode === "sign-up"
              ? "Check your email."
              : complete && mode === "reset-password"
                ? "You’re all set."
                : title}
          </h2>
          <p>{description}</p>
          {!configured && (
            <div className="errors">
              Accounts need setup. Add the Supabase URL and publishable key,
              then apply the database migration. See the production setup guide.
            </div>
          )}
          {error && (
            <div
              ref={alertRef}
              className="errors auth-error"
              role="alert"
              tabIndex={-1}
            >
              {error}
            </div>
          )}
          {message && (
            <div className="notice auth-success" role="status">
              <CheckCircle2 size={18} />
              <span>{message}</span>
            </div>
          )}
          {!complete && (
            <form ref={formRef} onSubmit={submit} noValidate aria-busy={busy}>
              {mode !== "reset-password" && (
                <div>
                  <label htmlFor="account-email">Email address</label>
                  <input
                    id="account-email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    maxLength={254}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearField("email");
                    }}
                    disabled={busy}
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={
                      fieldErrors.email ? "email-error" : undefined
                    }
                  />
                  {fieldErrors.email && (
                    <span id="email-error" className="field-error">
                      {fieldErrors.email}
                    </span>
                  )}
                </div>
              )}
              {mode !== "forgot-password" && (
                <PasswordField
                  id="account-password"
                  label={
                    mode === "reset-password" ? "New password" : "Password"
                  }
                  value={password}
                  onChange={(value) => {
                    setPassword(value);
                    clearField("password");
                    if (confirm)
                      setFieldErrors((previous) => ({
                        ...previous,
                        confirm: undefined,
                      }));
                  }}
                  error={fieldErrors.password}
                  disabled={busy}
                  autoComplete={
                    mode === "sign-in" ? "current-password" : "new-password"
                  }
                />
              )}
              {(mode === "sign-up" || mode === "reset-password") && (
                <>
                  <small
                    className={
                      password.length >= 12 ? "password-length-met" : ""
                    }
                  >
                    {password.length >= 12 ? "✓ " : ""}Use at least 12
                    characters and a unique password.
                  </small>
                  <PasswordField
                    id="account-confirm"
                    label="Confirm password"
                    value={confirm}
                    onChange={(value) => {
                      setConfirm(value);
                      clearField("confirm");
                    }}
                    error={fieldErrors.confirm}
                    disabled={busy}
                    autoComplete="new-password"
                  />
                </>
              )}
              <button
                className="primary"
                disabled={
                  busy ||
                  !configured ||
                  (mode === "forgot-password" && cooldown > 0)
                }
              >
                {busy ? (
                  <>
                    <LoaderCircle className="auth-spinner" size={16} />
                    {pending === "resend"
                      ? "Sending verification…"
                      : mode === "sign-in"
                        ? "Signing in…"
                        : "Please wait…"}
                  </>
                ) : mode === "forgot-password" && cooldown > 0 ? (
                  `Resend in ${cooldown}s`
                ) : mode === "sign-in" ? (
                  "Sign in"
                ) : mode === "sign-up" ? (
                  "Create account"
                ) : mode === "forgot-password" ? (
                  "Send reset link"
                ) : (
                  "Update password"
                )}
                {!busy && <ArrowRight size={16} />}
              </button>
            </form>
          )}
          {complete && mode === "reset-password" && (
            <Link className="primary auth-return" href="/studio">
              Return to studio <ArrowRight size={16} />
            </Link>
          )}
          {(mode === "sign-in" || (complete && mode === "sign-up")) && (
            <div className="verification-action">
              <button
                type="button"
                className="text-button"
                disabled={busy || !configured || cooldown > 0}
                onClick={resendVerification}
              >
                {pending === "resend"
                  ? "Sending…"
                  : cooldown > 0
                    ? `Resend verification in ${cooldown}s`
                    : "Resend verification email"}
              </button>
              {complete && mode === "sign-up" && (
                <button
                  type="button"
                  className="text-button"
                  disabled={busy}
                  onClick={() => {
                    setComplete(false);
                    setMessage("");
                    setError("");
                  }}
                >
                  Use a different email
                </button>
              )}
            </div>
          )}
          <div className="auth-links">
            {mode === "sign-in" ? (
              <>
                <Link href="/sign-up">New here? Create account</Link>
                <Link href="/forgot-password">Forgot password?</Link>
              </>
            ) : (
              <Link href="/sign-in">Back to sign in</Link>
            )}
            {mode === "sign-up" && (
              <Link href="/forgot-password">
                Already registered? Reset password
              </Link>
            )}
          </div>
          <p className="auth-privacy">
            Your quotes belong to your account.{" "}
            <Link href="/privacy">Privacy & data</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
