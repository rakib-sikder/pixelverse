"use client";

import { useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { decodableLabels, dropzoneAccept } from "@/lib/formats";

interface DropzoneProps {
  onFiles: (files: File[]) => void;
  /** Shrinks to a bar once the queue has something in it. */
  compact: boolean;
}

export function Dropzone({ onFiles, compact }: DropzoneProps) {
  const onDrop = useCallback((accepted: File[]) => {
    if (accepted.length > 0) onFiles(accepted);
  }, [onFiles]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: dropzoneAccept(),
    // The dropzone wraps the whole page area, so a click on the surrounding
    // layout should not open a file picker.
    noClick: compact,
    noKeyboard: compact,
  });

  // Pasting a screenshot is how a lot of people get an image into a converter,
  // and it costs one listener.
  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const files = Array.from(event.clipboardData?.files ?? []);
      if (files.length > 0) {
        event.preventDefault();
        onFiles(files);
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [onFiles]);

  if (compact) {
    return (
      <div {...getRootProps()} className="contents">
        <input {...getInputProps()} />
        <button
          type="button"
          onClick={open}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-ring hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <ImagePlus className="size-4" />
          Add more images
          <span className="text-xs opacity-60">or drop them anywhere</span>
        </button>
        {isDragActive ? <DragOverlay /> : null}
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      role="button"
      tabIndex={0}
      aria-label="Add images to convert"
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-20 text-center transition-colors",
        "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        isDragActive
          ? "border-primary bg-primary/5"
          : "border-border hover:border-ring hover:bg-muted/40",
      )}
    >
      <input {...getInputProps()} />
      <div className="rounded-full bg-muted p-4">
        <ImagePlus className="size-7 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-1.5">
        <p className="text-lg font-medium">
          {isDragActive ? "Drop them here" : "Drop images here"}
        </p>
        <p className="text-sm text-muted-foreground">
          or click to browse, or paste from your clipboard
        </p>
      </div>
      <p className="max-w-md text-xs leading-relaxed text-muted-foreground">{decodableLabels()}</p>
    </div>
  );
}

function DragOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-primary/10 backdrop-blur-sm">
      <p className="rounded-xl bg-background px-6 py-4 text-lg font-medium shadow-lg">
        Drop to add
      </p>
    </div>
  );
}
