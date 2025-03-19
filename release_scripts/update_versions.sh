#!/bin/bash
# Script to update version numbers across multiple package.json files and docker-compose.yml
# Dependency: yq only (handles both JSON and YAML)

# Check if yq is installed
if ! command -v yq &> /dev/null; then
  echo "Error: yq is not installed. Please install it first."
  echo "Ubuntu/Debian: apt-get install yq"
  echo "macOS: brew install yq"
  exit 1
fi

# Check if version argument is provided
if [ -z "$1" ]; then
  echo "Error: Version argument is required"
  echo "Usage: $0 <version>"
  exit 1
fi

VERSION=$1
echo "Updating all version references to $VERSION"

# Function to update package.json files using yq with JSON parser
update_package_json() {
  local file=$1
  if [ -f "$file" ]; then
    # Use yq with JSON parser to update version
    yq -pj -oj -i ".version = \"$VERSION\"" "$file"
    echo "Updated version in $file to $VERSION"
  else
    echo "Error: File $file not found"
    exit 1
  fi
}

# Update all package.json files
update_package_json "./app/package.json"
update_package_json "./api/package.json"
update_package_json "./app/src/js/sdk/package.json"

# Update version.txt
echo "$VERSION" > version.txt
echo "Updated version.txt to $VERSION"

# Note: Docker Compose image tags are no longer updated here
# Local development now uses the 'local' tag for app and api images

echo "All version updates completed successfully"
