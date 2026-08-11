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
  return Boolean(tile) && !["ocean", "coast", "lake"].includes(tile.terrain);
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

function terrainTextureNoise(seed, x, y, periodX) {
  const longitude = x / periodX * Math.PI * 2;
  const seedOffset = String(seed).length * 0.731;
  const broad = Math.sin(longitude * 29 + y * 0.071 + seedOffset) * 0.23;
  const medium = Math.sin(longitude * 71 - y * 0.163 + seedOffset * 1.7) * 0.14;
  const fine = Math.sin(longitude * 157 + y * 0.311 - seedOffset * 2.3) * 0.08;
  return clamp(0.5 + broad + medium + fine + (pixelNoise(seed, x, y, periodX) - 0.5) * 0.22);
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

function renderTerrainBmpDataUrl(world, pixelsPerTile = 12) {
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
      const nearestTile = tileAt(world, Math.round(gridX), Math.round(gridY));
      const elevation = sampleField(world, gridX, gridY, surfaceElevation);
      const dx = sampleField(world, gridX + 0.27, gridY, surfaceElevation) - sampleField(world, gridX - 0.27, gridY, surfaceElevation);
      const dy = sampleField(world, gridX, gridY + 0.27, surfaceElevation) - sampleField(world, gridX, gridY - 0.27, surfaceElevation);
      const reliefScale = nearestTile.relief === "mountains" ? 17 : nearestTile.relief === "hills" ? 13 : 9;
      const length = Math.hypot(dx * reliefScale, dy * reliefScale, 1);
      const diffuse = (-dx * reliefScale * -0.54 + -dy * reliefScale * -0.68 + 0.62) / length;
      const texture = terrainTextureNoise(world.seed, px, py, width);
      const fineGrain = 0.94 + pixelNoise(world.seed, px, py, width) * 0.12;
      let red;
      let green;
      let blue;
      if (elevation <= 0) {
        const depth = clamp(-elevation * 16);
        const shallow = 1 - depth;
        const wave = 0.96 + (texture - 0.5) * 0.1;
        red = (15 + shallow * 39) * wave;
        green = (54 + shallow * 91) * wave;
        blue = (72 + shallow * 84) * wave;
        if (Math.abs(elevation) < 0.012) {
          const foam = clamp((0.012 - Math.abs(elevation)) / 0.012) * (0.24 + texture * 0.14);
          red += (170 - red) * foam;
          green += (208 - green) * foam;
          blue += (196 - blue) * foam;
        }
      } else {
        red = sampleField(world, gridX, gridY, redAt);
        green = sampleField(world, gridX, gridY, greenAt);
        blue = sampleField(world, gridX, gridY, blueAt);
        let material = 0.89 + texture * 0.2;
        if (["forest", "rainforest"].includes(nearestTile.feature)) material *= 0.8 + texture * 0.25;
        if (nearestTile.relief === "mountains") material *= 0.78 + texture * 0.35;
        if (nearestTile.terrain === "snow") material = 0.96 + texture * 0.08;
        const light = clamp(0.72 + diffuse * 0.34, 0.48, 1.22);
        const contour = nearestTile.relief === "flat" ? 1 : 0.94 + Math.abs(((elevation * 18) % 1) - 0.5) * 0.12;
        const beach = clamp((0.045 - elevation) / 0.045) * (nearestTile.relief === "flat" ? 0.34 : 0.16);
        red = red * light * material * contour * fineGrain;
        green = green * light * material * contour * fineGrain;
        blue = blue * light * material * contour * fineGrain;
        red += (181 - red) * beach;
        green += (158 - green) * beach;
        blue += (103 - blue) * beach;
      }
      const outputRow = height - py - 1;
      const offset = 54 + outputRow * rowSize + px * 3;
      bytes[offset] = Math.round(clamp(blue, 0, 255));
      bytes[offset + 1] = Math.round(clamp(green, 0, 255));
      bytes[offset + 2] = Math.round(clamp(red, 0, 255));
    }
  }
  return `data:image/bmp;base64,${bytesToBase64(bytes)}`;
}

