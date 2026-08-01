import { ClientOnly, createFileRoute, redirect } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { MobileShell } from "@/components/layout/mobile-shell";
import {
  listFavoriteRoutes,
  listFavoriteStops,
  deleteFavoriteRoute,
  deleteFavoriteStop,
  createFavoriteStop,
} from "@/lib/favorites.functions";
import {
  listFavoritePlaces,
  createFavoritePlace,
  deleteFavoritePlace,
} from "@/lib/favorite-places.functions";
import { PlaceSearch } from "@/components/planner/place-search";
import type { PlaceResult } from "@/lib/places.functions";
import { getBusJourney, getStopLive } from "@/lib/live-bus.functions";
import type { BusJourney } from "@/lib/live-bus.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Bus, ChevronRight, LocateFixed, Map, MapPin, RefreshCw, Trash2, Heart, Star, Plus, TrainFront } from "lucide-react";
import { toast } from "sonner";

const LiveMap = lazy(() => import("@/components/map/live-map"));
const MrtMap = lazy(() => import("@/components/map/mrt-map"));

export const Route = createFileRoute("/_authenticated/favorites")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
  },
  component: FavoritesPage,
  head: () => ({
    meta: [
      { title: "Favourites | ComfortCommute" },
      { name: "description", content: "Manage your saved routes and stops." },
      { property: "og:title", content: "Favourites | ComfortCommute" },
      { property: "og:description", content: "Manage your saved routes and stops." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function FavoritesPage() {
  const queryClient = useQueryClient();
  const listRoutesFn = useServerFn(listFavoriteRoutes);
  const listStopsFn = useServerFn(listFavoriteStops);

  const { data: routes = [] } = useQuery({
    queryKey: ["favorite-routes"],
    queryFn: () => listRoutesFn({ data: undefined }),
  });

  const { data: stops = [] } = useQuery({
    queryKey: ["favorite-stops"],
    queryFn: () => listStopsFn({ data: undefined }),
  });

  const deleteRoute = useMutation({
    mutationFn: useServerFn(deleteFavoriteRoute),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorite-routes"] });
      toast.success("Route removed");
    },
  });

  const deleteStop = useMutation({
    mutationFn: useServerFn(deleteFavoriteStop),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorite-stops"] });
      toast.success("Stop removed");
    },
  });

  const listPlacesFn = useServerFn(listFavoritePlaces);
  const { data: places = [] } = useQuery({
    queryKey: ["favorite-places"],
    queryFn: () => listPlacesFn({ data: undefined }),
  });

  const deletePlace = useMutation({
    mutationFn: useServerFn(deleteFavoritePlace),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorite-places"] });
      toast.success("Place removed");
    },
  });

  return (
    <MobileShell>
      <div className="space-y-5 p-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Your favourites</h1>
          <p className="text-sm text-muted-foreground">
            Saved journeys, stops and places we watch for disruptions.
          </p>
        </div>

        <Tabs defaultValue="routes" className="w-full space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="routes">Routes</TabsTrigger>
            <TabsTrigger value="stops">Stops</TabsTrigger>
            <TabsTrigger value="places">Places</TabsTrigger>
            <TabsTrigger value="map">MRT map</TabsTrigger>
          </TabsList>

        <TabsContent value="places" className="space-y-4">
          <AddPlaceForm />
          {places.length === 0 ? (
            <EmptyState message="No saved places yet. Save the spots you travel to often." />
          ) : (
            places.map((place) => (
              <Card key={place.id} className="border-border/70 shadow-soft">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-mint text-primary">
                      <Star className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base">{place.label}</CardTitle>
                      <p className="truncate text-xs text-muted-foreground">{place.name}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => deletePlace.mutate({ data: { id: place.id } })}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>



        <TabsContent value="routes" className="space-y-4">
          {routes.length === 0 ? (
            <EmptyState message="No saved routes yet. Plan a journey and save it." />
          ) : (
            routes.map((route) => (
              <Card key={route.id} className="border-border/70 shadow-soft">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base leading-snug">{route.name}</CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {route.origin_name} → {route.destination_name}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 capitalize">
                      {route.priority}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => deleteRoute.mutate({ data: { id: route.id } })}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="stops" className="space-y-4">
          <AddStopForm />
          {stops.length === 0 ? (
            <EmptyState message="No saved stops yet. Search a bus stop or MRT station above to pin it here." />
          ) : (
            stops.map((stop) => (
              <SavedStopCard
                key={stop.id}
                stop={stop}
                onRemove={() => deleteStop.mutate({ data: { id: stop.id } })}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="map" className="space-y-3">
          <div>
            <h2 className="font-display text-lg font-semibold">Singapore rail network</h2>
            <p className="text-sm text-muted-foreground">Pinch, pan and tap any station to see its line codes.</p>
          </div>
          <div className="h-[60vh] min-h-96 overflow-hidden rounded-xl border border-border/70 shadow-soft">
            <ClientOnly fallback={<MapFallback />}>
              <Suspense fallback={<MapFallback />}>
                <MrtMap />
              </Suspense>
            </ClientOnly>
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </MobileShell>
  );
}

type SavedStop = {
  id: string;
  stop_name: string;
  stop_code: string | null;
  stop_lat: number | null;
  stop_lng: number | null;
  transport_type: string;
};

function SavedStopCard({ stop, onRemove }: { stop: SavedStop; onRemove: () => void }) {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDirection, setSelectedDirection] = useState(0);
  const liveFn = useServerFn(getStopLive);
  const journeyFn = useServerFn(getBusJourney);
  const isBusStop = stop.transport_type === "bus" && Boolean(stop.stop_code);

  const { data: live, isFetching, refetch } = useQuery({
    queryKey: ["saved-stop-live", stop.stop_code],
    enabled: isBusStop,
    refetchInterval: 20_000,
    queryFn: () => liveFn({ data: { code: stop.stop_code ?? "" } }),
  });

  const { data: journeys = [], isLoading: journeyLoading } = useQuery({
    queryKey: ["bus-journey", selectedService, stop.stop_code],
    enabled: Boolean(selectedService && stop.stop_code),
    queryFn: () => journeyFn({ data: { serviceNo: selectedService ?? "", stopCode: stop.stop_code ?? "" } }),
  });

  const journey = journeys[selectedDirection] as BusJourney | undefined;
  const selectedLiveService = live?.services.find((service) => service.serviceNo === selectedService);
  const mapBuses = useMemo(
    () =>
      (selectedLiveService?.buses ?? [])
        .filter((bus) => bus.lat !== null && bus.lng !== null)
        .map((bus) => ({
          id: `${selectedService}-${bus.order}`,
          serviceNo: selectedService ?? "",
          lat: bus.lat ?? 0,
          lng: bus.lng ?? 0,
          etaMinutes: bus.etaMinutes,
          load: bus.load,
        })),
    [selectedLiveService, selectedService]
  );
  const routeStops = (journey?.stops ?? []).filter((item) => item.lat !== 0 && item.lng !== 0);
  const center = routeStops.find((item) => item.isCurrent) ?? routeStops[0] ?? {
    lat: stop.stop_lat ?? 1.3521,
    lng: stop.stop_lng ?? 103.8198,
  };

  return (
    <Card className="border-border/70 shadow-soft">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              {isBusStop ? <Bus className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
            </span>
            <div className="min-w-0">
              <CardTitle className="truncate text-base">{stop.stop_name}</CardTitle>
              {stop.stop_code && <p className="text-xs text-muted-foreground">Stop {stop.stop_code}</p>}
            </div>
          </div>
          {isBusStop && (
            <Button variant="ghost" size="icon" onClick={() => refetch()} aria-label="Refresh arrivals">
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isBusStop && (live?.services.length ?? 0) > 0 ? (
          <div className="divide-y divide-border rounded-lg border border-border/70">
            {live?.services.map((service) => (
              <Button
                key={service.serviceNo}
                variant="ghost"
                className="h-auto w-full justify-start rounded-none px-3 py-3 first:rounded-t-lg last:rounded-b-lg"
                onClick={() => {
                  setSelectedDirection(0);
                  setSelectedService(service.serviceNo);
                }}
              >
                <span className="flex h-9 w-12 shrink-0 items-center justify-center rounded-md bg-primary font-display font-bold text-primary-foreground">
                  {service.serviceNo}
                </span>
                <span className="ml-3 flex min-w-0 flex-1 gap-1.5 overflow-hidden">
                  {service.buses.slice(0, 3).map((bus) => (
                    <Badge key={bus.order} variant={bus.order === 1 ? "default" : "secondary"} className="shrink-0">
                      {bus.etaMinutes === null ? "—" : bus.etaMinutes <= 0 ? "Arr" : `${bus.etaMinutes}m`}
                    </Badge>
                  ))}
                </span>
                <ChevronRight className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
              </Button>
            ))}
          </div>
        ) : isBusStop ? (
          <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
            {isFetching ? "Loading live arrivals…" : "No live arrivals are reporting right now."}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Open the MRT map to explore this station and its lines.</p>
        )}

        <Button variant="ghost" size="sm" className="text-destructive" onClick={onRemove}>
          <Trash2 className="mr-2 h-4 w-4" /> Remove
        </Button>
      </CardContent>

      <Drawer open={Boolean(selectedService)} onOpenChange={(open) => !open && setSelectedService(null)}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader>
            <DrawerTitle>Bus {selectedService} journey</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-4 overflow-y-auto px-4 pb-8">
            {journeys.length > 1 && (
              <div className="flex gap-2">
                {journeys.map((item, index) => (
                  <Button
                    key={item.direction}
                    size="sm"
                    variant={selectedDirection === index ? "default" : "outline"}
                    onClick={() => setSelectedDirection(index)}
                  >
                    Direction {item.direction}
                  </Button>
                ))}
              </div>
            )}
            <div className="h-72 overflow-hidden rounded-xl border border-border/70">
              <ClientOnly fallback={<MapFallback />}>
                <Suspense fallback={<MapFallback />}>
                  <LiveMap
                    center={{ lat: center.lat, lng: center.lng }}
                    buses={mapBuses}
                    incidents={[]}
                    stops={routeStops.map((item) => ({
                      code: item.code,
                      name: `${item.sequence}. ${item.name}`,
                      lat: item.lat,
                      lng: item.lng,
                      active: item.isCurrent,
                    }))}
                    routeLine={routeStops.map((item) => ({ lat: item.lat, lng: item.lng }))}
                  />
                </Suspense>
              </ClientOnly>
            </div>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <LocateFixed className="h-3.5 w-3.5" /> Live bus markers refresh every 20 seconds when GPS is available.
            </p>
            {journeyLoading ? (
              <p className="text-sm text-muted-foreground">Loading the full journey…</p>
            ) : journey ? (
              <ol className="space-y-0">
                {journey.stops.map((item) => (
                  <li key={`${item.code}-${item.sequence}`} className="flex gap-3">
                    <div className="flex w-5 flex-col items-center">
                      <span className={`mt-1 h-3 w-3 rounded-full border-2 ${item.isCurrent ? "border-primary bg-primary" : "border-muted-foreground bg-background"}`} />
                      <span className="h-full min-h-8 w-px bg-border" />
                    </div>
                    <div className="pb-4">
                      <p className={`text-sm ${item.isCurrent ? "font-semibold text-primary" : "font-medium"}`}>{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.code} · {item.road}</p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">Journey information is unavailable for this service.</p>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </Card>
  );
}

function MapFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted/40 text-sm text-muted-foreground">
      <Map className="mr-2 h-4 w-4" /> Loading map…
    </div>
  );
}

function AddStopForm() {
  const queryClient = useQueryClient();
  const [stop, setStop] = useState<PlaceResult | null>(null);

  const create = useMutation({
    mutationFn: useServerFn(createFavoriteStop),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorite-stops"] });
      setStop(null);
      toast.success("Stop saved");
    },
    onError: () => toast.error("Couldn't save that stop"),
  });

  const isTransit = stop?.type === "bus" || stop?.type === "rail";

  return (
    <Card className="border-border/70 shadow-soft">
      <CardContent className="space-y-3 p-4">
        <PlaceSearch
          id="favorite-stop"
          label="Add a bus stop or MRT station"
          value={stop}
          onChange={setStop}
          placeholder="Search e.g. 'Bishan MRT' or a bus stop name"
        />
        {stop && !isTransit && (
          <p className="text-xs text-muted-foreground">
            That's an address — save it under the Places tab instead.
          </p>
        )}
        <Button
          className="w-full"
          disabled={!isTransit || create.isPending}
          onClick={() =>
            stop &&
            isTransit &&
            create.mutate({
              data: {
                stopName: stop.name,
                stopCode: stop.id.startsWith("bus-")
                  ? stop.id.slice(4)
                  : stop.description || undefined,
                stopLat: stop.lat,
                stopLng: stop.lng,
                transportType: stop.type === "bus" ? "bus" : "mrt",
              },
            })
          }
        >
          <Plus className="mr-2 h-4 w-4" />
          Save stop
        </Button>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <TrainFront className="h-3.5 w-3.5" /> Saved stops power live arrivals and alerts.
        </p>
      </CardContent>
    </Card>
  );
}

function AddPlaceForm() {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState("");
  const [place, setPlace] = useState<PlaceResult | null>(null);

  const create = useMutation({
    mutationFn: useServerFn(createFavoritePlace),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorite-places"] });
      setLabel("");
      setPlace(null);
      toast.success("Place saved");
    },
    onError: () => toast.error("Couldn't save that place"),
  });

  return (
    <Card className="border-border/70 shadow-soft">
      <CardContent className="space-y-3 p-4">
        <Input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Nickname (e.g. Gym, Mum's place)"
        />
        <PlaceSearch
          id="favorite-place"
          label="Location"
          value={place}
          onChange={setPlace}
          placeholder="Search an address, landmark or stop"
        />
        <Button
          className="w-full"
          disabled={!label.trim() || !place || create.isPending}
          onClick={() =>
            place &&
            create.mutate({
              data: {
                label: label.trim(),
                name: place.name,
                address: place.description,
                lat: place.lat,
                lng: place.lng,
              },
            })
          }
        >
          <Plus className="mr-2 h-4 w-4" />
          Save place
        </Button>
      </CardContent>
    </Card>
  );
}



function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-mint text-primary">
        <Heart className="h-6 w-6" />
      </span>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>

  );
}
