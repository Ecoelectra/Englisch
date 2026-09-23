// Single-series progress line chart (inline SVG) with CEFR bands and a tap/hover tooltip.

const BANDS = [
  { from: 0, to: 20, label: "A1" },
  { from: 20, to: 40, label: "A2" },
  { from: 40, to: 60, label: "B1" },
  { from: 60, to: 75, label: "B2" },
  { from: 75, to: 90, label: "C1" },
  { from: 90, to: 100, label: "C2" },
];

const fmtDate = (iso) => new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });

export function renderChart(container, results, metric, metricLabel) {
  container.innerHTML = "";
  const points = results.map((r) => ({ r, v: r[metric] })).filter((p) => Number.isFinite(p.v));
  if (points.length === 0) {
    container.innerHTML = `<div class="chart-empty">Nach deinem ersten Gespräch siehst du hier deine Entwicklung. 📈</div>`;
    return;
  }

  const W = Math.max(320, container.clientWidth || 640);
  const H = 260;
  const m = { top: 16, right: 40, bottom: 30, left: 36 };
  const iw = W - m.left - m.right;
  const ih = H - m.top - m.bottom;
  const x = (i) => m.left + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (v) => m.top + ih - (v / 100) * ih;

  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("class", "chart-svg");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `${metricLabel}: ${points.map((p) => p.v).join(", ")}`);

  let html = "";
  BANDS.forEach((b, i) => {
    html += `<rect x="${m.left}" y="${y(b.to)}" width="${iw}" height="${y(b.from) - y(b.to)}" class="band ${i % 2 ? "band-alt" : ""}"/>`;
    html += `<text x="${W - m.right + 8}" y="${(y(b.from) + y(b.to)) / 2 + 4}" class="band-label">${b.label}</text>`;
  });
  for (const t of [0, 25, 50, 75, 100]) {
    html += `<line x1="${m.left}" x2="${W - m.right}" y1="${y(t)}" y2="${y(t)}" class="grid"/>`;
    html += `<text x="${m.left - 8}" y="${y(t) + 4}" class="axis-label" text-anchor="end">${t}</text>`;
  }
  const step = Math.max(1, Math.ceil(points.length / Math.floor(iw / 70)));
  points.forEach((p, i) => {
    if (i % step === 0 || i === points.length - 1)
      html += `<text x="${x(i)}" y="${H - 8}" class="axis-label" text-anchor="middle">${fmtDate(p.r.date)}</text>`;
  });

  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  if (points.length > 1) {
    const area = `${line} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
    html += `<defs><linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" class="area-stop-top"/><stop offset="100%" class="area-stop-bottom"/></linearGradient></defs>`;
    html += `<path d="${area}" fill="url(#areaGrad)"/>`;
    html += `<path d="${line}" class="series-line"/>`;
  }
  points.forEach((p, i) => {
    html += `<circle cx="${x(i)}" cy="${y(p.v)}" r="5" class="series-dot"/>`;
  });
  html += `<line class="crosshair" y1="${m.top}" y2="${m.top + ih}" x1="0" x2="0" visibility="hidden"/>`;
  html += `<circle class="focus-dot" r="7" visibility="hidden"/>`;
  html += `<rect class="hit" x="${m.left - 10}" y="${m.top}" width="${iw + 20}" height="${ih}" fill="transparent"/>`;
  svg.innerHTML = html;

  const tip = document.createElement("div");
  tip.className = "chart-tip";
  tip.hidden = true;
  container.append(svg, tip);

  const cross = svg.querySelector(".crosshair");
  const focus = svg.querySelector(".focus-dot");
  function show(clientX) {
    const rect = svg.getBoundingClientRect();
    const sx = ((clientX - rect.left) / rect.width) * W;
    let best = 0;
    points.forEach((_, i) => {
      if (Math.abs(x(i) - sx) < Math.abs(x(best) - sx)) best = i;
    });
    const p = points[best];
    cross.setAttribute("x1", x(best));
    cross.setAttribute("x2", x(best));
    cross.setAttribute("visibility", "visible");
    focus.setAttribute("cx", x(best));
    focus.setAttribute("cy", y(p.v));
    focus.setAttribute("visibility", "visible");
    tip.innerHTML = `<div class="tip-value">${p.v} <span>${metricLabel}</span></div><div class="tip-meta">${p.r.emoji ?? ""} ${escapeHtml(p.r.topic)}</div><div class="tip-meta">${new Date(p.r.date).toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "long" })} · ${p.r.cefr ?? ""}</div>`;
    tip.hidden = false;
    const px = (x(best) / W) * rect.width;
    const left = Math.min(Math.max(px, 90), rect.width - 90);
    tip.style.left = `${left}px`;
    tip.style.top = `${(y(p.v) / H) * rect.height}px`;
  }
  function hide() {
    cross.setAttribute("visibility", "hidden");
    focus.setAttribute("visibility", "hidden");
    tip.hidden = true;
  }
  const hit = svg.querySelector(".hit");
  hit.addEventListener("pointermove", (e) => show(e.clientX));
  hit.addEventListener("pointerdown", (e) => show(e.clientX));
  hit.addEventListener("pointerleave", (e) => e.pointerType === "mouse" && hide());
}

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
