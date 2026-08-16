export const BUILD_INFO = Object.freeze({
  version: "0.4.0",
  commit: "17ba1a83a509e8a6fe41ae5d55d78063ed7e027b",
  repositoryUrl: "https://github.com/Rune-markar/oathbound-chronicle-island-prototype",
});

export function getBuildCommitUrl(buildInfo = BUILD_INFO) {
  return `${buildInfo.repositoryUrl}/commit/${buildInfo.commit}`;
}
