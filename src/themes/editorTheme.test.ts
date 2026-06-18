import { describe, expect, it } from "vitest";
import { editorSyntaxTheme } from "./editorTheme";
import { DEFAULT_THEME_ID, THEMES } from "./themes";

describe("editorSyntaxTheme", () => {
  it("gives github-dark a different editor theme from vitesse-dark", () => {
    expect(editorSyntaxTheme("github-dark")).not.toBe(editorSyntaxTheme("vitesse-dark"));
  });

  it("maps every registered theme to its own distinct editor theme", () => {
    const themes = THEMES.map((th) => editorSyntaxTheme(th.id));
    expect(new Set(themes).size).toBe(THEMES.length);
  });

  it("falls back to the default theme's editor for an unknown id", () => {
    expect(editorSyntaxTheme("does-not-exist")).toBe(editorSyntaxTheme(DEFAULT_THEME_ID));
  });
});
