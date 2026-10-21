import json
import re
from pathlib import Path


SPEC_PATH = "content/api/emulate.json"
MDX_PATH = "content/api/emulate/overview.mdx"
MARKER = "API_EMULATE_ENDPOINTS"
LINK_BASE = "/api/emulate"
API_BASE = "/api/emulate/v1"


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9\s-]", "", value.lower())
    slug = re.sub(r"\s+", "-", slug)
    return re.sub(r"-+", "-", slug).strip("-")


def generate_table(spec: dict) -> str:
    lines = [
        "| Category | Method | Description |",
        "| -------- | ------ | ----------- |",
    ]

    for path, path_item in spec["paths"].items():
        for method in ["get", "post", "put", "patch", "delete"]:
            if method not in path_item:
                continue

            operation = path_item[method]
            tag = operation["tags"][0]
            summary = operation["summary"]
            description = operation["description"]
            link = f"{LINK_BASE}/{slugify(tag)}/{slugify(summary)}"
            method_display = f"[`{method.upper()} {path.removeprefix(API_BASE)}`]({link})"
            lines.append(f"| {tag} | {method_display} | {description} |")

    return "\n".join(lines)


def main():
    repo_root = Path(__file__).resolve().parents[2]
    spec = json.loads((repo_root / SPEC_PATH).read_text())
    mdx_path = repo_root / MDX_PATH
    content = mdx_path.read_text()
    table = generate_table(spec)
    pattern = rf"(\{{/\* BEGIN_AUTO_GENERATED: {MARKER} \*/\}})[ \t]*\n.*?(\{{/\* END_AUTO_GENERATED: {MARKER} \*/\}})"
    new_content, count = re.subn(
        pattern,
        lambda match: f"{match[1]}\n{table}\n{match[2]}",
        content,
        flags=re.DOTALL,
    )
    if count != 1:
        raise ValueError(f"Expected one {MARKER} marker block in {MDX_PATH}")

    if new_content != content:
        mdx_path.write_text(new_content)
        print(f"Updated {MDX_PATH}")
    else:
        print(f"No changes needed in {MDX_PATH}")


if __name__ == "__main__":
    main()