function coastlinePathData(world, cellSize) {
  const segments = [];
  const neighbor = (tile, dx, dy) => {
    let x = tile.x + dx;
    const y = tile.y + dy;
    if (world.config.wrapX) x = (x + world.width) % world.width;
    if (x < 0 || x >= world.width || y < 0 || y >= world.height) return null;
    return world.tiles[y * world.width + x];
  };
  for (const tile of world.tiles.filter(isLand)) {
    if (!isLand(neighbor(tile, 0, -1))) segments.push({ start: { x: tile.x, y: tile.y }, end: { x: tile.x + 1, y: tile.y } });
    if (!isLand(neighbor(tile, 1, 0))) segments.push({ start: { x: tile.x + 1, y: tile.y }, end: { x: tile.x + 1, y: tile.y + 1 } });
    if (!isLand(neighbor(tile, 0, 1))) segments.push({ start: { x: tile.x + 1, y: tile.y + 1 }, end: { x: tile.x, y: tile.y + 1 } });
    if (!isLand(neighbor(tile, -1, 0))) segments.push({ start: { x: tile.x, y: tile.y + 1 }, end: { x: tile.x, y: tile.y } });
  }
  const pointKey = (point) => `${point.x},${point.y}`;
  const adjacency = new Map();
  segments.forEach((segment, index) => {
    for (const point of [segment.start, segment.end]) {
      const key = pointKey(point);
      if (!adjacency.has(key)) adjacency.set(key, []);
      adjacency.get(key).push(index);
    }
  });
  const unused = new Set(segments.map((_, index) => index));
  const chains = [];
  while (unused.size) {
    const firstIndex = [...unused].find((index) => {
      const segment = segments[index];
      return adjacency.get(pointKey(segment.start)).length === 1 || adjacency.get(pointKey(segment.end)).length === 1;
    }) ?? unused.values().next().value;
    const first = segments[firstIndex];
    const start = adjacency.get(pointKey(first.start)).length === 1 ? first.start : first.end;
    const points = [start];
    let current = start;
    while (true) {
      const nextIndex = (adjacency.get(pointKey(current)) ?? []).find((index) => unused.has(index));
      if (nextIndex === undefined) break;
      unused.delete(nextIndex);
      const segment = segments[nextIndex];
      current = pointKey(segment.start) === pointKey(current) ? segment.end : segment.start;
      points.push(current);
      if (pointKey(current) === pointKey(start)) break;
    }
    chains.push(points);
  }
  return chains.map((chain, chainIndex) => {
    const simplified = chain.filter((point, index, points) => {
      if (index === 0 || index === points.length - 1) return true;
      const previous = points[index - 1];
      const next = points[index + 1];
      return (point.x - previous.x) * (next.y - point.y) !== (point.y - previous.y) * (next.x - point.x);
    });
    const points = simplified.map((point, index) => {
      if (index === 0 || index === simplified.length - 1) return { x: point.x * cellSize, y: point.y * cellSize };
      const jitter = (hashUnit(world.seed, chainIndex * 1009 + index, 811) - 0.5) * cellSize * 0.34;
      return { x: point.x * cellSize + jitter, y: point.y * cellSize - jitter * 0.62 };
    });
    if (points.length < 2) return "";
    let path = `M${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
    for (let index = 1; index < points.length - 1; index += 1) {
      const point = points[index];
      const next = points[index + 1];
      path += `Q${point.x.toFixed(2)} ${point.y.toFixed(2)} ${((point.x + next.x) / 2).toFixed(2)} ${((point.y + next.y) / 2).toFixed(2)}`;
    }
    const last = points.at(-1);
    return `${path}L${last.x.toFixed(2)} ${last.y.toFixed(2)}`;
  }).filter(Boolean);
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
    const width = 0.68 + segment.order * 0.46;
    const d = `M${x1.toFixed(2)} ${y1.toFixed(2)}Q${cx.toFixed(2)} ${cy.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}`;
    const copies = [0];
    if (Math.min(x1, x2) < 0) copies.push(worldWidth);
    if (Math.max(x1, x2) > worldWidth) copies.push(-worldWidth);
    return copies.map((shiftX) => `<g${shiftX ? ` transform="translate(${shiftX} 0)"` : ""}><path d="${d}" fill="none" stroke="#173b43" stroke-width="${(width + 1.25).toFixed(2)}" stroke-linecap="round" opacity=".72"/><path d="${d}" fill="none" stroke="#77cad6" stroke-width="${width.toFixed(2)}" stroke-linecap="round" opacity=".96"/><path d="${d}" fill="none" stroke="#d4f2ed" stroke-width="${Math.max(0.3, width * 0.24).toFixed(2)}" stroke-linecap="round" opacity=".48"/></g>`).join("");
  }).join("");
}

function squareGrid(world, cellSize) {
  const lines = [];
  for (let x = 1; x < world.width; x += 1) lines.push(`<path d="M${x * cellSize} 0V${world.height * cellSize}"/>`);
  for (let y = 1; y < world.height; y += 1) lines.push(`<path d="M0 ${y * cellSize}H${world.width * cellSize}"/>`);
  return lines.join("");
}

function terrainDetailMarkers(world, cellSize) {
  return world.tiles.map((tile) => {
    if (!isLand(tile)) return "";
    const x = (tile.x + 0.5) * cellSize;
    const y = (tile.y + 0.5) * cellSize;
    const variation = hashUnit(world.seed, tile.index, 431);
    if (tile.relief === "mountains" && variation > 0.55) {
      const scale = (cellSize * (0.62 + variation * 0.14)).toFixed(2);
      return `<g class="terrain-detail is-mountain" transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale})"><path d="M-1.08 .7-.32-.66.02-.18.46-1.04 1.12.7Z" fill="#4c5655" stroke="#273332" stroke-width=".13"/><path d="M-.67-.02-.32-.66-.04-.25M.16-.35.46-1.04.72-.38" fill="#e7e6d8" stroke="#f6f2df" stroke-width=".11"/><path d="M-1.08 .7-.32-.66.02-.18M-.2.7.46-1.04 1.12.7" fill="none" stroke="#b9c0b7" stroke-width=".12"/></g>`;
    }
    if (tile.relief === "hills" && variation > 0.68) {
      const scale = (cellSize * 0.55).toFixed(2);
      return `<g class="terrain-detail is-hill" transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale})"><path d="M-1 .55Q-.58-.58-.08.34Q.43-.48 1 .55" fill="#817457" fill-opacity=".28" stroke="#464536" stroke-width=".17" opacity=".74"/><path d="M-.72.5Q-.48-.18-.14.31M.15.38Q.46-.16.76.48" fill="none" stroke="#c0b68b" stroke-width=".1" opacity=".55"/></g>`;
    }
    if (["forest", "rainforest"].includes(tile.feature) && variation > 0.6) {
      const scale = (cellSize * (tile.feature === "rainforest" ? 0.49 : 0.44)).toFixed(2);
      return `<g class="terrain-detail is-forest" transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale})" fill="#1d4932" stroke="#9eb582" stroke-width=".09" opacity=".88"><path d="M-1 .75-.6-.2-.34.3-.02-.76.34.18.58-.5 1 .75Z"/><path d="M-.58.74V.18M-.02.74V-.04M.58.74V.12" fill="none" stroke="#443827" stroke-width=".12"/></g>`;
    }
    if (tile.feature === "marsh" && variation > 0.48) {
      const scale = (cellSize * 0.46).toFixed(2);
      return `<g class="terrain-detail is-marsh" transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale})" fill="none" stroke="#b9d4c3" stroke-width=".16" opacity=".72"><path d="M-1 .6Q-.5.25 0 .6T1 .6M-.55.45V-.55M.2.5V-.75M.72.5V-.25"/></g>`;
    }
    return "";
  }).join("");
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
    const frontierType = segment.frontierType ?? (segment.followsRiver ? "river" : "artificial");
    const pair = `${[...segment.nations].sort().join(":")}|${frontierType}`;
    if (!pairGroups.has(pair)) pairGroups.set(pair, []);
    pairGroups.get(pair).push({
      start: { x: segment.x1, y: segment.y1 },
      end: { x: segment.x2, y: segment.y2 },
      followsRiver: segment.followsRiver,
      natural: Boolean(segment.natural),
      frontierType,
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
      let natural = true;
      let frontierType = first.frontierType;
      while (true) {
        const nextIndex = (adjacency.get(pointKey(current)) ?? []).find((index) => unused.has(index));
        if (nextIndex === undefined) break;
        unused.delete(nextIndex);
        const segment = segments[nextIndex];
        followsRiver ||= segment.followsRiver;
        natural &&= segment.natural;
        frontierType = segment.frontierType;
        current = pointKey(segment.start) === pointKey(current) ? segment.end : segment.start;
        points.push(current);
        if (pointKey(current) === pointKey(start)) break;
      }
      chains.push({ points, followsRiver, natural, frontierType });
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
    const frontierClass = String(chain.frontierType).replace(/[^a-z0-9_-]/gi, "");
    return `<path class="nation-border ${chain.natural ? "is-natural-border" : "is-artificial-border"} is-frontier-${frontierClass}${chain.followsRiver ? " is-river-border" : ""}" d="${path}"/>`;
  }).join("");
}

