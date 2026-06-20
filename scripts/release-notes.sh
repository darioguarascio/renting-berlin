#!/usr/bin/env bash
set -euo pipefail

# Computes the next semantic version from conventional commits since the last
# tag, builds a categorised Telegram changelog, and (when run in CI) exposes the
# result via GITHUB_OUTPUT.
#
# Outputs:
#   version    next tag, e.g. v0.3.0
#   prev_tag   previous tag, empty on first release
#   changed    "true" when there are new commits to release
#   notes_file path to the Telegram-ready HTML message
#
# Conventional commit mapping:
#   feat        -> Added   (minor bump)
#   fix         -> Fixed   (patch bump)
#   anything    -> Updated (patch bump)
#   feat!/BREAKING CHANGE -> major bump

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NOTES_FILE="${RELEASE_NOTES_FILE:-${ROOT}/release-notes.txt}"
SITE_URL="${SITE_URL:-https://renting.berlin}"

git config --global --add safe.directory "$ROOT" 2>/dev/null || true

prev_tag="$(git describe --tags --abbrev=0 --match 'v*' 2>/dev/null || echo '')"

if [ -n "$prev_tag" ]; then
  range="${prev_tag}..HEAD"
  base_version="${prev_tag#v}"
else
  range=""
  base_version="0.0.0"
fi

IFS='.' read -r major minor patch <<<"$base_version"
major="${major:-0}"; minor="${minor:-0}"; patch="${patch:-0}"

# Use unit separator (\x1f) between subject and body, record separator (\x1e)
# between commits, so multi-line bodies survive parsing.
raw="$(git log ${range:+$range} --no-merges --pretty=format:'%s%x1f%b%x1e')"

added=(); fixed=(); updated=()
has_breaking=0; has_feat=0; has_change=0

while IFS= read -r -d $'\x1e' record; do
  # Records after the first carry a leading newline from git's commit separator.
  record="${record#"${record%%[![:space:]]*}"}"
  [ -z "$record" ] && continue
  subject="${record%%$'\x1f'*}"
  body="${record#*$'\x1f'}"
  subject="${subject%%$'\n'*}"

  if printf '%s\n%s' "$subject" "$body" | grep -qi 'BREAKING CHANGE' \
     || printf '%s' "$subject" | grep -qE '^[a-zA-Z]+(\([^)]*\))?!:'; then
    has_breaking=1
  fi

  has_change=1

  # Conventional commit prefix takes priority; otherwise fall back to the
  # leading verb of the subject (this repo writes "Add …" / "Fix …" style).
  if printf '%s' "$subject" | grep -qE '^(feat|fix|docs|chore|refactor|perf|test|build|ci|style|revert)(\([^)]*\))?!?:'; then
    type="$(printf '%s' "$subject" | sed -E 's/^([a-zA-Z]+)(\([^)]*\))?!?:.*/\1/' | tr '[:upper:]' '[:lower:]')"
    msg="$(printf '%s' "$subject" | sed -E 's/^[a-zA-Z]+(\([^)]*\))?!?:[[:space:]]*//')"
    case "$type" in
      feat) added+=("$msg"); has_feat=1 ;;
      fix) fixed+=("$msg") ;;
      *) updated+=("$msg") ;;
    esac
  else
    verb="$(printf '%s' "$subject" | sed -E 's/^([a-zA-Z]+).*/\1/' | tr '[:upper:]' '[:lower:]')"
    case "$verb" in
      add|adds|added|new|introduce|introduces|implement|implements|create|creates|feature)
        added+=("$subject"); has_feat=1 ;;
      fix|fixes|fixed|bugfix|hotfix|patch|resolve|resolves|correct|corrects|repair)
        fixed+=("$subject") ;;
      *)
        updated+=("$subject") ;;
    esac
  fi
done <<<"$raw"

if [ "$has_change" -eq 0 ]; then
  changed="false"
  version="${prev_tag:-v0.0.0}"
else
  changed="true"
  if [ "$has_breaking" -eq 1 ] && [ -n "$prev_tag" ]; then
    major=$((major + 1)); minor=0; patch=0
  elif [ "$has_feat" -eq 1 ] || [ -z "$prev_tag" ]; then
    minor=$((minor + 1)); patch=0
  else
    patch=$((patch + 1))
  fi
  version="v${major}.${minor}.${patch}"
fi

html_escape() { sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g'; }

emit_section() {
  local title="$1"; shift
  local items=("$@")
  [ "${#items[@]}" -eq 0 ] && return
  printf '\n%s\n' "$title"
  for item in "${items[@]}"; do
    [ -z "$item" ] && continue
    printf '• %s\n' "$(printf '%s' "$item" | html_escape)"
  done
}

{
  printf '🚀 <b>renting.berlin %s</b> deployed' "$version"
  if [ -n "$prev_tag" ] && [ "$changed" = "true" ]; then
    printf ' (from %s)' "$prev_tag"
  fi
  printf '\n'

  if [ "$changed" = "true" ]; then
    emit_section "✨ <b>Added</b>" "${added[@]}"
    emit_section "🛠 <b>Fixed</b>" "${fixed[@]}"
    emit_section "🔧 <b>Updated</b>" "${updated[@]}"
  else
    printf '\nRedeployed with no new changes.\n'
  fi

  printf '\n<a href="%s">%s</a>\n' "$SITE_URL" "$SITE_URL"
} >"$NOTES_FILE"

# Telegram messages are capped at 4096 chars.
if [ "$(wc -c <"$NOTES_FILE")" -gt 4000 ]; then
  head -c 3990 "$NOTES_FILE" >"${NOTES_FILE}.tmp"
  printf '\n…\n' >>"${NOTES_FILE}.tmp"
  mv "${NOTES_FILE}.tmp" "$NOTES_FILE"
fi

echo "Computed version: $version (prev: ${prev_tag:-none}, changed: $changed)"
echo "----- notes -----"
cat "$NOTES_FILE"
echo "-----------------"

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  {
    echo "version=$version"
    echo "prev_tag=$prev_tag"
    echo "changed=$changed"
    echo "notes_file=$NOTES_FILE"
  } >>"$GITHUB_OUTPUT"
fi
