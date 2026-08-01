import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { searchPlaces, type PlaceResult } from "@/lib/places.functions";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, TrainFront, Bus, X } from "lucide-react";

type Props = {
  id: string;
  label: string;
  value: PlaceResult | null;
  onChange: (place: PlaceResult | null) => void;
  placeholder?: string;
  saved?: PlaceResult[];
};

export function PlaceSearch({ id, label, value, onChange, placeholder, saved = [] }: Props) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const searchFn = useServerFn(searchPlaces);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const { data, isFetching } = useQuery({
    queryKey: ["places", debounced],
    queryFn: () => searchFn({ data: { query: debounced, limit: 15 } }),
    enabled: open,
    staleTime: 1000 * 60 * 10,
  });

  const results = useMemo(() => data ?? [], [data]);

  return (
    <div className="space-y-2" ref={containerRef}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          autoComplete="off"
          value={open ? query : (value?.name ?? "")}
          placeholder={placeholder ?? "Search a place, address, MRT or bus stop"}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onChange={(e) => setQuery(e.target.value)}
        />
        {value && !open && (
          <button
            type="button"
            aria-label={`Clear ${label}`}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            onClick={() => onChange(null)}
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {open && isFetching && (
          <Loader2 className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}

        {open && (
          <div className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
            {query.trim().length === 0 && saved.length > 0 && (
              <div className="mb-1 border-b pb-1">
                <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Saved
                </p>
                {saved.map((place) => (
                  <button
                    key={`saved-${place.id}`}
                    type="button"
                    className="flex w-full items-start gap-2 rounded-sm px-3 py-2 text-left text-sm hover:bg-accent"
                    onClick={() => {
                      onChange(place);
                      setOpen(false);
                    }}
                  >
                    <span className="mt-0.5 text-primary">
                      {place.type === "rail" ? (
                        <TrainFront className="h-4 w-4" />
                      ) : place.type === "bus" ? (
                        <Bus className="h-4 w-4" />
                      ) : (
                        <Star className="h-4 w-4" />
                      )}
                    </span>
                    <span>
                      <span className="block font-medium">{place.name}</span>
                      <span className="block text-xs text-muted-foreground">{place.description}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
            {results.length === 0 && !isFetching && query.trim().length > 0 && (
              <p className="px-3 py-2 text-sm text-muted-foreground">No matching places</p>
            )}
            {results.map((place) => (
              <button
                key={place.id}
                type="button"
                className="flex w-full items-start gap-2 rounded-sm px-3 py-2 text-left text-sm hover:bg-accent"
                onClick={() => {
                  onChange(place);
                  setOpen(false);
                }}
              >
                <span className="mt-0.5 text-muted-foreground">
                  {place.type === "rail" ? (
                    <TrainFront className="h-4 w-4" />
                  ) : place.type === "bus" ? (
                    <Bus className="h-4 w-4" />
                  ) : (
                    <MapPin className="h-4 w-4" />
                  )}
                </span>
                <span>
                  <span className="block font-medium">{place.name}</span>
                  <span className="block text-xs text-muted-foreground">{place.description}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
