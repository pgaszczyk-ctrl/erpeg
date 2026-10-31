import { route, type Network, type Point } from "./network";
import { tx } from "../i18n";
async function readCompressed(response: Response) {
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes[0] === 31 && bytes[1] === 139)
    return new Response(
      new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip")),
    ).json();
  return JSON.parse(new TextDecoder().decode(bytes));
}
const city = new URLSearchParams(location.search).get("city") ?? "lublin";
const valid = ["lublin", "warszawa", "istanbul"].includes(city)
  ? city
  : "lublin";
document.body.innerHTML = `<style>*{box-sizing:border-box}body{margin:0;background:#eee3c7;color:#302e28;font:16px system-ui}header{padding:16px 22px;background:#253b3d;color:#fff6dc;border-bottom:5px solid #bd914d}h1{font-size:22px;margin:0 0 8px}p{margin:6px 0}main{display:grid;grid-template-columns:1fr 310px;height:calc(100dvh - 115px)}canvas{width:100%;height:100%;touch-action:none;background:#e6d7ad}aside{padding:16px;overflow:auto;border-left:4px solid #b58d4c}button,select{padding:9px;margin:3px;border:2px solid #3a3d35;border-radius:6px;background:#fff8df;color:#282e2b;min-height:44px}button:focus-visible{outline:3px solid #147a9d}.muted{font-size:13px;color:#655d4a}#map{position:relative;min-height:220px}#tools{position:absolute;left:8px;top:8px}#status{font-weight:bold}.badge{display:inline-block;background:#e2b055;color:#273b3b;padding:2px 8px}@media(max-width:700px){h1{font-size:17px}header{padding:10px}main{height:calc(100dvh - 120px);grid-template-columns:1fr;grid-template-rows:60% 40%}aside{border:0;border-top:3px solid #b58d4c} }</style><header><h1>${tx("Miejska Artyleria Pasażerska", "Municipal Passenger Artillery")} <span class="badge">${tx("DIAGNOSTYKA", "DIAGNOSTICS")}</span></h1><label>${tx("Miasto", "City")} <select id="city"><option value="lublin">Lublin</option><option value="warszawa">Warszawa</option><option value="istanbul">İstanbul</option></select></label> <span>${tx("Przeciągnij mapę • przybliż kółkiem • wybierz dwa przystanki, aby zbadać trasę", "Drag to pan • wheel to zoom • select two stops to inspect a route")}</span></header><main><div id="map"><canvas aria-label="Mapa sieci"></canvas><div id="tools"><button id="plus" aria-label="Zoom in">+</button><button id="minus" aria-label="Zoom out">−</button><button id="fit">${tx("Całość", "Fit")}</button></div></div><aside><p id="status">${tx("Wczytywanie…", "Loading…")}</p><div id="stats"></div><label><input id="rejects" type="checkbox"> ${tx("Odrzuceni kandydaci", "Rejected candidates")}</label><p class="muted">${tx("OSM © OpenStreetMap contributors. Mosiądz: przystanki · fiolet: lotniska · czerwień: zabudowa bez dogodnego dojścia. Linie to rzeczywiste połączenia sieci, nie trasy piesze.", "OSM © OpenStreetMap contributors. Brass: stops · purple: airports · red: buildings without convenient foot access. Lines are network links, not footpaths.")}</p><div id="selection"></div><div id="missing"></div></aside></main>`;
const select = document.querySelector<HTMLSelectElement>("#city")!;
select.value = valid;
select.onchange = () => {
  const params = new URLSearchParams(location.search);
  params.set("city", select.value);
  location.search = params.toString();
};
const status = document.querySelector("#status")!,
  stats = document.querySelector("#stats")!,
  selection = document.querySelector("#selection")!,
  missing = document.querySelector("#missing")!;
const canvas = document.querySelector("canvas")!,
  ctx = canvas.getContext("2d")!,
  host = document.querySelector("#map")!;
let net: Network,
  geometry: {
    roads: { points: Point[] }[];
    buildings: Point[];
    water: { rings: Point[][] }[];
  },
  scale = 1,
  ox = 0,
  oy = 0,
  chosen: string[] = [],
  selectedRoute: string[] = [];
