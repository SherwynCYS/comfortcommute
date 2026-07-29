import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { MobileShell } from "@/components/layout/mobile-shell";
import {
  listFavoriteRoutes,
  listFavoriteStops,
  deleteFavoriteRoute,
  deleteFavoriteStop,
} from "@/lib/favorites.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Bus, MapPin, Trash2, Heart } from "lucide-react";
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
      { title: "Favourites | Nebula Commute" },
      { name: "description", content: "Manage your saved routes and stops." },
      { property: "og:title", content: "Favourites | Nebula Commute" },
      { property: "og:description", content: "Manage your saved routes and stops." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function FavoritesPage() {
  const queryClient = useQueryClient();

  const { data: routes = [] } = useQuery({
    queryKey: ["favorite-routes"],
    queryFn: () => useServerFn(listFavoriteRoutes)({ data: undefined }),
  });

  const { data: stops = [] } = useQuery({
    queryKey: ["favorite-stops"],
    queryFn: () => useServerFn(listFavoriteStops)({ data: undefined }),
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

  return (
    <MobileShell>
      <div className="space-y-6 p-4">
        <h2 className="text-xl font-semibold">Your favourites</h2>

      <Tabs defaultValue="routes" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="routes">Routes</TabsTrigger>
          <TabsTrigger value="stops">Stops</TabsTrigger>
        </TabsList>

        <TabsContent value="routes" className="space-y-4">
          {routes.length === 0 ? (
            <EmptyState message="No saved routes yet. Plan a journey and save it." />
          ) : (
            routes.map((route) => (
              <Card key={route.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{route.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {route.origin_name} → {route.destination_name}
                      </p>
                    </div>
                    <Badge variant="outline">{route.priority}</Badge>
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
          {stops.length === 0 ? (
            <EmptyState message="No saved stops yet." />
          ) : (
            stops.map((stop) => (
              <Card key={stop.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    {stop.transport_type === "bus" ? (
                      <Bus className="h-5 w-5 text-primary" />
                    ) : (
                      <MapPin className="h-5 w-5 text-primary" />
                    )}
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

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center">
      <Heart className="mb-4 h-10 w-10 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
