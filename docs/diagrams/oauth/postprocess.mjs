// Post-processes the generated Archify sequence-diagram HTML:
//   - Draws self-loops (feedback arrows) on participant lifelines, since
//     Archify's sequence renderer rejects self-messages (from == to,
//     minimum 60px arrow span).
//   - Shifts specific message labels horizontally off the MCP activation bar,
//     because their label masks are wider than the participant gap.
//
// Usage: node postprocess.mjs <diagram.html>

import { readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('usage: node postprocess.mjs <diagram.html>');
  process.exit(1);
}

let html = readFileSync(file, 'utf8');

// Column center (cx) of a participant, read from its header label x position.
function participantCx(id) {
  const nodeIdx = html.indexOf(`id="node-${id}"`);
  if (nodeIdx === -1) return null;
  const after = html.slice(nodeIdx);
  const textTag = after.match(/<text[^>]*class="t-primary"[^>]*>/);
  if (!textTag) return null;
  const x = textTag[0].match(/x="([0-9.]+)"/);
  return x ? parseFloat(x[1]) : null;
}

// y coordinate of a message edge, read from its path `d` attribute.
function edgeY(id) {
  const m = html.match(new RegExp(`data-edge-id="${id}"[\\s\\S]*?d="M [0-9.]+ ([0-9.]+) L`));
  return m ? parseFloat(m[1]) : null;
}

// Self-loops to draw, each sitting in the vertical gap between `after`
// (message above) and `before` (message below).
// side: 'left' keeps platform loops off the OAuth/message lane to the right.
const loops = [
  { participant: 'platform', after: 'm07', before: 'm07b', label: 'stores connection tokens', side: 'left' },
  // Bias toward m07c (bias 0.28) so the loop sits clearly above "organization connected".
  { participant: 'platform', after: 'm07c', before: 'm08', label: 'builds picker + business profile', side: 'left', bias: 0.28 },
  { participant: 'mcp', after: 'm10', before: 'm11', label: 'validates JWT', side: 'right' },
  { participant: 'mcp', after: 'm12', before: 'm13', label: 'caches permissions (short TTL)', side: 'right' },
  { participant: 'mcp', after: 'm14', before: 'm15', label: 'validates JWT', side: 'right' },
];

for (const loop of loops) {
  const cx = participantCx(loop.participant);
  const yAfter = edgeY(loop.after);
  const yBefore = edgeY(loop.before);
  if (cx == null || yAfter == null || yBefore == null) {
    console.error(`SKIP loop "${loop.label}": cx=${cx} yAfter=${yAfter} yBefore=${yBefore}`);
    continue;
  }
  const bias = typeof loop.bias === 'number' ? loop.bias : 0.5;
  const mid = yAfter + bias * (yBefore - yAfter);
  const yTop = mid - 10;
  const yBot = mid + 10;
  const side = loop.side === 'left' ? 'left' : 'right';
  const barEdge = side === 'left' ? cx - 5 : cx + 5;
  const loopOuter = side === 'left' ? cx - 42 : cx + 42;
  const labelX = side === 'left' ? loopOuter - 8 : loopOuter + 8;
  const anchor = side === 'left' ? 'end' : 'start';
  const labelY = mid + 3;
  const svg = `
        <g data-edge-self="${loop.participant}" data-edge-label="${loop.label}">
          <path d="M ${barEdge} ${yTop} L ${loopOuter} ${yTop} L ${loopOuter} ${yBot} L ${barEdge} ${yBot}" class="a-default" stroke-width="1.4" fill="none" marker-end="url(#arrowhead)"/>
          <text x="${labelX}" y="${labelY}" class="t-muted" font-size="8" text-anchor="${anchor}">${loop.label}</text>
        </g>`;
  html = html.replace(
    new RegExp(`(<g data-edge-from="[^"]*" data-edge-to="[^"]*"[^>]*data-edge-id="${loop.before}")`),
    `${svg}\n$1`
  );
}

// Shift a message label (and its mask rect) horizontally by `delta` px.
// Negative = left, positive = right.
function shiftLabel(labelText, delta) {
  const escaped = labelText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const blockRe = new RegExp(
    `<g data-detail="context">\\s*<rect x="([\\d.]+)" ([^>]*)/>\\s*<text x="([\\d.]+)" ([^>]*)>${escaped}</text>\\s*</g>`,
    'g'
  );
  let found = false;
  html = html.replace(blockRe, (match, rectX, rectRest, textX, textRest) => {
    found = true;
    const newRectX = parseFloat(rectX) + delta;
    const newTextX = parseFloat(textX) + delta;
    return `<g data-detail="context">\n          <rect x="${newRectX}" ${rectRest}/>\n          <text x="${newTextX}" ${textRest}>${labelText}</text>\n        </g>`;
  });
  if (!found) {
    console.error(`SKIP label shift: "${labelText}" block not found`);
  }
}

shiftLabel('GET /userinfo + Bearer JWT', -18);
shiftLabel('queries filtered by merchant_ids', 20);

writeFileSync(file, html, 'utf8');
console.log(`postprocessed ${file}`);
