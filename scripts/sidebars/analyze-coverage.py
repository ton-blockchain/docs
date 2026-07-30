#!/usr/bin/env python3

import argparse
import asyncio
import hashlib
import json
import os
import signal
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote, urlsplit


ANALYZER_VERSION = "1"
HEARTBEAT_SECONDS = 30
AUTO_TVM_ROUTES = {"/v3/documentation/tvm/instructions"}
GITHUB_CLONES = {
    ("ton-blockchain", "ton"): ".ctx/ton",
    ("ton-blockchain", "acton"): ".ctx/acton",
    ("ton-blockchain", "acton-contracts"): ".ctx/acton-contracts",
    ("ton-org", "ton"): ".ctx/at-ton-ton",
    ("ton-org", "ton-core"): ".ctx/at-ton-core",
    ("ton-org", "ton-crypto"): ".ctx/at-ton-crypto",
    ("ton-org", "sandbox"): ".ctx/sandbox",
    ("ton-org", "blueprint"): ".ctx/blueprint",
}


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def log(stage, **fields):
    details = []
    source = fields.pop("source", None)
    attempt = fields.pop("attempt", None)
    forced = fields.pop("forced", False) or fields.pop("force_rerun", False)

    if source is not None:
        details.append(str(source))
    if attempt is not None:
        details.append(f"attempt {attempt}")
    if forced:
        details.append("forced re-run")
    details.extend(f"{key}={value}" for key, value in fields.items())

    suffix = f" {', '.join(details)}" if details else ""
    print(f"{now()} [{stage}]{suffix}", flush=True)


