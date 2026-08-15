export const BUILD_INFO = Object.freeze({
  version: "0.4.0",
  commit: "0000000000000000000000000000000000000000",
  repositoryUrl: "https://github.com/Rune-markar/oathbound-chronicle-island-prototype",
});

export function getBuildCommitUrl(buildInfo = BUILD_INFO) {
  return `${buildInfo.repositoryUrl}/commit/${buildInfo.commit}`;
}
