import json
import re
import os

def split_dictionary(input_file, output_patterns):
    # Read the main JSON file with UTF-8 encoding
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Initialize output dictionaries
    output_data = {pattern: [] for pattern in output_patterns.keys()}
    remaining_data = []

    # Compile regex patterns
    compiled_patterns = {re.compile(pattern): output for pattern, output in output_patterns.items()}

    # Sort items into appropriate lists
    for item in data:
        matched = False
        for pattern, output_file in compiled_patterns.items():
            if pattern.search(item['id']):
                output_data[pattern.pattern].append(item)
                matched = True
                break
        if not matched:
            remaining_data.append(item)

    # Write output files with UTF-8 encoding
    for pattern, output_file in output_patterns.items():
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output_data[pattern], f, ensure_ascii=False, indent=2)

    # Write remaining items back to main file with UTF-8 encoding
    with open(input_file, 'w', encoding='utf-8') as f:
        json.dump(remaining_data, f, ensure_ascii=False, indent=2)

    print(f"Processing complete. Items split into {len(output_patterns)} files and the main file.")
    for pattern, output_file in output_patterns.items():
        print(f"  - {output_file}: {len(output_data[pattern])} items")
    print(f"  - {input_file}: {len(remaining_data)} items")

# Define patterns and output files
patterns = {
    r'(^meta_|_meta$)': 'dict_meta.json',
    # Add more patterns here as needed, e.g.:
    # r'user_': 'dict_user.json',
    # r'config_': 'dict_config.json',
}

# Ensure the script uses the correct working directory
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)

# Run the script
# split_dictionary('dict_main.json', patterns)