function regionBorderPaths(world, nationMap, cellSize) {
  if (!Array.isArray(nationMap.regionBorderSegments)) return "";
  return nationBorderPaths(world, {
    ...nationMap,
    borderSegments: nationMap.regionBorderSegments.filter((segment) => !segment.national).map((segment) => ({
      ...segment,
      nations: segment.regions,
      followsRiver: false,
    })),
  }, cellSize);
}

function routedRoadPathData(world, road, cellSize) {
  const tileIndices = road.tileIndices?.length ? road.tileIndices : [road.fromTileIndex, road.toTileIndex];
  const pixelWidth = world.width * cellSize;
  const points = [];
  tileIndices.forEach((tileIndex) => {
    const tile = world.tiles[tileIndex];
    let x = (tile.x + 0.5) * cellSize;
    const y = (tile.y + 0.5) * cellSize;
    if (points.length > 0 && world.config.wrapX) {
      const previousX = points.at(-1).x;
      while (x - previousX > pixelWidth / 2) x -= pixelWidth;
      while (previousX - x > pixelWidth / 2) x += pixelWidth;
    }
    points.push({ x, y });
  });
  const simplified = points.filter((point, index) => {
    if (index === 0 || index === points.length - 1) return true;
    const previous = points[index - 1];
    const next = points[index + 1];
    return (point.x - previous.x) * (next.y - point.y) !== (point.y - previous.y) * (next.x - point.x);
  });
  const makePath = (shiftX) => {
    const shifted = simplified.map((point) => ({ x: point.x + shiftX, y: point.y }));
    if (shifted.length === 1) return `M${shifted[0].x.toFixed(2)} ${shifted[0].y.toFixed(2)}`;
    if (shifted.length === 2) return `M${shifted[0].x.toFixed(2)} ${shifted[0].y.toFixed(2)}L${shifted[1].x.toFixed(2)} ${shifted[1].y.toFixed(2)}`;
    let path = `M${shifted[0].x.toFixed(2)} ${shifted[0].y.toFixed(2)}`;
    for (let index = 1; index < shifted.length - 1; index += 1) {
      const point = shifted[index];
      const next = shifted[index + 1];
      path += `Q${point.x.toFixed(2)} ${point.y.toFixed(2)} ${((point.x + next.x) / 2).toFixed(2)} ${((point.y + next.y) / 2).toFixed(2)}`;
    }
    const last = shifted.at(-1);
    return `${path}L${last.x.toFixed(2)} ${last.y.toFixed(2)}`;
  };
  return (world.config.wrapX ? [-pixelWidth, 0, pixelWidth] : [0]).map(makePath);
}

