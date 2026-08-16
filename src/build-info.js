export const BUILD_INFO = Object.freeze({
  version: "0.4.0",
  commit: "918fe8a87e694af23d501dfc305ac39ef5d29c8b",
  repositoryUrl: "https://github.com/Rune-markar/oathbound-chronicle-island-prototype",
});

export function getBuildCommitUrl(buildInfo = BUILD_INFO) {
  return `${buildInfo.repositoryUrl}/commit/${buildInfo.commit}`;
}
