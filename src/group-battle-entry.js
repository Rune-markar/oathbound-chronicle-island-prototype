import { readV3GroupBattleBridge } from "./v3-group-combat.js";

// A tactical page is part of the current field mission, never a standalone game.
const requestId = new URLSearchParams(window.location.search).get("v3-group-battle");
const bridge = readV3GroupBattleBridge(localStorage);
if (requestId && bridge?.status === "pending" && bridge.requestId === requestId) {
  await import("./app.js");
} else {
  window.location.replace(new URL("./index.html", window.location.href).href);
}
