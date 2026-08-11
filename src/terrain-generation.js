import {
  squareGridDistance as gridDistance,
  squareNeighborDistance as neighborDistance,
  squareNeighborIndices as neighborIndices,
  squareTileCoordinates as tileCoordinates,
  squareTileIndex as tileIndex,
  squareWrappedDeltaX as wrappedDeltaX,
} from "./square-grid.js";

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export const TERRAIN_GENERATION_DEFAULTS = Object.freeze({
  width: 160,
  height: 100,
  seed: "eldoria",
  wrapX: true,
  plateCount: 22,
  landRatio: 0.44,
  worldAge: 0.58,
  rainfall: 1,
  temperatureOffsetC: 0,
  erosionIterations: 5,
  riverDensity: 0.0035,
  lakeDepth: 0.028,
  templateCount: 14,
});

const TEMPLATE_GRID_SIZE = 5;

function defineTerrainTemplate(template) {
  return Object.freeze({
    ...template,
    elevationMap: Object.freeze([...template.elevationMap]),
    moistureMap: Object.freeze([...template.moistureMap]),
  });
}

// Each entry is a reusable 5 x 5 terrain piece. World generation rotates, places,
// and softly joins these pieces instead of deciding every tile from unrelated noise.
export const TERRAIN_TEMPLATES = Object.freeze([
  defineTerrainTemplate({
    id: "open-plains", name: "開けた平原", featureBias: -0.18,
    elevationMap: [
      -0.08, -0.06, -0.04, -0.05, -0.08,
      -0.06, -0.03, 0.00, -0.02, -0.05,
      -0.04, 0.00, 0.03, 0.00, -0.04,
      -0.05, -0.02, 0.00, -0.03, -0.06,
      -0.08, -0.05, -0.04, -0.06, -0.08,
    ],
    moistureMap: [
      0.01, 0.02, 0.02, 0.02, 0.01,
      0.02, 0.03, 0.04, 0.03, 0.02,
      0.02, 0.04, 0.05, 0.04, 0.02,
      0.02, 0.03, 0.04, 0.03, 0.02,
      0.01, 0.02, 0.02, 0.02, 0.01,
    ],
  }),
  defineTerrainTemplate({
    id: "forest-belt", name: "森林帯", featureBias: 0.34,
    elevationMap: [
      0.00, 0.03, 0.05, 0.03, 0.00,
      0.02, 0.06, 0.09, 0.06, 0.02,
      0.04, 0.08, 0.11, 0.08, 0.04,
      0.02, 0.06, 0.09, 0.06, 0.02,
      0.00, 0.03, 0.05, 0.03, 0.00,
    ],
    moistureMap: [
      0.12, 0.16, 0.19, 0.16, 0.12,
      0.16, 0.22, 0.26, 0.22, 0.16,
      0.19, 0.26, 0.31, 0.26, 0.19,
      0.16, 0.22, 0.26, 0.22, 0.16,
      0.12, 0.16, 0.19, 0.16, 0.12,
    ],
  }),
  defineTerrainTemplate({
    id: "mountain-spine", name: "山岳脊梁", featureBias: -0.12,
    elevationMap: [
      0.02, 0.18, 0.48, 0.20, 0.03,
      0.04, 0.25, 0.66, 0.27, 0.05,
      0.05, 0.30, 0.78, 0.32, 0.06,
      0.04, 0.24, 0.64, 0.26, 0.04,
      0.02, 0.16, 0.45, 0.18, 0.02,
    ],
    moistureMap: [
      0.03, 0.06, 0.09, -0.05, -0.09,
      0.04, 0.08, 0.12, -0.07, -0.12,
      0.05, 0.10, 0.14, -0.08, -0.14,
      0.04, 0.08, 0.12, -0.07, -0.12,
      0.03, 0.06, 0.09, -0.05, -0.09,
    ],
  }),
  defineTerrainTemplate({
    id: "dry-plateau", name: "乾燥台地", featureBias: -0.35,
    elevationMap: [
      0.04, 0.08, 0.10, 0.08, 0.04,
      0.08, 0.16, 0.20, 0.16, 0.08,
      0.10, 0.20, 0.25, 0.20, 0.10,
      0.08, 0.16, 0.20, 0.16, 0.08,
      0.04, 0.08, 0.10, 0.08, 0.04,
    ],
    moistureMap: [
      -0.12, -0.16, -0.18, -0.16, -0.12,
      -0.16, -0.22, -0.26, -0.22, -0.16,
      -0.18, -0.26, -0.31, -0.26, -0.18,
      -0.16, -0.22, -0.26, -0.22, -0.16,
      -0.12, -0.16, -0.18, -0.16, -0.12,
    ],
  }),
  defineTerrainTemplate({
    id: "river-valley", name: "河谷", featureBias: 0.06,
    elevationMap: [
      0.12, 0.07, -0.10, 0.07, 0.12,
      0.14, 0.08, -0.13, 0.08, 0.14,
      0.15, 0.09, -0.16, 0.09, 0.15,
      0.14, 0.08, -0.13, 0.08, 0.14,
      0.12, 0.07, -0.10, 0.07, 0.12,
    ],
    moistureMap: [
      0.04, 0.12, 0.28, 0.12, 0.04,
      0.05, 0.14, 0.32, 0.14, 0.05,
      0.06, 0.16, 0.36, 0.16, 0.06,
      0.05, 0.14, 0.32, 0.14, 0.05,
      0.04, 0.12, 0.28, 0.12, 0.04,
    ],
  }),
  defineTerrainTemplate({
    id: "wetland-delta", name: "湿地デルタ", featureBias: 0.12,
    elevationMap: [
      -0.03, -0.05, -0.07, -0.05, -0.03,
      -0.05, -0.09, -0.12, -0.09, -0.05,
      -0.07, -0.12, -0.16, -0.12, -0.07,
      -0.05, -0.09, -0.12, -0.09, -0.05,
      -0.03, -0.05, -0.07, -0.05, -0.03,
    ],
    moistureMap: [
      0.16, 0.21, 0.25, 0.21, 0.16,
      0.21, 0.28, 0.34, 0.28, 0.21,
      0.25, 0.34, 0.40, 0.34, 0.25,
      0.21, 0.28, 0.34, 0.28, 0.21,
      0.16, 0.21, 0.25, 0.21, 0.16,
    ],
  }),
]);

