import { createFileRoute, redirect } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { MobileShell } from "@/components/layout/mobile-shell";
import { getNearbyStops, getStopLive } from "@/lib/live-bus.functions";
import { createFavoriteStop } from "@/lib/favorites.functions";
import {
  listIncidentReports,
  createIncidentReport,
  voteIncidentReport,
  INCIDENT_TYPES,
} from "@/lib/reports.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Bus,
  Heart,
  LocateFixed,
  RefreshCw,
  Share2,
  ThumbsUp,
  ThumbsDown,
  TriangleAlert,
  Volume2,
  Accessibility,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { InfoButton } from "@/components/ui/info-button";

const LiveMap = lazy(() => import("@/components/map/live-map"));

const SG_CENTRE = { lat: 1.3521, lng: 103.8198 };

const INCIDENT_LABELS: Record<string, string> = {
  crowding: "Packed bus/train",
  breakdown: "Breakdown",
  delay: "Long delay",
  no_show: "Bus never came",
  accessibility: "Lift/ramp issue",
  police: "Enforcement",
  hazard: "Hazard on route",
  other: "Something else",
};

const INCIDENT_EMOJI: Record<string, string> = {
  crowding: "🧍",
  breakdown: "🛠️",
  delay: "⏳",
  no_show: "👻",
  accessibility: "♿",
  police: "🚓",
  hazard: "⚠️",
  other: "💬",
};