function regionalTravelNetwork(world, nationMap, cellSize) {
  if (!Array.isArray(nationMap.regions) || !nationMap.regions.length) return "";
  const regionById = new Map(nationMap.regions.map((region) => [region.id, region]));
  const objectById = new Map((nationMap.objects ?? []).map((object) => [object.id, object]));
  const pixelWidth = world.width * cellSize;
  const routeEdges = [];

  const roads = Array.isArray(nationMap.roads) && nationMap.roads.length
    ? nationMap.roads
    : nationMap.regions.flatMap((region) => (region.neighborIds ?? []).filter((neighborId) => region.id.localeCompare(neighborId) < 0).map((neighborId) => ({
      id: `fallback-${region.id}-${neighborId}`,
      fromTileIndex: region.markerIndex ?? region.anchorIndex,
      toTileIndex: regionById.get(neighborId)?.markerIndex ?? regionById.get(neighborId)?.anchorIndex,
      fromObjectId: region.id,
      toObjectId: neighborId,
      scope: region.nationId === regionById.get(neighborId)?.nationId ? "regional" : "frontier",
      importance: 2,
    })));
  for (const road of roads) {
      const fromTile = world.tiles[road.fromTileIndex ?? objectById.get(road.fromObjectId)?.tileIndex];
      const toTile = world.tiles[road.toTileIndex ?? objectById.get(road.toObjectId)?.tileIndex];
      if (!fromTile || !toTile) continue;
      const pathData = routedRoadPathData(world, road, cellSize);
      const from = objectById.get(road.fromObjectId);
      const to = objectById.get(road.toObjectId);
      const crossingKinds = road.crossingKinds ?? [];
      const crossingLabel = crossingKinds.length ? `（${crossingKinds.map((kind) => kind === "mountain" ? "山越え" : "渡河").join("・")}）` : "";
      const title = from && to ? `${from.name}―${to.name} 街道${crossingLabel}` : `地方街道${crossingLabel}`;
      const terrainClasses = crossingKinds.map((kind) => ` has-${kind}`).join("");
      routeEdges.push(`<g class="region-route-edge is-${escapeAttribute(road.scope ?? "regional")}${road.importance >= 3 ? " is-arterial" : ""}${terrainClasses}" data-road-id="${escapeAttribute(road.id)}" data-route-from="${escapeAttribute(road.fromObjectId)}" data-route-to="${escapeAttribute(road.toObjectId)}" data-crossing-kinds="${escapeAttribute(crossingKinds.join(" "))}"><title>${escapeAttribute(title)}</title>${pathData.map((d) => `<path class="region-route-casing" d="${d}"/><path class="region-route-line" d="${d}"/>`).join("")}</g>`);
  }

  const nodes = nationMap.regions.map((region) => {
    const hub = objectById.get(region.roadHubObjectId);
    const tile = world.tiles[hub?.tileIndex ?? region.markerIndex ?? region.anchorIndex];
    if (!tile) return "";
    const x = (tile.x + 0.5) * cellSize;
    const y = (tile.y + 0.5) * cellSize;
    const size = cellSize * (region.capital ? 0.72 : 0.52);
    const inset = Math.max(0.7, size * 0.22);
    return `<g class="region-route-node${region.capital ? " is-capital-region" : ""}" data-region-id="${escapeAttribute(region.id)}" transform="translate(${x.toFixed(2)} ${y.toFixed(2)})"><title>${escapeAttribute(`${region.name} · 地方拠点${region.capital ? "・首都地方" : ""}`)}</title><rect class="region-route-node-shadow" x="${(-size / 2 - 1).toFixed(2)}" y="${(-size / 2 - 1).toFixed(2)}" width="${(size + 2).toFixed(2)}" height="${(size + 2).toFixed(2)}" rx="${(size * 0.13).toFixed(2)}"/><rect class="region-route-node-frame" x="${(-size / 2).toFixed(2)}" y="${(-size / 2).toFixed(2)}" width="${size.toFixed(2)}" height="${size.toFixed(2)}" rx="${(size * 0.1).toFixed(2)}"/><rect class="region-route-node-core" x="${(-size / 2 + inset).toFixed(2)}" y="${(-size / 2 + inset).toFixed(2)}" width="${(size - inset * 2).toFixed(2)}" height="${(size - inset * 2).toFixed(2)}"/></g>`;
  }).join("");

  return `<g id="regionalTravelNetwork" aria-label="都市・町・村・城砦を結び、山越えと渡河点を守る地方街道網"><style>.region-route-casing{fill:none;stroke:#10282b;stroke-width:${Math.max(2.5, cellSize * 0.27).toFixed(2)};stroke-linecap:round;stroke-linejoin:round;opacity:.74}.region-route-line{fill:none;stroke:#efe3bf;stroke-width:${Math.max(1.05, cellSize * 0.105).toFixed(2)};stroke-linecap:round;stroke-linejoin:round;opacity:.94}.region-route-edge.is-local .region-route-casing{stroke-width:${Math.max(1.9, cellSize * 0.21).toFixed(2)}}.region-route-edge.is-local .region-route-line{stroke-width:${Math.max(.72, cellSize * 0.075).toFixed(2)};opacity:.82}.region-route-edge.is-frontier .region-route-line{stroke:#f1d59b}.region-route-edge.is-arterial .region-route-line{stroke:#fff0c7}.region-route-edge.has-mountain .region-route-casing{stroke:#2e2420}.region-route-edge.has-river .region-route-line{stroke:#f3d69e}.region-route-node-shadow{fill:#10272a;opacity:.88}.region-route-node-frame{fill:#fff8de;stroke:#263636;stroke-width:${Math.max(0.65, cellSize * 0.065).toFixed(2)}}.region-route-node-core{fill:#5f6f63}.region-route-node.is-capital-region .region-route-node-core{fill:#d5a84e}</style><g id="regionalRoutes">${routeEdges.join("")}</g><g id="regionalRouteNodes">${nodes}</g></g>`;
}

