#!/usr/bin/env bash
# docs/architectural-decisions/adr-20261029-cfj8-keep-the-evals-questions-in-a-repository-of-their-own-beside-the-project.org
set -euo pipefail

usage='usage: write-skill-text.sh <project dir> <brief file>'
project="$(git -C "${1:?$usage}" rev-parse --show-toplevel)"
brief="$(cat "${2:?$usage}")"
: "${CLAUDE_CODE_OAUTH_TOKEN:?CLAUDE_CODE_OAUTH_TOKEN is not set}"

here="$(cd "$(dirname "$0")/.." && pwd)"
work="$here/.leash"
rm -rf "$work/work"
mkdir -p "$work/tmp"
policy="$work/writer.cedar"
cat >"$policy" <<CEDAR
forbid (principal, action in [Action::"FileOpen", Action::"FileOpenReadOnly", Action::"FileOpenReadWrite"], resource)
when { resource in [ Dir::"$project/.git/", Dir::"$project/evals/runs/" ] };

permit (principal, action in [Action::"FileOpen", Action::"FileOpenReadOnly", Action::"FileOpenReadWrite"], resource)
when { resource in [ Dir::"/" ] };

permit (principal, action == Action::"ProcessExec", resource)
when { resource in [ Dir::"/" ] };

permit (principal, action == Action::"NetworkConnect", resource)
when { resource in [ Host::"*" ] };
CEDAR

cd "$project"
trap 'docker rm -f "$(basename "$project")" "$(basename "$project")-leash" >/dev/null 2>&1 || true' EXIT
TMPDIR="$work/tmp" LEASH_WORK_DIR="$work/work" "$here/node_modules/.bin/leash" -I --policy "$policy" \
  -e CLAUDE_CODE_OAUTH_TOKEN -e IS_SANDBOX=1 \
  claude -p --model "${WRITER_MODEL:-claude-fable-5-1}" --permission-mode bypassPermissions "$brief"
