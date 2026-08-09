const TERRAIN_COLORS = Object.freeze({
  ocean: "#153842",
  coast: "#2b6570",
  lake: "#397985",
  grassland: "#71815a",
  plains: "#9a8a5c",
  desert: "#b89b62",
  tundra: "#7f8b7d",
  snow: "#d8ddd5",
});

const FEATURE_TINTS = Object.freeze({
  forest: "#33523d",
  rainforest: "#244b37",
  marsh: "#58766b",
  floodplain: "#8c8e56",
});

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function hashUnit(seed, index, salt = 0) {
  const text = `${seed}:${index}:${salt}`;
  let hash = 2166136261;
  for (let cursor = 0; cursor < text.length; cursor += 1) {
    hash ^= text.charCodeAt(cursor);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function mixColor(left, right, ratio) {
  const parse = (color) => [1, 3, 5].map((offset) => Number.parseInt(color.slice(offset, offset + 2), 16));
  const a = parse(left);
  const b = parse(right);
  const mixed = a.map((value, index) => Math.round(value + (b[index] - value) * clamp(ratio)));
  return `#${mixed.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function tileColor(tile) {
  let color = TERRAIN_COLORS[tile.terrain] ?? TERRAIN_COLORS.plains;
  if (tile.feature && FEATURE_TINTS[tile.feature]) color = mixColor(color, FEATURE_TINTS[tile.feature], 0.48);
  if (tile.relief === "hills") color = mixColor(color, "#6e654f", 0.24);
  if (tile.relief === "mountains") color = mixColor(color, "#59605e", 0.58);
  const fertilityTint = tile.fertility > 65 ? "#718a55" : tile.fertility < 25 ? "#756950" : color;
  return mixColor(color, fertilityTint, 0.18);
}

function isLand(tile) {
  return !["ocean", "coast", "lake"].includes(tile.terrain);
}

function terrainCells(world, cellSize) {
  return world.tiles.map((tile) => {
    const opacity = tile.terrain === "ocean" ? 0.64 : 1;
    return `<rect x="${tile.x * cellSize}" y="${tile.y * cellSize}" width="${cellSize + 0.6}" height="${cellSize + 0.6}" fill="${tileColor(tile)}" opacity="${opacity}"/>`;
  }).join("");
}

function landMaskCells(world, cellSize) {
  return world.tiles.filter(isLand)
    .map((tile) => `<rect x="${tile.x * cellSize}" y="${tile.y * cellSize}" width="${cellSize + 0.8}" height="${cellSize + 0.8}" fill="white"/>`)
    .join("");
}

function reliefOverlay(world, cellSize) {
  return world.tiles.filter((tile) => isLand(tile) && tile.relief !== "flat").map((tile) => {
    const x = tile.x * cellSize;
    const y = tile.y * cellSize;
    const strength = tile.relief === "mountains" ? 0.58 : 0.24;
    const angle = hashUnit(world.seed, tile.index, 5) * 360;
    return `<rect x="${x}" y="${y}" width="${cellSize + 0.5}" height="${cellSize + 0.5}" fill="url(#reliefLight)" opacity="${strength}" transform="rotate(${angle.toFixed(1)} ${(x + cellSize / 2).toFixed(2)} ${(y + cellSize / 2).toFixed(2)})"/>`;
  }).join("");
}

function vegetationTexture(world, cellSize) {
  const marks = [];
  for (const tile of world.tiles) {
    if (!isLand(tile) || !["forest", "rainforest", "marsh"].includes(tile.feature)) continue;
    const count = tile.feature === "rainforest" ? 7 : tile.feature === "forest" ? 5 : 3;
    const color = tile.feature === "marsh" ? "#8ca798" : tile.feature === "rainforest" ? "#173b2b" : "#294b35";
    for (let mark = 0; mark < count; mark += 1) {
      const x = (tile.x + 0.12 + hashUnit(world.seed, tile.index, mark * 2 + 11) * 0.76) * cellSize;
      const y = (tile.y + 0.12 + hashUnit(world.seed, tile.index, mark * 2 + 12) * 0.76) * cellSize;
      const radius = cellSize * (0.055 + hashUnit(world.seed, tile.index, mark + 31) * 0.07);
      marks.push(`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${radius.toFixed(2)}" fill="${color}" opacity="${tile.feature === "marsh" ? 0.35 : 0.56}"/>`);
    }
  }
  return marks.join("");
}

function coastlinePath(world, cellSize) {
  const segments = [];
  const at = (x, y) => {
    if (y < 0 || y >= world.height) return null;
    const wrappedX = world.config.wrapX ? (x + world.width) % world.width : x;
    if (wrappedX < 0 || wrappedX >= world.width) return null;
    return world.tiles[y * world.width + wrappedX];
  };
  for (const tile of world.tiles.filter(isLand)) {
    const x = tile.x * cellSize;
    const y = tile.y * cellSize;
    if (!isLand(at(tile.x, tile.y - 1) ?? { terrain: "ocean" })) segments.push(`M${x} ${y}H${x + cellSize}`);
    if (!isLand(at(tile.x + 1, tile.y) ?? { terrain: "ocean" })) segments.push(`M${x + cellSize} ${y}V${y + cellSize}`);
    if (!isLand(at(tile.x, tile.y + 1) ?? { terrain: "ocean" })) segments.push(`M${x + cellSize} ${y + cellSize}H${x}`);
    if (!isLand(at(tile.x - 1, tile.y) ?? { terrain: "ocean" })) segments.push(`M${x} ${y + cellSize}V${y}`);
  }
  return segments.join("");
}

