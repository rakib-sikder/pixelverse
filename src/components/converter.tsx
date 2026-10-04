"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Loader2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dropzone } from "@/components/dropzone";
import { FileCard } from "@/components/file-card";
import { SettingsPanel } from "@/components/settings-panel";
import { downloadZip } from "@/lib/download";
import { formatBytes } from "@/lib/engine/router";
import type { FormatId } from "@/lib/formats";
import { useConverterStore } from "@/store/use-converter-store";

type ConverterProps = {
  /** Preselects the output format, so a landing page opens on the conversion
      it is about rather than on the default. */
  target?: FormatId;
};

export function Converter({ target }: ConverterProps = {}) {
  const items = useConverterStore((s) => s.items);
  const setTarget = useConverterStore((s) => s.setTarget);
  const isConverting = useConverterStore((s) => s.isConverting);
  const addFiles = useConverterStore((s) => s.addFiles);
  const clearAll = useConverterStore((s) => s.clearAll);
  const convertAll = useConverterStore((s) => s.convertAll);
  const outputNameFor = useConverterStore((s) => s.outputNameFor);

  const [isZipping, setIsZipping] = useState(false);

  useEffect(() => {
    if (target) setTarget(target);
  }, [target, setTarget]);

  const onFiles = useCallback(
    (files: File[]) => {
      void addFiles(files);
    },
    [addFiles],
  );

  const done = items.filter((item) => item.result !== null);
  const convertible = items.filter((item) => item.from !== null);

  const totalIn = done.reduce((sum, item) => sum + item.file.size, 0);
  const totalOut = done.reduce((sum, item) => sum + (item.result?.blob.size ?? 0), 0);

  async function handleConvert() {
    await convertAll();

    const { items: latest } = useConverterStore.getState();
    const failed = latest.filter((item) => item.status === "error").length;
    const succeeded = latest.filter((item) => item.result !== null).length;

    if (succeeded > 0 && failed === 0) {
      toast.success(`Converted ${succeeded} ${succeeded === 1 ? "image" : "images"}.`);
    } else if (succeeded > 0) {
      toast.warning(`Converted ${succeeded}, but ${failed} could not be done.`);
    } else if (failed > 0) {
      toast.error("Nothing could be converted. See the messages on each file.");
    }
  }

  async function handleDownloadAll() {
    setIsZipping(true);
    try {
      await downloadZip(
        done.map((item) => ({ blob: item.result!.blob, filename: outputNameFor(item.id) })),
        `pixelverse-${new Date().toISOString().slice(0, 10)}.zip`,
      );
    } catch {
      toast.error("The ZIP could not be built. Try saving the files individually.");
    } finally {
      setIsZipping(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <Dropzone onFiles={onFiles} compact={false} />
      </div>
    );
  }

  return (
    <div className="grid w-full gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
      <div className="min-w-0 space-y-4">
        <Dropzone onFiles={onFiles} compact />

        <ul className="space-y-2">
          {items.map((item) => (
            <FileCard key={item.id} item={item} />
          ))}
        </ul>

        {done.length > 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            {done.length} of {items.length} converted —{" "}
            <span className="tabular-nums">{formatBytes(totalIn)}</span> became{" "}
            <span className="font-medium tabular-nums text-foreground">
              {formatBytes(totalOut)}
            </span>
            {totalIn > 0 ? (
              <> ({Math.round(((totalIn - totalOut) / totalIn) * 100)}% saved)</>
            ) : null}
          </p>
        ) : null}
      </div>

      {/* Sticky so the settings stay reachable while scrolling a long queue. */}
      <Card className="lg:sticky lg:top-6">
        <CardContent className="space-y-6">
          <SettingsPanel />

          <Separator />

          <div className="space-y-2">
            <Button
              className="w-full"
              size="lg"
              onClick={handleConvert}
              disabled={isConverting || convertible.length === 0}
            >
              {isConverting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {isConverting
                ? "Converting…"
                : `Convert ${convertible.length} ${convertible.length === 1 ? "image" : "images"}`}
            </Button>

            {done.length > 1 ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleDownloadAll}
                disabled={isZipping}
              >
                {isZipping ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                Download all as ZIP
              </Button>
            ) : null}

            <Button variant="ghost" className="w-full" onClick={clearAll} disabled={isConverting}>
              <Trash2 className="size-4" />
              Clear queue
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