const screen = (p: Point) => ({ x: p.x * scale + ox, y: p.y * scale + oy });
function draw() {
  if (!net) return;
  const w = host.clientWidth,
    h = host.clientHeight;
  canvas.width = w * devicePixelRatio;
  canvas.height = h * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#8cbbbd";
  for (const o of geometry.water) {
    ctx.beginPath();
    for (const ring of o.rings) {
      ring.forEach((p, i) => {
        const q = screen(p);
        if (i) ctx.lineTo(q.x, q.y);
        else ctx.moveTo(q.x, q.y);
      });
      ctx.closePath();
    }
    ctx.fill("evenodd");
  }
  ctx.fillStyle = "#968974";
  for (const p of geometry.buildings) {
    const q = screen(p);
    ctx.fillRect(q.x, q.y, Math.max(1, 5 * scale), Math.max(1, 5 * scale));
  }
  ctx.strokeStyle = "#faf3d8";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (const r of geometry.roads)
    r.points.forEach((p, i) => {
      const q = screen(p);
      if (i) ctx.lineTo(q.x, q.y);
      else ctx.moveTo(q.x, q.y);
    });
  ctx.stroke();
  ctx.fillStyle = "#d74d43";
  for (const p of net.diagnostics.uncovered) {
    const q = screen(p);
    ctx.fillRect(q.x - 2, q.y - 2, 4, 4);
  }
  if (document.querySelector<HTMLInputElement>("#rejects")!.checked) {
    ctx.fillStyle = "#b6313277";
    for (const p of net.diagnostics.rejected) {
      const q = screen(p);
      ctx.fillRect(q.x, q.y, 2, 2);
    }
  }
  for (const [a, b] of net.edges) {
    const x = net.stops.find((s) => s.id === a),
      y = net.stops.find((s) => s.id === b);
    if (!x || !y) continue;
    const p = screen(x),
      q = screen(y);
    const active = selectedRoute.some(
      (id, i) =>
        (id === a && selectedRoute[i + 1] === b) ||
        (id === b && selectedRoute[i + 1] === a),
    );
    ctx.strokeStyle = active ? "#a12422" : "#293e4588";
    ctx.lineWidth = active ? 4 : 1.5;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
  }
  for (const s of net.stops) {
    const p = screen(s);
    ctx.beginPath();
    ctx.arc(p.x, p.y, chosen.includes(s.id) ? 9 : 6, 0, Math.PI * 2);
    ctx.fillStyle = s.disabled ? "#888" : s.airport ? "#895caa" : "#d9a744";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#24373b";
    ctx.stroke();
    if (net.stops.length <= 12 || scale > 0.065) {
      ctx.fillStyle = "#24373b";
      ctx.font = "bold 11px system-ui";
      ctx.fillText(s.name, p.x + 9, p.y + 3);
    }
  }
}
function fit() {
  if (!net) return;
  const pts = [...net.stops, ...net.diagnostics.uncovered];
  if (!pts.length) return;
  const x = Math.min(...pts.map((p) => p.x)),
    y = Math.min(...pts.map((p) => p.y)),
    w = Math.max(...pts.map((p) => p.x)) - x,
    h = Math.max(...pts.map((p) => p.y)) - y;
  scale = Math.min(
    (host.clientWidth - 60) / (w || 1),
    (host.clientHeight - 60) / (h || 1),
  );
  ox = host.clientWidth / 2 - (x + w / 2) * scale;
  oy = host.clientHeight / 2 - (y + h / 2) * scale;
  draw();
}
function zoom(f: number, x = host.clientWidth / 2, y = host.clientHeight / 2) {
  const next = Math.max(0.002, Math.min(2, scale * f));
  ox = x - ((x - ox) * next) / scale;
  oy = y - ((y - oy) * next) / scale;
  scale = next;
  draw();
}
canvas.onwheel = (e) => {
  e.preventDefault();
  zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.offsetX, e.offsetY);
};
let drag: { x: number; y: number; sx: number; sy: number } | null = null;
canvas.onpointerdown = (e) => {
  canvas.setPointerCapture(e.pointerId);
  drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY };
};
canvas.onpointermove = (e) => {
  if (drag) {
    ox += e.clientX - drag.x;
    oy += e.clientY - drag.y;
    drag.x = e.clientX;
    drag.y = e.clientY;
    draw();
  }
};
canvas.onpointerup = (e) => {
  if (drag && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 5 && net) {
    const rect = canvas.getBoundingClientRect(),
      p = {
        x: (e.clientX - rect.left - ox) / scale,
        y: (e.clientY - rect.top - oy) / scale,
      };
    const s = net.stops.find(
      (s) => Math.hypot(s.x - p.x, s.y - p.y) * scale < 18,
    );
    if (s) {
      chosen = chosen.length === 1 ? [chosen[0], s.id] : [s.id];
      selectedRoute =
        chosen.length === 2 ? (route(net, chosen[0], chosen[1]) ?? []) : [];
      selection.textContent = [
        ...chosen.map((id) => net.stops.find((s) => s.id === id)!.name),
        selectedRoute.length
          ? `${tx("Odcinki", "Legs")}: ${selectedRoute.length - 1}; ${tx("przesiadki", "transfers")}: ${Math.max(0, selectedRoute.length - 2)}`
          : "",
      ].join(" → ");
      draw();
    }
  }
  drag = null;
};
document.querySelector("#plus")!.addEventListener("click", () => zoom(1.5));
document
  .querySelector("#minus")!
  .addEventListener("click", () => zoom(1 / 1.5));