function createTerrainTemplateLayout(config, random) {
  const columns = Math.max(3, Math.round(Math.sqrt(config.templateCount * config.width / config.height)));
  const rows = Math.ceil(config.templateCount / columns);
  const cellWidth = config.width / columns;
  const cellHeight = config.height / rows;
  const templateOffset = Math.floor(random() * TERRAIN_TEMPLATES.length);
  const placements = Array.from({ length: config.templateCount }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const template = TERRAIN_TEMPLATES[(index + templateOffset) % TERRAIN_TEMPLATES.length];
    return Object.freeze({
      id: `piece-${index + 1}`,
      templateId: template.id,
      templateName: template.name,
      centerX: Number(((column + 0.5 + (random() - 0.5) * 0.34) * cellWidth).toFixed(3)),
      centerY: Number(((row + 0.5 + (random() - 0.5) * 0.34) * cellHeight).toFixed(3)),
      width: Number((cellWidth * (1.5 + random() * 0.35)).toFixed(3)),
      height: Number((cellHeight * (1.5 + random() * 0.35)).toFixed(3)),
      rotation: Math.floor(random() * 4),
    });
  });
  return Object.freeze({ placements: Object.freeze(placements) });
}

function rotateTemplateCoordinates(u, v, rotation) {
  if (rotation === 1) return { u: v, v: 1 - u };
  if (rotation === 2) return { u: 1 - u, v: 1 - v };
  if (rotation === 3) return { u: 1 - v, v: u };
  return { u, v };
}

function sampleTemplateMap(template, property, u, v, rotation) {
  const rotated = rotateTemplateCoordinates(clamp(u), clamp(v), rotation);
  const x = rotated.u * (TEMPLATE_GRID_SIZE - 1);
  const y = rotated.v * (TEMPLATE_GRID_SIZE - 1);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(TEMPLATE_GRID_SIZE - 1, x0 + 1);
  const y1 = Math.min(TEMPLATE_GRID_SIZE - 1, y0 + 1);
  const tx = smoothstep(x - x0);
  const ty = smoothstep(y - y0);
  const values = template[property];
  const top = values[y0 * TEMPLATE_GRID_SIZE + x0] * (1 - tx) + values[y0 * TEMPLATE_GRID_SIZE + x1] * tx;
  const bottom = values[y1 * TEMPLATE_GRID_SIZE + x0] * (1 - tx) + values[y1 * TEMPLATE_GRID_SIZE + x1] * tx;
  return top * (1 - ty) + bottom * ty;
}

function sampleTerrainTemplates(layout, x, y, config) {
  let elevation = 0;
  let moisture = 0;
  let totalWeight = 0;
  let strongest = null;
  for (const placement of layout.placements) {
    const template = TERRAIN_TEMPLATES.find((entry) => entry.id === placement.templateId);
    const dx = wrappedDeltaX(placement.centerX, x, config.width) / (placement.width / 2);
    const dy = (y - placement.centerY) / (placement.height / 2);
    const distance = Math.hypot(dx, dy);
    const weight = smoothstep(clamp(1 - distance / 1.2));
    const u = dx / 2 + 0.5;
    const v = dy / 2 + 0.5;
    const effectiveWeight = Math.max(0.015, weight);
    elevation += sampleTemplateMap(template, "elevationMap", u, v, placement.rotation) * effectiveWeight;
    moisture += sampleTemplateMap(template, "moistureMap", u, v, placement.rotation) * effectiveWeight;
    totalWeight += effectiveWeight;
    const affinity = 1 / Math.max(0.08, distance);
    if (!strongest || affinity > strongest.affinity) strongest = { placement, template, affinity };
  }
  return {
    elevation: elevation / Math.max(0.001, totalWeight),
    moisture: moisture / Math.max(0.001, totalWeight),
    placement: strongest.placement,
    template: strongest.template,
  };
}

