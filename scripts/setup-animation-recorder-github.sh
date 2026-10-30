#!/usr/bin/env bash
# One-time setup for the GitHub Actions recorder (.github/workflows/record-animation.yml), the fallback when
# the Cloud Run job can't start: a GitHub token for animation-studio to dispatch the workflow, and the same
# RENDER_SECRET in GitHub and Supabase. Run from the repo root, signed in to gh and supabase. Prints no secret.
#
# The token: a fine-grained personal access token (github.com/settings/personal-access-tokens/new), repository
# curios-devops/curios only, permission Actions: Read and write. Paste it when asked (hidden), or pass it as
# GH_DISPATCH_TOKEN=... in the environment.
set -euo pipefail

TOKEN="${GH_DISPATCH_TOKEN:-}"
if [ -z "$TOKEN" ]; then
  read -r -s -p "GitHub token (Actions: write on curios-devops/curios): " TOKEN; echo
fi
[ -n "$TOKEN" ] || { echo "no token"; exit 1; }

# The token must be able to see the recorder workflow.
curl -fsS -o /dev/null -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/curios-devops/curios/actions/workflows/record-animation.yml \
  || { echo "the token can't reach record-animation.yml (merged to main? Actions permission?)"; exit 1; }
echo "token ok"

supabase secrets set GITHUB_DISPATCH_TOKEN="$TOKEN"
unset TOKEN
gh secret set SUPABASE_ANON_KEY --body "$(grep '^SUPABASE_ANON_KEY=' .env | cut -d= -f2- | tr -d '"')"
RS=$(openssl rand -hex 32)
gh secret set RENDER_SECRET --body "$RS"
supabase secrets set RENDER_SECRET="$RS"
unset RS
echo "done: new animations are recorded on GitHub Actions while Cloud Run is unavailable"