export const Route = createFileRoute("/_authenticated/live")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
  },
  component: LivePage,
  head: () => ({
    meta: [
      { title: "Live buses near you | ComfortCommute" },
      {
        name: "description",
        content:
          "Track buses moving in real time on the map, see arrival countdowns at your stop and report delays for other commuters.",
      },
      { property: "og:title", content: "Live buses near you | ComfortCommute" },
      {
        property: "og:description",
        content: "Real-time bus positions, arrival countdowns and community delay reports in Singapore.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function LivePage() {
  const queryClient = useQueryClient();
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [activeStop, setActiveStop] = useState<string | null>(null);
  const [voiceOn, setVoiceOn] = useState(false);
  const announcedRef = useRef<Set<string>>(new Set());

  const nearbyFn = useServerFn(getNearbyStops);
  const stopLiveFn = useServerFn(getStopLive);
  const reportsFn = useServerFn(listIncidentReports);
  const saveStopFn = useServerFn(createFavoriteStop);

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Location isn't available on this device");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        toast.error("Couldn't get your location — showing central Singapore");
        setPosition(SG_CENTRE);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    locate();
  }, [locate]);

  const { data: stops = [] } = useQuery({
    queryKey: ["nearby-stops", position?.lat, position?.lng],
    enabled: Boolean(position),
    queryFn: () => nearbyFn({ data: { lat: position!.lat, lng: position!.lng, limit: 8 } }),
  });

  useEffect(() => {
    if (!activeStop && stops.length > 0) setActiveStop(stops[0].code);
  }, [stops, activeStop]);

  const { data: live, isFetching, refetch } = useQuery({
    queryKey: ["stop-live", activeStop],
    enabled: Boolean(activeStop),
    refetchInterval: 20000,
    queryFn: () => stopLiveFn({ data: { code: activeStop! } }),
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["incident-reports"],
    refetchInterval: 60000,
    queryFn: () => reportsFn({ data: undefined }),
  });

  useEffect(() => {
    const channel = supabase
      .channel("incident-reports-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "incident_reports" }, () => {
        queryClient.invalidateQueries({ queryKey: ["incident-reports"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const services = live?.services ?? [];
  const stopInfo = live?.stop ?? stops.find((s) => s.code === activeStop) ?? null;

  // Waze-style spoken heads-up as a bus closes in on your stop.
  useEffect(() => {
    if (!voiceOn || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    for (const service of services) {
      const bus = service.buses[0];
      if (!bus || bus.etaMinutes === null || bus.etaMinutes > 2) continue;
      const key = `${activeStop}-${service.serviceNo}-${bus.etaMinutes}`;
      if (announcedRef.current.has(key)) continue;
      announcedRef.current.add(key);
      const phrase =
        bus.etaMinutes <= 0
          ? `Bus ${service.serviceNo} is arriving now`
          : `Bus ${service.serviceNo} arrives in ${bus.etaMinutes} minute${bus.etaMinutes === 1 ? "" : "s"}`;
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(phrase));
    }
  }, [services, voiceOn, activeStop]);

  const mapBuses = useMemo(
    () =>
      services.flatMap((service) =>
        service.buses
          .filter((bus) => bus.lat !== null && bus.lng !== null)
          .map((bus) => ({
            id: `${service.serviceNo}-${bus.order}`,
            serviceNo: service.serviceNo,
            lat: bus.lat!,
            lng: bus.lng!,
            etaMinutes: bus.etaMinutes,
            load: bus.load,
          }))
      ),
    [services]
  );

  const mapIncidents = useMemo(
    () =>
      reports
        .filter((r) => r.lat !== null && r.lng !== null)
        .map((r) => ({ id: r.id, type: r.type as string, lat: r.lat as number, lng: r.lng as number })),
    [reports]
  );

  const centre = stopInfo
    ? { lat: stopInfo.lat, lng: stopInfo.lng }
    : (position ?? SG_CENTRE);

  const saveStop = useMutation({
    mutationFn: saveStopFn,
    onSuccess: () => toast.success("Stop saved to favourites"),
    onError: () => toast.error("Couldn't save this stop"),
  });

  const shareEta = async (serviceNo: string, etaMinutes: number | null) => {
    const arrival = new Date(Date.now() + (etaMinutes ?? 0) * 60000);
    const time = arrival.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const text = `I'm catching bus ${serviceNo} from ${stopInfo?.name ?? "my stop"} — arriving around ${time}. Tracked on ComfortCommute.`;
    try {
      if (navigator.share) await navigator.share({ title: "My ETA", text });
      else {
        await navigator.clipboard.writeText(text);
        toast.success("ETA copied — paste it to a friend");
      }
    } catch {
      /* user dismissed the share sheet */
    }
  };

  return (
    <MobileShell>
      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1"><h1 className="font-display text-2xl font-bold">Live near you</h1><InfoButton label="How the live map works">Bus labels show the service number and arrival time. The coloured dot shows reported crowding; tap a stop on the map to change arrivals.</InfoButton></div>
            <p className="text-sm text-muted-foreground">
              Buses move on the map as they drive. Countdowns refresh every 20 seconds.
            </p>
          </div>
          <Button variant="outline" size="icon" onClick={locate} aria-label="Recentre on my location">
            <LocateFixed className="h-4 w-4" />
          </Button>
        </div>

        <div className="relative h-72 overflow-hidden rounded-2xl border border-border/70 shadow-soft">
          <ClientOnly fallback={<MapSkeleton />}>
            <Suspense fallback={<MapSkeleton />}>
              <LiveMap
                center={centre}
                buses={mapBuses}
                incidents={mapIncidents}
                stops={stops.map((stop) => ({
                  code: stop.code,
                  name: stop.name,
                  lat: stop.lat,
                  lng: stop.lng,
                  active: stop.code === activeStop,
                }))}
                onSelectStop={setActiveStop}
              />
            </Suspense>
          </ClientOnly>
          {mapBuses.length === 0 && (
            <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-background/90 px-3 py-1.5 text-[11px] text-muted-foreground shadow-soft">
              No GPS-tracked buses reporting at this stop right now
            </div>
          )}
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {stops.map((stop) => (
            <button
              key={stop.code}
              onClick={() => setActiveStop(stop.code)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-2 text-xs font-medium transition-colors",
                stop.code === activeStop
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              {stop.name} · {stop.meters}m
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Volume2 className="h-4 w-4 text-primary" />
            <Label htmlFor="voice" className="text-sm">
              Speak alerts when a bus is 2 min away
            </Label>
          </div>
          <Switch id="voice" checked={voiceOn} onCheckedChange={setVoiceOn} />
        </div>

        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold">
            {stopInfo?.name ?? "Arrivals"}{" "}
            {activeStop && <span className="text-xs text-muted-foreground">#{activeStop}</span>}
          </h2>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => refetch()} aria-label="Refresh arrivals">
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Save this stop"
              disabled={!stopInfo}
              onClick={() =>
                stopInfo &&
                saveStop.mutate({
                  data: {
                    stopName: stopInfo.name,
                    stopCode: stopInfo.code,
                    stopLat: stopInfo.lat,
                    stopLng: stopInfo.lng,
                    transportType: "bus" as const,
                  },
                })
              }
            >
              <Heart className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2.5">
          {services.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              No services reporting at this stop right now.
            </p>
          ) : (
            services.map((service) => (
              <Card key={service.serviceNo} className="border-border/70 shadow-soft">
                <CardContent className="flex items-center gap-3 p-3.5">
                  <span className="flex h-11 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-mint font-display text-sm font-bold text-primary">
                    {service.serviceNo}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {service.buses.map((bus) => (
                        <Badge
                          key={bus.order}
                          variant={bus.order === 1 ? "default" : "secondary"}
                          className="gap-1 font-medium"
                        >
                          {bus.etaMinutes === null
                            ? "—"
                            : bus.etaMinutes <= 0
                              ? "Arriving"
                              : `${bus.etaMinutes} min`}
                          {bus.isWheelchairAccessible && <Accessibility className="h-3 w-3" />}
                        </Badge>
                      ))}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {loadLabel(service.buses[0]?.load)}
                      {service.buses[0]?.lat ? " · GPS tracked" : ""}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Share ETA for bus ${service.serviceNo}`}
                    onClick={() => shareEta(service.serviceNo, service.buses[0]?.etaMinutes ?? null)}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <CommunityFeed
          reports={reports}
          stopCode={activeStop}
          stopPosition={stopInfo ? { lat: stopInfo.lat, lng: stopInfo.lng } : position}
        />

        <p className="pb-2 text-center text-[11px] leading-relaxed text-muted-foreground">
          Bus positions and arrival times come from LTA DataMall and can be delayed or missing.
          Community reports are user-submitted and unverified — always check on the ground.
        </p>
      </div>
    </MobileShell>
  );
}

function loadLabel(load: string | null | undefined) {
  if (load === "SEA") return "Seats available";
  if (load === "SDA") return "Standing room";
  if (load === "LSD") return "Very crowded";
  return "Crowd unknown";
}

function MapSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted/40">
      <Bus className="h-6 w-6 animate-pulse text-muted-foreground" />
    </div>
  );
}

type ReportRow = Awaited<ReturnType<typeof listIncidentReports>>[number];

function CommunityFeed({
  reports,
  stopCode,
  stopPosition,
}: {
  reports: ReportRow[];
  stopCode: string | null;
  stopPosition: { lat: number; lng: number } | null;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>("crowding");
  const [note, setNote] = useState("");

  const createFn = useServerFn(createIncidentReport);
  const voteFn = useServerFn(voteIncidentReport);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["incident-reports"] });

  const create = useMutation({
    mutationFn: createFn,
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setNote("");
      toast.success("Report shared · +10 points");
    },
    onError: () => toast.error("Couldn't share that report"),
  });

  const vote = useMutation({
    mutationFn: voteFn,
    onSuccess: () => {
      invalidate();
      toast.success("Thanks · +2 points");
    },
  });

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-semibold">Commuter reports</h2>
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <TriangleAlert className="h-4 w-4" />
              Report
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>What's happening?</DrawerTitle>
            </DrawerHeader>
            <div className="space-y-4 px-4 pb-8">
              <div className="grid grid-cols-4 gap-2">
                {INCIDENT_TYPES.map((option) => (
                  <button
                    key={option}
                    onClick={() => setType(option)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl border p-2.5 text-[10px] font-medium leading-tight transition-colors",
                      type === option
                        ? "border-primary bg-accent text-accent-foreground"
                        : "border-border bg-card text-muted-foreground"
                    )}
                  >
                    <span className="text-lg">{INCIDENT_EMOJI[option]}</span>
                    {INCIDENT_LABELS[option]}
                  </button>
                ))}
              </div>
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={280}
                placeholder="Add a detail for other commuters (optional)"
              />
              <Button
                className="w-full"
                disabled={create.isPending}
                onClick={() =>
                  create.mutate({
                    data: {
                      type: type as (typeof INCIDENT_TYPES)[number],
                      description: note.trim() || undefined,
                      lat: stopPosition?.lat,
                      lng: stopPosition?.lng,
                      busStopCode: stopCode ?? undefined,
                    },
                  })
                }
              >
                Share with commuters
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                Only report when it's safe to do so. Reports expire after 3 hours.
              </p>
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      {reports.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          Nothing reported nearby. Be the first to warn other commuters.
        </p>
      ) : (
        reports.slice(0, 12).map((report) => (
          <Card key={report.id} className="border-border/70 shadow-soft">
            <CardContent className="flex items-start gap-3 p-3.5">
              <span className="text-xl">{INCIDENT_EMOJI[report.type as string] ?? "💬"}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {INCIDENT_LABELS[report.type as string] ?? "Report"}
                  {report.bus_stop_code && (
                    <span className="text-xs font-normal text-muted-foreground"> · stop {report.bus_stop_code}</span>
                  )}
                </p>
                {report.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{report.description}</p>
                )}
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {new Date(report.created_at as string).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {report.isMine ? " · yours" : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant={report.myVote === "confirm" ? "default" : "ghost"}
                  size="sm"
                  className="h-8 gap-1 px-2 text-xs"
                  onClick={() => vote.mutate({ data: { reportId: report.id, isConfirm: true } })}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                  {report.confirms}
                </Button>
                <Button
                  variant={report.myVote === "dismiss" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 gap-1 px-2 text-xs"
                  onClick={() => vote.mutate({ data: { reportId: report.id, isConfirm: false } })}
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                  {report.dismisses}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </section>
  );
}