function hashSeed(seed) {
  const text = String(seed);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function makeRandom(seed) {
  let state = hashSeed(seed);
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function smoothstep(value) {
  return value * value * (3 - 2 * value);
}

function latticeNoise(x, y, seed) {
  let value = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function valueNoise(x, y, seed) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smoothstep(x - x0);
  const ty = smoothstep(y - y0);
  const top = latticeNoise(x0, y0, seed) * (1 - tx) + latticeNoise(x0 + 1, y0, seed) * tx;
  const bottom = latticeNoise(x0, y0 + 1, seed) * (1 - tx) + latticeNoise(x0 + 1, y0 + 1, seed) * tx;
  return top * (1 - ty) + bottom * ty;
}

function fractalNoise(x, y, seed, octaves = 4) {
  let total = 0;
  let amplitude = 1;
  let frequency = 1;
  let amplitudeTotal = 0;
  for (let octave = 0; octave < octaves; octave += 1) {
    total += valueNoise(x * frequency, y * frequency, seed + octave * 1013) * amplitude;
    amplitudeTotal += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return total / amplitudeTotal;
}

function validateOptions(options) {
  const config = { ...TERRAIN_GENERATION_DEFAULTS, ...options };
  if (!Number.isInteger(config.width) || config.width < 12 || !Number.isInteger(config.height) || config.height < 8) {
    throw new RangeError("Terrain generation requires a grid of at least 12 x 8 tiles.");
  }
  if (!Number.isInteger(config.plateCount) || config.plateCount < 3 || config.plateCount > Math.floor(config.width * config.height / 12)) {
    throw new RangeError("plateCount must be an integer compatible with the map size.");
  }
  if (!(config.landRatio >= 0.15 && config.landRatio <= 0.8)) throw new RangeError("landRatio must be between 0.15 and 0.8.");
  if (!(config.worldAge >= 0 && config.worldAge <= 1)) throw new RangeError("worldAge must be between 0 and 1.");
  if (!(config.rainfall >= 0.35 && config.rainfall <= 1.8)) throw new RangeError("rainfall must be between 0.35 and 1.8.");
  if (!Number.isInteger(config.templateCount) || config.templateCount < TERRAIN_TEMPLATES.length || config.templateCount > 64) {
    throw new RangeError(`templateCount must be an integer between ${TERRAIN_TEMPLATES.length} and 64.`);
  }
  return config;
}

function quantile(values, fraction) {
  const sorted = [...values].sort((left, right) => left - right);
  const index = clamp(Math.round((sorted.length - 1) * fraction), 0, sorted.length - 1);
  return sorted[index];
}

function roundContinentalField(config, field) {
  let rounded = [...field];
  for (let pass = 0; pass < 5; pass += 1) {
    rounded = rounded.map((value, index) => {
      const { x, y } = tileCoordinates(index, config.width);
      let nearbyTotal = 0;
      let nearbyWeight = 0;
      for (let offsetY = -2; offsetY <= 2; offsetY += 1) {
        const sampleY = y + offsetY;
        if (sampleY < 0 || sampleY >= config.height) continue;
        for (let offsetX = -2; offsetX <= 2; offsetX += 1) {
          if (offsetX === 0 && offsetY === 0) continue;
          const distance = Math.hypot(offsetX, offsetY);
          if (distance > 2.25) continue;
          const sampleX = config.wrapX
            ? (x + offsetX + config.width) % config.width
            : x + offsetX;
          if (sampleX < 0 || sampleX >= config.width) continue;
          const weight = 1 / (1 + distance);
          nearbyTotal += rounded[tileIndex(sampleX, sampleY, config.width)] * weight;
          nearbyWeight += weight;
        }
      }
      const nearbyAverage = nearbyTotal / Math.max(0.001, nearbyWeight);
      return value * 0.58 + nearbyAverage * 0.42;
    });
  }
  return rounded;
}

function createPlates(config, random) {
  return Array.from({ length: config.plateCount }, (_, id) => {
    const angle = random() * Math.PI * 2;
    const speed = 0.35 + random() * 0.65;
    return {
      id,
      centerX: random() * config.width,
      centerY: (0.04 + random() * 0.92) * config.height,
      velocityX: Math.cos(angle) * speed,
      velocityY: Math.sin(angle) * speed,
      continentalBias: random() < 0.52 ? 0.16 + random() * 0.28 : -0.3 - random() * 0.2,
      mineralRichness: 0.28 + random() * 0.67,
      crustAge: random(),
    };
  });
}

function assignPlates(config, plates) {
  return Array.from({ length: config.width * config.height }, (_, index) => {
    const { x, y } = tileCoordinates(index, config.width);
    let nearest = plates[0];
    let nearestDistance = Infinity;
    for (const plate of plates) {
      const dx = wrappedDeltaX(x, plate.centerX, config.width) / config.width;
      const dy = (plate.centerY - y) / config.height;
      const distance = dx * dx + dy * dy;
      if (distance < nearestDistance) {
        nearest = plate;
        nearestDistance = distance;
      }
    }
    return nearest.id;
  });
}

function spreadField(field, config, passes, decay) {
  let current = field;
  for (let pass = 0; pass < passes; pass += 1) {
    current = current.map((value, index) => {
      const neighbors = neighborIndices(index, config);
      const propagated = Math.max(...neighbors.map((neighbor) => current[neighbor] * decay), 0);
      const average = neighbors.reduce((sum, neighbor) => sum + current[neighbor], 0) / Math.max(1, neighbors.length);
      return Math.max(value, propagated, average * 0.78);
    });
  }
  return current;
}

function calculatePlateStress(config, plates, plateIds) {
  const convergence = new Array(plateIds.length).fill(0);
  const divergence = new Array(plateIds.length).fill(0);
  const transform = new Array(plateIds.length).fill(0);
  for (let index = 0; index < plateIds.length; index += 1) {
    const plate = plates[plateIds[index]];
    for (const neighbor of neighborIndices(index, config)) {
      const other = plates[plateIds[neighbor]];
      if (other.id === plate.id) continue;
      let dx = wrappedDeltaX(plate.centerX, other.centerX, config.width) / config.width;
      let dy = (other.centerY - plate.centerY) / config.height;
      const length = Math.hypot(dx, dy) || 1;
      dx /= length;
      dy /= length;
      const relativeX = plate.velocityX - other.velocityX;
      const relativeY = plate.velocityY - other.velocityY;
      const normal = (relativeX * dx + relativeY * dy) / 2;
      const shear = Math.abs(relativeX * dy - relativeY * dx) / 2;
      convergence[index] = Math.max(convergence[index], clamp(normal));
      divergence[index] = Math.max(divergence[index], clamp(-normal));
      transform[index] = Math.max(transform[index], clamp(shear));
    }
  }
  return {
    convergence: spreadField(convergence, config, 3, 0.72),
    divergence: spreadField(divergence, config, 2, 0.66),
    transform: spreadField(transform, config, 2, 0.62),
  };
}

function generateElevation(config, plates, plateIds, stress, seed, templateLayout) {
  const raw = plateIds.map((plateId, index) => {
    const { x: tileX, y: tileY } = tileCoordinates(index, config.width);
    const plate = plates[plateId];
    const normalizedX = tileX / config.width;
    const normalizedY = tileY / config.height;
    const continentalShape = (fractalNoise(normalizedX * 2.15, normalizedY * 2.15, seed + 17, 4) - 0.5) * 1.08;
    const localRelief = (fractalNoise(normalizedX * 8.5, normalizedY * 8.5, seed + 43, 3) - 0.5) * 0.2;
    const polarEdge = Math.pow(Math.max(0, Math.abs((tileY / (config.height - 1)) * 2 - 1) - 0.72) / 0.28, 2) * 0.9;
    const uplift = stress.convergence[index] * (0.62 + (1 - plate.crustAge) * 0.28) + stress.transform[index] * 0.14;
    const rift = stress.divergence[index] * 0.34;
    const templateSample = sampleTerrainTemplates(templateLayout, tileX, tileY, config);
    return plate.continentalBias + continentalShape * 0.78 + localRelief * 0.55
      + uplift - rift - polarEdge + templateSample.elevation * 0.72;
  });
  const rounded = roundContinentalField(config, raw);
  const seaLevel = quantile(rounded, 1 - config.landRatio);
  const rawSeaLevel = quantile(raw, 1 - config.landRatio);
  const maximumLand = Math.max(...raw.filter((value) => value > rawSeaLevel), rawSeaLevel + 0.01);
  const minimumSea = Math.min(...raw.filter((value) => value <= rawSeaLevel), rawSeaLevel - 0.01);
  return raw.map((value, index) => {
    const rawElevation = value > rawSeaLevel
      ? (value - rawSeaLevel) / (maximumLand - rawSeaLevel)
      : -(rawSeaLevel - value) / (rawSeaLevel - minimumSea);
    if (rounded[index] > seaLevel) return Math.max(0.00001, rawElevation);
    return Math.min(-0.00001, rawElevation);
  });
}

function calculateClimate(config, elevation, seed, templateLayout) {
  const size = config.width * config.height;
  const temperatureC = new Array(size);
  const precipitationNorm = new Array(size).fill(0);
  const precipitationMm = new Array(size).fill(0);
  for (let index = 0; index < size; index += 1) {
    const { x, y } = tileCoordinates(index, config.width);
    const latitude = 1 - (y / (config.height - 1)) * 2;
    const climateNoise = (fractalNoise(x / config.width * 5, y / config.height * 5, seed + 701, 3) - 0.5) * 5;
    temperatureC[index] = 30 - 42 * Math.pow(Math.abs(latitude), 1.3) - Math.max(0, elevation[index]) * 22 + climateNoise + config.temperatureOffsetC;
  }

  for (let y = 0; y < config.height; y += 1) {
    const latitude = 1 - (y / (config.height - 1)) * 2;
    const absoluteLatitude = Math.abs(latitude);
    const eastToWest = absoluteLatitude < 0.28 || absoluteLatitude > 0.76;
    const baseOrder = Array.from({ length: config.width }, (_, x) => eastToWest ? config.width - x - 1 : x);
    const oceanPosition = baseOrder.findIndex((x) => elevation[tileIndex(x, y, config.width)] <= 0);
    const order = oceanPosition > 0 ? [...baseOrder.slice(oceanPosition), ...baseOrder.slice(0, oceanPosition)] : baseOrder;
    let atmosphericMoisture = 0.72;
    let previousElevation = 0;
    for (const x of order) {
      const index = tileIndex(x, y, config.width);
      if (elevation[index] <= 0) {
        atmosphericMoisture = Math.min(1, atmosphericMoisture + 0.58);
        previousElevation = 0;
        continue;
      }
      const uplift = Math.max(0, elevation[index] - Math.max(0, previousElevation));
      const convective = Math.max(0, 1 - absoluteLatitude / 0.42) * 0.18;
      const subtropicalSubsidence = Math.exp(-Math.pow((absoluteLatitude - 0.38) / 0.13, 2)) * 0.21;
      const rainNoise = (fractalNoise(x / config.width * 7, y / config.height * 7, seed + 911, 2) - 0.5) * 0.12;
      const templateMoisture = sampleTerrainTemplates(templateLayout, x, y, config).moisture;
      const rain = clamp((atmosphericMoisture * (0.3 + uplift * 1.7) + convective - subtropicalSubsidence
        + rainNoise + templateMoisture * 0.62) * config.rainfall);
      precipitationNorm[index] = rain;
      precipitationMm[index] = Math.round(80 + rain * 3220);
      atmosphericMoisture = clamp(atmosphericMoisture * (0.982 - uplift * 0.5) - rain * 0.055 + 0.022, 0.04, 1);
      previousElevation = elevation[index];
    }
  }
  return { temperatureC, precipitationNorm, precipitationMm };
}

class MinHeap {
  constructor() {
    this.items = [];
  }

  push(item) {
    this.items.push(item);
    let index = this.items.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.items[parent].priority <= item.priority) break;
      this.items[index] = this.items[parent];
      index = parent;
    }
    this.items[index] = item;
  }

  pop() {
    if (this.items.length === 1) return this.items.pop();
    const root = this.items[0];
    const tail = this.items.pop();
    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      if (left >= this.items.length) break;
      const child = right < this.items.length && this.items[right].priority < this.items[left].priority ? right : left;
      if (this.items[child].priority >= tail.priority) break;
      this.items[index] = this.items[child];
      index = child;
    }
    this.items[index] = tail;
    return root;
  }

  get length() {
    return this.items.length;
  }
}

