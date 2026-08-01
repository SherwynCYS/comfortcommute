import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProfile, acceptTerms } from "@/lib/profile.functions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Loader2, MapPin, ShieldCheck } from "lucide-react";

type PermissionState = "granted" | "denied" | "unsupported" | "skipped";

async function requestLocation(): Promise<PermissionState> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return "unsupported";
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve("granted"),
      () => resolve("denied"),
      { timeout: 10000 }
    );
  });
}

async function requestNotifications(): Promise<PermissionState> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  try {
    const result = await Notification.requestPermission();
    return result === "granted" ? "granted" : "denied";
  } catch {
    return "denied";
  }
}

/**
 * Blocks the app until the signed-in commuter has accepted the terms and been
 * asked for the location and notification permissions the app relies on.
 */
export function ConsentGate({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const getProfileFn = useServerFn(getProfile);
  const acceptTermsFn = useServerFn(acceptTerms);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => getProfileFn({ data: undefined }),
  });

  const [agreed, setAgreed] = useState(false);
  const [locationState, setLocationState] = useState<PermissionState | null>(null);
  const [notifyState, setNotifyState] = useState<PermissionState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accepted = Boolean((profile as { terms_accepted_at?: string | null } | undefined)?.terms_accepted_at);

  useEffect(() => {
    if (accepted) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "granted") setNotifyState("granted");
  }, [accepted]);

  if (isLoading || accepted) return <>{children}</>;

  const handleContinue = async () => {
    setBusy(true);
    setError(null);
    try {
      const location = locationState ?? (await requestLocation());
      const notifications = notifyState ?? (await requestNotifications());
      setLocationState(location);
      setNotifyState(notifications);
      await acceptTermsFn({
        data: { locationPermission: location, notificationPermission: notifications },
      });
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your consent");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-md shadow-lift">
        <CardHeader className="text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-mint text-primary">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <CardTitle className="font-display text-xl">Before you ride</CardTitle>
          <CardDescription>
            ComfortCommute needs a couple of permissions and your agreement to our terms.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PermissionRow
            icon={<MapPin className="h-4 w-4" />}
            title="Location"
            body="Used to find nearby stops, live buses and journeys from where you are."
            state={locationState}
            onRequest={async () => setLocationState(await requestLocation())}
          />
          <PermissionRow
            icon={<Bell className="h-4 w-4" />}
            title="Notifications"
            body="Used to alert you about disruptions and crowding on the network."
            state={notifyState}
            onRequest={async () => setNotifyState(await requestNotifications())}
          />

          <label className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
            <Checkbox
              checked={agreed}
              onCheckedChange={(v) => setAgreed(v === true)}
              className="mt-0.5"
              aria-label="Accept terms"
            />
            <span>
              I accept the{" "}
              <Link to="/legal" className="font-medium text-primary underline-offset-4 hover:underline">
                terms of use, disclaimer and privacy notice
              </Link>
              , and understand that journey times, fares, crowd levels and alerts are estimates from
              third-party data and are not official notifications.
            </span>
          </label>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <Button className="w-full" disabled={!agreed || busy} onClick={() => void handleContinue()}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Agree and continue
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            You can change device permissions at any time in your browser settings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function PermissionRow({
  icon,
  title,
  body,
  state,
  onRequest,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  state: PermissionState | null;
  onRequest: () => Promise<void>;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border p-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        {icon}
      </span>
      <div className="flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{body}</p>
      </div>
      <Button
        type="button"
        size="sm"
        variant={state === "granted" ? "secondary" : "outline"}
        disabled={state === "granted"}
        onClick={() => void onRequest()}
      >
        {state === "granted"
          ? "Allowed"
          : state === "denied"
            ? "Retry"
            : state === "unsupported"
              ? "N/A"
              : "Allow"}
      </Button>
    </div>
  );
}
