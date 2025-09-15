#!/bin/bash

# Rename index files to be more descriptive
rename_index() {
  local dir=$1
  local new_name=$2
  
  if [ -f "$dir/index.ts" ]; then
    echo "Renaming $dir/index.ts to $dir/$new_name.ts"
    mv "$dir/index.ts" "$dir/$new_name.ts"
  fi
}

# Base services directory
SERVICES_DIR="src/services"

# Rename index files
rename_index "$SERVICES_DIR/lab" "labIndex"
rename_index "$SERVICES_DIR/lab/regular" "labRegularIndex"
rename_index "$SERVICES_DIR/research/pro" "researchProIndex"
rename_index "$SERVICES_DIR/research/pro/agents" "researchProAgentsIndex"
rename_index "$SERVICES_DIR/research/regular" "researchRegularIndex"
rename_index "$SERVICES_DIR/search/pro" "searchProIndex"
rename_index "$SERVICES_DIR/search/regular" "searchRegularIndex"

echo "All index files have been renamed successfully!"
echo "Don't forget to update any imports that reference these files."