function priorityFlood(config, elevation) {
  const filled = [...elevation];
  const visited = new Array(elevation.length).fill(false);
  const heap = new MinHeap();
  for (let index = 0; index < elevation.length; index += 1) {
    const { y } = tileCoordinates(index, config.width);
    if (elevation[index] <= 0 || y === 0 || y === config.height - 1) {
      visited[index] = true;
      heap.push({ index, priority: elevation[index] });
    }
  }
  while (heap.length) {
    const current = heap.pop();
    for (const neighbor of neighborIndices(current.index, config)) {
      if (visited[neighbor]) continue;
      visited[neighbor] = true;
      const epsilon = elevation[neighbor] > 0 ? 1e-7 : 0;
      filled[neighbor] = Math.max(elevation[neighbor], filled[current.index] + epsilon);
      heap.push({ index: neighbor, priority: filled[neighbor] });
    }
  }
  return filled;
}

function calculateHydrology(config, elevation, climate) {
  const filledElevation = priorityFlood(config, elevation);
  const flowTo = new Array(elevation.length).fill(-1);
  const runoff = elevation.map((value, index) => {
    if (value <= 0) return 0;
    const warmth = clamp((climate.temperatureC[index] + 8) / 38);
    return Math.max(0.025, climate.precipitationNorm[index] * (0.92 - warmth * 0.38) + (warmth < 0.3 ? 0.035 : 0));
  });
  for (let index = 0; index < elevation.length; index += 1) {
    if (elevation[index] <= 0) continue;
    let destination = -1;
    let steepestGradient = 0;
    for (const neighbor of neighborIndices(index, config)) {
      const gradient = (filledElevation[index] - filledElevation[neighbor]) / neighborDistance(index, neighbor, config);
      if (gradient > steepestGradient + 1e-10 || (Math.abs(gradient - steepestGradient) <= 1e-10 && gradient > 0 && neighbor < destination)) {
        steepestGradient = gradient;
        destination = neighbor;
      }
    }
    flowTo[index] = destination;
  }
  const flowAccumulation = [...runoff];
  const order = elevation.map((_, index) => index).sort((left, right) => filledElevation[right] - filledElevation[left]);
  for (const index of order) {
    const destination = flowTo[index];
    if (destination >= 0) flowAccumulation[destination] += flowAccumulation[index];
  }
  return {
    filledElevation,
    flowTo,
    flowAccumulation,
    runoff,
    depressionDepth: filledElevation.map((value, index) => Math.max(0, value - elevation[index])),
  };
}

