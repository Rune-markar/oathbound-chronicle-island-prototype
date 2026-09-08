import { runV3SimulationTrials } from "./v3-simulation-trials.js";

self.onmessage = async ({ data }) => {
  try {
    const report = await runV3SimulationTrials(data, (progress) => self.postMessage({ type: "progress", progress }));
    self.postMessage({ type: "complete", report });
  } catch (error) {
    self.postMessage({ type: "error", message: error.message ?? String(error) });
  }
};
