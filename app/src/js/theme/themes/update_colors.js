#!/usr/bin/env node

const fs = require("fs");
const { execSync } = require("child_process");

// Find all JSON files using the find command (similar to bash script)
const findCommand = "find . -type f -name '*.json'";
const jsonFiles = execSync(findCommand).toString().trim().split("\n");

// Process each JSON file
jsonFiles.forEach((file) => {
  if (!file) return; // Skip empty entries

  try {
    // Read file
    const data = fs.readFileSync(file, "utf8");
    const theme = JSON.parse(data);

    // Modify the color property (with nested property checks)
    theme.colors.mx_map_feature_highlight.color = theme.dark
      ? "rgb(255, 255, 0)"
      : "rgb(255,0,255)";

    theme.colors.mx_ui_highlighter = {
      color: theme.colors.mx_map_feature_highlight.color,
      visibility: "visible",
    };

    // Write back to file
    fs.writeFileSync(file, JSON.stringify(theme, null, 2));
    console.log(`Processed: ${file}`);
  } catch (error) {
    console.error(`Error processing ${file}: ${error.message}`);
  }
});

console.log("Finished processing JSON files.");