def atomic_write_text(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    with temporary.open("w", encoding="utf-8") as file:
        file.write(text)
        file.flush()
        os.fsync(file.fileno())
    temporary.replace(path)
    directory = os.open(path.parent, os.O_RDONLY)
    try:
        os.fsync(directory)
    finally:
        os.close(directory)


def checkpoint_path(root, source):
    return root / ".ctx/analysis/.checkpoints" / f"{report_filename(source)}.json"


def read_bytes(path):
    return path.read_bytes() if path and path.is_file() else b""


def destination_kind(destination):
    if destination.startswith("/"):
        return "local"
    hostname = urlsplit(destination).hostname or ""
    if hostname in {"github.com", "www.github.com", "gist.github.com"}:
        return "github"
    return "external"


def resolve_old_source(root, source):
    base = root / ".ctx/old-ton-docs/docs" / source.removeprefix("/")
    for suffix in (".mdx", ".md"):
        candidate = Path(f"{base}{suffix}")
        if candidate.is_file():
            return candidate
    return None


def resolve_local_destination(root, destination):
    route = urlsplit(destination).path.strip("/")
    if not route:
        return None
    base = root / "content" / unquote(route)
    for candidate in (Path(f"{base}.mdx"), base / "index.mdx", base):
        if candidate.is_file():
            return candidate
    return None


def resolve_github_destination(root, destination):
    parts = [unquote(part) for part in urlsplit(destination).path.split("/") if part]
    if len(parts) < 2:
        return None
    clone = GITHUB_CLONES.get((parts[0], parts[1]))
    if not clone:
        return None
    clone_root = root / clone
    if len(parts) >= 5 and parts[2] in {"blob", "raw"}:
        candidate = clone_root.joinpath(*parts[4:])
        return candidate if candidate.is_file() else None
    for name in ("README.md", "README", "readme.md"):
        candidate = clone_root / name
        if candidate.is_file():
            return candidate
    return None


def resolve_destination(root, destination, kind):
    if kind == "local":
        return resolve_local_destination(root, destination)
    if kind == "github":
        return resolve_github_destination(root, destination)
    return None


def report_filename(source):
    return f"{source.strip('/').replace('/', '-')}.md"


def relative_path(root, path):
    return path.relative_to(root).as_posix() if path else None


def fingerprint(root, source, destination, source_file, destination_file):
    inputs = [
        ANALYZER_VERSION.encode(),
        source.encode(),
        destination.encode(),
        read_bytes(source_file),
        read_bytes(destination_file),
        read_bytes(root / "content/start-here.mdx"),
        read_bytes(root / "content/contribute/style-guide-extended.mdx"),
        read_bytes(root / "scripts/sidebars/coverage.schema.json"),
    ]
    digest = hashlib.sha256()
    for value in inputs:
        digest.update(len(value).to_bytes(8, "big"))
        digest.update(value)
    return digest.hexdigest()


def initial_state(source, kind, source_file):
    if not source_file:
        return "source_missing", None, "No matching old .md or .mdx file exists."
    if source.startswith("/v3/guidelines/ton-connect/"):
        return "fully_covered", 100.0, "TON Connect-focused pages are pre-assessed as covered."
    if source in AUTO_TVM_ROUTES:
        return "fully_covered", 100.0, "The aggregate TVM instruction page is excluded and covered."
    if kind == "external":
        return "fully_covered", 100.0, "External non-GitHub destinations are pre-assessed as covered."
    return "pending", None, None


def connect_database(database):
    connection = sqlite3.connect(database, timeout=60)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA journal_mode = WAL")
    connection.execute("PRAGMA synchronous = FULL")
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS mappings (
            source_route TEXT PRIMARY KEY,
            position INTEGER NOT NULL,
            destination TEXT NOT NULL,
            source_file TEXT,
            destination_kind TEXT NOT NULL,
            destination_file TEXT,
            fingerprint TEXT NOT NULL,
            analyzed_fingerprint TEXT,
            status TEXT NOT NULL,
            coverage_percent REAL,
            result TEXT,
            summary TEXT,
            recommended_destination TEXT,
            report_file TEXT,
            attempts INTEGER NOT NULL DEFAULT 0,
            last_error TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            analyzed_at TEXT
        )
        """
    )
    columns = {
        row["name"] for row in connection.execute("PRAGMA table_info(mappings)").fetchall()
    }
    if "analyzed_fingerprint" not in columns:
        connection.execute(
            "ALTER TABLE mappings ADD COLUMN analyzed_fingerprint TEXT"
        )
        connection.execute(
            """
            UPDATE mappings
            SET analyzed_fingerprint = fingerprint
            WHERE status IN ('fully_covered', 'report_created')
            """
        )
    connection.execute(
        "CREATE INDEX IF NOT EXISTS mappings_status_position ON mappings(status, position)"
    )
    connection.commit()
    return connection


def remove_report(root, report_file):
    if not report_file:
        return
    path = root / report_file
    analysis_dir = (root / ".ctx/analysis").resolve()
    if path.resolve().parent == analysis_dir and path.is_file():
        path.unlink()


def prepare(root, database):
    log("prepare_start", database=relative_path(root, database))
    config = json.loads((root / "docs.json").read_text(encoding="utf-8"))
    redirects = [
        item for item in config.get("redirects", []) if item["source"].startswith("/v3/")
    ]
    sources = [item["source"] for item in redirects]
    if len(sources) != len(set(sources)):
        raise RuntimeError("docs.json contains duplicate /v3/ redirect sources")

    connection = connect_database(database)
    seen = set()
    timestamp = now()

    for position, item in enumerate(redirects):
        source = item["source"]
        destination = item["destination"]
        kind = destination_kind(destination)
        source_path = resolve_old_source(root, source)
        destination_path = resolve_destination(root, destination, kind)
        source_file = relative_path(root, source_path)
        destination_file = relative_path(root, destination_path)
        state, coverage, summary = initial_state(source, kind, source_path)
        content_fingerprint = fingerprint(
            root, source, destination, source_path, destination_path
        )
        existing = connection.execute(
            """
            SELECT fingerprint, analyzed_fingerprint, status, report_file
            FROM mappings
            WHERE source_route = ?
            """,
            (source,),
        ).fetchone()

        if not existing:
            analyzed_fingerprint = (
                content_fingerprint if state == "fully_covered" else None
            )
            connection.execute(
                """
                INSERT INTO mappings (
                    source_route, position, destination, source_file,
                    destination_kind, destination_file, fingerprint,
                    analyzed_fingerprint, status, coverage_percent, summary,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    source,
                    position,
                    destination,
                    source_file,
                    kind,
                    destination_file,
                    content_fingerprint,
                    analyzed_fingerprint,
                    state,
                    coverage,
                    summary,
                    timestamp,
                    timestamp,
                ),
            )
        else:
            report_exists = bool(
                existing["report_file"] and (root / existing["report_file"]).is_file()
            )
            successful = existing["status"] == "fully_covered" or (
                existing["status"] == "report_created" and report_exists
            )
            reset = existing["status"] == "removed" or (
                not successful and existing["fingerprint"] != content_fingerprint
            )
            if existing["status"] == "report_created" and not report_exists:
                reset = True
                log("report_missing", source=source, action="reset_pending")

        if existing and reset:
            remove_report(root, existing["report_file"])
            analyzed_fingerprint = (
                content_fingerprint if state == "fully_covered" else None
            )
            connection.execute(
                """
                UPDATE mappings
                SET position = ?, destination = ?, source_file = ?,
                    destination_kind = ?, destination_file = ?, fingerprint = ?,
                    analyzed_fingerprint = ?, status = ?, coverage_percent = ?,
                    result = NULL, summary = ?, recommended_destination = NULL,
                    report_file = NULL, attempts = 0, last_error = NULL,
                    updated_at = ?, analyzed_at = NULL
                WHERE source_route = ?
                """,
                (
                    position,
                    destination,
                    source_file,
                    kind,
                    destination_file,
                    content_fingerprint,
                    analyzed_fingerprint,
                    state,
                    coverage,
                    summary,
                    timestamp,
                    source,
                ),
            )
        elif existing:
            connection.execute(
                """
                UPDATE mappings
                SET position = ?, destination = ?, source_file = ?,
                    destination_kind = ?, destination_file = ?, fingerprint = ?,
                    updated_at = ?
                WHERE source_route = ?
                """,
                (
                    position,
                    destination,
                    source_file,
                    kind,
                    destination_file,
                    content_fingerprint,
                    timestamp,
                    source,
                ),
            )
        seen.add(source)

    stale_rows = connection.execute(
        "SELECT source_route, report_file FROM mappings WHERE status != 'removed'"
    ).fetchall()
    for row in stale_rows:
        if row["source_route"] not in seen:
            remove_report(root, row["report_file"])
            connection.execute(
                """
                UPDATE mappings
                SET status = 'removed', report_file = NULL, updated_at = ?
                WHERE source_route = ?
                """,
                (timestamp, row["source_route"]),
            )

    connection.commit()
    recover_checkpoints(root, connection)
    log("prepare_done", mappings=len(redirects))
    print_status(connection)
    connection.close()


