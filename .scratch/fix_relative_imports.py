import os
import re

WORKSPACE_DIR = "/Users/nico/Desktop/Workspace/my-app/myapp"
APP_DIR = os.path.join(WORKSPACE_DIR, "app")
TARGET_DIRS = [
    os.path.join(APP_DIR, "(auth)"),
    os.path.join(APP_DIR, "(client)")
]

ROOT_LEVEL_ELEMENTS = [
    "context",
    "lib",
    "styles",
    "components",
    "assets",
    "constants",
    "hooks",
    "utils",
    "OnboardingScreen"
]

# Create regex pattern to match imports like:
# from '../context/...', require('../assets/...'), etc.
# We want to replace '../<element>' with '../../<element>'
patterns = []
for element in ROOT_LEVEL_ELEMENTS:
    # Match '../element' prefixed by 'from ' or 'require(' or similar
    # e.g., from '../context'
    # We use a pattern that captures the quotes and replaces the path.
    pattern = re.compile(rf"(['\"`])\.\./{re.escape(element)}(/|['\"`])")
    patterns.append((pattern, element))

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = content
    for pattern, element in patterns:
        # Replace '../element' with '../../element'
        # e.g. from '../context/ThemeContext' -> from '../../context/ThemeContext'
        new_content = pattern.sub(r"\1../../" + element + r"\2", new_content)

    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Fixed imports in: {filepath}")

def main():
    print("Fixing relative imports in (auth) and (client) groups...")
    for target_dir in TARGET_DIRS:
        if not os.path.exists(target_dir):
            print(f"Directory {target_dir} does not exist. Skipping.")
            continue
        for root, dirs, files in os.walk(target_dir):
            for file in files:
                if file.endswith((".ts", ".tsx")):
                    filepath = os.path.join(root, file)
                    fix_file(filepath)
    print("Import fixing completed!")

if __name__ == "__main__":
    main()
