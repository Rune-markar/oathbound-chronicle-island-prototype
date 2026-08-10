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

function parseColor(color) {
  return [1, 3, 5].map((offset) => Number.parseInt(color.slice(offset, offset + 2), 16));
}

function isLand(tile) {
  return !["ocean", "coast", "lake"].includes(tile.terrain);
}

function landMaskCells(world, cellSize) {
  const worldWidth = world.width * cellSize;
  const shifts = world.config.wrapX ? [-worldWidth, 0, worldWidth] : [0];
  return shifts.flatMap((shiftX) => world.tiles.filter(isLand)
    .map((tile) => `<rect x="${tile.x * cellSize + shiftX}" y="${tile.y * cellSize}" width="${cellSize + 0.8}" height="${cellSize + 0.8}" fill="white"/>`))
    .join("");
}

function tileAt(world, x, y) {
  const wrappedX = world.config.wrapX ? (x + world.width) % world.width : clamp(x, 0, world.width - 1);
  const clampedY = clamp(y, 0, world.height - 1);
  return world.tiles[clampedY * world.width + wrappedX];
}

function sampleField(world, gridX, gridY, accessor) {
  const x0 = Math.floor(gridX);
  const y0 = Math.floor(gridY);
  const tx = gridX - x0;
  const ty = gridY - y0;
  const top = accessor(tileAt(world, x0, y0)) * (1 - tx) + accessor(tileAt(world, x0 + 1, y0)) * tx;
  const bottom = accessor(tileAt(world, x0, y0 + 1)) * (1 - tx) + accessor(tileAt(world, x0 + 1, y0 + 1)) * tx;
  return top * (1 - ty) + bottom * ty;
}

function surfaceElevation(tile) {
  return isLand(tile) ? Math.max(0.015, tile.elevation) : Math.min(-0.012, tile.elevation);
}

function pixelNoise(seed, x, y, periodX) {
  const longitude = x / periodX * Math.PI * 2;
  const value = Math.sin(
    Math.cos(longitude) * 12.9898
    + Math.sin(longitude) * 78.233
    + y * 37.719
    + String(seed).length * 19.17,
  ) * 43758.5453;
  return value - Math.floor(value);
}

function writeUint32(view, offset, value) {
  view.setUint32(offset, value, true);
}

function bytesToBase64(bytes) {
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(bytes.length, offset + 0x8000)));
  }
  return btoa(binary);
}

function renderTerrainBmpDataUrl(world, pixelsPerTile = 6) {
  const width = world.width * pixelsPerTile;
  const height = world.height * pixelsPerTile;
  const rowSize = Math.ceil(width * 3 / 4) * 4;
  const bytes = new Uint8Array(54 + rowSize * height);
  const view = new DataView(bytes.buffer);
  bytes[0] = 0x42;
  bytes[1] = 0x4d;
  writeUint32(view, 2, bytes.length);
  writeUint32(view, 10, 54);
  writeUint32(view, 14, 40);
  writeUint32(view, 18, width);
  writeUint32(view, 22, height);
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
  writeUint32(view, 34, rowSize * height);

  const colorChannels = world.tiles.map((tile) => parseColor(tileColor(tile)));
  const colorForChannel = (channel) => (tile) => colorChannels[tile.index][channel];
  const redAt = colorForChannel(0);
  const greenAt = colorForChannel(1);
  const blueAt = colorForChannel(2);
  for (let py = 0; py < height; py += 1) {
    for (let px = 0; px < width; px += 1) {
      const gridX = (px + 0.5) / pixelsPerTile - 0.5;
      const gridY = (py + 0.5) / pixelsPerTile - 0.5;
      const elevation = sampleField(world, gridX, gridY, surfaceElevation);
      const dx = sampleField(world, gridX + 0.34, gridY, surfaceElevation) - sampleField(world, gridX - 0.34, gridY, surfaceElevation);
      const dy = sampleField(world, gridX, gridY + 0.34, surfaceElevation) - sampleField(world, gridX, gridY - 0.34, surfaceElevation);
      const length = Math.hypot(dx * 9, dy * 9, 1);
      const light = clamp(0.76 + (-dx * 9 * -0.56 + -dy * 9 * -0.62 + 0.55) / length * 0.24, 0.54, 1.14);
      const grain = 0.93 + pixelNoise(world.seed, px, py, width) * 0.12;
      const shore = clamp(Math.abs(elevation) * 28, 0, 1);
      const coastalLight = elevation > 0 ? 1 : 1.08 - shore * 0.08;
      const red = sampleField(world, gridX, gridY, redAt);
      const green = sampleField(world, gridX, gridY, greenAt);
      const blue = sampleField(world, gridX, gridY, blueAt);
      const outputRow = height - py - 1;
      const offset = 54 + outputRow * rowSize + px * 3;
      bytes[offset] = Math.round(clamp(blue * light * grain * coastalLight, 0, 255));
      bytes[offset + 1] = Math.round(clamp(green * light * grain * coastalLight, 0, 255));
      bytes[offset + 2] = Math.round(clamp(red * light * grain * coastalLight, 0, 255));
    }
  }
  return `data:image/bmp;base64,${bytesToBase64(bytes)}`;
}

