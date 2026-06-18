import { describe, expect, it } from "vitest";

// @ts-expect-error - plain .mjs release helper, no type declarations
import { buildManifest } from "./buildManifest.mjs";

describe("buildManifest", () => {
  it("carries the changelog into notes so the in-app updater shows it", () => {
    const manifest = buildManifest({
      version: "0.0.3",
      notes: "## What's new\n- feat: a thing",
      pubDate: "2026-06-18T00:00:00Z",
      signature: "sig",
      url: "https://example.com/TempoTerm.app.tar.gz",
    });

    expect(manifest.notes).toBe("## What's new\n- feat: a thing");
  });

  it("keeps the version, pub_date and signed darwin-aarch64 download the updater expects", () => {
    const manifest = buildManifest({
      version: "0.0.3",
      notes: "notes",
      pubDate: "2026-06-18T00:00:00Z",
      signature: "the-signature",
      url: "https://example.com/TempoTerm.app.tar.gz",
    });

    expect(manifest.version).toBe("0.0.3");
    expect(manifest.pub_date).toBe("2026-06-18T00:00:00Z");
    expect(manifest.platforms["darwin-aarch64"]).toEqual({
      signature: "the-signature",
      url: "https://example.com/TempoTerm.app.tar.gz",
    });
  });
});