def print_status(connection):
    rows = connection.execute(
        """
        SELECT status, COUNT(*) AS count
        FROM mappings
        GROUP BY status
        ORDER BY status
        """
    ).fetchall()
    counts = {row["status"]: row["count"] for row in rows}
    counts["total"] = sum(
        row["count"] for row in rows if row["status"] != "removed"
    )
    counts["inputs_changed"] = connection.execute(
        """
        SELECT COUNT(*)
        FROM mappings
        WHERE status IN ('fully_covered', 'report_created')
          AND analyzed_fingerprint IS NOT fingerprint
        """
    ).fetchone()[0]
    counts["warnings"] = connection.execute(
        "SELECT COUNT(*) FROM mappings WHERE last_error IS NOT NULL"
    ).fetchone()[0]
    log("status", **counts)


def build_prompt(root, row):
    destination_file = row["destination_file"] or "(not resolved to a local file)"
    return f"""
Assess one old TON documentation route against its current redirect destination.
Do not edit any files. Return only the JSON object required by the output schema.

Scope:
- Source route: {row["source_route"]}
- Old source file: {row["source_file"]}
- Current redirect: {row["destination"]}
- Destination kind: {row["destination_kind"]}
- Locally resolved destination file: {destination_file}

Context discipline:
- Read the complete old source file named above, but do not read or search any other file
  under .ctx/old-ton-docs. Each invocation must remain isolated to one old route.
- Read the current destination file when it resolves locally.
- For a GitHub destination, inspect the exact target. For /blob/<ref>/<path> URLs, use the
  exact ref and path from the corresponding local clone when available; use the current
  checkout separately to validate whether the old material remains correct. If no clone
  corresponds to the URL, inspect the exact GitHub target with available read-only tools.
- Do not load the current documentation corpus. Search it only when the destination covers
  less than 95% or when a precise linked-page check is necessary.
- Use FFF MCP tools for file searches, as required by AGENTS.md. Direct reads of the exact
  paths in this prompt and exact paths found through FFF are allowed.
- When checking technical validity, consult only relevant files in these local primary
  sources: .ctx/ton, .ctx/acton, .ctx/acton-contracts, .ctx/at-ton-core,
  .ctx/at-ton-ton, .ctx/at-ton-crypto, .ctx/sandbox, and .ctx/blueprint.
- Read content/start-here.mdx, the early overview page for the relevant section when needed
  for placement, and content/contribute/style-guide-extended.mdx before drafting suggestions.

Coverage method:
1. Split the old page into factual or procedural content units. Navigation chrome, feedback
   widgets, repeated introductions, and pure link lists do not count.
2. Exclude units that are incorrect, outdated, or about external non-open-source commercial
   products. Treat excluded units as covered. TON Center APIs, TON Connect and its demo apps,
   and TON Pay are allowed. A tonscan.org URL may remain only with generic visible link text
   such as "explorer" or "popular TON explorer"; do not use the product name in prose.
3. If no in-scope units remain, return 100% coverage.
4. Measure the current destination itself. Up to three other current-doc pages may count
   toward current-destination coverage only when the destination actually links to them.
   Name those linked pages in the report when they materially provide coverage.
5. coverage_percent is the percentage of in-scope old content covered by the current
   destination under rule 4. Use a number from 0 through 100.
6. At 95% or more, use result "fully_covered" and leave report_body empty.
7. Below 95%, search for better current-doc pages when useful. Below 20%, this search is
   mandatory. Show at most three alternatives.
8. If another page covers at least 95% and the current redirect does not point there, use
   result "redirect_change_only". Set recommended_destination to its docs route. The report
   body must contain only a "## Redirect correction" section and must not suggest content
   edits.
9. Otherwise use result "needs_changes". Set recommended_destination to an empty string.

Report body requirements for "needs_changes":
- Start with "## Coverage gap" and give a brief, precise outline.
- Then use "## Missing chunks". For every uncovered chunk:
  - identify the old heading and line range;
  - reproduce the exact missing old content verbatim;
  - explain why the current destination and any qualifying linked pages do not cover it;
  - provide ready-to-paste suggested Markdown in clear American English;
  - name the exact destination page and insertion point for the suggestion.
- Suggested text must comply with content/contribute/style-guide-extended.mdx.
- If coverage is below 20% and better alternatives exist, compare each missing chunk against
  up to three alternatives, identify them as the optimal placement options, and assign every
  suggestion to a specific page.
- If coverage is below 20% and no alternative exceeds 20%, include "## Suggested new page"
  with complete ready-to-paste page content. Also list up to three optimal placements based
  on content/start-here.mdx and the relevant section overview.
- If another current page covers a missing chunk but the current destination does not link
  to it, state exactly where the destination should add the link and provide the link text.

Report body requirements for "redirect_change_only":
- Include the current redirect, recommended route and file, evidence for at least 95%
  coverage, and the exact docs.json change. Include no other section or suggestion.

Keep summary to one sentence. Do not treat stylistic similarity as factual coverage.
""".strip()


