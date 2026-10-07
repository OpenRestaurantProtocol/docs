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
const loops = [
  { participant: 'toqan', after: 'm07', before: 'm08', label: 'stores connection tokens' },
  { participant: 'mcp',   after: 'm10', before: 'm11', label: 'validates JWT' },
  { participant: 'mcp',   after: 'm12', before: 'm13', label: 'caches permissions (short TTL)' },
  { participant: 'mcp',   after: 'm14', before: 'm15', label: 'validates JWT' },
];

for (const loop of loops) {
  const cx = participantCx(loop.participant);
  const yAfter = edgeY(loop.after);
  const yBefore = edgeY(loop.before);
  if (cx == null || yAfter == null || yBefore == null) {
    console.error(`SKIP loop "${loop.label}": cx=${cx} yAfter=${yAfter} yBefore=${yBefore}`);
    continue;
  }
  const mid = (yAfter + yBefore) / 2;
  const yTop = mid - 10;
  const yBot = mid + 10;
  const barRight = cx + 5;   // right border of the 10px-wide activation bar
  const loopRight = cx + 42;
  const labelY = mid + 3;
  const svg = `
        <g data-edge-self="${loop.participant}" data-edge-label="${loop.label}">
          <path d="M ${barRight} ${yTop} L ${loopRight} ${yTop} L ${loopRight} ${yBot} L ${barRight} ${yBot}" class="a-default" stroke-width="1.4" fill="none" marker-end="url(#arrowhead)"/>
          <text x="${loopRight + 8}" y="${labelY}" class="t-muted" font-size="8" text-anchor="start">${loop.label}</text>
        </g>`;
  html = html.replace(
    new RegExp(`(<g data-edge-from="[^"]*" data-edge-to="[^"]*"[^>]*data-edge-id="${loop.before}")`),
    `${svg}\n$1`
  );
}

// Shift a message label (and its mask rect) horizontally by `delta` px.
// Negative = left, positive = right.
function shiftLabel(labelText, delta) {
  const blockRe = new RegExp(
    `<g data-detail="context">\\s*<rect x="([\\d.]+)" ([^>]*)/>\\s*<text x="([\\d.]+)" ([^>]*)>${labelText}</text>\\s*</g>`
  );
  const m = html.match(blockRe);
  if (!m) {
    console.error(`SKIP label shift: "${labelText}" block not found`);
    return;
  }
  const rectX = parseFloat(m[1]) + delta;
  const textX = parseFloat(m[3]) + delta;
  const replacement = `<g data-detail="context">\n          <rect x="${rectX}" ${m[2]}/>\n          <text x="${textX}" ${m[4]}>${labelText}</text>\n        </g>`;
  html = html.replace(blockRe, replacement);
}

shiftLabel('query stores and permissions', -18);
shiftLabel('validate subject permissions', -18);
shiftLabel('queries filtered by store_ids', 20);

writeFileSync(file, html, 'utf8');
console.log(`postprocessed ${file}`);
