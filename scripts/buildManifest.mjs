import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Build the updater manifest (latest.json) that the in-app updater polls.
 *
 * The Tauri updater surfaces this manifest's `notes` field as `update.body`,
 * which is what the in-app "更新內容" prompt renders. The GitHub release body is
 * never read by the updater, so the changelog has to be embedded here too.
 *
 * @param {{ version: string, notes: string, pubDate: string, signature: string, url: string }} input
 */
export function buildManifest({ version, notes, pubDate, signature, url }) {
  return {
    version,
    notes,
    pub_date: pubDate,
    platforms: {
      "darwin-aarch64": {
        signature,
        url,
      },
    },
  };
}

// CLI: node scripts/buildManifest.mjs <changelogPath> <outPath>
// release.sh passes version/pub_date/signature/url via MANIFEST_* env vars so it
// never has to quote the markdown notes on the command line; notes come from the
// changelog file directly.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [changelogPath, outPath] = process.argv.slice(2);
  if (!changelogPath || !outPath) {
    process.stderr.write("usage: buildManifest.mjs <changelogPath> <outPath>\n");
    process.exit(1);
  }

  const notes = readFileSync(changelogPath, "utf8").trim();
  const manifest = buildManifest({
    version: process.env.MANIFEST_VERSION,
    notes,
    pubDate: process.env.MANIFEST_PUB_DATE,
    signature: process.env.MANIFEST_SIGNATURE,
    url: process.env.MANIFEST_URL,
  });

  writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`);
}
