"use client";

import Image from "next/image";
import {
  AlertTriangle,
  ArrowRight,
  Cloud,
  Download,
  Loader2,
  MonitorSmartphone,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FORMATS } from "@/lib/formats";
import { formatBytes } from "@/lib/engine/router";
import { downloadBlob } from "@/lib/download";
import { cn } from "@/lib/utils";
import { useConverterStore, type QueueItem } from "@/store/use-converter-store";

export function FileCard({ item }: { item: QueueItem }) {
  const removeItem = useConverterStore((s) => s.removeItem);
  const outputNameFor = useConverterStore((s) => s.outputNameFor);
  const targetLabel = useConverterStore((s) => FORMATS[s.settings.target].label);

  const result = item.result;
  const savedPercent = result
    ? Math.round(((item.file.size - result.blob.size) / item.file.size) * 100)
    : null;

  return (
    <li
      className={cn(
        "flex items-center gap-4 rounded-xl border bg-card p-3 transition-colors",
        item.status === "error" ? "border-destructive/40 bg-destructive/5" : "border-border",
      )}
    >
      <Thumbnail item={item} />

      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-sm font-medium" title={item.file.name}>
          {item.file.name}
        </p>

        {item.status === "error" ? (
          <div className="space-y-0.5">
            <p className="flex items-start gap-1.5 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {item.error}
            </p>
            {item.suggestion ? (
              <p className="pl-5 text-xs text-muted-foreground">{item.suggestion}</p>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span>{item.from ? FORMATS[item.from].label : "Reading…"}</span>
            <ArrowRight className="size-3" aria-hidden />
            <span>{targetLabel}</span>
            <span aria-hidden>·</span>
            <span className="tabular-nums">{formatBytes(item.file.size)}</span>

            {result ? (
              <>
                <ArrowRight className="size-3" aria-hidden />
                <span className="font-medium tabular-nums text-foreground">
                  {formatBytes(result.blob.size)}
                </span>
                {savedPercent !== null && savedPercent > 0 ? (
                  <Badge variant="secondary" className="font-normal">
                    {savedPercent}% smaller
                  </Badge>
                ) : null}
                {savedPercent !== null && savedPercent < 0 ? (
                  <Badge variant="outline" className="font-normal">
                    {Math.abs(savedPercent)}% larger
                  </Badge>
                ) : null}
                <span aria-hidden>·</span>
                <span className="tabular-nums">
                  {result.width}×{result.height}
                </span>
                <EngineBadge engine={result.engine} />
              </>
            ) : null}
          </div>
        )}

        {result?.targetMissed ? (
          <p className="text-xs text-amber-600 dark:text-amber-500">
            Could not reach your size limit even at the lowest quality — this is the smallest
            possible. Try resizing the image down as well.
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {item.status === "converting" ? (
          <Loader2 className="mr-1 size-4 animate-spin text-muted-foreground" aria-label="Converting" />
        ) : null}

        {result ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadBlob(result.blob, outputNameFor(item.id))}
          >
            <Download className="size-3.5" />
            Save
          </Button>
        ) : null}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => removeItem(item.id)}
          aria-label={`Remove ${item.file.name}`}
        >
          <X className="size-4" />
        </Button>
      </div>
    </li>
  );
}

function Thumbnail({ item }: { item: QueueItem }) {
  // The converted result is the more useful preview once it exists — it is what
  // the user is about to download.
  const source = item.result?.url ?? item.sourceUrl;

  return (
    <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
      {item.from === "heic" && !item.result ? (
        // Browsers cannot display HEIC, so a preview would render broken.
        <span className="flex size-full items-center justify-center text-[10px] font-medium text-muted-foreground">
          HEIC
        </span>
      ) : (
        <Image
          src={source}
          alt=""
          fill
          sizes="48px"
          className="object-cover"
          // Blob URLs cannot go through the Next.js optimiser.
          unoptimized
        />
      )}
    </div>
  );
}

function EngineBadge({ engine }: { engine: "client" | "server" }) {
  const local = engine === "client";
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Badge variant="outline" className="gap-1 font-normal">
            {local ? <MonitorSmartphone className="size-3" /> : <Cloud className="size-3" />}
            {local ? "On your device" : "Server"}
          </Badge>
        }
      />
      <TooltipContent>
        {local
          ? "Converted in your browser. This file was never uploaded."
          : "TIFF encoding is not available in browsers, so this one file was sent to the server and discarded straight after."}
      </TooltipContent>
    </Tooltip>
  );
}
