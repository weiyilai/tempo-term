/**
 * Maps a terminal pane's working directory to the directory where Claude Code
 * stores that project's session transcripts. Claude Code derives the folder
 * name by replacing every non-alphanumeric character in the absolute cwd with a
 * dash, e.g. `/Users/me/01.project` -> `-Users-me-01-project`.
 */
export function transcriptDirForCwd(cwd: string, home: string): string {
  const munged = cwd.replace(/[^a-zA-Z0-9]/g, "-");
  return `${home}/.claude/projects/${munged}`;
}
