"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { encodableFormats, FORMATS, type FormatId } from "@/lib/formats";
import type { ResizeSpec } from "@/lib/engine/types";
import { useConverterStore } from "@/store/use-converter-store";

export function SettingsPanel() {
  const settings = useConverterStore((s) => s.settings);
  const setTarget = useConverterStore((s) => s.setTarget);
  const patchSettings = useConverterStore((s) => s.patchSettings);
  const resetOps = useConverterStore((s) => s.resetOps);

  const target = FORMATS[settings.target];
  const outputs = encodableFormats();

  return (
    <div className="space-y-6">
      <Field label="Convert to" htmlFor="target-format">
        <Select
          value={settings.target}
          onValueChange={(value) => setTarget(value as FormatId)}
          items={outputs.map((format) => ({ value: format.id, label: format.label }))}
        >
          <SelectTrigger id="target-format" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {outputs.map((format) => (
              <SelectItem key={format.id} value={format.id}>
                <span className="font-medium">{format.label}</span>
                <span className="ml-2 text-xs text-muted-foreground">{format.blurb}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{target.blurb}</p>
      </Field>

      {target.quality && !settings.lossless ? (
        <Field
          label="Quality"
          htmlFor="quality"
          aside={<span className="tabular-nums text-muted-foreground">{settings.quality}</span>}
        >
          <Slider
            id="quality"
            min={target.quality.min}
            max={target.quality.max}
            value={settings.quality}
            onValueChange={(value) =>
              patchSettings({ quality: Array.isArray(value) ? value[0] : value })
            }
            disabled={settings.targetKb !== null}
          />
          <p className="text-xs text-muted-foreground">
            {settings.targetKb !== null
              ? "Quality is chosen automatically to hit your size limit."
              : target.quality.hint}
          </p>
        </Field>
      ) : null}

      {target.lossless ? (
        <Toggle
          id="lossless"
          label="Lossless"
          description={`Keep every pixel exactly. Larger files.${
            settings.target === "png" ? " PNG is always lossless." : ""
          }`}
          checked={settings.target === "png" ? true : settings.lossless}
          disabled={settings.target === "png"}
          onChange={(checked) => patchSettings({ lossless: checked })}
        />
      ) : null}

      {settings.target === "png" ? (
        <Toggle
          id="optimize"
          label="Optimise with oxipng"
          description="Roughly 10–20% smaller. Takes noticeably longer."
          checked={settings.optimize}
          onChange={(checked) => patchSettings({ optimize: checked })}
        />
      ) : null}

      {target.quality ? <TargetSizeField /> : null}

      <ResizeField />

      <BackgroundField />

      <Button variant="ghost" size="sm" onClick={resetOps} className="w-full">
        <RotateCcw className="size-3.5" />
        Reset adjustments
      </Button>
    </div>
  );
}

function TargetSizeField() {
  const targetKb = useConverterStore((s) => s.settings.targetKb);
  const patchSettings = useConverterStore((s) => s.patchSettings);

  return (
    <Field
      label="Target file size"
      htmlFor="target-size"
      aside={
        <Switch
          checked={targetKb !== null}
          onCheckedChange={(checked) => patchSettings({ targetKb: checked ? 200 : null })}
          aria-label="Limit output file size"
        />
      }
    >
      {targetKb !== null ? (
        <>
          <div className="flex items-center gap-2">
            <Input
              id="target-size"
              type="number"
              min={1}
              value={targetKb}
              onChange={(event) =>
                patchSettings({ targetKb: Math.max(1, Number(event.target.value) || 1) })
              }
              className="w-28"
            />
            <span className="text-sm text-muted-foreground">KB or smaller</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Quality is searched automatically to fit. If even the lowest quality overshoots, you
            will be told.
          </p>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          Off — the quality slider decides the size.
        </p>
      )}
    </Field>
  );
}

const RESIZE_PRESETS = [
  { label: "Original", value: "none" },
  { label: "Scale by percent", value: "percent" },
  { label: "Fit within", value: "contain" },
  { label: "Fill exactly (crops)", value: "cover" },
  { label: "Stretch to", value: "fill" },
] as const;

function ResizeField() {
  const resize = useConverterStore((s) => s.settings.ops.resize);
  const patchOps = useConverterStore((s) => s.patchOps);

  const mode: string =
    resize === null ? "none" : resize.mode === "percent" ? "percent" : resize.fit;

  function setMode(next: string) {
    if (next === "none") return patchOps({ resize: null });
    if (next === "percent") {
      return patchOps({ resize: { mode: "percent", percent: 50, noEnlarge: true } });
    }
    patchOps({
      resize: {
        mode: "dimensions",
        width: 1920,
        height: 1080,
        fit: next as "contain" | "cover" | "fill",
        noEnlarge: true,
      },
    });
  }

  function patchResize(patch: Partial<Extract<ResizeSpec, { mode: "dimensions" }>>) {
    if (!resize || resize.mode !== "dimensions") return;
    patchOps({ resize: { ...resize, ...patch } });
  }

  return (
    <Field label="Resize" htmlFor="resize-mode">
      <Select
        value={mode}
        onValueChange={(value) => setMode(String(value))}
        items={RESIZE_PRESETS.map((preset) => ({ value: preset.value, label: preset.label }))}
      >
        <SelectTrigger id="resize-mode" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RESIZE_PRESETS.map((preset) => (
            <SelectItem key={preset.value} value={preset.value}>
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {resize?.mode === "percent" ? (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            max={400}
            value={resize.percent}
            onChange={(event) =>
              patchOps({
                resize: { ...resize, percent: Math.max(1, Number(event.target.value) || 1) },
              })
            }
            className="w-24"
            aria-label="Scale percentage"
          />
          <span className="text-sm text-muted-foreground">% of original</span>
        </div>
      ) : null}

      {resize?.mode === "dimensions" ? (
        <>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              value={resize.width ?? ""}
              placeholder="auto"
              onChange={(event) =>
                patchResize({ width: event.target.value === "" ? null : Number(event.target.value) })
              }
              className="w-24"
              aria-label="Target width in pixels"
            />
            <span className="text-sm text-muted-foreground">×</span>
            <Input
              type="number"
              min={1}
              value={resize.height ?? ""}
              placeholder="auto"
              onChange={(event) =>
                patchResize({
                  height: event.target.value === "" ? null : Number(event.target.value),
                })
              }
              className="w-24"
              aria-label="Target height in pixels"
            />
            <span className="text-sm text-muted-foreground">px</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Leave one side blank to keep the aspect ratio.
          </p>
        </>
      ) : null}

      {resize ? (
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={resize.noEnlarge}
            onCheckedChange={(checked) => patchOps({ resize: { ...resize, noEnlarge: checked } })}
          />
          Never enlarge
        </label>
      ) : null}
    </Field>
  );
}

function BackgroundField() {
  const target = useConverterStore((s) => FORMATS[s.settings.target]);
  const background = useConverterStore((s) => s.settings.ops.background);
  const patchOps = useConverterStore((s) => s.patchOps);

  const forced = !target.alpha;

  return (
    <Field label="Background" htmlFor="background">
      <div className="flex items-center gap-2">
        <input
          id="background"
          type="color"
          value={background ?? "#ffffff"}
          onChange={(event) => patchOps({ background: event.target.value })}
          className="h-8 w-14 cursor-pointer rounded-md border border-input bg-transparent"
        />
        {background !== null ? (
          <Button variant="ghost" size="sm" onClick={() => patchOps({ background: null })}>
            Clear
          </Button>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        {forced
          ? `${target.label} has no transparency, so transparent areas are filled with this colour — white unless you change it.`
          : "Only used if you set one. Transparency is kept otherwise."}
      </p>
    </Field>
  );
}

function Field({
  label,
  htmlFor,
  aside,
  children,
}: {
  label: string;
  htmlFor: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={htmlFor}>{label}</Label>
        {aside}
      </div>
      {children}
    </div>
  );
}

function Toggle({
  id,
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-1">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Tooltip>
        <TooltipTrigger
          render={
            <Switch
              id={id}
              checked={checked}
              disabled={disabled}
              onCheckedChange={onChange}
              className="mt-0.5"
            />
          }
        />
        {disabled ? <TooltipContent>This format is always lossless.</TooltipContent> : null}
      </Tooltip>
    </div>
  );
}
