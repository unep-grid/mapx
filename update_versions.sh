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

# Update docker-compose.yml for each service using yq
update_docker_compose() {
  local service=$1
  local base_service=${service/_dev/}
  
  # Use yq to update image version
  yq -i ".services.$service.image = \"fredmoser/mapx_$base_service:$VERSION\"" docker-compose.yml
  
  echo "Updated $service image in docker-compose.yml to version $VERSION"
}

# Update docker-compose.yml for each service
update_docker_compose "app"
update_docker_compose "app_dev"
update_docker_compose "api"
update_docker_compose "api_dev"

echo "All version updates completed successfully"
