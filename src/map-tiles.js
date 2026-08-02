const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export const TERRITORY_SECTOR_COUNT = 3;

function coordinate(value) {
  return Number(value.toFixed(2));
}

function point(x, y) {
  return `${coordinate(x)} ${coordinate(y)}`;
}

function validateBox(box) {
  const values = [box?.x, box?.y, box?.width, box?.height];
  if (!values.every(Number.isFinite) || box.width <= 0 || box.height <= 0) {
    throw new TypeError("Territory subdivision requires a positive SVG bounding box.");
  }
}

export function buildTerritorySectorPaths(box, seed = 0) {
  validateBox(box);
  const { x, y, width, height } = box;
  const padding = Math.max(1.5, Math.min(width, height) * 0.035);
  const left = x - padding;
  const right = x + width + padding;
  const top = y - padding;
  const bottom = y + height + padding;
  const direction = seed % 2 === 0 ? 1 : -1;
  const stagger = ((seed % 5) - 2) * 0.008;

  if (width >= height) {
    const firstTop = x + width * (0.34 + stagger);
    const firstBottom = x + width * (0.31 - stagger);
    const firstControl = x + width * (0.325 + direction * 0.055);
    const secondTop = x + width * (0.68 - stagger);
    const secondBottom = x + width * (0.65 + stagger);
    const secondControl = x + width * (0.665 - direction * 0.05);
    const middleY = y + height * 0.5;

    return [
      {
        label: "西部",
        d: `M${point(left, top)}L${point(firstTop, top)}Q${point(firstControl, middleY)} ${point(firstBottom, bottom)}L${point(left, bottom)}Z`,
      },
      {
        label: "中央",
        d: `M${point(firstTop, top)}L${point(secondTop, top)}Q${point(secondControl, middleY)} ${point(secondBottom, bottom)}L${point(firstBottom, bottom)}Q${point(firstControl, middleY)} ${point(firstTop, top)}Z`,
      },
      {
        label: "東部",
        d: `M${point(secondTop, top)}L${point(right, top)}L${point(right, bottom)}L${point(secondBottom, bottom)}Q${point(secondControl, middleY)} ${point(secondTop, top)}Z`,
      },
    ];
  }

  const firstLeft = y + height * (0.34 + stagger);
  const firstRight = y + height * (0.31 - stagger);
  const firstControl = y + height * (0.325 + direction * 0.055);
  const secondLeft = y + height * (0.68 - stagger);
  const secondRight = y + height * (0.65 + stagger);
  const secondControl = y + height * (0.665 - direction * 0.05);
  const middleX = x + width * 0.5;

  return [
    {
      label: "北部",
      d: `M${point(left, top)}L${point(right, top)}L${point(right, firstRight)}Q${point(middleX, firstControl)} ${point(left, firstLeft)}Z`,
    },
    {
      label: "中央",
      d: `M${point(left, firstLeft)}Q${point(middleX, firstControl)} ${point(right, firstRight)}L${point(right, secondRight)}Q${point(middleX, secondControl)} ${point(left, secondLeft)}Z`,
    },
    {
      label: "南部",
      d: `M${point(left, secondLeft)}Q${point(middleX, secondControl)} ${point(right, secondRight)}L${point(right, bottom)}L${point(left, bottom)}Z`,
    },
  ];
}

function createSvgElement(name) {
  return document.createElementNS(SVG_NAMESPACE, name);
}

function copyTerritoryData(source, sector) {
  for (const attribute of source.attributes) {
    if (attribute.name.startsWith("data-") && attribute.name !== "data-tile-name") {
      sector.setAttribute(attribute.name, attribute.value);
    }
  }
}

export function subdivideTerritoryTiles(svg) {
  if (!svg || svg.dataset.territoriesSubdivided === "true") {
    return svg?.querySelectorAll(".territory-cell").length ?? 0;
  }

  const definitions = svg.querySelector("defs");
  if (!definitions) throw new Error("The strategy map requires an SVG defs element.");

  const sources = [...svg.querySelectorAll(".country-group .province.map-tile")];
  sources.forEach((source, sourceIndex) => {
    const group = source.closest(".country-group");
    const nationOutline = group?.querySelector(".nation-outline");
    if (!group || !nationOutline) return;

    const countryId = group.dataset.country ?? "unknown";
    const sourceId = `territory-source-${countryId}-${sourceIndex + 1}`;
    const clipId = `territory-clip-${countryId}-${sourceIndex + 1}`;
    const baseName = source.dataset.tileName ?? `領域${sourceIndex + 1}`;
    const originalClasses = source.getAttribute("class") ?? "province map-tile";
    source.id = sourceId;

    const clipPath = createSvgElement("clipPath");
    clipPath.id = clipId;
    clipPath.setAttribute("clipPathUnits", "userSpaceOnUse");
    const clippedShape = createSvgElement("use");
    clippedShape.setAttribute("href", `#${sourceId}`);
    clipPath.append(clippedShape);
    definitions.append(clipPath);

    const sectors = buildTerritorySectorPaths(source.getBBox(), sourceIndex);
    sectors.forEach((sectorDefinition, sectorIndex) => {
      const sector = createSvgElement("path");
      const sectorName = `${baseName}・${sectorDefinition.label}`;
      sector.setAttribute("class", `${originalClasses} territory-cell`);
      sector.setAttribute("d", sectorDefinition.d);
      sector.setAttribute("clip-path", `url(#${clipId})`);
      sector.setAttribute("data-tile-name", sectorName);
      sector.setAttribute("data-parent-tile-name", baseName);
      sector.setAttribute("data-sector-index", String(sectorIndex + 1));
      sector.setAttribute("aria-label", `${sectorName}、${source.dataset.terrainLabel ?? "地勢不明"}`);
      copyTerritoryData(source, sector);
      group.insertBefore(sector, nationOutline);
    });

    const regionalOutline = createSvgElement("use");
    regionalOutline.setAttribute("class", "territory-region-outline");
    regionalOutline.setAttribute("href", `#${sourceId}`);
    group.insertBefore(regionalOutline, nationOutline);

    source.classList.remove("province", "map-tile");
    source.classList.add("territory-source");
    source.setAttribute("aria-hidden", "true");
  });

  svg.querySelectorAll(".country-group").forEach((group) => {
    group.dataset.tileCount = String(group.querySelectorAll(".territory-cell").length);
  });
  svg.dataset.territoriesSubdivided = "true";
  const description = svg.querySelector("#mapDescription");
  if (description) {
    description.textContent = "十国家を構成する百八十六の小領域タイルと、森林、平原、丘陵、山岳、湿地、乾燥地、河川、街道を重ねた広域地勢図";
  }
  return svg.querySelectorAll(".territory-cell").length;
}
