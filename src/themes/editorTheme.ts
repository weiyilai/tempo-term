import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import {
  createVitesseDarkTheme,
  createVitesseLightTheme,
  defaultSettingsVitesseDark,
  defaultSettingsVitesseLight,
} from "codemirror-theme-vitesse";

/**
 * CodeMirror 語法高亮主題，對齊 app 的 Vitesse 配色。
 *
 * 語法配色直接來自 codemirror-theme-vitesse（源自 antfu/vscode-theme-vitesse）。
 * 編輯器自身的背景與 gutter 設為透明，讓它沿用底下 app 的背景色（bg-bg），
 * 不再自己畫一塊深色底，這樣切到任何 app 主題都不會出現色塊斷層。
 *
 * 套件預設的「當前行高亮」偏綠，跟 vitesse 不搭，這裡改回官方
 * editor.lineHighlightBackground 的中性灰（深色 #292929 / 淺色 #f7f7f7）。
 */
const DARK_ACTIVE_LINE = "#292929";
const LIGHT_ACTIVE_LINE = "#f7f7f7";

const vitesseDarkEditor: Extension = [
  createVitesseDarkTheme({
    settings: {
      ...defaultSettingsVitesseDark,
      background: "transparent",
      gutterBackground: "transparent",
      lineHighlight: DARK_ACTIVE_LINE,
    },
  }),
  EditorView.theme({
    ".cm-activeLine": { backgroundColor: DARK_ACTIVE_LINE },
    ".cm-activeLineGutter": { backgroundColor: DARK_ACTIVE_LINE },
  }),
];

const vitesseLightEditor: Extension = [
  createVitesseLightTheme({
    settings: {
      ...defaultSettingsVitesseLight,
      background: "transparent",
      gutterBackground: "transparent",
      lineHighlight: LIGHT_ACTIVE_LINE,
    },
  }),
  EditorView.theme({
    ".cm-activeLine": { backgroundColor: LIGHT_ACTIVE_LINE },
    ".cm-activeLineGutter": { backgroundColor: LIGHT_ACTIVE_LINE },
  }),
];

/** 依 app 的明暗外觀挑選對應的編輯器語法高亮主題。 */
export function editorSyntaxTheme(isDark: boolean): Extension {
  return isDark ? vitesseDarkEditor : vitesseLightEditor;
}
