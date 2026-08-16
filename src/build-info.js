export const BUILD_INFO = Object.freeze({
  version: "0.4.0",
  commit: "c11d3add583e1b194f03aee74c14fa70aee0b66e",
  repositoryUrl: "https://github.com/Rune-markar/oathbound-chronicle-island-prototype",
});

export function getBuildCommitUrl(buildInfo = BUILD_INFO) {
  return `${buildInfo.repositoryUrl}/commit/${buildInfo.commit}`;
}