document.querySelector("#fit")!.addEventListener("click", fit);
document.querySelector("#rejects")!.addEventListener("change", draw);
new ResizeObserver(() => draw()).observe(host);
try {
  const [n, g] = await Promise.all([
    fetch(`artillery/${valid}.json`),
    fetch(`artillery/${valid}-geometry.json.gz`),
  ]);
  if (
    !n.ok ||
    !g.ok ||
    !n.headers.get("content-type")?.includes("application/json") ||
    g.headers.get("content-type")?.includes("text/html")
  )
    throw Error(
      tx(
        "Brak danych tego miasta. Walidacja nie została wykonana.",
        "City data unavailable. Validation has not been performed.",
      ),
    );
  net = await n.json();
  const diagnostics = await fetch(`artillery/${valid}-diagnostics.json.gz`);
  if (!diagnostics.ok)
    throw Error(
      tx("Brak danych diagnostycznych.", "Diagnostic data unavailable."),
    );
  net.diagnostics = await readCompressed(diagnostics);
  geometry = await readCompressed(g);
  status.textContent = valid.toUpperCase();
  const d = net.diagnostics;
  stats.textContent = `${net.stops.length} ${tx("przystanków", "stops")} · ${net.edges.length} ${tx("połączeń", "links")}\n${tx("Pokrycie komórek zabudowy", "Building-cell coverage")}: ${d.demands ? ((100 * d.covered) / d.demands).toFixed(1) : 0}%\n${tx("Cel dojścia", "Access target")}: ${Math.round(d.maxWalkM)} m\n${tx("Najdłuższa trasa", "Longest route")}: ${d.diameter} ${tx("odcinków", "legs")}\n${tx("Średnia", "Mean")}: ${d.meanHops.toFixed(2)}\n${tx("Odrzucenia", "Rejections")}: ${d.rejected.length}`;
  stats.setAttribute("style", "white-space:pre-line;line-height:1.8");
  const reasons: Record<string, number> = {};
  for (const r of d.rejected) reasons[r.reason] = (reasons[r.reason] ?? 0) + 1;
  missing.textContent = [
    tx("Braki i odrzucenia:", "Missing data and rejections:"),
    ...d.missing,
    ...Object.entries(reasons).map(([r, n]) => `${r}: ${n}`),
  ].join("\n");
  missing.setAttribute(
    "style",
    "white-space:pre-line;font-size:13px;margin-top:12px",
  );
  fit();
} catch (e) {
  status.textContent = e instanceof Error ? e.message : String(e);
}