function riverPaths(world, cellSize) {
  const worldWidth = world.width * cellSize;
  return world.riverSegments.map((segment, index) => {
    const from = world.tiles[segment.from];
    const to = world.tiles[segment.to];
    const x1 = (from.x + 0.5) * cellSize;
    const y1 = (from.y + 0.5) * cellSize;
    let x2 = (to.x + 0.5) * cellSize;
    const y2 = (to.y + 0.5) * cellSize;
    if (world.config.wrapX && Math.abs(x2 - x1) > worldWidth / 2) {
      x2 += x2 > x1 ? -worldWidth : worldWidth;
    }
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy) || 1;
    const bend = (hashUnit(world.seed, segment.from, index + 71) - 0.5) * cellSize * 0.36;
    const cx = (x1 + x2) / 2 - dy / length * bend;
    const cy = (y1 + y2) / 2 + dx / length * bend;
    const width = 0.52 + segment.order * 0.34;
    const path = `<path d="M${x1.toFixed(2)} ${y1.toFixed(2)}Q${cx.toFixed(2)} ${cy.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}" fill="none" stroke="#75b6c3" stroke-width="${width.toFixed(2)}" stroke-linecap="round" opacity="0.9"`;
    const copies = [0];
    if (Math.min(x1, x2) < 0) copies.push(worldWidth);
    if (Math.max(x1, x2) > worldWidth) copies.push(-worldWidth);
    return copies.map((shiftX) => `${path}${shiftX ? ` transform="translate(${shiftX} 0)"` : ""}/>`).join("");
  }).join("");
}

function squareGrid(world, cellSize) {
  const lines = [];
  for (let x = 1; x < world.width; x += 1) lines.push(`<path d="M${x * cellSize} 0V${world.height * cellSize}"/>`);
  for (let y = 1; y < world.height; y += 1) lines.push(`<path d="M0 ${y * cellSize}H${world.width * cellSize}"/>`);
  return lines.join("");
}

function nationOverlayCells(world, nationMap, cellSize) {
  const nationById = new Map(nationMap.nations.map((nation) => [nation.id, nation]));
  return world.tiles.map((tile) => {
    const nation = nationById.get(nationMap.tileNationIds[tile.index]);
    if (!nation) return "";
    return `<rect x="${tile.x * cellSize}" y="${tile.y * cellSize}" width="${cellSize + 0.5}" height="${cellSize + 0.5}" fill="${escapeAttribute(nation.color)}"/>`;
  }).join("");
}

