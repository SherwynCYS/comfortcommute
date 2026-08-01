import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Check, Monitor, Moon, Palette, Sun } from "lucide-react";
import { ACCENT_PRESETS, accentSwatch, useTheme, type ThemeMode } from "@/lib/theme";
import { cn } from "@/lib/utils";

const MODES: { value: ThemeMode; label: string; icon: React.ElementType }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function AppearanceSettings() {
  const theme = useTheme();

  return (
    <Card className="border-border/70 shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-mint text-primary">
            <Palette className="h-4 w-4" />
          </span>
          Appearance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>Theme</Label>
          <div className="grid grid-cols-3 gap-2">
            {MODES.map((mode) => {
              const Icon = mode.icon;
              const active = theme.mode === mode.value;
              return (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => theme.setMode(mode.value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-all",
                    active
                      ? "border-primary bg-accent text-accent-foreground shadow-soft"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {mode.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <Label>Colour scheme</Label>
          <div className="grid grid-cols-6 gap-2">
            {ACCENT_PRESETS.map((preset) => {
              const active = theme.accentId === preset.id && theme.hue === preset.hue;
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-label={preset.label}
                  title={preset.label}
                  onClick={() => theme.setAccent(preset)}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-full ring-offset-2 ring-offset-background transition-all",
                    active ? "ring-2 ring-primary" : "hover:scale-105",
                  )}
                  style={{ backgroundColor: accentSwatch(preset.hue, preset.chroma) }}
                >
                  {active && <Check className="h-4 w-4 text-primary-foreground" />}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Fine-tune your own shade — the whole app follows it instantly.
          </p>
          <Slider
            value={[theme.hue]}
            min={0}
            max={360}
            step={1}
            onValueChange={([hue]) =>
              theme.setAccent({ id: "custom", hue: hue ?? theme.hue, chroma: theme.chroma })
            }
          />
          <div className="flex items-center gap-3">
            <span
              className="h-8 w-8 shrink-0 rounded-full border border-border"
              style={{ backgroundColor: accentSwatch(theme.hue, theme.chroma) }}
            />
            <div className="flex-1 space-y-1">
              <p className="text-xs text-muted-foreground">Intensity</p>
              <Slider
                value={[Math.round(theme.chroma * 1000)]}
                min={20}
                max={160}
                step={1}
                onValueChange={([c]) =>
                  theme.setAccent({
                    id: "custom",
                    hue: theme.hue,
                    chroma: (c ?? theme.chroma * 1000) / 1000,
                  })
                }
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
