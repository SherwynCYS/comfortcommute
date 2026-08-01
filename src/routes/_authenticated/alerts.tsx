import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { MobileShell } from "@/components/layout/mobile-shell";
import { listAlerts, markAlertRead, deleteAlert, syncAlertsFromLta } from "@/lib/alerts.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/alerts")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
  },
  component: AlertsPage,
  head: () => ({
    meta: [
      { title: "Alerts | ComfortCommute" },
      { name: "description", content: "Incident and crowd alerts for your favourite routes." },
      { property: "og:title", content: "Alerts | ComfortCommute" },
      { property: "og:description", content: "Incident and crowd alerts for your favourite routes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function AlertsPage() {
  const queryClient = useQueryClient();
  const listAlertsFn = useServerFn(listAlerts);

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => listAlertsFn({ data: undefined }),
  });

  const markRead = useMutation({
    mutationFn: useServerFn(markAlertRead),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alerts"] }),
  });

  const remove = useMutation({
    mutationFn: useServerFn(deleteAlert),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alerts"] }),
  });

  const sync = useMutation({
    mutationFn: useServerFn(syncAlertsFromLta),
    onSuccess: (result: { inserted: number }) => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      toast.success(`${result.inserted} new alert(s) synced`);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Sync failed"),
  });

  return (
    <MobileShell>
      <div className="space-y-5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold">Alerts</h1>
            <p className="text-sm text-muted-foreground">
              Disruptions touching your saved journeys.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => sync.mutate({ data: undefined })}
            disabled={sync.isPending}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${sync.isPending ? "animate-spin" : ""}`} />
            Sync
          </Button>
        </div>

        <p className="rounded-xl border border-dashed border-border p-3 text-xs leading-relaxed text-muted-foreground">
          Alerts are derived from LTA train service messages and may be delayed or incomplete. They
          are not an official notification channel — always check the operator for confirmation.
        </p>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading alerts…</p>
        ) : alerts.length === 0 ? (
          <EmptyState message="No alerts yet. Sync to check for incidents affecting your favourites." />
        ) : (
          alerts.map((alert) => (
            <Card key={alert.id} className={alert.is_read ? "opacity-70 shadow-soft" : "shadow-soft"}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <Bell className="h-4 w-4" />
                  </span>
                  <CardTitle className="text-base leading-snug">{alert.title}</CardTitle>
                </div>

                <SeverityBadge severity={alert.severity} />
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(alert.created_at).toLocaleString()}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">{alert.body}</p>
              <div className="flex gap-2">
                {!alert.is_read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markRead.mutate({ data: { id: alert.id } })}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Mark read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => remove.mutate({ data: { id: alert.id } })}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
        )}
      </div>
    </MobileShell>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  if (severity === "critical") {
    return <Badge variant="destructive">Critical</Badge>;
  }
  if (severity === "warning") {
    return <Badge variant="secondary">Warning</Badge>;
  }
  return <Badge variant="outline">Info</Badge>;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-mint text-primary">
        <Bell className="h-6 w-6" />
      </span>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>

  );
}