function erodeTerrain(config, elevation, seed, templateLayout) {
  let eroded = [...elevation];
  for (let iteration = 0; iteration < config.erosionIterations; iteration += 1) {
    const climate = calculateClimate(config, eroded, seed, templateLayout);
    const hydrology = calculateHydrology(config, eroded, climate);
    const landCount = eroded.filter((value) => value > 0).length;
    const erodibility = 0.22 + config.worldAge * 0.42;
    eroded = eroded.map((value, index) => {
      const destination = hydrology.flowTo[index];
      if (value <= 0 || destination < 0) return value;
      const slope = Math.max(0, value - Math.max(0, eroded[destination])) / neighborDistance(index, destination, config);
      const drainageArea = hydrology.flowAccumulation[index] / Math.max(1, landCount);
      const incision = Math.min(0.012, erodibility * Math.sqrt(drainageArea) * slope);
      return Math.max(0.00001, value - incision);
    });
  }
  return eroded;
}

function calculateSlope(config, elevation) {
  return elevation.map((value, index) => {
    if (value <= 0) return 0;
    const differences = neighborIndices(index, config)
      .map((neighbor) => Math.max(0, value - Math.max(0, elevation[neighbor])) / neighborDistance(index, neighbor, config));
    return Math.max(...differences, 0);
  });
}

function calculateStreamOrder(flowTo, filledElevation) {
  const streamOrder = new Array(flowTo.length).fill(1);
  const maximumUpstreamOrder = new Array(flowTo.length).fill(0);
  const maximumOrderCount = new Array(flowTo.length).fill(0);
  const order = flowTo.map((_, index) => index).sort((left, right) => filledElevation[right] - filledElevation[left]);
  for (const index of order) {
    if (maximumUpstreamOrder[index] > 0) {
      streamOrder[index] = maximumUpstreamOrder[index] + (maximumOrderCount[index] >= 2 ? 1 : 0);
    }
    const destination = flowTo[index];
    if (destination < 0) continue;
    if (streamOrder[index] > maximumUpstreamOrder[destination]) {
      maximumUpstreamOrder[destination] = streamOrder[index];
      maximumOrderCount[destination] = 1;
    } else if (streamOrder[index] === maximumUpstreamOrder[destination]) {
      maximumOrderCount[destination] += 1;
    }
  }
  return streamOrder;
}

function extractRivers(config, elevation, hydrology) {
  const landCount = elevation.filter((value) => value > 0).length;
  const threshold = Math.max(2.2, landCount * config.riverDensity / Math.max(0.55, config.rainfall));
  const streamOrder = calculateStreamOrder(hydrology.flowTo, hydrology.filledElevation);
  const segments = [];
  const outletFor = new Map();
  function findOutlet(start) {
    if (outletFor.has(start)) return outletFor.get(start);
    const path = [];
    const seen = new Set();
    let current = start;
    while (current >= 0 && elevation[current] > 0 && !seen.has(current)) {
      if (outletFor.has(current)) {
        current = outletFor.get(current);
        break;
      }
      path.push(current);
      seen.add(current);
      current = hydrology.flowTo[current];
    }
    const outlet = current >= 0 ? current : path.at(-1);
    for (const index of path) outletFor.set(index, outlet);
    return outlet;
  }
  for (let index = 0; index < elevation.length; index += 1) {
    const destination = hydrology.flowTo[index];
    if (elevation[index] <= 0 || destination < 0 || hydrology.flowAccumulation[index] < threshold) continue;
    segments.push({
      from: index,
      to: destination,
      discharge: Number(hydrology.flowAccumulation[index].toFixed(3)),
      order: streamOrder[index],
      outlet: findOutlet(index),
    });
  }
  const groups = new Map();
  for (const segment of segments) {
    const key = segment.outlet;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(segment);
  }
  const rivers = [...groups.entries()]
    .map(([outlet, riverSegments]) => ({
      outlet,
      segments: riverSegments,
      discharge: Math.max(...riverSegments.map((segment) => segment.discharge)),
    }))
    .sort((left, right) => right.discharge - left.discharge)
    .map((river, index) => {
      const downstreamTiles = new Set(river.segments.map((segment) => segment.to));
      const sourceIndices = [...new Set(river.segments.map((segment) => segment.from))].filter((source) => !downstreamTiles.has(source));
      return {
        id: `river-${index + 1}`,
        outletIndex: river.outlet,
        sourceIndices,
        tileIndices: [...new Set(river.segments.flatMap((segment) => [segment.from, segment.to]))],
        length: river.segments.length,
        discharge: river.discharge,
        maxOrder: Math.max(...river.segments.map((segment) => segment.order)),
      };
    });
  const riverIdByOutlet = new Map(rivers.map((river) => [river.outletIndex, river.id]));
  for (const segment of segments) segment.riverId = riverIdByOutlet.get(segment.outlet);
  return { threshold, streamOrder, segments, rivers };
}

function labelLandmasses(config, elevation) {
  const ids = new Array(elevation.length).fill(null);
  let nextId = 1;
  for (let start = 0; start < elevation.length; start += 1) {
    if (elevation[start] <= 0 || ids[start] !== null) continue;
    const queue = [start];
    ids[start] = nextId;
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      for (const neighbor of neighborIndices(queue[cursor], config)) {
        if (elevation[neighbor] <= 0 || ids[neighbor] !== null) continue;
        ids[neighbor] = nextId;
        queue.push(neighbor);
      }
    }
    nextId += 1;
  }
  return ids;
}

