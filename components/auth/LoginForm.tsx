"use client";

import { ArrowRight, KeyRound } from "lucide-react";
import { useState } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

const seedAccounts = [
  {
    role: "Admin",
    email: "admin@bugtracker.dev",
    password: "Admin123!",
  },
  {
    role: "QA",
    email: "qa@bugtracker.dev",
    password: "Qa123456!",
  },
  {
    role: "Developer",
    email: "dev@bugtracker.dev",
    password: "Dev123456!",
  },
];

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const { login, isAuthenticating } = useAuth();
  const { pushToast } = useToast();
  const [email, setEmail] = useState("admin@bugtracker.dev");
  const [password, setPassword] = useState("Admin123!");

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-10">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white/80 backdrop-blur">
            <span className="size-2 rounded-full bg-emerald-400" />
            Production-ready issue operations
          </div>
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-blue-200">
              BugFlow
            </p>
            <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-white sm:text-6xl">
              Keep every bug moving with clarity, ownership, and traceable
              decisions.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-200/85">
              Sign in to manage the board, coordinate assignments, and review
              the full audit trail behind every status change.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {seedAccounts.map((account) => (
            <button
              key={account.email}
              className="rounded-[28px] border border-white/15 bg-white/10 p-5 text-left backdrop-blur transition hover:bg-white/15"
              onClick={() => {
                setEmail(account.email);
                setPassword(account.password);
              }}
              type="button"
            >
              <p className="text-sm font-semibold text-white">{account.role}</p>
              <p className="mt-3 text-sm text-slate-200">{account.email}</p>
              <p className="mt-1 text-sm text-slate-400">{account.password}</p>
            </button>
          ))}
        </div>
      </div>

      <Card className="rounded-[32px] p-6 sm:p-8">
        <form
          className="space-y-6"
          onSubmit={async (event) => {
            event.preventDefault();

            try {
              await login({ email, password }, redirectTo);
            } catch (error) {
              pushToast({
                title: "Sign-in failed",
                description:
                  error instanceof Error
                    ? error.message
                    : "Unable to sign in with those credentials.",
                tone: "error",
              });
            }
          }}
        >
          <div className="space-y-2">
            <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-[color:var(--color-primary)]">
              <KeyRound className="size-5" />
            </div>
            <h2 className="text-3xl font-semibold text-slate-950">Welcome back</h2>
            <p className="text-sm leading-6 text-slate-500">
              Your refresh token stays in a secure cookie, and the UI restores
              the session automatically when the access token rolls over.
            </p>
          </div>

          <Input
            autoComplete="email"
            label="Email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            type="email"
            value={email}
          />

          <Input
            autoComplete="current-password"
            label="Password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            type="password"
            value={password}
          />

          <Button
            className="w-full"
            loading={isAuthenticating}
            size="lg"
            leadingIcon={<ArrowRight className="size-4" />}
            type="submit"
          >
            Continue to workspace
          </Button>

          <p className="text-center text-sm text-slate-500">
            Redirect target: {redirectTo}
          </p>
        </form>
      </Card>
    </div>
  );
}
