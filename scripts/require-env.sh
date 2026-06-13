require_env() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    echo "${name} is required. Set it in .env or your shell environment."
    exit 1
  fi
}
