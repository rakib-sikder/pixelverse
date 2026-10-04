import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { REPO_URL } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo />
          <span className="text-lg font-semibold tracking-tight">PixelVerse</span>
        </Link>

        <div className="flex items-center gap-4">
          <p className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
            <ShieldCheck className="size-3.5" aria-hidden />
            Your images stay on your device
          </p>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Source on GitHub"
          >
            <GithubMark />
          </a>
        </div>
      </div>
    </header>
  );
}

/** lucide-react v1 dropped brand marks, so this one is inline. */
function GithubMark() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden focusable="false">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

function Logo() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-6 text-primary"
      fill="none"
      aria-hidden
      focusable="false"
    >
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="9" cy="9" r="1.9" fill="currentColor" />
      <path
        d="M4 17.5 9.4 12l3.3 3.4L16.2 11l4 5.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
