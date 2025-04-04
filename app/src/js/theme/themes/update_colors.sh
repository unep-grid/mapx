#!/bin/bash

# Function to process a single JSON file
process_json() {
  local file="$1"

  jq '.colors.mx_map_feature_highlight.color = "rgb(255, 20, 147)"' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
}

# Find all JSON files in the current directory and its subdirectories
find . -type f -name "*.json" -print0 | while IFS= read -r -d $'\0' file; do
  process_json "$file"
done

echo "Finished processing JSON files."
