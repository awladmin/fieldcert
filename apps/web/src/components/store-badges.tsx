function AppleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-7 fill-current" aria-hidden="true">
      <path d="M17.05 12.54c-.03-2.89 2.36-4.27 2.47-4.34-1.35-1.97-3.44-2.24-4.18-2.27-1.78-.18-3.47 1.05-4.37 1.05-.9 0-2.29-1.02-3.77-1-1.94.03-3.72 1.13-4.72 2.86-2.01 3.49-.51 8.66 1.45 11.49.96 1.39 2.1 2.94 3.6 2.88 1.45-.06 2-.93 3.74-.93 1.75 0 2.24.93 3.77.9 1.56-.03 2.55-1.41 3.5-2.8 1.1-1.61 1.55-3.17 1.58-3.25-.04-.02-3.03-1.16-3.07-4.59zM14.16 4.06c.8-.97 1.34-2.32 1.19-3.66-1.15.05-2.55.77-3.38 1.73-.74.86-1.39 2.23-1.22 3.55 1.29.1 2.6-.65 3.41-1.62z" />
    </svg>
  );
}

function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
      <path d="M3.6 1.8a2 2 0 0 0-.6 1.45v17.5a2 2 0 0 0 .6 1.45l.1.09L13.55 12.4v-.23L3.7 1.7l-.1.1z" fill="#00D7FE" />
      <path d="M16.83 15.7l-3.28-3.3v-.23l3.28-3.3.07.05 3.9 2.22c1.11.63 1.11 1.66 0 2.3l-3.9 2.21-.07.05z" fill="#FFCE00" />
      <path d="M16.9 15.65l-3.35-3.37L3.6 22.2c.37.4.98.44 1.66.05l11.64-6.6" fill="#FF3A44" />
      <path d="M16.9 8.92L5.26 2.33c-.68-.39-1.29-.34-1.66.05l9.95 9.9 3.35-3.36z" fill="#00F076" />
    </svg>
  );
}

function Badge({ glyph, top, bottom }: { glyph: React.ReactNode; top: string; bottom: string }) {
  return (
    <span className="flex items-center gap-3 rounded-xl bg-zinc-900 px-5 py-2.5 text-white shadow-md ring-1 ring-white/10">
      {glyph}
      <span className="flex flex-col text-left leading-tight">
        <span className="text-[10px] tracking-wide uppercase opacity-80">{top}</span>
        <span className="text-lg font-semibold">{bottom}</span>
      </span>
    </span>
  );
}

export function AppStoreBadge() {
  return <Badge glyph={<AppleGlyph />} top="Coming soon on the" bottom="App Store" />;
}

export function GooglePlayBadge() {
  return <Badge glyph={<PlayGlyph />} top="Coming soon on" bottom="Google Play" />;
}
