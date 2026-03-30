"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface FieldErrors {
  email?: string;
  password?: string;
  name?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState("");
  const [loading, setLoading] = useState(false);

  function validateLocal(): FieldErrors {
    const errors: FieldErrors = {};
    if (!email.includes("@") || !email.includes(".")) {
      errors.email = "Enter a valid email address";
    }
    if (password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }
    if (password.length > 72) {
      errors.password = "Password must be at most 72 characters";
    }
    if (!name.trim()) {
      errors.name = "Name is required";
    }
    if (name.trim().length > 100) {
      errors.name = "Name must be at most 100 characters";
    }
    return errors;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setGeneralError("");

    const errors = validateLocal();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      if (!res.ok) {
        const body = await res.json();
        if (res.status === 409) {
          setFieldErrors({ email: "This email is already registered" });
        } else if (res.status === 400) {
          setGeneralError(body.error || "Invalid input");
        } else {
          setGeneralError(body.error || "Registration failed");
        }
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setGeneralError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-[var(--container-padding)]">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Create Account</h1>
          <p className="text-sm opacity-50">
            Sign up to get full access
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div role="alert" aria-live="assertive" className="alert-error" style={generalError ? undefined : { display: "none" }}>
            {generalError}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="name" className="form-label">
              Name
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => { setName(e.target.value); setFieldErrors((p) => ({ ...p, name: undefined })); }}
              className={`input-field ${fieldErrors.name ? "ring-2 ring-red-500/50" : ""}`}
              placeholder="Your name"
              autoComplete="name"
              aria-describedby="name-error"
              aria-invalid={!!fieldErrors.name}
            />
            {fieldErrors.name && (
              <p id="name-error" className="field-error">{fieldErrors.name}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="form-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: undefined })); }}
              className={`input-field ${fieldErrors.email ? "ring-2 ring-red-500/50" : ""}`}
              placeholder="you@example.com"
              autoComplete="email"
              aria-describedby="email-error"
              aria-invalid={!!fieldErrors.email}
            />
            {fieldErrors.email && (
              <p id="email-error" className="field-error">{fieldErrors.email}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: undefined })); }}
              className={`input-field ${fieldErrors.password ? "ring-2 ring-red-500/50" : ""}`}
              placeholder="8+ characters"
              autoComplete="new-password"
              aria-describedby="password-description password-error"
              aria-invalid={!!fieldErrors.password}
            />
            <p id="password-description" className="text-xs opacity-50">
              8–72 characters required.
            </p>
            {fieldErrors.password && (
              <p id="password-error" className="field-error">{fieldErrors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="text-center text-xs opacity-50">
          Already have an account?{" "}
          <Link href="/login" className="font-bold opacity-100 text-accent-interactive hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