function classifyRelief(elevation, slope, convergence, thresholds) {
  if (elevation <= 0) return "water";
  if (elevation >= thresholds.mountainElevation
    || (slope >= thresholds.mountainSlope && elevation >= thresholds.hillElevation)
    || (convergence >= 0.7 && elevation >= thresholds.hillElevation)) return "mountains";
  if (elevation >= thresholds.hillElevation || slope >= thresholds.hillSlope || convergence >= 0.3) return "hills";
  return "flat";
}

function classifyTerrain(temperatureC, precipitationMm) {
  if (temperatureC < -8) return "snow";
  if (temperatureC < 4) return "tundra";
  if (precipitationMm < 340) return "desert";
  if (precipitationMm < 720) return "plains";
  return "grassland";
}

function buildTiles(config, plates, plateIds, stress, elevation, climate, hydrology, riverData, seed, templateLayout) {
  const slope = calculateSlope(config, elevation);
  const landElevations = elevation.filter((value) => value > 0);
  const landSlopes = slope.filter((_, index) => elevation[index] > 0);
  const reliefThresholds = {
    mountainElevation: Math.max(0.58, quantile(landElevations, 0.82 + config.worldAge * 0.08)),
    hillElevation: Math.max(0.22, quantile(landElevations, 0.46 + config.worldAge * 0.08)),
    mountainSlope: Math.max(0.18, quantile(landSlopes, 0.9)),
    hillSlope: Math.max(0.07, quantile(landSlopes, 0.65)),
  };
  const landmassIds = labelLandmasses(config, elevation);
  const riverSegmentByFrom = new Map(riverData.segments.map((segment) => [segment.from, segment]));
  const channelTiles = new Set(riverData.segments.map((segment) => segment.from));
  const lakeTiles = new Set(hydrology.depressionDepth
    .map((depth, index) => ({ depth, index }))
    .filter(({ depth, index }) => depth >= config.lakeDepth
      && elevation[index] > 0
      && hydrology.flowAccumulation[index] >= riverData.threshold * 0.45
      && climate.temperatureC[index] > -12)
    .map(({ index }) => index));

  return elevation.map((height, index) => {
    const { x, y } = tileCoordinates(index, config.width);
    const templateSample = sampleTerrainTemplates(templateLayout, x, y, config);
    const terrainTemplate = {
      terrainTemplateId: templateSample.template.id,
      terrainTemplateName: templateSample.template.name,
      terrainTemplatePieceId: templateSample.placement.id,
    };
    const neighbors = neighborIndices(index, config);
    const isOcean = height <= 0;
    const isLake = lakeTiles.has(index);
    const isCoast = isOcean && neighbors.some((neighbor) => elevation[neighbor] > 0);
    if (isOcean || isLake) {
      return {
        index,
        x,
        y,
        ...terrainTemplate,
        latitude: Number((1 - (y / (config.height - 1)) * 2).toFixed(4)),
        plateId: plateIds[index],
        landmassId: null,
        elevation: Number(height.toFixed(5)),
        hydrologyElevation: Number(hydrology.filledElevation[index].toFixed(7)),
        slope: 0,
        temperatureC: Number(climate.temperatureC[index].toFixed(1)),
        precipitationMm: 0,
        flowTo: hydrology.flowTo[index],
        flowAccumulation: Number(hydrology.flowAccumulation[index].toFixed(3)),
        relief: "water",
        terrain: isLake ? "lake" : isCoast ? "coast" : "ocean",
        feature: climate.temperatureC[index] < -8 ? "ice" : null,
        riverId: riverSegmentByFrom.get(index)?.riverId ?? null,
        riverOrder: riverData.streamOrder[index],
        freshwater: isLake ? 1 : 0,
        soilMoisture: 1,
        floodRisk: isLake ? 0.35 : 0,
        fertility: 0,
        yields: { food: isCoast || isLake ? 1 : 0, production: 0, commerce: isCoast ? 1 : 0 },
        resourcePotential: { agriculture: 0, grazing: 0, timber: 0, mineral: 0, freshwater: isLake ? 1 : 0 },
        movementCost: 1,
        defense: 0,
        settlementScore: 0,
      };
    }

    const relief = classifyRelief(height, slope[index], stress.convergence[index], reliefThresholds);
    const terrain = classifyTerrain(climate.temperatureC[index], climate.precipitationMm[index]);
    const nearbyChannelDischarge = Math.max(0, ...[index, ...neighbors]
      .filter((neighbor) => channelTiles.has(neighbor))
      .map((neighbor) => hydrology.flowAccumulation[neighbor]));
    const riverProximity = channelTiles.has(index) ? 1 : nearbyChannelDischarge > 0 ? 0.68 : 0;
    const thermalEvaporation = clamp((climate.temperatureC[index] - 5) / 35);
    const soilMoisture = clamp(
      climate.precipitationNorm[index] * 0.72
      + riverProximity * 0.24
      + Math.log1p(hydrology.flowAccumulation[index]) / 35
      - slope[index] * 0.48
      - thermalEvaporation * 0.12,
    );
    const dischargeScale = clamp(nearbyChannelDischarge / Math.max(riverData.threshold * 3.5, 1));
    const flatness = clamp(1 - slope[index] / 0.13);
    const floodRisk = clamp(riverProximity * dischargeScale * flatness * (0.58 + climate.precipitationNorm[index] * 0.42));
    const floodplain = riverProximity > 0 && relief === "flat" && slope[index] < 0.07 && climate.temperatureC[index] > -3 && floodRisk > 0.18;
    const wetland = !floodplain && relief === "flat" && soilMoisture > 0.81 && climate.temperatureC[index] > 2;
    const vegetationNoise = fractalNoise(x / config.width * 5.5, y / config.height * 5.5, seed + 1201, 2);
    const vegetationScore = vegetationNoise + templateSample.template.featureBias;
    let feature = null;
    if (floodplain) feature = "floodplain";
    else if (wetland) feature = "marsh";
    else if (terrain === "grassland" && climate.temperatureC[index] > 21 && climate.precipitationMm[index] > 1750 && vegetationScore > 0.48) feature = "rainforest";
    else if ((terrain === "grassland" || terrain === "plains" || terrain === "tundra") && climate.precipitationMm[index] > 680 && vegetationScore > 0.52) feature = "forest";

    const plate = plates[plateIds[index]];
    const moistureFitness = Math.exp(-Math.pow((soilMoisture - 0.62) / 0.33, 2));
    const growingTemperature = clamp((climate.temperatureC[index] + 6) / 24) * clamp((38 - climate.temperatureC[index]) / 18);
    const alluvialBonus = feature === "floodplain" ? 0.27 : riverProximity * 0.09;
    const organicBonus = terrain === "grassland" ? 0.07 : feature === "forest" ? 0.04 : 0;
    const waterloggingPenalty = Math.max(0, soilMoisture - 0.82) * 0.72;
    const leachingPenalty = climate.temperatureC[index] > 22 && climate.precipitationMm[index] > 2100 ? 0.09 : 0;
    const slopePenalty = clamp(slope[index] / 0.22) * 0.24;
    const fertilityNorm = clamp(
      0.16 + plate.mineralRichness * 0.23 + moistureFitness * 0.31 + growingTemperature * 0.18
      + alluvialBonus + organicBonus - waterloggingPenalty - leachingPenalty - slopePenalty,
    );
    const fertility = Math.round(fertilityNorm * 100);
    const agriculture = clamp(fertilityNorm * flatness * (feature === "marsh" ? 0.52 : 1));
    const grazing = clamp((terrain === "plains" || terrain === "grassland" ? 0.55 : 0.18) + fertilityNorm * 0.25 - slope[index]);
    const timber = feature === "rainforest" ? 1 : feature === "forest" ? 0.8 : 0.08;
    const mineral = clamp(plate.mineralRichness * 0.42 + stress.convergence[index] * 0.46 + (relief === "mountains" ? 0.27 : relief === "hills" ? 0.12 : 0));
    const freshwater = clamp(riverProximity * 0.85 + soilMoisture * 0.15);
    const baseFood = terrain === "grassland" ? 1.25 : terrain === "plains" ? 0.72 : terrain === "tundra" ? 0.36 : 0;
    const food = Number((baseFood + agriculture * 1.85 + (feature === "floodplain" ? 0.48 : 0)).toFixed(1));
    const production = Number(((relief === "mountains" ? 2.2 : relief === "hills" ? 1.45 : 0.65) + timber * 0.55 + mineral * 0.45).toFixed(1));
    const commerce = Number(((riverProximity > 0 ? 0.7 : 0.15) + (feature === "floodplain" ? 0.25 : 0)).toFixed(1));
    const movementCost = relief === "mountains" ? 4 : 1 + (relief === "hills" ? 1 : 0) + (feature === "forest" || feature === "rainforest" ? 1 : 0) + (feature === "marsh" ? 2 : 0);
    const defense = relief === "mountains" ? 3 : (relief === "hills" ? 2 : 0) + (feature === "forest" || feature === "rainforest" ? 1 : 0) - (feature === "floodplain" ? 1 : 0);
    const hazardPenalty = floodRisk * 16 + (feature === "marsh" ? 12 : 0) + (relief === "mountains" ? 20 : 0);
    const settlementScore = Math.max(0, Math.round(food * 18 + production * 10 + commerce * 7 + freshwater * 18 - movementCost * 3 - hazardPenalty));
    return {
      index,
      x,
      y,
      ...terrainTemplate,
      latitude: Number((1 - (y / (config.height - 1)) * 2).toFixed(4)),
      plateId: plateIds[index],
      landmassId: landmassIds[index],
      elevation: Number(height.toFixed(5)),
      hydrologyElevation: Number(hydrology.filledElevation[index].toFixed(7)),
      slope: Number(slope[index].toFixed(5)),
      temperatureC: Number(climate.temperatureC[index].toFixed(1)),
      precipitationMm: climate.precipitationMm[index],
      flowTo: hydrology.flowTo[index],
      flowAccumulation: Number(hydrology.flowAccumulation[index].toFixed(3)),
      relief,
      terrain,
      feature,
      riverId: riverSegmentByFrom.get(index)?.riverId ?? null,
      riverOrder: riverData.streamOrder[index],
      freshwater: Number(freshwater.toFixed(3)),
      soilMoisture: Number(soilMoisture.toFixed(3)),
      floodRisk: Number(floodRisk.toFixed(3)),
      fertility,
      yields: { food, production, commerce },
      resourcePotential: {
        agriculture: Number(agriculture.toFixed(3)),
        grazing: Number(grazing.toFixed(3)),
        timber: Number(timber.toFixed(3)),
        mineral: Number(mineral.toFixed(3)),
        freshwater: Number(freshwater.toFixed(3)),
      },
      movementCost,
      defense,
      settlementScore,
    };
  });
}

