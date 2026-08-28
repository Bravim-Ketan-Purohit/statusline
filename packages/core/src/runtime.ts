/**
 * Everything a tile can read at render time. Deliberately all-optional:
 * Claude Code omits whole objects (rate_limits for API-key users, pr once a
 * PR merges) and nulls individual fields (used_percentage before the first
 * API call and right after /compact). A tile that reads a missing field must
 * return no spans -- never an empty box.
 */
export interface ClaudeStdin {
  cwd?: string;
  session_id?: string;
  session_name?: string;
  transcript_path?: string;
  version?: string;
  model?: { id?: string; display_name?: string };
  workspace?: {
    current_dir?: string;
    project_dir?: string;
    added_dirs?: string[];
    git_worktree?: string;
    repo?: { host?: string; owner?: string; name?: string };
  };
  output_style?: { name?: string };
  cost?: {
    total_cost_usd?: number;
    total_duration_ms?: number;
    total_api_duration_ms?: number;
    total_lines_added?: number;
    total_lines_removed?: number;
  };
  context_window?: {
    total_input_tokens?: number;
    total_output_tokens?: number;
    context_window_size?: number;
    used_percentage?: number | null;
    remaining_percentage?: number | null;
    current_usage?: unknown | null;
  };
  exceeds_200k_tokens?: boolean;
  fast_mode?: boolean;
  effort?: { level?: string };
  thinking?: { enabled?: boolean };
  rate_limits?: {
    five_hour?: { used_percentage?: number; resets_at?: number };
    seven_day?: { used_percentage?: number; resets_at?: number };
  };
  vim?: { mode?: string };
  agent?: { name?: string };
  pr?: { number?: number; url?: string; review_state?: string; kind?: string };
  worktree?: { name?: string; path?: string; branch?: string };
}

/** Data resolved locally by the CLI (Tier 1/2), handed to tiles alongside stdin. */
export interface LocalData {
  gitBranch?: string;
  gitRoot?: string;
  now?: Date;
}

export interface RuntimeData {
  cc: ClaudeStdin;
  local: LocalData;
  /** Terminal width in columns, from $COLUMNS. 0 means unknown -> no dropping. */
  columns: number;
}
