#!/usr/bin/env bash
# Claude Code status line: git branch, model, context usage, session cost.
# Receives the session payload as JSON on stdin.
set -uo pipefail

input=$(cat)

# Keep the last payload around so the available fields can be inspected.
printf '%s' "$input" > "$HOME/.claude/statusline-last-input.json" 2>/dev/null

model=$(printf '%s' "$input"  | jq -r '.model.display_name // .model.id // "?"')
dir=$(printf '%s' "$input"    | jq -r '.workspace.current_dir // .cwd // "."')
transcript=$(printf '%s' "$input" | jq -r '.transcript_path // empty')
cost=$(printf '%s' "$input"   | jq -r '.cost.total_cost_usd // empty')

# Context window: 1M models advertise it in their name, everything else is 200k.
case "$model" in
  *1M*|*1m*) window=1000000 ;;
  *)         window=200000  ;;
esac

# Current context size = the last assistant message's input + both cache buckets.
used=0
if [ -n "$transcript" ] && [ -f "$transcript" ]; then
  used=$(grep -a '"usage"' "$transcript" 2>/dev/null | tail -5 | jq -rs '
    [ .[]
      | select(.message.usage != null)
      | (.message.usage.input_tokens // 0)
        + (.message.usage.cache_read_input_tokens // 0)
        + (.message.usage.cache_creation_input_tokens // 0)
    ] | last // 0' 2>/dev/null) || used=0
fi
[ -z "$used" ] && used=0

pct=$(( used * 100 / window ))

# Colour the context figure by how full it is.
if   [ "$pct" -ge 80 ]; then ctx_colour=$'\033[31m'
elif [ "$pct" -ge 60 ]; then ctx_colour=$'\033[33m'
else                         ctx_colour=$'\033[32m'
fi

human=$(awk -v n="$used" 'BEGIN {
  if (n >= 1000000) printf "%.2fM", n/1000000;
  else if (n >= 1000) printf "%.1fk", n/1000;
  else printf "%d", n
}')
cap=$(awk -v n="$window" 'BEGIN {
  if (n >= 1000000) printf "%.0fM", n/1000000; else printf "%.0fk", n/1000
}')

dim=$'\033[2m'; reset=$'\033[0m'; sep="${dim} · ${reset}"

branch=$(git -C "$dir" branch --show-current 2>/dev/null)
repo=$(basename "$dir")

out="${dim}${repo}${reset}"
[ -n "$branch" ] && out="${out}${dim}:${reset}${branch}"
out="${out}${sep}${model}"
out="${out}${sep}${ctx_colour}${human}${reset}${dim}/${cap} (${pct}%)${reset}"
[ -n "$cost" ] && out="${out}${sep}${dim}\$$(printf '%.2f' "$cost")${reset}"

printf '%s' "$out"
