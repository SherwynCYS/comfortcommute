import { Link } from "@tanstack/react-router";

export function LegalFooter({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? "px-4 pb-4 text-center text-[11px] leading-relaxed text-muted-foreground"
          : "border-t border-border/60 px-4 py-8 text-center text-xs leading-relaxed text-muted-foreground"
      }
    >
      <p className="mx-auto max-w-2xl">
        Estimates only — journey times, fares, crowd levels and seat likelihood are indicative and
        may differ from actual conditions. Always check official operator information before
        travelling.
      </p>
      <p className="mx-auto mt-2 max-w-2xl">
        Data from LTA DataMall, Google Maps Platform and OpenStreetMap. ComfortCommute is an
        independent student project and is not affiliated with, endorsed by or operated by LTA, SMRT,
        SBS Transit or Google.
      </p>
      <p className="mt-3">
        <Link to="/legal" className="font-medium text-primary underline-offset-4 hover:underline">
          Disclaimer, data sources &amp; privacy
        </Link>
      </p>
    </div>
  );
}
