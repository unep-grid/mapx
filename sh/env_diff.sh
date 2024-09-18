#!/bin/bash

# Extract and sort variable names from EXAMPLE.env
grep -v '^#' mapx.dev.EXAMPLE.env | sed 's/=.*//' | sort > example_vars.txt

# Extract and sort variable names from dev.env
grep -v '^#' mapx.dev.env | sed 's/=.*//' | sort > dev_vars.txt

# Find variables in EXAMPLE.env but not in dev.env
echo "Variables in mapx.dev.EXAMPLE.env but NOT in mapx.dev.env:"
comm -23 example_vars.txt dev_vars.txt

echo ""

# Find variables in dev.env but not in EXAMPLE.env
echo "Variables in mapx.dev.env but NOT in mapx.dev.EXAMPLE.env:"
comm -13 example_vars.txt dev_vars.txt

# Clean up temporary files
rm example_vars.txt dev_vars.txt
