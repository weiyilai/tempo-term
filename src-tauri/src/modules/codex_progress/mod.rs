//! Watches Codex rollout transcripts and streams newly appended lines to the
//! frontend, tagged with the cwd they belong to. Codex stores sessions under
//! `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`, keyed by date not cwd, so the
//! cwd is read from each file's first `session_meta` line.

use serde_json::Value;
use std::path::PathBuf;
use std::time::SystemTime;

/// A discovered Codex rollout file: its path, last-modified time, and the cwd
/// read from its session_meta line.
pub struct RolloutCandidate {
    pub path: PathBuf,
    pub modified: SystemTime,
    pub cwd: String,
}

/// The newest candidate whose cwd equals `target_cwd`, or None.
pub fn select_newest_for_cwd(candidates: &[RolloutCandidate], target_cwd: &str) -> Option<PathBuf> {
    candidates
        .iter()
        .filter(|c| c.cwd == target_cwd)
        .max_by_key(|c| c.modified)
        .map(|c| c.path.clone())
}

/// The cwd recorded in a Codex rollout's first line. Returns None when the line
/// is not a `session_meta` record or has no cwd.
pub fn parse_session_meta_cwd(first_line: &str) -> Option<String> {
    let value: Value = serde_json::from_str(first_line).ok()?;
    if value.get("type").and_then(Value::as_str) != Some("session_meta") {
        return None;
    }
    value
        .get("payload")?
        .get("cwd")?
        .as_str()
        .map(str::to_string)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;
    use std::time::{Duration, SystemTime};

    #[test]
    fn reads_cwd_from_a_session_meta_line() {
        let line = r#"{"type":"session_meta","payload":{"id":"x","cwd":"/Users/me/proj","cli_version":"0.140.0"}}"#;
        assert_eq!(parse_session_meta_cwd(line).as_deref(), Some("/Users/me/proj"));
    }

    #[test]
    fn returns_none_for_non_session_meta_or_malformed() {
        assert_eq!(parse_session_meta_cwd(r#"{"type":"event_msg","payload":{}}"#), None);
        assert_eq!(parse_session_meta_cwd("not json"), None);
        assert_eq!(parse_session_meta_cwd(r#"{"type":"session_meta","payload":{}}"#), None);
    }

    #[test]
    fn picks_the_newest_candidate_whose_cwd_matches() {
        let base = SystemTime::UNIX_EPOCH;
        let candidates = vec![
            RolloutCandidate { path: PathBuf::from("/a/old.jsonl"), modified: base, cwd: "/proj".into() },
            RolloutCandidate { path: PathBuf::from("/a/new.jsonl"), modified: base + Duration::from_secs(10), cwd: "/proj".into() },
            RolloutCandidate { path: PathBuf::from("/a/other.jsonl"), modified: base + Duration::from_secs(20), cwd: "/elsewhere".into() },
        ];
        assert_eq!(select_newest_for_cwd(&candidates, "/proj"), Some(PathBuf::from("/a/new.jsonl")));
        assert_eq!(select_newest_for_cwd(&candidates, "/missing"), None);
    }
}
