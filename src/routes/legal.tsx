import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Database, Gavel, Info, Lock, TriangleAlert } from "lucide-react";

export const Route = createFileRoute("/legal")({
  component: LegalPage,
  head: () => ({
    meta: [
      { title: "Disclaimer & Data Sources | ComfortCommute" },
      {
        name: "description",
        content:
          "ComfortCommute disclaimer, third-party data attribution, AI limitations, privacy notice and terms of use.",
      },
      { property: "og:title", content: "Disclaimer & Data Sources | ComfortCommute" },
      {
        property: "og:description",
        content:
          "ComfortCommute disclaimer, third-party data attribution, AI limitations, privacy notice and terms of use.",
      },
      { property: "og:type", content: "article" },
      { property: "og:image", content: "https://comfortcommute.lovable.app/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://comfortcommute.lovable.app/og-image.png" },
    ],
  }),
});

const sections = [
  {
    icon: TriangleAlert,
    title: "No guarantee of accuracy",
    body: [
      "ComfortCommute provides journey suggestions for informational purposes only. Travel times, arrival and departure times, fares, crowd levels, seat likelihood and accessibility indicators are estimates derived from third-party and predictive data.",
      "Real conditions change constantly. Service disruptions, weather, engineering works and demand surges can make any estimate wrong. Always confirm with the official operator app, station signage or staff before relying on a journey.",
      "Fare figures are indicative estimates based on distance and the concession card you select. They are not quotations and do not account for every promotion, transfer rule, capping scheme or card balance condition.",
    ],
  },
  {
    icon: Database,
    title: "Third-party data & attribution",
    body: [
      "Public transport data, including bus arrivals, bus stops, passenger volume and train service alerts, is retrieved from the Land Transport Authority (LTA) DataMall and remains the property of LTA. Use is subject to the LTA DataMall terms and conditions.",
      "Routing, transit itineraries and geocoding are powered by Google Maps Platform and are subject to the Google Maps Platform Terms of Service, including its Acceptable Use Policy. Map and place data may also derive from OpenStreetMap contributors, licensed under the Open Database Licence (ODbL).",
      "ComfortCommute is an independent project built for the Nebula X (NUS) hackathon. It is not affiliated with, sponsored by, endorsed by or operated by the Land Transport Authority, SMRT, SBS Transit, Tower Transit, Go-Ahead Singapore, Google or any other transport operator. All trademarks belong to their respective owners.",
    ],
  },
  {
    icon: Info,
    title: "AI-generated recommendations",
    body: [
      "Route rankings and explanations are generated in part by an AI language model. AI output can be incomplete, outdated or incorrect, and should be treated as a suggestion rather than advice.",
      "Comfort, seat availability and crowd signals are probabilistic predictions, not measurements. They must not be relied upon by anyone with mobility, medical or accessibility needs as a substitute for confirming conditions directly with the operator.",
    ],
  },
  {
    icon: Lock,
    title: "Your data & privacy",
    body: [
      "We store only what you give us: your account email, display name, optional occupation and fare card type, your saved home and work locations, saved routes and stops, and the alerts generated for you.",
      "Your saved places and profile are used solely to personalise planning and fare estimates inside the app. We do not sell your data or share it with advertisers. Search queries you type may be sent to our geocoding and routing providers in order to return results.",
      "Your records are protected by row-level access controls so that only your signed-in account can read or modify them. You can edit or clear your saved places and profile at any time from the Profile screen; deleting your account removes the associated records.",
      "We do not perform continuous background location tracking. The app only uses the origins and destinations you enter or save.",
    ],
  },
  {
    icon: Gavel,
    title: "Terms of use & liability",
    body: [
      "ComfortCommute is provided \"as is\" and \"as available\", without warranties of any kind, express or implied, including fitness for a particular purpose. Availability of the service and of upstream data feeds is not guaranteed.",
      "To the maximum extent permitted by law, the project team accepts no liability for any loss, missed connection, missed appointment, additional cost, injury or damage arising from the use of, or reliance on, information presented in this app.",
      "Do not use the app while operating a vehicle, and follow all instructions from transport staff and official signage. Use of the service must comply with the terms of the underlying data providers.",
    ],
  },
];

function LegalPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-hero px-4 py-10 text-ink-foreground">
        <div className="mx-auto max-w-3xl">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-ink-foreground/70 transition-colors hover:text-ink-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to ComfortCommute
          </Link>
          <h1 className="mt-5 text-3xl font-bold md:text-4xl">Disclaimer, data &amp; privacy</h1>
          <p className="mt-3 max-w-2xl text-sm text-ink-foreground/75">
            Please read this before relying on any journey, fare or crowd estimate shown in
            ComfortCommute.
          </p>
          <p className="mt-4 text-xs text-ink-foreground/55">Last updated: 1 August 2026</p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-4 py-10">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title} className="border-border/70 shadow-soft">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-base">
                  <h2 className="flex items-center gap-3 text-base font-semibold">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                      <Icon className="h-4 w-4" />
                    </span>
                    {section.title}
                  </h2>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                {section.body.map((paragraph) => (
                  <p key={paragraph.slice(0, 32)}>{paragraph}</p>
                ))}
              </CardContent>
            </Card>
          );
        })}

        <p className="pt-2 text-center text-xs text-muted-foreground">
          Questions about this notice? Reach the team through the hackathon submission page.
        </p>
      </main>
    </div>
  );
}