function nationBorderPaths(world, nationMap, cellSize) {
  const pointKey = (point) => `${point.x},${point.y}`;
  const pairGroups = new Map();
  for (const segment of nationMap.borderSegments) {
    const pair = [...segment.nations].sort().join(":");
    if (!pairGroups.has(pair)) pairGroups.set(pair, []);
    pairGroups.get(pair).push({
      start: { x: segment.x1, y: segment.y1 },
      end: { x: segment.x2, y: segment.y2 },
      followsRiver: segment.followsRiver,
    });
  }

  const chains = [];
  for (const segments of pairGroups.values()) {
    const adjacency = new Map();
    segments.forEach((segment, index) => {
      for (const point of [segment.start, segment.end]) {
        const key = pointKey(point);
        if (!adjacency.has(key)) adjacency.set(key, []);
        adjacency.get(key).push(index);
      }
    });
    const unused = new Set(segments.map((_, index) => index));
    while (unused.size) {
      const firstIndex = [...unused].find((index) => {
        const segment = segments[index];
        return adjacency.get(pointKey(segment.start)).length === 1 || adjacency.get(pointKey(segment.end)).length === 1;
      }) ?? unused.values().next().value;
      const first = segments[firstIndex];
      const start = adjacency.get(pointKey(first.start)).length === 1 ? first.start : first.end;
      const points = [start];
      let current = start;
      let followsRiver = false;
      while (true) {
        const nextIndex = (adjacency.get(pointKey(current)) ?? []).find((index) => unused.has(index));
        if (nextIndex === undefined) break;
        unused.delete(nextIndex);
        const segment = segments[nextIndex];
        followsRiver ||= segment.followsRiver;
        current = pointKey(segment.start) === pointKey(current) ? segment.end : segment.start;
        points.push(current);
        if (pointKey(current) === pointKey(start)) break;
      }
      chains.push({ points, followsRiver });
    }
  }

  return chains.map((chain, chainIndex) => {
    const simplified = chain.points.filter((point, index, points) => {
      if (index === 0 || index === points.length - 1) return true;
      const previous = points[index - 1];
      const next = points[index + 1];
      return (point.x - previous.x) * (next.y - point.y) !== (point.y - previous.y) * (next.x - point.x);
    });
    const points = simplified.map((point, index) => {
      if (index === 0 || index === simplified.length - 1) return { x: point.x * cellSize, y: point.y * cellSize };
      const jitter = (hashUnit(nationMap.seed, chainIndex, index, 907) - 0.5) * cellSize * 0.28;
      return { x: point.x * cellSize + jitter, y: point.y * cellSize - jitter * 0.72 };
    });
    if (points.length < 2) return "";
    let path = `M${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
    for (let index = 1; index < points.length - 1; index += 1) {
      const point = points[index];
      const next = points[index + 1];
      const midX = (point.x + next.x) / 2;
      const midY = (point.y + next.y) / 2;
      path += `Q${point.x.toFixed(2)} ${point.y.toFixed(2)} ${midX.toFixed(2)} ${midY.toFixed(2)}`;
    }
    const last = points.at(-1);
    path += `L${last.x.toFixed(2)} ${last.y.toFixed(2)}`;
    return `<path class="nation-border${chain.followsRiver ? " is-river-border" : ""}" d="${path}"/>`;
  }).join("");
}

function capitalMarkers(world, nationMap, cellSize) {
  return nationMap.nations.map((nation) => {
    const capital = world.tiles[nation.capitalIndex];
    const x = (capital.x + 0.5) * cellSize;
    const y = (capital.y + 0.5) * cellSize;
    const radius = Math.max(2.4, cellSize * 0.2);
    return `<g class="nation-capital" transform="translate(${x.toFixed(2)} ${y.toFixed(2)})"><title>${escapeAttribute(`${nation.name}の首都`)}</title><circle r="${radius.toFixed(2)}" fill="${escapeAttribute(nation.color)}"/><circle r="${(radius * 0.43).toFixed(2)}" fill="#fff4ce"/></g>`;
  }).join("");
}

export function renderTerrainSvg(world, options = {}) {
  if (!world || world.gridType !== "square" || !Array.isArray(world.tiles)) {
    throw new TypeError("Terrain renderer requires a generated square-grid world.");
  }
  const cellSize = options.cellSize ?? 14;
  const textureUrl = escapeAttribute(options.textureUrl ?? "./assets/generated/terrain-natural-texture.png");
  const showGrid = options.showGrid ?? true;
  const nationMap = options.nationMap ?? null;
  if (nationMap && (!Array.isArray(nationMap.nations) || nationMap.tileNationIds?.length !== world.tiles.length)) {
    throw new TypeError("Nation overlay does not match the generated terrain world.");
  }
  const pixelWidth = world.width * cellSize;
  const pixelHeight = world.height * cellSize;
  const blur = Math.max(2.4, cellSize * 0.3);
  const displacement = Math.max(3.5, cellSize * 0.5);
  const rasterUrl = renderTerrainBmpDataUrl(world, options.pixelsPerTile ?? 6);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${pixelWidth} ${pixelHeight}" width="${pixelWidth}" height="${pixelHeight}" role="img" aria-label="東西に循環する自然地形画像" data-grid="square" data-wrap="longitude">
  <defs>
    <linearGradient id="oceanDepth" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#173944"/><stop offset="1" stop-color="#0b2833"/></linearGradient>
    <pattern id="naturalTexture" width="256" height="256" patternUnits="userSpaceOnUse"><image href="${textureUrl}" x="0" y="0" width="256" height="256" preserveAspectRatio="xMidYMid slice"/></pattern>
    <filter id="organicTerrain" x="-100%" y="-6%" width="300%" height="112%">
      <feTurbulence type="fractalNoise" baseFrequency="0.012 0.026" numOctaves="3" seed="${Math.abs(String(world.seed).length * 13 + world.width)}" stitchTiles="stitch" result="warp"/>
      <feGaussianBlur in="SourceGraphic" stdDeviation="${blur.toFixed(2)}" result="soft"/>
      <feDisplacementMap in="soft" in2="warp" scale="${displacement.toFixed(2)}" xChannelSelector="R" yChannelSelector="B"/>
    </filter>
    <filter id="riverSoft"><feGaussianBlur stdDeviation="0.18"/></filter>
    <filter id="politicalSoft" x="-4%" y="-5%" width="108%" height="110%"><feGaussianBlur stdDeviation="${Math.max(1.2, cellSize * 0.17).toFixed(2)}"/></filter>
    <mask id="landMask"><rect width="100%" height="100%" fill="black"/><g filter="url(#organicTerrain)">${landMaskCells(world, cellSize)}</g></mask>
  </defs>
  <rect width="100%" height="100%" fill="url(#oceanDepth)"/>
  <image href="${rasterUrl}" x="0" y="0" width="${pixelWidth}" height="${pixelHeight}" preserveAspectRatio="none"/>
  <rect width="100%" height="100%" fill="url(#naturalTexture)" opacity="0.25" mask="url(#landMask)" style="mix-blend-mode:soft-light"/>
  ${nationMap ? `<g id="nationOverlay" filter="url(#politicalSoft)" mask="url(#landMask)" opacity="0.24" style="mix-blend-mode:color">${nationOverlayCells(world, nationMap, cellSize)}</g>` : ""}
  <g filter="url(#riverSoft)">${riverPaths(world, cellSize)}</g>
  ${nationMap ? `<g id="nationBorders" fill="none" stroke="#f4e6bb" stroke-width="${Math.max(0.65, cellSize * 0.062).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" opacity="0.76"><style>.nation-border.is-river-border{stroke:#bfe6e8;stroke-width:${Math.max(0.8, cellSize * 0.078).toFixed(2)}}</style>${nationBorderPaths(world, nationMap, cellSize)}</g><g id="nationCapitals" stroke="#142225" stroke-width="${Math.max(0.7, cellSize * 0.06).toFixed(2)}">${capitalMarkers(world, nationMap, cellSize)}</g>` : ""}
  ${showGrid ? `<g fill="none" stroke="#d9d0b3" stroke-width="0.42" opacity="0.13">${squareGrid(world, cellSize)}</g>` : ""}
</svg>`;
}

export function terrainSvgDataUrl(world, options = {}) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderTerrainSvg(world, options))}`;
}