def parse_codex_output(stdout):
    output = stdout.strip()
    try:
        return json.loads(output)
    except json.JSONDecodeError:
        for line in reversed(output.splitlines()):
            line = line.strip()
            if line.startswith("{") and line.endswith("}"):
                return json.loads(line)
    raise ValueError("Codex output did not contain a JSON object")


def validate_result(result):
    coverage = float(result["coverage_percent"])
    disposition = result["result"]
    report_body = result["report_body"].strip()
    recommended = result["recommended_destination"].strip()

    if disposition == "fully_covered":
        if coverage < 95:
            raise ValueError("fully_covered requires at least 95% coverage")
        if report_body:
            raise ValueError("fully_covered must not include report_body")
    elif disposition == "needs_changes":
        if coverage >= 95:
            raise ValueError("needs_changes requires less than 95% coverage")
        if not report_body:
            raise ValueError("needs_changes requires report_body")
        if recommended:
            raise ValueError("needs_changes must leave recommended_destination empty")
    elif disposition == "redirect_change_only":
        if not recommended:
            raise ValueError("redirect_change_only requires recommended_destination")
        if not report_body.startswith("## Redirect correction"):
            raise ValueError(
                "redirect_change_only report_body must start with ## Redirect correction"
            )
    return coverage, disposition, report_body, recommended


def format_percent(value):
    return f"{value:.1f}".rstrip("0").rstrip(".")


