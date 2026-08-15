export const BUILD_INFO = Object.freeze({
  version: "0.4.0",
  commit: "290fb297cbd03ea375c5574a34fabe1883c58457",
  repositoryUrl: "https://github.com/Rune-markar/oathbound-chronicle-island-prototype",
});

export function getBuildCommitUrl(buildInfo = BUILD_INFO) {
  return `${buildInfo.repositoryUrl}/commit/${buildInfo.commit}`;
}
