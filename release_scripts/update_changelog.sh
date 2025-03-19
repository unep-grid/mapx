#!/bin/bash
# Simple script to update CHANGELOG.md based on commits between the current and previous tag

# Configuration
CHANGELOG_FILE="./CHANGELOG.md"
PACKAGE_JSON="./package.json"
REPO_URL="https://github.com/unep-grid/mapx/tree/"

# Get the current version - can be passed as argument or read from package.json
if [ -n "$1" ]; then
  CURRENT_VERSION="$1"
else
  CURRENT_VERSION=$(node -p "require('$PACKAGE_JSON').version")
fi

# Get the latest tag (previous version)
PREVIOUS_TAG=$(git describe --tags --abbrev=0)

echo "Generating changelog from $PREVIOUS_TAG to $CURRENT_VERSION..."

# Create a temporary file for the new changelog entry
TEMP_FILE=$(mktemp)

# Write the header
echo "  - [$CURRENT_VERSION]($REPO_URL$CURRENT_VERSION) " > "$TEMP_FILE"
echo "" >> "$TEMP_FILE"

# Get commits between the previous tag and HEAD, excluding version bump commits
git log "$PREVIOUS_TAG"..HEAD --pretty=format:"    - %s" \
  | grep -v "chore: release v" \
  | grep -v "chore(release):" \
  >> "$TEMP_FILE"

echo "" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"

# Check if CHANGELOG.md exists
if [ ! -f "$CHANGELOG_FILE" ]; then
  # Create it if it doesn't
  cp "$TEMP_FILE" "$CHANGELOG_FILE"
else
  # Prepend the new entry to the existing changelog
  cat "$TEMP_FILE" "$CHANGELOG_FILE" > "$CHANGELOG_FILE.new"
  mv "$CHANGELOG_FILE.new" "$CHANGELOG_FILE"
fi

# Open in editor for manual adjustments, if available
if [ -n "$EDITOR" ]; then
  $EDITOR "$CHANGELOG_FILE"
  echo "Changelog updated and opened in editor for review."
else
  echo "No editor found. Please edit $CHANGELOG_FILE manually if needed."
fi

# Clean up
rm "$TEMP_FILE"

echo "Changelog updated successfully!"