def render_report(row, coverage, result):
    destination_file = row["destination_file"] or "not resolved locally"
    body = result["report_body"].strip()
    return (
        "# Documentation coverage analysis\n\n"
        f"- Source: `{row['source_route']}`\n"
        f"- Old source file: `{row['source_file']}`\n"
        f"- Current destination: `{row['destination']}`\n"
        f"- Resolved destination file: `{destination_file}`\n"
        f"- Coverage: **{format_percent(coverage)}%**\n"
        f"- Assessment: {result['summary'].strip()}\n\n"
        f"{body}\n"
    )


def save_checkpoint(root, row, result):
    path = checkpoint_path(root, row["source_route"])
    payload = {
        "source_route": row["source_route"],
        "fingerprint": row["fingerprint"],
        "result": result,
        "created_at": now(),
    }
    atomic_write_text(
        path,
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
    )
    return path


def persist_result(root, connection, row, result, checkpoint):
    coverage, disposition, _, recommended = validate_result(result)
    report_path = root / ".ctx/analysis" / report_filename(row["source_route"])
    previous_report = row["report_file"] if "report_file" in row.keys() else None
    report_file = None
    status = "fully_covered"

    if disposition != "fully_covered":
        atomic_write_text(report_path, render_report(row, coverage, result))
        report_file = relative_path(root, report_path)
        status = "report_created"

    timestamp = now()
    connection.execute(
        """
        UPDATE mappings
        SET status = ?, coverage_percent = ?, result = ?, summary = ?,
            recommended_destination = ?, report_file = ?, last_error = NULL,
            analyzed_fingerprint = fingerprint, updated_at = ?, analyzed_at = ?
        WHERE source_route = ?
        """,
        (
            status,
            coverage,
            disposition,
            result["summary"].strip(),
            recommended or None,
            report_file,
            timestamp,
            timestamp,
            row["source_route"],
        ),
    )
    connection.commit()

    if disposition == "fully_covered":
        remove_report(root, previous_report)
        if report_path.is_file():
            report_path.unlink()
    if checkpoint.is_file():
        checkpoint.unlink()
    return coverage, disposition, report_file


def recover_checkpoints(root, connection):
    directory = root / ".ctx/analysis/.checkpoints"
    if not directory.is_dir():
        return
    for checkpoint in sorted(directory.glob("*.json")):
        try:
            payload = json.loads(checkpoint.read_text(encoding="utf-8"))
            row = connection.execute(
                "SELECT * FROM mappings WHERE source_route = ?",
                (payload["source_route"],),
            ).fetchone()
            if not row:
                log("checkpoint_skipped", file=checkpoint.name, reason="source_missing")
                continue
            if payload["fingerprint"] != row["fingerprint"]:
                log(
                    "checkpoint_skipped",
                    source=row["source_route"],
                    reason="inputs_changed",
                )
                continue
            persist_result(root, connection, row, payload["result"], checkpoint)
            log("checkpoint_recovered", source=row["source_route"])
        except (OSError, ValueError, KeyError, json.JSONDecodeError) as error:
            log(
                "checkpoint_invalid",
                file=checkpoint.name,
                error=str(error).replace("\n", " ")[-500:],
            )


def codex_command(root, model):
    command = [
        "codex",
        "exec",
        "--ephemeral",
        "--sandbox",
        "read-only",
        "--cd",
        str(root),
        "--output-schema",
        str(root / "scripts/sidebars/coverage.schema.json"),
    ]
    if model:
        command.extend(["--model", model])
    command.append("-")
    return command


async def stop_process(process):
    if process.returncode is not None:
        return
    try:
        process.terminate()
    except ProcessLookupError:
        await process.wait()
        return
    try:
        await asyncio.wait_for(process.wait(), timeout=5)
    except asyncio.TimeoutError:
        try:
            process.kill()
        except ProcessLookupError:
            pass
        await process.wait()


