import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { generateTerrain } from "../src/terrain-generation.js";
import { renderTerrainSvg } from "../src/terrain-renderer.js";

const destination = fileURLToPath(new URL("../assets/generated/procedural-terrain-square.svg", import.meta.url));
const world = generateTerrain({ seed: process.argv[2] ?? "eldoria-317" });
const image = renderTerrainSvg(world, {
  cellSize: 18,
  showGrid: true,
  textureUrl: "./terrain-natural-texture.png",
});

writeFileSync(destination, image, "utf8");
console.log(JSON.stringify({ destination, gridType: world.gridType, ...world.summary }));
