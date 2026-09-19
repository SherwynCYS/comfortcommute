import { createFileRoute, redirect, useRouter, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProfile, updateProfile } from "@/lib/profile.functions";
import { listFavoriteRoutes, listFavoriteStops } from "@/lib/favorites.functions";
import { supabase } from "@/integrations/supabase/client";
import { MobileShell } from "@/components/layout/mobile-shell";
import { useI18n } from "@/lib/i18n";
import { PlaceSearch } from "@/components/planner/place-search";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import type { PlaceResult } from "@/lib/places.functions";
import { CARD_TYPES, OCCUPATIONS, cardLabel, occupationLabel, type CardType, type Occupation } from "@/lib/fares";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Briefcase, CreditCard, Home, LogOut, MapPin, Route as RouteIcon, Sparkles, Star, User } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
  },
  component: ProfilePage,
  head: () => ({
    meta: [
      { title: "Your Profile | ComfortCommute" },
      { name: "description", content: "Personalise ComfortCommute: set home and work, your occupation and fare card for accurate fares." },
      { property: "og:title", content: "Your Profile | ComfortCommute" },
      { property: "og:description", content: "Personalise ComfortCommute: set home and work, your occupation and fare card for accurate fares." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function ProfilePage() {
  const { t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState("");
  const [occupation, setOccupation] = useState<Occupation>("working_adult");
  const [cardType, setCardType] = useState<CardType>("adult_card");
  const [home, setHome] = useState<PlaceResult | null>(null);
  const [work, setWork] = useState<PlaceResult | null>(null);

  const getProfileFn = useServerFn(getProfile);
  const updateProfileFn = useServerFn(updateProfile);
  const listRoutesFn = useServerFn(listFavoriteRoutes);
  const listStopsFn = useServerFn(listFavoriteStops);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => getProfileFn({ data: undefined }),
  });
  const { data: favRoutes } = useQuery({
    queryKey: ["favorite-routes"],
    queryFn: () => listRoutesFn({ data: undefined }),
  });
  const { data: favStops } = useQuery({
    queryKey: ["favorite-stops"],
    queryFn: () => listStopsFn({ data: undefined }),
  });

  useEffect(() => {
    if (!profile) return;
    if (profile.display_name) setDisplayName(profile.display_name);
    if (profile.occupation) setOccupation(profile.occupation as Occupation);
    if (profile.card_type) setCardType(profile.card_type as CardType);
    if (profile.home_name && profile.home_lat != null && profile.home_lng != null) {
      setHome({
        id: "home",
        name: profile.home_name,
        description: "Saved home",
        lat: profile.home_lat,
        lng: profile.home_lng,
        type: "address",
      });
    }
    if (profile.work_name && profile.work_lat != null && profile.work_lng != null) {
      setWork({
        id: "work",
        name: profile.work_name,
        description: "Saved work",
        lat: profile.work_lat,
        lng: profile.work_lng,
        type: "address",
      });
    }
  }, [profile]);

  const update = useMutation({
    mutationFn: updateProfileFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Saved — your commute just got more personal");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not save profile"),
  });

  const savePersonal = () =>
    update.mutate({ data: { displayName: displayName || "Commuter", occupation, cardType } });

  const savePlaces = () =>
    update.mutate({
      data: {
        home: home ? { name: home.name, lat: home.lat, lng: home.lng } : null,
        work: work ? { name: work.name, lat: work.lat, lng: work.lng } : null,
      },
    });

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  };

  const initials = (displayName || "Commuter").slice(0, 2).toUpperCase();
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-SG", { month: "short", year: "numeric" })
    : "—";
  const suggestedCard = OCCUPATIONS.find((o) => o.value === occupation)?.suggestedCard;
  const completeness = [displayName, profile?.home_name, profile?.work_name, profile?.card_type].filter(
    Boolean
  ).length;

  return (
    <MobileShell>
      <div className="space-y-5 p-4">
        <h1 className="sr-only">Your ComfortCommute profile and saved places</h1>
        <Card className="overflow-hidden border-0 bg-gradient-hero text-ink-foreground shadow-lift">
          <CardHeader className="flex-row items-center gap-4 space-y-0">
            <Avatar className="h-16 w-16 ring-2 ring-primary-glow/40">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {initials || <User className="h-6 w-6" />}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm text-ink-foreground/60">{greeting()},</p>
              <CardTitle className="text-xl">{displayName || "Commuter"}</CardTitle>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full border border-ink-foreground/20 bg-ink-foreground/10 px-2.5 py-0.5 text-[11px]">
                  {occupationLabel(occupation)}
                </span>
                <span className="rounded-full border border-ink-foreground/20 bg-ink-foreground/10 px-2.5 py-0.5 text-[11px]">
                  {cardLabel(cardType)}
                </span>
                <span className="rounded-full border border-primary-glow/40 bg-primary-glow/15 px-2.5 py-0.5 text-[11px] font-semibold text-primary-glow">
                  🏆 {profile?.points ?? 0} pts
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="Saved routes" value={favRoutes?.length ?? 0} icon={<RouteIcon className="h-4 w-4" />} />
              <Stat label="Saved stops" value={favStops?.length ?? 0} icon={<Star className="h-4 w-4" />} />
              <Stat label="Reports made" value={profile?.reports_count ?? 0} icon={<Sparkles className="h-4 w-4" />} />
            </div>

            {completeness < 4 && (
              <div className="mt-4 rounded-xl border border-primary-glow/25 bg-primary-glow/10 p-3">
                <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-foreground/15">
                  <div
                    className="h-full rounded-full bg-primary-glow transition-all"
                    style={{ width: `${(completeness / 4) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-ink-foreground/75">
                  Profile {completeness}/4 complete — add your home, work and fare card so we can
                  price and rank every journey for you.
                </p>
              </div>
            )}
          </CardContent>
        </Card>


        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Home className="h-4 w-4" /> Home &amp; work
            </CardTitle>
            <CardDescription>
              Saved places give you one-tap journeys from the planner.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <PlaceSearch id="home" label={t("home")} value={home} onChange={setHome} placeholder="Search your home address" />
            <PlaceSearch id="work" label={t("workSchool")} value={work} onChange={setWork} placeholder="Search your workplace" />
            <div className="flex gap-2">
              <Button className="flex-1" onClick={savePlaces} disabled={update.isPending}>
                Save places
              </Button>
              <Button variant="outline" asChild>
                <Link to="/planner">
                  <MapPin className="mr-2 h-4 w-4" />
                  Plan now
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4" /> Fares &amp; you
            </CardTitle>
            <CardDescription>
              Your occupation and card type set the concession rate we use to estimate every fare.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display-name">Display name</Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How should we call you?"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" /> Occupation
              </Label>
              <Select
                value={occupation}
                onValueChange={(v) => {
                  const next = v as Occupation;
                  setOccupation(next);
                  const suggested = OCCUPATIONS.find((o) => o.value === next)?.suggestedCard;
                  if (suggested) setCardType(suggested);
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OCCUPATIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Travel card</Label>
              <Select value={cardType} onValueChange={(v) => setCardType(v as CardType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CARD_TYPES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {CARD_TYPES.find((c) => c.value === cardType)?.description}
                {suggestedCard && suggestedCard !== cardType
                  ? ` · Tip: ${cardLabel(suggestedCard)} usually fits your occupation.`
                  : ""}
              </p>
            </div>

            <Button className="w-full" onClick={savePersonal} disabled={update.isPending}>
              Save profile
            </Button>
          </CardContent>
        </Card>

        <AppearanceSettings />

        <Separator />

        <p className="rounded-xl border border-dashed border-border p-3 text-xs leading-relaxed text-muted-foreground">
          Your saved places and profile are used only to personalise planning and fare estimates,
          and are visible only to your account. We never sell your data.{" "}
          <Link to="/legal" className="font-medium text-primary underline-offset-4 hover:underline">
            Read the privacy notice
          </Link>
          .
        </p>

        <Button variant="outline" className="w-full text-destructive" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </MobileShell>
  );
}

function Stat({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-ink-foreground/15 bg-ink-foreground/10 p-3">
      <div className="mb-1 flex justify-center text-primary-glow">{icon}</div>
      <p className="text-sm font-semibold">{value}</p>
      <p className="text-[11px] text-ink-foreground/60">{label}</p>
    </div>

  );
}
