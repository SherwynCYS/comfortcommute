import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bus, Loader2 } from "lucide-react";

function safeNext(value: unknown): string | undefined {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : undefined;
}

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  validateSearch: (search: Record<string, unknown>): { next?: string } => {
    const next = safeNext(search.next);
    return next ? { next } : {};
  },

  head: () => ({
    meta: [
      { title: "Sign in | ComfortCommute" },
      { name: "description", content: "Sign in to ComfortCommute to plan your public transport journeys." },
      { property: "og:title", content: "Sign in | ComfortCommute" },
      { property: "og:description", content: "Sign in to ComfortCommute to plan your public transport journeys." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function AuthPage() {
  const router = useRouter();
  const { next } = Route.useSearch();
  const goNext = () => {
    if (next) window.location.href = next;
    else void router.navigate({ to: "/planner" });
  };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (mounted && data.session) {
        goNext();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
        goNext();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, next]);

  const handleEmailAuth = async (type: "signup" | "login") => {
    setLoading(true);
    setMessage(null);
    const normalizedEmail = email.trim();

    try {
      if (type === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: next ? `${window.location.origin}/auth?next=${encodeURIComponent(next)}` : window.location.origin,
          },
        });
        if (error) throw error;
        if (data.session) {
          goNext();
          return;
        }
        setMessage("Account created. You can sign in now.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (error) throw error;
        goNext();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Authentication failed";
      if (errorMessage.toLowerCase().includes("invalid login credentials")) {
        setMessage("Invalid email or password. If you first signed in with Google, use Google or reset your password below.");
      } else if (errorMessage.toLowerCase().includes("already registered")) {
        setMessage("This email already has an account. Sign in, continue with Google, or reset your password below.");
      } else {
        setMessage(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setMessage("Enter your email first, then request a password reset.");
      return;
    }

    setResetLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setMessage("If this email has an account, a password reset link has been sent.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send password reset email");
    } finally {
      setResetLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setMessage(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: next
        ? `${window.location.origin}/auth?next=${encodeURIComponent(next)}`
        : `${window.location.origin}/auth`,
    });
    if (result.error) {
      setMessage(result.error.message);
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    goNext();
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-hero p-4">
      <div className="grid-lines pointer-events-none absolute inset-0 opacity-50" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 right-0 h-72 w-72 rounded-full bg-primary-glow/20 blur-3xl"
      />

      <Link
        to="/"
        className="relative mb-8 flex items-center gap-3 font-display text-2xl font-bold text-ink-foreground"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-glow/15 ring-1 ring-primary-glow/40">
          <Bus className="h-6 w-6 text-primary-glow" />
        </span>
        ComfortCommute
      </Link>

      <Card className="relative w-full max-w-md border-border/60 shadow-lift">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome aboard</CardTitle>
          <CardDescription>Sign in to plan smarter commutes across Singapore.</CardDescription>
        </CardHeader>
        <CardContent>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="link"
                  className="h-auto px-0 text-xs"
                  onClick={handlePasswordReset}
                  disabled={loading || resetLoading}
                >
                  {resetLoading ? "Sending reset link…" : "Forgot password?"}
                </Button>
              </div>
              <Button
                className="w-full"
                onClick={() => handleEmailAuth("login")}
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Sign in
              </Button>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
                onClick={() => handleEmailAuth("signup")}
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create account
              </Button>
            </TabsContent>
          </Tabs>

          <div className="my-6 flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">OR</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={loading}>
            Continue with Google
          </Button>

          {message && (
            <p className="mt-4 rounded-lg bg-muted p-3 text-center text-sm text-muted-foreground">
              {message}
            </p>
          )}

          <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground">
            By continuing you agree that journey times, fares and crowd levels shown are estimates
            only, and you accept our{" "}
            <Link to="/legal" className="font-medium text-primary underline-offset-4 hover:underline">
              terms, disclaimer and privacy notice
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>

  );
}
