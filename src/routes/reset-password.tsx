import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bus, Loader2 } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "Reset password | ComfortCommute" },
      { name: "description", content: "Set a new password for your ComfortCommute account." },
      { property: "og:title", content: "Reset password | ComfortCommute" },
      { property: "og:description", content: "Set a new password for your ComfortCommute account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const recoveryType = hashParams.get("type");

    if (recoveryType && recoveryType !== "recovery") {
      setMessage("This reset link is invalid. Request a new password reset from the sign-in page.");
      setReady(false);
      return;
    }

    void supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        setMessage("Open the latest password reset link from your email to continue.");
      }
      setReady(Boolean(data.session));
    });
  }, []);

  const handleReset = async () => {
    setMessage(null);
    if (password.length < 8) {
      setMessage("Choose a password with at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      router.navigate({ to: "/planner" });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 flex items-center gap-2 text-2xl font-bold text-foreground">
        <Bus className="h-8 w-8 text-primary" />
        ComfortCommute
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle><h1>Reset your password</h1></CardTitle>
          <CardDescription>Choose a new password to continue planning your commute.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={!ready || loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={!ready || loading}
            />
          </div>
          <Button className="w-full" onClick={handleReset} disabled={!ready || loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Update password
          </Button>
          {message && <p className="text-center text-sm text-muted-foreground">{message}</p>}
        </CardContent>
      </Card>
    </div>
  );
}