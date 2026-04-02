export function formatIssueKey(issueNumber: number) {
  return `DF-${issueNumber.toString().padStart(4, "0")}`;
}
