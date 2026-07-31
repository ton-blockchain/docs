import importlib.util
import json
import sqlite3
import tempfile
import unittest
from pathlib import Path


ANALYZER_SCRIPT = Path(__file__).with_name("analyze-coverage.py")
SPEC = importlib.util.spec_from_file_location("analyze_coverage", ANALYZER_SCRIPT)
analyze_coverage = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(analyze_coverage)


def write(root, relative, content):
    path = root / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    return path


def write_config(root, redirects):
    write(root, "docs.json", json.dumps({"redirects": redirects}))


class CoverageInventoryTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)

    def tearDown(self):
        self.temporary.cleanup()

    def test_sidebar_sources_are_unique_and_keep_order(self):
        write(
            self.root,
            "scripts/sidebars/sidebars.js",
            """
            module.exports = {
              learn: [
                'v3/first',
                { type: 'doc', id: 'v3/second' },
                { type: 'link', href: '/v3/third' },
                `v3/first`,
                'not-a-v3-route',
              ],
            };
            """,
        )

        self.assertEqual(
            analyze_coverage.load_sidebar_sources(self.root),
            ["/v3/first", "/v3/second", "/v3/third"],
        )

    def test_every_sidebar_source_must_have_one_redirect(self):
        write(
            self.root,
            "scripts/sidebars/sidebars.js",
            "module.exports = { learn: ['v3/page'] };",
        )
        write_config(self.root, [])

        with self.assertRaisesRegex(RuntimeError, "/v3/page"):
            analyze_coverage.load_coverage_redirects(self.root)

        write_config(
            self.root,
            [
                {"source": "/v3/page", "destination": "/page"},
                {"source": "/v3/page", "destination": "/other"},
            ],
        )
        with self.assertRaisesRegex(RuntimeError, "duplicate redirect sources"):
            analyze_coverage.load_coverage_redirects(self.root)

    def test_prepare_ignores_aliases_and_preserves_processed_orphans(self):
        sidebar = """
        module.exports = {
          learn: [
            'v3/page',
            { type: 'link', href: '/v3/documentation/tvm/instructions' },
            'v3/orphan',
          ],
        };
        """
        write(self.root, "scripts/sidebars/sidebars.js", sidebar)
        write_config(
            self.root,
            [
                {"source": "/v3/alias", "destination": "/page"},
                {"source": "/v3/page", "destination": "/page"},
                {
                    "source": "/v3/documentation/tvm/instructions",
                    "destination": "/tvm/instructions",
                },
                {"source": "/v3/orphan", "destination": "/orphan"},
            ],
        )
        write(self.root, ".ctx/old-ton-docs/docs/v3/page.mdx", "# Old page\n")
        write(self.root, ".ctx/old-ton-docs/docs/v3/orphan.mdx", "# Old orphan\n")
        write(self.root, "content/page.mdx", "# Current page\n")
        write(self.root, "content/tvm/instructions.mdx", "# Instructions\n")
        write(self.root, "content/orphan.mdx", "# Current orphan\n")

        database = self.root / ".ctx/analysis/coverage.sqlite3"
        database.parent.mkdir(parents=True, exist_ok=True)
        analyze_coverage.prepare(self.root, database)
        report = write(self.root, ".ctx/analysis/orphan.md", "processed report\n")
        connection = sqlite3.connect(database)
        connection.execute(
            """
            UPDATE mappings
            SET status = 'report_created', result = 'needs_changes',
                coverage_percent = 50, report_file = ?,
                analyzed_fingerprint = fingerprint
            WHERE source_route = '/v3/orphan'
            """,
            (report.relative_to(self.root).as_posix(),),
        )
        fingerprint = connection.execute(
            "SELECT fingerprint FROM mappings WHERE source_route = '/v3/orphan'"
        ).fetchone()[0]
        connection.commit()
        connection.close()
        checkpoint = write(
            self.root,
            ".ctx/analysis/.checkpoints/v3-orphan.md.json",
            json.dumps(
                {
                    "source_route": "/v3/orphan",
                    "fingerprint": fingerprint,
                    "result": {
                        "coverage_percent": 100,
                        "result": "fully_covered",
                        "report_body": "",
                        "recommended_destination": "",
                        "summary": "Would overwrite the processed result.",
                    },
                }
            ),
        )

        write(
            self.root,
            "scripts/sidebars/sidebars.js",
            """
            module.exports = {
              learn: [
                'v3/page',
                { type: 'link', href: '/v3/documentation/tvm/instructions' },
              ],
            };
            """,
        )
        sources = analyze_coverage.prepare(self.root, database)

        connection = sqlite3.connect(database)
        rows = dict(
            connection.execute(
                "SELECT source_route, status FROM mappings ORDER BY source_route"
            ).fetchall()
        )
        connection.close()
        self.assertEqual(
            sources,
            ["/v3/page", "/v3/documentation/tvm/instructions"],
        )
        self.assertNotIn("/v3/alias", rows)
        self.assertEqual(rows["/v3/page"], "pending")
        self.assertEqual(
            rows["/v3/documentation/tvm/instructions"], "fully_covered"
        )
        self.assertEqual(rows["/v3/orphan"], "report_created")
        self.assertEqual(report.read_text(encoding="utf-8"), "processed report\n")
        self.assertTrue(checkpoint.is_file())


if __name__ == "__main__":
    unittest.main()