function riverPaths(world, cellSize) {
  return world.riverSegments.map((segment, index) => {
    const from = world.tiles[segment.from];
    const to = world.tiles[segment.to];
    if (Math.abs(from.x - to.x) > 1 && world.config.wrapX) return "";
    const x1 = (from.x + 0.5) * cellSize;
    const y1 = (from.y + 0.5) * cellSize;
    const x2 = (to.x + 0.5) * cellSize;
    const y2 = (to.y + 0.5) * cellSize;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy) || 1;
    const bend = (hashUnit(world.seed, segment.from, index + 71) - 0.5) * cellSize * 0.36;
    const cx = (x1 + x2) / 2 - dy / length * bend;
    const cy = (y1 + y2) / 2 + dx / length * bend;
    const width = 0.52 + segment.order * 0.34;
    return `<path d="M${x1.toFixed(2)} ${y1.toFixed(2)}Q${cx.toFixed(2)} ${cy.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}" fill="none" stroke="#75b6c3" stroke-width="${width.toFixed(2)}" stroke-linecap="round" opacity="0.9"/>`;
  }).join("");
}

function squareGrid(world, cellSize) {
  const lines = [];
  for (let x = 0; x <= world.width; x += 1) lines.push(`<path d="M${x * cellSize} 0V${world.height * cellSize}"/>`);
  for (let y = 0; y <= world.height; y += 1) lines.push(`<path d="M0 ${y * cellSize}H${world.width * cellSize}"/>`);
  return lines.join("");
}

export function renderTerrainSvg(world, options = {}) {
  if (!world || world.gridType !== "square" || !Array.isArray(world.tiles)) {
    throw new TypeError("Terrain renderer requires a generated square-grid world.");
  }
  const cellSize = options.cellSize ?? 14;
  const textureUrl = escapeAttribute(options.textureUrl ?? "./assets/generated/terrain-natural-texture.png");
  const showGrid = options.showGrid ?? true;
  const pixelWidth = world.width * cellSize;
  const pixelHeight = world.height * cellSize;
  const blur = Math.max(0.7, cellSize * 0.075);
  const displacement = Math.max(2, cellSize * 0.38);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${pixelWidth} ${pixelHeight}" width="${pixelWidth}" height="${pixelHeight}" role="img" aria-label="自然地形画像" data-grid="square">
  <defs>
    <linearGradient id="oceanDepth" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#173944"/><stop offset="1" stop-color="#0b2833"/></linearGradient>
    <linearGradient id="reliefLight" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f2e7c6"/><stop offset="0.46" stop-color="#9b9278"/><stop offset="1" stop-color="#1b292a"/></linearGradient>
    <pattern id="naturalTexture" width="256" height="256" patternUnits="userSpaceOnUse"><image href="${textureUrl}" x="0" y="0" width="256" height="256" preserveAspectRatio="xMidYMid slice"/></pattern>
    <filter id="organicTerrain" x="-4%" y="-6%" width="108%" height="112%">
      <feTurbulence type="fractalNoise" baseFrequency="0.012 0.026" numOctaves="3" seed="${Math.abs(String(world.seed).length * 13 + world.width)}" result="warp"/>
      <feDisplacementMap in="SourceGraphic" in2="warp" scale="${displacement.toFixed(2)}" xChannelSelector="R" yChannelSelector="B" result="displaced"/>
      <feGaussianBlur in="displaced" stdDeviation="${blur.toFixed(2)}"/>
    </filter>
    <filter id="coastRoughness" x="-5%" y="-8%" width="110%" height="116%"><feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="17" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="${(cellSize * 0.34).toFixed(2)}"/></filter>
    <filter id="riverSoft"><feGaussianBlur stdDeviation="0.18"/></filter>
    <mask id="landMask"><rect width="100%" height="100%" fill="black"/><g filter="url(#organicTerrain)">${landMaskCells(world, cellSize)}</g></mask>
  </defs>
  <rect width="100%" height="100%" fill="url(#oceanDepth)"/>
  <g filter="url(#organicTerrain)">${terrainCells(world, cellSize)}</g>
  <rect width="100%" height="100%" fill="url(#naturalTexture)" opacity="0.34" mask="url(#landMask)" style="mix-blend-mode:soft-light"/>
  <g mask="url(#landMask)" style="mix-blend-mode:overlay">${reliefOverlay(world, cellSize)}</g>
  <g filter="url(#coastRoughness)" opacity="0.75"><path d="${coastlinePath(world, cellSize)}" fill="none" stroke="#d1c49b" stroke-width="1.15" stroke-linecap="round"/></g>
  <g>${vegetationTexture(world, cellSize)}</g>
  <g filter="url(#riverSoft)">${riverPaths(world, cellSize)}</g>
  ${showGrid ? `<g fill="none" stroke="#d9d0b3" stroke-width="0.42" opacity="0.13">${squareGrid(world, cellSize)}</g>` : ""}
</svg>`;
}

export function terrainSvgDataUrl(world, options = {}) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderTerrainSvg(world, options))}`;
}