function countBy(items, property) {
  return Object.fromEntries([...items.reduce((counts, item) => {
    const key = item[property] ?? "none";
    counts.set(key, (counts.get(key) ?? 0) + 1);
    return counts;
  }, new Map())].sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function buildSummary(config, tiles, rivers) {
  const land = tiles.filter((tile) => !["ocean", "coast", "lake"].includes(tile.terrain));
  const habitable = land.filter((tile) => tile.relief !== "mountains" && tile.feature !== "marsh");
  return {
    landRatio: Number((land.length / tiles.length).toFixed(3)),
    landTiles: land.length,
    waterTiles: tiles.length - land.length,
    landmassCount: new Set(land.map((tile) => tile.landmassId)).size,
    riverCount: rivers.length,
    riverTileCount: land.filter((tile) => tile.riverId).length,
    meanFertility: Number((land.reduce((sum, tile) => sum + tile.fertility, 0) / Math.max(1, land.length)).toFixed(1)),
    meanPrecipitationMm: Math.round(land.reduce((sum, tile) => sum + tile.precipitationMm, 0) / Math.max(1, land.length)),
    viableSettlementTiles: habitable.filter((tile) => tile.settlementScore >= 55).length,
    terrainCounts: countBy(tiles, "terrain"),
    reliefCounts: countBy(land, "relief"),
    featureCounts: countBy(land, "feature"),
    templateCounts: countBy(land, "terrainTemplateId"),
  };
}

function tilesWithinRadius(world, startIndex, radius) {
  const visited = new Set([startIndex]);
  let frontier = [startIndex];
  for (let step = 0; step < radius; step += 1) {
    const next = [];
    for (const index of frontier) {
      for (const neighbor of neighborIndices(index, world.config)) {
        if (visited.has(neighbor)) continue;
        visited.add(neighbor);
        next.push(neighbor);
      }
    }
    frontier = next;
  }
  return [...visited].map((index) => world.tiles[index]);
}

function evaluateStartRegion(world, tile) {
  const workable = tilesWithinRadius(world, tile.index, 2)
    .filter((candidate) => candidate.terrain !== "ocean" && candidate.relief !== "mountains");
  const bestFood = workable.map((candidate) => candidate.yields.food).sort((left, right) => right - left).slice(0, 7);
  const bestProduction = workable.map((candidate) => candidate.yields.production).sort((left, right) => right - left).slice(0, 7);
  const freshWaterAccess = Math.max(tile.freshwater, ...tilesWithinRadius(world, tile.index, 1).map((candidate) => candidate.freshwater));
  const terrainVariety = new Set(workable.map((candidate) => candidate.terrain)).size;
  const averageHazard = workable.reduce((sum, candidate) => sum + candidate.floodRisk, 0) / Math.max(1, workable.length);
  return Math.round(
    bestFood.reduce((sum, value) => sum + value, 0) * 3.2
    + bestProduction.reduce((sum, value) => sum + value, 0) * 2.1
    + freshWaterAccess * 22
    + terrainVariety * 2.5
    + tile.settlementScore * 0.35
    - averageHazard * 12,
  );
}

export function selectStartLocations(world, count = 4, options = {}) {
  if (!Number.isInteger(count) || count < 1) throw new RangeError("Start location count must be a positive integer.");
  const minDistance = options.minDistance ?? Math.max(4, Math.floor(Math.min(world.width, world.height) / 5));
  const candidates = world.tiles
    .filter((tile) => tile.settlementScore > 0 && tile.relief !== "mountains" && tile.feature !== "marsh")
    .map((tile) => ({ tile, regionScore: evaluateStartRegion(world, tile) }))
    .sort((left, right) => right.regionScore - left.regionScore || left.tile.index - right.tile.index);
  const selected = [];
  while (selected.length < count) {
    const available = candidates.filter((candidate) => !selected.includes(candidate)
      && selected.every((start) => gridDistance(candidate.tile.index, start.tile.index, world.config) >= minDistance));
    if (!available.length) break;
    const best = available.reduce((winner, candidate) => {
      const distanceBonus = selected.length
        ? Math.min(...selected.map((start) => gridDistance(candidate.tile.index, start.tile.index, world.config))) * 1.4
        : 0;
      const newLandmassBonus = selected.some((start) => start.tile.landmassId === candidate.tile.landmassId) ? 0 : 8;
      const score = candidate.regionScore + distanceBonus + newLandmassBonus;
      return !winner || score > winner.score ? { candidate, score } : winner;
    }, null);
    selected.push(best.candidate);
  }
  return selected.map(({ tile, regionScore }) => ({
    index: tile.index,
    x: tile.x,
    y: tile.y,
    landmassId: tile.landmassId,
    score: regionScore,
    localScore: tile.settlementScore,
    freshwater: tile.freshwater,
    terrain: tile.terrain,
    feature: tile.feature,
  }));
}

export function traceRiver(world, startIndex) {
  if (!Number.isInteger(startIndex) || startIndex < 0 || startIndex >= world.tiles.length) return [];
  const path = [];
  const visited = new Set();
  let current = startIndex;
  while (current >= 0 && !visited.has(current)) {
    path.push(current);
    visited.add(current);
    current = world.tiles[current].flowTo;
  }
  return path;
}

export function validateTerrainWorld(world) {
  const issues = [];
  for (const segment of world.riverSegments) {
    const from = world.tiles[segment.from];
    const to = world.tiles[segment.to];
    if (to.hydrologyElevation >= from.hydrologyElevation) issues.push(`River does not descend: ${segment.from} -> ${segment.to}`);
    if (from.terrain === "ocean" || from.terrain === "coast") issues.push(`River starts in ocean water at ${segment.from}.`);
  }
  for (const tile of world.tiles) {
    if (tile.feature === "floodplain") {
      const hasRiver = tile.riverId || neighborIndices(tile.index, world.config).some((neighbor) => world.tiles[neighbor].riverId);
      if (!hasRiver) issues.push(`Floodplain ${tile.index} is not adjacent to a river.`);
      if (tile.relief !== "flat") issues.push(`Floodplain ${tile.index} is not flat.`);
    }
  }
  const isolatedMountains = world.tiles.filter((tile) => tile.relief === "mountains"
    && !neighborIndices(tile.index, world.config).some((neighbor) => world.tiles[neighbor].relief === "mountains"));
  if (isolatedMountains.length > Math.max(2, world.summary.landTiles * 0.015)) {
    issues.push(`Too many isolated mountains: ${isolatedMountains.length}.`);
  }
  return {
    valid: issues.length === 0,
    issues,
    isolatedMountainCount: isolatedMountains.length,
  };
}

export function generateTerrain(options = {}) {
  const config = validateOptions(options);
  const seed = hashSeed(config.seed);
  const random = makeRandom(config.seed);
  const plates = createPlates(config, random);
  const plateIds = assignPlates(config, plates);
  const stress = calculatePlateStress(config, plates, plateIds);
  const templateLayout = createTerrainTemplateLayout(config, random);
  const initialElevation = generateElevation(config, plates, plateIds, stress, seed, templateLayout);
  const elevation = erodeTerrain(config, initialElevation, seed, templateLayout);
  const climate = calculateClimate(config, elevation, seed, templateLayout);
  const hydrology = calculateHydrology(config, elevation, climate);
  const riverData = extractRivers(config, elevation, hydrology);
  const tiles = buildTiles(config, plates, plateIds, stress, elevation, climate, hydrology, riverData, seed, templateLayout);
  const world = {
    version: 1,
    gridType: "square",
    seed: config.seed,
    width: config.width,
    height: config.height,
    config: Object.freeze({ ...config }),
    plates: plates.map((plate) => ({ ...plate })),
    terrainTemplates: templateLayout.placements,
    tiles,
    rivers: riverData.rivers,
    riverSegments: riverData.segments,
  };
  world.summary = buildSummary(config, tiles, world.rivers);
  return world;
}
