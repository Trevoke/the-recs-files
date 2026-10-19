#!/usr/bin/env bash
set -euo pipefail

harness=$1
dir=$(realpath "$2")
here=$(dirname "$(realpath "$0")")

node "$here/check.mjs" "$harness" "$dir"

home=$(mktemp -d)
trap 'rm -rf "$home"' EXIT
mkdir -p "$home/agent" "$home/project"
skills=$(find "$dir/skills" -mindepth 1 -maxdepth 1 -type d | wc -l)
out="$home/out"

fail() {
  echo "$harness: $1" >&2
  cat "$out" >&2
  exit 1
}

case "$harness" in
  claude)
    export HOME="$home" CLAUDE_CONFIG_DIR="$home/.claude"
    claude plugin validate "$dir" > "$out" 2>&1 || fail "claude plugin validate failed"
    claude plugin marketplace add "$dir" >> "$out" 2>&1 || fail "marketplace add failed"
    claude plugin install recs-files@the-recs-files >> "$out" 2>&1 || fail "plugin install failed"
    claude plugin details recs-files@the-recs-files > "$out" 2>&1
    grep -q "Skills ($skills)" "$out" || fail "Claude Code does not list $skills skills"
    grep -q "recs-code-reviewer" "$out" || fail "Claude Code does not list recs-code-reviewer"
    ;;
  codex)
    export HOME="$home" CODEX_HOME="$home/.codex"
    mkdir -p "$CODEX_HOME"
    codex plugin marketplace add "$dir" > "$out" 2>&1 || fail "marketplace add failed"
    codex plugin add recs-files@the-recs-files >> "$out" 2>&1 || fail "plugin add failed"
    found=$( (find "$CODEX_HOME/plugins/cache" -name SKILL.md || true) | wc -l)
    [ "$found" -eq "$skills" ] || fail "Codex installed $found skills, not $skills"
    ;;
  pi)
    export HOME="$home" PI_CODING_AGENT_DIR="$home/agent"
    unset OPENROUTER_API_KEY ANTHROPIC_API_KEY OPENAI_API_KEY GEMINI_API_KEY
    pi install "$dir" > "$out" 2>&1 || fail "pi install failed"
    (cd "$home/project" && echo '{"type":"get_commands"}' | timeout 60 pi --mode rpc --no-session --offline) > "$out" 2>&1 || true
    grep -q "Failed to load extension" "$out" && fail "pi could not load the subagent extension"
    found=$( (grep -o 'skill:recs-[a-z-]*' "$out" || true) | sort -u | wc -l)
    [ "$found" -eq "$skills" ] || fail "pi offers $found skills, not $skills"
    ;;
  agy)
    if ! command -v agy > /dev/null; then
      echo "agy: no agy CLI here; package checks only"
      exit 0
    fi
    export HOME="$home"
    agy plugin validate "$dir" > "$out" 2>&1 || fail "agy plugin validate failed"
    agy plugin install "$dir" >> "$out" 2>&1 || fail "agy plugin install failed"
    agy plugin list > "$out" 2>&1
    grep -q "$skills skills, 1 agent" "$out" || fail "agy does not list $skills skills and 1 agent"
    ;;
  *)
    echo "usage: packaging/validate.sh <claude|codex|pi|agy> <package-dir>" >&2
    exit 2
    ;;
esac

echo "$harness: installs and offers $skills skills"
