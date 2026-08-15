export const BUILD_INFO = Object.freeze({
  version: "0.4.0",
  commit: "f37aec725fcd464e12306a89c1ba2b5ff6068939",
  repositoryUrl: "https://github.com/Rune-markar/oathbound-chronicle-island-prototype",
});

export function getBuildCommitUrl(buildInfo = BUILD_INFO) {
  return `${buildInfo.repositoryUrl}/commit/${buildInfo.commit}`;
}
