import { TEST, TEST_POSTACIE } from './version';
import { BOHATEROWIE } from './content/wyglad';
import type { Look } from './look';

// One draw for this pack, without replacement: Arceus and Jam start with different new heroes.
// Choices are separate from the shared production save, and remain stable on this device (also after 1.015).
const FIRST_DRAW = [0, 12];
const key = (name: string) => `exp-test-avatar25:${name.toLowerCase()}`;

export function testLook(original: Look, name: string): Look {
  if (!TEST) return original;
  let stored: number | undefined;
  try {
    const raw = localStorage.getItem(key(name));
    const n = raw === null ? NaN : Number(raw);
    if (Number.isInteger(n) && n >= 0 && n < BOHATEROWIE.length) stored = n;
  } catch { /* Browser storage may be unavailable; the initial draw still gives a valid hero. */ }
  const index = TEST_POSTACIE.findIndex(n => n.toLowerCase() === name.toLowerCase());
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  const look = { ...original, postac: stored ?? FIRST_DRAW[index] ?? hash % BOHATEROWIE.length };
  rememberTestLook(look, name);
  return look;
}

export function rememberTestLook(look: Look, name: string) {
  if (!TEST || look.postac === undefined) return;
  try { localStorage.setItem(key(name), String(look.postac)); } catch { /* Drawing and choosing still work. */ }
}