function maritimeTravelNetwork(world, nationMap, cellSize) {
  const objectById = new Map((nationMap.objects ?? []).map((object) => [object.id, object]));
  const routes = (nationMap.seaRoutes ?? []).map((route) => {
    const from = objectById.get(route.fromObjectId);
    const to = objectById.get(route.toObjectId);
    const paths = routedRoadPathData(world, { tileIndices: route.pathTileIndices }, cellSize);
    return `<g class="sea-route-edge is-${escapeAttribute(route.scope)}" data-sea-route-id="${escapeAttribute(route.id)}" data-route-from="${escapeAttribute(route.fromObjectId)}" data-route-to="${escapeAttribute(route.toObjectId)}"><title>${escapeAttribute(`${from?.name ?? "港"}―${to?.name ?? "港"} 海路・約${route.travelMinutes / 60}時間`)}</title>${paths.map((d) => `<path class="sea-route-casing" d="${d}"/><path class="sea-route-line" d="${d}"/>`).join("")}</g>`;
  }).join("");
  if (!routes) return "";
  return `<g id="maritimeTravelNetwork" aria-label="漁港・港・湾口都市を結ぶ海運航路"><style>.sea-route-casing{fill:none;stroke:#071f29;stroke-width:${Math.max(2.4, cellSize * 0.24).toFixed(2)};stroke-linecap:round;stroke-linejoin:round;opacity:.72}.sea-route-line{fill:none;stroke:#7fd7df;stroke-width:${Math.max(.82, cellSize * 0.082).toFixed(2)};stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:${Math.max(1.8, cellSize * .18).toFixed(2)} ${Math.max(1.15, cellSize * .11).toFixed(2)};opacity:.9}.sea-route-edge.is-international .sea-route-line{stroke:#bcecf0;stroke-width:${Math.max(1.05, cellSize * .1).toFixed(2)}}</style>${routes}</g>`;
}

