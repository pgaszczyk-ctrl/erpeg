import { tx } from "../i18n";
import { resetKeys, resetTouch } from "../controls";
import { audio } from "../sfx";
/** One lightweight compositor scene; the real world can load behind the clouds. */
export function flight(
  hero: string | string[] | undefined,
  describe: (e: unknown) => string = (e) =>
    e instanceof Error ? e.message : String(e),
) {
  resetKeys();
  resetTouch();
  const root = document.createElement("div");
  root.id = "artillery-flight";
  root.className = "m-screen";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", tx("Lot armatą", "Cannon flight"));
  root.innerHTML = `<style>#artillery-flight{z-index:10020;background:linear-gradient(#488cb0,#d7eff0);overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:end;padding:24px;color:#253d43}#artillery-flight .cloud{position:absolute;width:180px;height:60px;background:#fff9;border-radius:50%;animation:ma-cloud 4s linear infinite}#artillery-flight .cloud:nth-child(2){top:25%;left:10%;animation-delay:-2s}#artillery-flight .cloud:nth-child(3){top:50%;left:50%;animation-delay:-1s}#artillery-flight .cloud:nth-child(4){top:65%;left:5%}#artillery-flight .pilot{position:absolute;top:35%;left:calc(50% - 72px);width:144px;height:144px;object-fit:contain;image-rendering:pixelated;animation:ma-tumble 2.5s ease-in-out forwards}#artillery-flight:not(.launched) .pilot{animation:none;transform:translateY(120px) scale(.45)}#artillery-flight .chute{display:none;position:absolute;top:15%;width:190px;height:210px;background:repeating-linear-gradient(90deg,#e7b949 0 35px,#b25739 35px 65px);border-radius:55% 55% 0 0;border:4px solid #293d42;clip-path:polygon(0 0,100% 0,100% 35%,52% 100%,48% 100%,0 35%)}#artillery-flight.descend .chute{display:block;animation:ma-sway 2s ease-in-out infinite alternate}#artillery-flight.descend .pilot{animation:ma-sway 2s ease-in-out infinite alternate}#artillery-flight p{position:relative;background:#f6e7c6;padding:12px 20px;border:3px solid #33434a;border-radius:12px;max-width:95%;text-align:center}#artillery-flight button{position:relative;min-height:44px;padding:10px 18px;border:3px solid #33434a;border-radius:8px;background:#e9b856;margin:4px}#artillery-flight .smoke{position:absolute;left:46%;top:66%;width:65px;height:65px;border-radius:50%;background:#fff;opacity:0;box-shadow:30px -10px 0 #fff9,-20px -18px 0 #fff9}#artillery-flight.launched .smoke{animation:ma-smoke .7s ease-out forwards}@keyframes ma-smoke{0%{opacity:1;transform:scale(.2)}100%{opacity:0;transform:translateY(-90px) scale(3)}}#artillery-flight .net{position:absolute;bottom:26%;width:220px;height:55px;border-radius:0 0 50% 50%;border:4px solid #33434a;background:repeating-linear-gradient(45deg,transparent 0 11px,#33434a 12px 14px,transparent 15px 24px)}@keyframes ma-cloud{from{transform:translateX(90vw)}to{transform:translateX(-90vw)}}@keyframes ma-tumble{0%{transform:translateY(160px) scale(.4) rotate(-50deg)}50%{transform:translateY(-30px) scale(1.8) rotate(170deg)}100%{transform:scale(1) rotate(360deg)}}@keyframes ma-sway{from{transform:translateY(0) rotate(-5deg)}to{transform:translateY(18px) rotate(5deg)}}@media(prefers-reduced-motion:reduce){#artillery-flight *{animation:none!important}}</style><div class="cloud"></div><div class="cloud"></div><div class="cloud"></div><div class="cloud"></div><div class="chute"></div><div class="smoke"></div><img class="pilot" alt=""><p aria-live="polite"></p>`;
  const image = root.querySelector<HTMLImageElement>("img")!;
  const frames=Array.isArray(hero)?hero:hero?[hero]:[];if(frames.length)image.src=frames[0];else image.hidden=true;
  let wave:ReturnType<typeof setInterval>|undefined;
  const text = root.querySelector("p")!;
  text.textContent = tx(
    "Naukowiec sprawdza obliczenia…",
    "The scientist is checking the calculations…",
  );
  document.body.append(root);
  const focus = document.activeElement as HTMLElement | null;
  const key = (e: KeyboardEvent) => {
    if (e.key !== "Tab") {
      e.preventDefault();
      e.stopImmediatePropagation();
    } else {
      const b = [...root.querySelectorAll("button")];
      if (b.length) {
        e.preventDefault();
        b[
          (b.indexOf(document.activeElement as HTMLButtonElement) +
            (e.shiftKey ? -1 : 1) +
            b.length) %
            b.length
        ].focus();
      } else e.preventDefault();
    }
  };
  window.addEventListener("keydown", key, true);
  let timer: ReturnType<typeof setTimeout> | undefined,
    chute: ReturnType<typeof setTimeout> | undefined,
    launchedAt = 0;
  const launch = () => {
    if (launchedAt) return;
    launchedAt = performance.now();if(frames.length>1){let frame=0;wave=setInterval(()=>{image.src=frames[(++frame)%frames.length];},120);}
    root.classList.add("launched");
    timer = setTimeout(() => {
      text.textContent = tx("Huk! Lecimy!", "Boom! Here we go!");
      const a = audio();
      if (a) {
        const o = a.createOscillator(),
          g = a.createGain();
        o.type = "triangle";
        o.frequency.setValueAtTime(110, a.currentTime);
        o.frequency.exponentialRampToValueAtTime(35, a.currentTime + 0.22);
        g.gain.setValueAtTime(0.18, a.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.35);
        o.connect(g).connect(a.destination);
        o.start();
        o.stop(a.currentTime + 0.36);
      }
    }, 60);
    chute = setTimeout(() => {
      root.classList.add("descend");clearInterval(wave);if(frames.length)image.src=frames[2%frames.length];
      text.textContent = tx(
        "Spadochron otwarty. Szykujemy siatkę…",
        "Parachute open. Preparing the landing net…",
      );
    }, 2500);
  };
  return {
    root,
    text,
    launch,
    async land() {
      if (!matchMedia("(prefers-reduced-motion:reduce)").matches && launchedAt)
        await new Promise((resolve) =>
          setTimeout(
            resolve,
            Math.max(0, launchedAt + 3500 - performance.now()),
          ),
        );
      clearTimeout(chute);clearInterval(wave);
      root.classList.add("descend");
      const net = document.createElement("div");
      net.className = "net";
      root.append(net);
      text.textContent = tx(
        "Miękkie lądowanie! Oddaj spadochron…",
        "Soft landing! Return the parachute…",
      );
      if (!matchMedia("(prefers-reduced-motion:reduce)").matches) {
        await image.animate(
          [
            { transform: "translateY(0)" },
            { transform: "translateY(80px) scale(.8)" },
            { transform: "translateY(45px) scale(.85)" },
            { transform: "translateY(65px) scale(.8)" },
          ],
          { duration: 850, fill: "forwards" },
        ).finished;
      }
    },
    async recover(
      message: string,
      actions: { label: string; run: () => Promise<void> }[],
    ) {
      text.textContent = message;
      await new Promise<void>((resolve) => {
        const buttons = actions.map((action) => {
          const b = document.createElement("button");
          b.textContent = action.label;
          b.onclick = async () => {
            buttons.forEach((b) => (b.disabled = true));
            try {
              await action.run();
              buttons.forEach((b) => b.remove());
              resolve();
            } catch (e) {
              text.textContent = describe(e);
              buttons.forEach((b) => (b.disabled = false));
            }
          };
          root.append(b);
          return b;
        });
        buttons[0]?.focus();
      });
    },
    close() {
      clearTimeout(timer);clearInterval(wave);
      clearTimeout(chute);
      window.removeEventListener("keydown", key, true);
      root.getAnimations({ subtree: true }).forEach((a) => a.cancel());
      root.remove();
      resetKeys();
      resetTouch();
      focus?.focus();
    },
  };
}
