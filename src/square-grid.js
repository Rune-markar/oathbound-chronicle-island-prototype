export const SQUARE_CARDINAL_DIRECTIONS = Object.freeze([
  Object.freeze({ name: "east", dx: 1, dy: 0 }),
  Object.freeze({ name: "south", dx: 0, dy: 1 }),
  Object.freeze({ name: "west", dx: -1, dy: 0 }),
  Object.freeze({ name: "north", dx: 0, dy: -1 }),
]);

export const SQUARE_DIAGONAL_DIRECTIONS = Object.freeze([
  Object.freeze({ name: "north-east", dx: 1, dy: -1 }),
  Object.freeze({ name: "south-east", dx: 1, dy: 1 }),
  Object.freeze({ name: "south-west", dx: -1, dy: 1 }),
  Object.freeze({ name: "north-west", dx: -1, dy: -1 }),
]);

export const SQUARE_ALL_DIRECTIONS = Object.freeze([
  ...SQUARE_CARDINAL_DIRECTIONS,
  ...SQUARE_DIAGONAL_DIRECTIONS,
]);

function gridDimensions(gridOrWidth) {
  if (Number.isInteger(gridOrWidth)) return { width: gridOrWidth, height: Number.POSITIVE_INFINITY, wrapX: false };
  const width = gridOrWidth?.width;
  const height = gridOrWidth?.height;
  const wrapX = Boolean(gridOrWidth?.wrapX ?? gridOrWidth?.config?.wrapX);
  if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1) {
    throw new TypeError("Square-grid operations require positive integer width and height values.");
  }
  return { width, height, wrapX };
}

export function squareTileIndex(x, y, gridOrWidth) {
  const { width } = gridDimensions(gridOrWidth);
  if (!Number.isInteger(x) || !Number.isInteger(y)) throw new TypeError("Square tile coordinates must be integers.");
  return y * width + x;
}

export function squareTileCoordinates(index, gridOrWidth) {
  const { width } = gridDimensions(gridOrWidth);
  if (!Number.isInteger(index) || index < 0) throw new RangeError("Square tile index must be a non-negative integer.");
  return { x: index % width, y: Math.floor(index / width) };
}

export function squareWrappedDeltaX(left, right, width, wrapX = true) {
  let delta = right - left;
  if (wrapX && Math.abs(delta) > width / 2) delta -= Math.sign(delta) * width;
  return delta;
}

export function squareNeighborIndices(index, grid, options = {}) {
  const dimensions = gridDimensions(grid);
  const { x, y } = squareTileCoordinates(index, dimensions.width);
  const directions = options.diagonal === false ? SQUARE_CARDINAL_DIRECTIONS : SQUARE_ALL_DIRECTIONS;
  const neighbors = [];
  for (const direction of directions) {
    let nextX = x + direction.dx;
    const nextY = y + direction.dy;
    if (dimensions.wrapX) nextX = (nextX + dimensions.width) % dimensions.width;
    if (nextX < 0 || nextX >= dimensions.width || nextY < 0 || nextY >= dimensions.height) continue;
    neighbors.push(squareTileIndex(nextX, nextY, dimensions.width));
  }
  return neighbors;
}

export function squareNeighborDistance(leftIndex, rightIndex, grid) {
  const dimensions = gridDimensions(grid);
  const left = squareTileCoordinates(leftIndex, dimensions.width);
  const right = squareTileCoordinates(rightIndex, dimensions.width);
  const dx = Math.abs(squareWrappedDeltaX(left.x, right.x, dimensions.width, dimensions.wrapX));
  const dy = Math.abs(right.y - left.y);
  return dx > 0 && dy > 0 ? Math.SQRT2 : 1;
}

export function squareGridDistance(leftIndex, rightIndex, grid, options = {}) {
  const dimensions = gridDimensions(grid);
  const left = squareTileCoordinates(leftIndex, dimensions.width);
  const right = squareTileCoordinates(rightIndex, dimensions.width);
  const dx = Math.abs(squareWrappedDeltaX(left.x, right.x, dimensions.width, dimensions.wrapX));
  const dy = Math.abs(right.y - left.y);
  return options.diagonal === false ? dx + dy : Math.max(dx, dy);
}

export function buildSquareOperationalWorld(world, nationWorld = null) {
  if (!world || world.gridType !== "square" || !Array.isArray(world.tiles)) {
    throw new TypeError("Operational world requires a generated square-grid terrain world.");
  }
  const nationById = new Map((nationWorld?.nations ?? []).map((nation) => [nation.id, nation]));
  const capitalByIndex = new Map((nationWorld?.nations ?? []).map((nation) => [nation.capitalIndex, nation.id]));
  const ownership = nationWorld?.tileNationIds ?? Array(world.tiles.length).fill(null);
  if (ownership.length !== world.tiles.length) throw new RangeError("Nation ownership must contain one value for every square tile.");

  const tiles = world.tiles.map((tile) => {
    const nationId = ownership[tile.index];
    const borderSides = [];
    for (const direction of SQUARE_CARDINAL_DIRECTIONS) {
      let x = tile.x + direction.dx;
      const y = tile.y + direction.dy;
      if (world.config.wrapX) x = (x + world.width) % world.width;
      if (x < 0 || x >= world.width || y < 0 || y >= world.height) continue;
      const neighborIndex = squareTileIndex(x, y, world.width);
      const neighborNationId = ownership[neighborIndex];
      if (nationId && neighborNationId && nationId !== neighborNationId) borderSides.push(direction.name);
    }
    return {
      id: `tile-${tile.x}-${tile.y}`,
      index: tile.index,
      x: tile.x,
      y: tile.y,
      orthogonalNeighbors: squareNeighborIndices(tile.index, world, { diagonal: false }),
      allNeighbors: squareNeighborIndices(tile.index, world),
      terrain: tile.terrain,
      relief: tile.relief,
      feature: tile.feature,
      elevation: tile.elevation,
      fertility: tile.fertility,
      freshwater: tile.freshwater,
      riverId: tile.riverId,
      flowTo: tile.flowTo,
      movementCost: tile.movementCost,
      yields: { ...tile.yields },
      resourcePotential: { ...tile.resourcePotential },
      nationId,
      nationName: nationById.get(nationId)?.name ?? null,
      capitalNationId: capitalByIndex.get(tile.index) ?? null,
      borderSides,
      passable: !["ocean", "coast", "lake"].includes(tile.terrain),
    };
  });

  return {
    version: 1,
    gridType: "square",
    width: world.width,
    height: world.height,
    wrapX: world.config.wrapX,
    tiles,
  };
}