function fallbackCapitalObjects(world, nationMap) {
  return nationMap.nations.map((nation) => {
    const capital = world.tiles[nation.capitalIndex];
    return { id: `${nation.id}-castle`, type: "castle", nationId: nation.id, tileIndex: capital.index, name: `${nation.name}の首都` };
  });
}

function worldObjectShape(type) {
  if (type === "castle") {
    return `<path d="M-6 5V-3h2v-3h3v3h2v-3h3v3h2v8Z" fill="#e8c66f" stroke="#2a2420" stroke-width="1"/><path d="M-2 5V1h4v4M-5-1h2M3-1h2" fill="none" stroke="#fff0b5" stroke-width=".9"/>`;
  }
  if (type === "fort") {
    return `<path d="M-5 5V-4l2-2 2 2 2-2 2 2 2-2v11Z" fill="#a75e46" stroke="#241f1c" stroke-width="1"/><path d="M-2 5V1h4v4M-4-1h8" fill="none" stroke="#f3d49a" stroke-width=".9"/>`;
  }
  if (type === "fishing_port") {
    return `<path d="M-5 2Q0 6 5 2L4 5H-4Z" fill="#c8e4dc" stroke="#1d3434" stroke-width=".9"/><path d="M0 3V-5M0-4L4-1H0" fill="none" stroke="#f5e6b4" stroke-width="1"/>`;
  }
  if (type === "port") {
    return `<path d="M0-6V4M-4-2Q-4 3 0 5Q4 3 4-2M-6 1H6" fill="none" stroke="#d8f1e8" stroke-width="1.35"/><circle cy="-4" r="1.4" fill="#e8c66f" stroke="#263636" stroke-width=".55"/>`;
  }
  if (type === "bay_city") {
    return `<path d="M-6 5V0h2v-4h2v4h2v-6h2v6h2v-4h2v9Z" fill="#e8c66f" stroke="#263636" stroke-width="1"/><path d="M0-5V4M-4 1Q-4 4 0 5Q4 4 4 1M-5 2H5" fill="none" stroke="#d9f4eb" stroke-width=".85"/>`;
  }
  if (type === "city") {
    return `<path d="M-6 5V-1h2v-3h2v3h2v-5h2v5h2v-3h2v9Z" fill="#e8c66f" stroke="#2a2420" stroke-width="1"/><path d="M-4 5V1h2v4M0 5V-1h2v6M4 5V1h1v4" fill="none" stroke="#fff0b5" stroke-width=".8"/>`;
  }
  if (type === "town") {
    return `<path d="M-6 5V0l3-3 3 3v5ZM0 5V-2l3-3 3 3v7Z" fill="#d9b96f" stroke="#32291f" stroke-width=".9"/><path d="M-4 5V2h2v3M2 5V1h2v4M-6 0h6M0-2h6" fill="none" stroke="#fff0b5" stroke-width=".75"/>`;
  }
  return `<path d="M-6 5V0l3-3 3 3v5ZM0 5V-2l3-3 3 3v7Z" fill="#e7d5a2" stroke="#32291f" stroke-width=".9"/><path d="M-4 5V2h2v3M2 5V1h2v4" fill="none" stroke="#8f5d3f" stroke-width=".8"/>`;
}

