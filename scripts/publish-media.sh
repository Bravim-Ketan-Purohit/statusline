#!/usr/bin/env bash
# Uploads the demo video to a GitHub Release so it never enters git history.
# The site references these URLs; see site.config.json.
set -euo pipefail
cd "$(dirname "$0")/.."

REPO=$(node -p "require('./site.config.json').repo")
TAG=$(node -p "require('./site.config.json').mediaTag")
FILES=(landing-kit/assets/video/*.mp4)

if [ ! -e "${FILES[0]}" ]; then
  echo "No .mp4 found in landing-kit/assets/video/ — nothing to publish." >&2
  exit 1
fi

echo "repo   $REPO"
echo "tag    $TAG"
echo "files  ${#FILES[@]} mp4  ($(du -ch "${FILES[@]}" | tail -1 | cut -f1))"
echo

if gh release view "$TAG" --repo "$REPO" >/dev/null 2>&1; then
  echo "Release $TAG exists — replacing assets."
  gh release upload "$TAG" "${FILES[@]}" --repo "$REPO" --clobber
else
  echo "Creating release $TAG."
  gh release create "$TAG" "${FILES[@]}" --repo "$REPO" \
    --title "Site media" \
    --notes "Demo recordings served by the landing page. Kept out of git history so clones stay small."
fi

echo
echo "Published. Verify with: pnpm media:check"
