// The character's recent log: what the game said and asked (toasts, dialogs and
// the buttons chosen), errors, map changes and where the hero walked. Kept only in
// memory (the last MAX entries) and sent with a bug report ("🐞 Znalazłem buga").

const MAX = 80;
const t0 = Date.now();
const entries: { t: number; e: string }[] = [];

/** Adds one line to the log. */
export function note(e: string) {
  entries.push({ t: Math.round((Date.now() - t0) / 1000), e: e.replace(/\s+/g, ' ').slice(0, 160) });
  if (entries.length > MAX) entries.splice(0, entries.length - MAX);
}

/** The log for a bug report: seconds since the page opened + the line. */
export function recentLog() {
  return entries.map(({ t, e }) => `${t}s ${e}`);
}
