import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BrainCircuit, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, User } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Nexora AI Document Control" },
      {
        name: "description",
        content:
          "Secure sign-in to Nexora, the AI-powered invoice and credit note management and approval platform.",
      },
      { property: "og:title", content: "Sign in — Nexora AI Document Control" },
      {
        property: "og:description",
        content: "Secure access to AI invoice extraction, approvals and financial reporting.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Enter both your email address and password.");
      return;
    }
    if (mode === "signup" && password.length < 8) {
      setError("Choose a password with at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName.trim() || undefined },
          },
        });
        if (signUpError) throw signUpError;
        const { error: afterSignUp } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (afterSignUp) {
          toast.success("Account created. Confirm your email address, then sign in.");
          setMode("signin");
          setLoading(false);
          return;
        }
      }
      await queryClient.invalidateQueries();
      navigate({ to: "/dashboard" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign in failed. Please try again.";
      setError(
        message.toLowerCase().includes("invalid login")
          ? "That email and password combination is not recognised."
          : message,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-2 lg:items-center">
        <div className="hidden lg:block">
          <span className="bg-gradient-brand mb-6 flex size-12 items-center justify-center rounded-2xl text-background">
            <BrainCircuit className="size-6" />
          </span>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            <span className="text-gradient">Nexora</span> financial document intelligence
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
            Upload invoices and credit notes, let AI extract and validate every figure, catch
            duplicates before they are paid, and move each document through a three-stage approval
            chain with a complete audit trail.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-muted-foreground">
            {[
              "AI extraction of vendor, number, dates, VAT and totals",
              "Automatic duplicate detection before approval",
              "Reviewer → Manager → Finance final approval",
              "Row-level security on every record and file",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-cyan" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="glass glow-ring rounded-3xl p-6 sm:p-8">
          <div className="mb-6 lg:hidden">
            <span className="bg-gradient-brand mb-4 flex size-11 items-center justify-center rounded-xl text-background">
              <BrainCircuit className="size-5" />
            </span>
            <p className="text-sm font-semibold tracking-[0.18em]">NEXORA</p>
          </div>

          <h2 className="text-xl font-semibold tracking-tight">
            {mode === "signin" ? "Sign in to your workspace" : "Create your account"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Use your work email address to continue."
              : "The first account created becomes the workspace administrator."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            {mode === "signup" ? (
              <Field
                id="fullName"
                label="Full name"
                icon={<User className="size-4" />}
                value={fullName}
                onChange={setFullName}
                autoComplete="name"
                placeholder="Thandi Nkosi"
              />
            ) : null}

            <Field
              id="email"
              label="Email address"
              type="email"
              icon={<Mail className="size-4" />}
              value={email}
              onChange={setEmail}
              autoComplete="email"
              placeholder="you@company.com"
            />

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Lock className="size-4" />
                </span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  className="w-full rounded-xl border border-input bg-surface/70 py-2.5 pl-10 pr-11 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary/60"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error ? (
              <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-brand flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-background transition-transform duration-200 hover:brightness-110 active:scale-[0.99] disabled:opacity-70"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "No account yet?" : "Already registered?"}{" "}
            <button
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
              }}
              className="font-medium text-primary hover:underline"
            >
              {mode === "signin" ? "Create one" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  icon,
  value,
  onChange,
  type = "text",
  autoComplete,
  placeholder,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </span>
        <input
          id={id}
          type={type}
          value={value}
          autoComplete={autoComplete}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-input bg-surface/70 py-2.5 pl-10 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary/60"
        />
      </div>
    </div>
  );
}
