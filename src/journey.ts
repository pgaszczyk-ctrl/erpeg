import { api } from './api';

// Rides take time: a coach or a train goes PODROZ_KMH along a straight line
// (so hopping station to station is never faster than riding straight). The
// ride runs by the server's clock, also with the game closed; meanwhile the
// screen shows a bar with the cart moving from one sign to the other. The
// arrival station is the load point at once (a bench on the platform, no
// healing), so logging out on the way neither loses the trip nor takes the
// hero home for free. Test characters (immortal) ride at once.

/** Speed of every ride, km/h. */
export const PODROZ_KMH = 80;

export interface Journey {
  /** Where from and where to (names for the signs). */
  from: string;
  to: string;
  km: number;
  /** Server time (ms) of departure and arrival. */
  start: number;
  end: number;
  /** A train (long distance) or a coach. */
  train?: boolean;
}

export function rideMs(km: number) {
  return Math.round((km / PODROZ_KMH) * 3_600_000);
}

/** Server time minus the phone's (so the phone clock can't shorten a ride). */
let offset = 0;
export async function syncClock() {
  try {
    const t0 = Date.now();
    const server = new Date(await api.now()).getTime();
    offset = server - (t0 + Date.now()) / 2;
  } catch {
    // Offline: the phone's clock.
  }
}
export const serverNow = () => Date.now() + offset;

function fmtLeft(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h} godz. ${m} min` : m ? `${m} min ${String(sec).padStart(2, '0')} s` : `${sec} s`;
}

function fmtClock(t: number) {
  const d = new Date(t - offset);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Ride time for the coachman's list, e.g. "ok. 19 min". */
export function rideText(km: number) {
  const ms = rideMs(km);
  const min = Math.round(ms / 60_000);
  return min >= 60 ? `ok. ${Math.floor(min / 60)} godz. ${min % 60 ? `${min % 60} min` : ''}`.trim() : `ok. ${Math.max(1, min)} min`;
}

/** The ride screen until arrival; resolves when the cart gets there. */
export function showJourney(j: Journey): Promise<void> {
  document.getElementById('journey')?.remove();
  const box = document.createElement('div');
  box.id = 'journey';
  box.style.cssText = 'position:fixed;inset:0;z-index:70;background:#141a14;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:16px;font-family:monospace;color:#fff;text-align:center;';
  const icon = j.train ? '🚂' : '🐴';
  box.innerHTML = `
    <div style="font-size:20px;color:#f7c531">${icon} W drodze</div>
    <div style="width:min(92vw,560px)">
      <div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:8px"><span class="j-a"></span><span class="j-b"></span></div>
      <div style="position:relative;height:44px">
        <div style="position:absolute;left:0;right:0;top:30px;height:6px;background:#3a3a44;border-radius:3px"></div>
        <div class="j-fill" style="position:absolute;left:0;top:30px;height:6px;background:#f7c531;border-radius:3px;width:0"></div>
        <div class="j-cart" style="position:absolute;top:0;font-size:28px;transform:translateX(-50%) scaleX(-1)">${icon}</div>
        <div style="position:absolute;left:-4px;top:12px;font-size:18px">🪧</div>
        <div style="position:absolute;right:-4px;top:12px;font-size:18px">🪧</div>
      </div>
    </div>
    <div class="j-left" style="font-size:16px"></div>
    <div class="j-eta" style="font-size:14px;color:#bbb"></div>
    <div style="font-size:12px;color:#888;max-width:420px">Możesz zamknąć grę – podróż trwa dalej. Gdy wrócisz po przyjeździe, będziesz już na peronie.</div>`;
  box.querySelector('.j-a')!.textContent = j.from;
  box.querySelector('.j-b')!.textContent = j.to;
  box.querySelector('.j-eta')!.textContent = `${j.km.toFixed(0)} km · przyjazd ok. ${fmtClock(j.end)}`;
  document.body.append(box);
  return new Promise((done) => {
    const tick = () => {
      if (!box.isConnected) return done();
      const now = serverNow();
      const f = Math.min(1, Math.max(0, (now - j.start) / Math.max(1, j.end - j.start)));
      (box.querySelector('.j-fill') as HTMLElement).style.width = `${f * 100}%`;
      (box.querySelector('.j-cart') as HTMLElement).style.left = `${f * 100}%`;
      box.querySelector('.j-left')!.textContent = now >= j.end ? 'Dojeżdżamy…' : `Zostało ${fmtLeft(j.end - now)}`;
      if (now >= j.end) {
        setTimeout(() => {
          box.remove();
          done();
        }, 600);
        return;
      }
      setTimeout(tick, 250);
    };
    tick();
  });
}

export const journeyOpen = () => !!document.getElementById('journey');