async def invoke_codex(root, row, model, timeout_seconds):
    process = await asyncio.create_subprocess_exec(
        *codex_command(root, model),
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        stdout, stderr = await asyncio.wait_for(
            process.communicate(build_prompt(root, row).encode()),
            timeout=timeout_seconds,
        )
    except asyncio.TimeoutError:
        await stop_process(process)
        raise RuntimeError(f"codex exec timed out after {timeout_seconds} seconds")
    except asyncio.CancelledError:
        await stop_process(process)
        raise

    stdout_text = stdout.decode(errors="replace")
    stderr_text = stderr.decode(errors="replace")
    if process.returncode != 0:
        details = (stderr_text or stdout_text).strip()
        raise RuntimeError(
            f"codex exec exited with {process.returncode}: {details[-4000:]}"
        )
    return stdout_text


async def analyze_row(
    root,
    connection,
    row,
    model,
    timeout_seconds,
    semaphore,
    progress,
):
    async with semaphore:
        progress["active"] += 1
        progress["started"] += 1
        previous_status = row["status"]
        previous_success = previous_status in {"fully_covered", "report_created"}
        timestamp = now()
        connection.execute(
            """
            UPDATE mappings
            SET status = 'analyzing', attempts = attempts + 1,
                last_error = NULL, updated_at = ?
            WHERE source_route = ?
            """,
            (timestamp, row["source_route"]),
        )
        connection.commit()
        log(
            "analysis_start",
            source=row["source_route"],
            destination=row["destination"],
            attempt=row["attempts"] + 1,
            forced=previous_success,
        )

        try:
            stdout = await invoke_codex(root, row, model, timeout_seconds)
            result = parse_codex_output(stdout)
            validate_result(result)
            checkpoint = save_checkpoint(root, row, result)
            coverage, disposition, report_file = persist_result(
                root,
                connection,
                row,
                result,
                checkpoint,
            )
            progress["succeeded"] += 1
            log(
                "analysis_done",
                source=row["source_route"],
                coverage=coverage,
                result=disposition,
                report=report_file,
            )
        except asyncio.CancelledError:
            restored_status = previous_status if previous_success else "pending"
            connection.execute(
                """
                UPDATE mappings
                SET status = ?, updated_at = ?
                WHERE source_route = ?
                """,
                (restored_status, now(), row["source_route"]),
            )
            connection.commit()
            progress["cancelled"] += 1
            log(
                "analysis_cancelled",
                source=row["source_route"],
                restored_status=restored_status,
            )
            raise
        except (OSError, ValueError, RuntimeError, KeyError) as error:
            restored_status = previous_status if previous_success else "error"
            error_text = str(error).replace("\n", " ")[-4000:]
            connection.execute(
                """
                UPDATE mappings
                SET status = ?, last_error = ?, updated_at = ?
                WHERE source_route = ?
                """,
                (restored_status, error_text, now(), row["source_route"]),
            )
            connection.commit()
            progress["failed"] += 1
            log(
                "analysis_error",
                source=row["source_route"],
                restored_status=restored_status,
                error=error_text[-500:],
            )
        finally:
            progress["active"] -= 1
            progress["completed"] += 1


async def log_heartbeat(progress, stopped):
    while True:
        try:
            await asyncio.wait_for(stopped.wait(), timeout=HEARTBEAT_SECONDS)
            return
        except asyncio.TimeoutError:
            if stopped.is_set():
                return
            log(
                "heartbeat",
                active=progress["active"],
                started=progress["started"],
                completed=progress["completed"],
                remaining=progress["total"] - progress["completed"],
                succeeded=progress["succeeded"],
                failed=progress["failed"],
            )


async def analyze_rows(root, connection, rows, model, timeout_seconds, jobs):
    semaphore = asyncio.Semaphore(jobs)
    progress = {
        "total": len(rows),
        "active": 0,
        "started": 0,
        "completed": 0,
        "succeeded": 0,
        "failed": 0,
        "cancelled": 0,
    }
    stopped = asyncio.Event()
    heartbeat = asyncio.create_task(log_heartbeat(progress, stopped))
    try:
        await asyncio.gather(
            *(
                analyze_row(
                    root,
                    connection,
                    row,
                    model,
                    timeout_seconds,
                    semaphore,
                    progress,
                )
                for row in rows
            )
        )
    finally:
        stopped.set()
        await heartbeat
    return progress


def run(root, database, args):
    prepare(root, database)
    connection = connect_database(database)
    recovered = connection.execute(
        "UPDATE mappings SET status = 'pending', updated_at = ? WHERE status = 'analyzing'",
        (now(),),
    ).rowcount
    connection.commit()
    if recovered:
        log("interrupted_rows_reset", count=recovered)

    conditions = ["status = 'pending'"]
    if args.retry_errors:
        conditions.append("status = 'error'")
    if args.force_rerun:
        conditions.append(
            "(status IN ('fully_covered', 'report_created') AND result IS NOT NULL)"
        )
    query = f"""
        SELECT *
        FROM mappings
        WHERE ({" OR ".join(conditions)})
    """
    values = []
    if args.source:
        query += " AND source_route = ?"
        values.append(args.source)
    query += " ORDER BY position"
    if args.limit is not None:
        query += " LIMIT ?"
        values.append(args.limit)
    rows = connection.execute(query, values).fetchall()
    log(
        "run_selected",
        count=len(rows),
        jobs=args.jobs,
        retry_errors=args.retry_errors,
        force_rerun=args.force_rerun,
    )

    if args.dry_run:
        for row in rows:
            log(
                "dry_run_mapping",
                source=row["source_route"],
                destination=row["destination"],
                previous_status=row["status"],
            )
        connection.close()
        return

    progress = asyncio.run(
        analyze_rows(
            root,
            connection,
            rows,
            args.model,
            args.timeout_seconds,
            args.jobs,
        )
    )

    log(
        "run_done",
        total=progress["total"],
        succeeded=progress["succeeded"],
        failed=progress["failed"],
        cancelled=progress["cancelled"],
    )
    print_status(connection)
    connection.close()


def show_status(database):
    if not database.is_file():
        raise RuntimeError("analysis database does not exist; run prepare first")
    connection = connect_database(database)
    print_status(connection)
    warnings = connection.execute(
        """
        SELECT source_route, status, last_error
        FROM mappings
        WHERE last_error IS NOT NULL
        ORDER BY position
        """
    ).fetchall()
    for row in warnings:
        log(
            "stored_error",
            source=row["source_route"],
            status=row["status"],
            error=row["last_error"].replace("\n", " ")[-500:],
        )
    connection.close()


def jobs_count(value):
    jobs = int(value)
    if not 1 <= jobs <= 30:
        raise argparse.ArgumentTypeError("--jobs must be between 1 and 30")
    return jobs


def parse_args():
    parser = argparse.ArgumentParser(
        description="Compare old /v3/ TON docs pages with current redirect destinations."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("prepare", help="Inventory redirects and initialize SQLite state.")
    subparsers.add_parser("status", help="Show resumable pipeline state.")
    run_parser = subparsers.add_parser(
        "run", help="Prepare state and analyze pending mappings."
    )
    run_parser.add_argument("--source", help="Analyze only this exact /v3/ source route.")
    run_parser.add_argument("--limit", type=int, help="Analyze at most this many mappings.")
    run_parser.add_argument(
        "--retry-errors", action="store_true", help="Retry mappings in error state."
    )
    run_parser.add_argument(
        "--force-rerun",
        action="store_true",
        help="Reanalyze successfully processed model-assessed mappings.",
    )
    run_parser.add_argument(
        "--dry-run", action="store_true", help="List selected mappings without invoking Codex."
    )
    run_parser.add_argument(
        "--jobs",
        type=jobs_count,
        default=1,
        help="Number of parallel codex exec calls, from 1 through 30 (default: 1).",
    )
    run_parser.add_argument("--model", help="Override the configured Codex model.")
    run_parser.add_argument(
        "--timeout-seconds",
        type=int,
        default=1800,
        help="Timeout for each codex exec call (default: 1800).",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    log("pipeline_start", command=args.command)
    root = Path(__file__).resolve().parents[2]
    analysis_dir = root / ".ctx/analysis"
    analysis_dir.mkdir(parents=True, exist_ok=True)
    database = analysis_dir / "coverage.sqlite3"

    if args.command == "prepare":
        prepare(root, database)
    elif args.command == "status":
        show_status(database)
    else:
        run(root, database, args)


def terminate_with_interrupt(signum, frame):
    raise KeyboardInterrupt


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, terminate_with_interrupt)
    try:
        main()
    except KeyboardInterrupt:
        log("pipeline_interrupted", action="resume_with_run")
        raise SystemExit(130)
    except (OSError, RuntimeError, sqlite3.Error, json.JSONDecodeError) as error:
        log("pipeline_error", error=str(error).replace("\n", " ")[-500:])
        raise SystemExit(1)
