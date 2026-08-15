export async function requestLandscapeMode({ documentRef = document, screenRef = screen } = {}) {
  const requestFullscreen = documentRef?.documentElement?.requestFullscreen;
  const lockOrientation = screenRef?.orientation?.lock;
  if (typeof requestFullscreen !== "function") return { ok: false, reason: "fullscreen-unsupported" };
  if (typeof lockOrientation !== "function") return { ok: false, reason: "orientation-unsupported" };

  const enteredFullscreen = !documentRef.fullscreenElement;
  try {
    if (enteredFullscreen) await requestFullscreen.call(documentRef.documentElement);
  } catch {
    return { ok: false, reason: "fullscreen-failed" };
  }

  try {
    await lockOrientation.call(screenRef.orientation, "landscape");
    return { ok: true };
  } catch {
    if (enteredFullscreen && typeof documentRef.exitFullscreen === "function") {
      try { await documentRef.exitFullscreen(); } catch { /* best-effort rollback */ }
    }
    return { ok: false, reason: "orientation-failed" };
  }
}