function worldObjectMarkers(world, nationMap, cellSize, visibleObjectIds = null) {
  const nationById = new Map(nationMap.nations.map((nation) => [nation.id, nation]));
  const worldPixelWidth = world.width * cellSize;
  const objects = (Array.isArray(nationMap.objects) ? nationMap.objects : fallbackCapitalObjects(world, nationMap))
    .filter((object) => !visibleObjectIds || visibleObjectIds.has(object.id));
  const groupIds = { village: "nationVillages", town: "nationTowns", city: "nationCities", fishing_port: "nationFishingPorts", port: "nationPorts", bay_city: "nationBayCities", fort: "nationForts", castle: "nationCapitals" };
  return ["village", "town", "city", "fishing_port", "port", "bay_city", "fort", "castle"].map((type) => {
    const markers = objects.filter((object) => object.type === type).map((object) => {
      const tile = world.tiles[object.tileIndex];
      if (!tile) return "";
      const nation = nationById.get(object.nationId);
      const x = (tile.x + 0.5) * cellSize;
      const y = (tile.y + 0.5) * cellSize;
      // Markers must remain smaller than the generator's three-tile clearance.
      // Keeping even capitals below 1.4x stops neighboring settlements from
      // becoming an unreadable icon pile on the regional camera.
      const baseSize = type === "castle" ? 1.38 : ["city", "bay_city"].includes(type) ? 1.22 : type === "fort" ? 1.08 : ["town", "port"].includes(type) ? 0.94 : 0.78;
      const scale = Math.max(0.54, cellSize * baseSize / 12);
      const className = `world-object object-${type}${type === "castle" ? " nation-capital" : ""}`;
      const shape = `<rect x="-7" y="-7" width="14" height="14" rx="1.8" fill="${escapeAttribute(nation?.color ?? "#66777b")}" stroke="#fff0bd" stroke-width="1.05"/><rect x="-5.8" y="-5.8" width="11.6" height="11.6" rx="1" fill="#172629" fill-opacity=".3" stroke="#172326" stroke-width=".55"/>${worldObjectShape(type)}`;
      const marker = (markerX, wrapCopy = false) => `<g class="${className}${wrapCopy ? " is-wrap-copy" : ""}" ${wrapCopy ? `data-wrap-copy="${escapeAttribute(object.id)}" aria-hidden="true"` : `data-object-id="${escapeAttribute(object.id)}" data-object-type="${type}"`} transform="translate(${markerX.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(3)})" filter="url(#markerShadow)">${wrapCopy ? "" : `<title>${escapeAttribute(`${object.name} · ${nation?.name ?? "無主地"}`)}</title>`}${shape}</g>`;
      const wrappedMarkers = [marker(x)];
      if (world.config.wrapX) {
        // The SVG itself clips filters and shapes at its viewport. Mirror only
        // edge-crossing icons so the three repeated map images join cleanly.
        const visualRadius = 10 * scale;
        if (x - visualRadius < 0) wrappedMarkers.push(marker(x + worldPixelWidth, true));
        if (x + visualRadius > worldPixelWidth) wrappedMarkers.push(marker(x - worldPixelWidth, true));
      }
      return wrappedMarkers.join("");
    }).join("");
    return `<g id="${groupIds[type]}" class="world-object-group is-${type}">${markers}</g>`;
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
  const visibleObjectIds = options.visibleObjectIds instanceof Set
    ? options.visibleObjectIds
    : Array.isArray(options.visibleObjectIds) ? new Set(options.visibleObjectIds) : null;
  if (nationMap && (!Array.isArray(nationMap.nations) || nationMap.tileNationIds?.length !== world.tiles.length)) {
    throw new TypeError("Nation overlay does not match the generated terrain world.");
  }
  const pixelWidth = world.width * cellSize;
  const pixelHeight = world.height * cellSize;
  const blur = Math.max(1.2, cellSize * 0.14);
  const displacement = Math.max(2, cellSize * 0.28);
  const pixelsPerTile = Math.max(4, Math.round(options.pixelsPerTile ?? 12));
  const rasterUrl = renderTerrainBmpDataUrl(world, pixelsPerTile);
  const coastlines = coastlinePathData(world, cellSize);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${pixelWidth} ${pixelHeight}" width="${pixelWidth}" height="${pixelHeight}" preserveAspectRatio="none" role="img" aria-label="東西に循環する高精細自然地形と城・都市・町・村・漁港・港・湾口都市・砦・街道・海路" data-grid="square" data-wrap="longitude" data-terrain-resolution="${world.width}x${world.height}" data-raster-resolution="${world.width * pixelsPerTile}x${world.height * pixelsPerTile}" data-map-style="illustrated-strategy">
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
    <filter id="markerShadow" x="-45%" y="-45%" width="190%" height="205%"><feDropShadow dx="0" dy="1.4" stdDeviation="1.1" flood-color="#061416" flood-opacity=".9"/></filter>
    <mask id="landMask"><rect width="100%" height="100%" fill="black"/><g filter="url(#organicTerrain)">${landMaskCells(world, cellSize)}</g></mask>
  </defs>
  <rect width="100%" height="100%" fill="url(#oceanDepth)"/>
  <image href="${rasterUrl}" x="0" y="0" width="${pixelWidth}" height="${pixelHeight}" preserveAspectRatio="none"/>
  <rect width="100%" height="100%" fill="url(#naturalTexture)" opacity="0.14" mask="url(#landMask)" style="mix-blend-mode:soft-light"/>
  <g id="coastlines" fill="none" stroke-linecap="round" stroke-linejoin="round">${coastlines.map((d) => `<path d="${d}" stroke="#102f37" stroke-width="3.2" opacity=".82"/><path d="${d}" stroke="#d7c493" stroke-width="1.15" opacity=".88"/><path d="${d}" stroke="#eef0d0" stroke-width=".34" opacity=".72"/>`).join("")}</g>
  <g id="terrainDetails">${terrainDetailMarkers(world, cellSize)}</g>
  ${nationMap ? `<g id="nationOverlay" filter="url(#politicalSoft)" mask="url(#landMask)" opacity="0.24" style="mix-blend-mode:color">${nationOverlayCells(world, nationMap, cellSize)}</g>` : ""}
  <g filter="url(#riverSoft)">${riverPaths(world, cellSize)}</g>
  ${showGrid ? `<g fill="none" stroke="#d9d0b3" stroke-width="0.36" opacity="0.08">${squareGrid(world, cellSize)}</g>` : ""}
  ${nationMap ? `<g id="regionBorders" fill="none" stroke="#253b3b" stroke-width="${Math.max(0.42, cellSize * 0.038).toFixed(2)}" stroke-dasharray="${Math.max(0.8, cellSize * 0.09).toFixed(2)} ${Math.max(0.7, cellSize * 0.07).toFixed(2)}" stroke-linecap="round" opacity="0.72">${regionBorderPaths(world, nationMap, cellSize)}</g>` : ""}
  ${nationMap ? `<g id="nationBorders" fill="none" stroke="#f4e6bb" stroke-width="${Math.max(0.65, cellSize * 0.062).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" opacity="0.76"><style>.nation-border.is-natural-border{stroke-width:${Math.max(0.76, cellSize * 0.07).toFixed(2)}}.nation-border.is-artificial-border{stroke-dasharray:${Math.max(1.5, cellSize * 0.2).toFixed(2)} ${Math.max(1, cellSize * 0.13).toFixed(2)};opacity:.68}.nation-border.is-river-border{stroke:#bfe6e8;stroke-width:${Math.max(0.8, cellSize * 0.078).toFixed(2)}}</style>${nationBorderPaths(world, nationMap, cellSize)}</g>${maritimeTravelNetwork(world, nationMap, cellSize)}${regionalTravelNetwork(world, nationMap, cellSize)}<g id="worldObjects">${worldObjectMarkers(world, nationMap, cellSize, visibleObjectIds)}</g>` : ""}
</svg>`;
}

export function terrainSvgDataUrl(world, options = {}) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderTerrainSvg(world, options))}`;
}
