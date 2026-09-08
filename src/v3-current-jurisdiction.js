// Physical regions survive conquest; authority belongs to the current polity.
export function getV3CurrentJurisdiction(context, regionId, fallbackNationId = null) {
  const region = context.runtime.regionById.get(regionId);
  const domains = context.worldSimulation?.generatedWorld?.regionalDomains;
  const current = domains?.regionStates?.[regionId];
  const nationId = current && Object.hasOwn(current, "nationId")
    ? current.nationId
    : region?.nationId ?? fallbackNationId;
  const nation = nationId
    ? domains?.independentPolities?.[nationId] ?? context.runtime.nationById.get(nationId) ?? null
    : null;
  return { region, nationId, nation };
}

export function getV3CurrentSettlement(context, settlement) {
  const { nationId, nation } = getV3CurrentJurisdiction(context, settlement.regionId, settlement.nationId);
  return {
    ...structuredClone(settlement),
    nationId,
    nationName: nation?.name ?? nationId ?? "無所属",
    government: nation?.government ?? nation?.polity?.politicalSystemName ?? "地域政権",
  };
}
