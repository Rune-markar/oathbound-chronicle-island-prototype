export const BUILD_INFO = Object.freeze({
  version: "0.4.0",
  commit: "155eea11b7b3e3eff39966dd2c5d39437343b8fb",
  repositoryUrl: "https://github.com/Rune-markar/oathbound-chronicle-island-prototype",
});

export function getBuildCommitUrl(buildInfo = BUILD_INFO) {
  return `${buildInfo.repositoryUrl}/commit/${buildInfo.commit}`;
}
