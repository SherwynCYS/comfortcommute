import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Bus, MapPin, Trash2, Heart, Star, Plus, TrainFront } from "lucide-react";
import { toast } from "sonner";

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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="routes">Routes</TabsTrigger>
            <TabsTrigger value="stops">Stops</TabsTrigger>
            <TabsTrigger value="places">Places</TabsTrigger>
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
              <Card key={stop.id} className="border-border/70 shadow-soft">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                      {stop.transport_type === "bus" ? (
                        <Bus className="h-4 w-4" />
                      ) : (
                        <MapPin className="h-4 w-4" />
                      )}
                    </span>
                    <CardTitle className="text-base">{stop.stop_name}</CardTitle>
                  </div>

                  {stop.stop_code && (
                    <p className="text-xs text-muted-foreground">Code: {stop.stop_code}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => deleteStop.mutate({ data: { id: stop.id } })}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
      </div>
    </MobileShell>
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
