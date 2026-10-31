/** Browser/status-bar color per theme: the page background (`--background`) in hex, since `<meta theme-color>` takes no oklch. */
export const THEME_COLOR = { dark: "#090b12", light: "#f9fafe" } as const;

/** Points the `theme-color` meta at the given theme, creating the tag when the page has none yet. */
export function applyThemeColor(dark: boolean) {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = dark ? THEME_COLOR.dark : THEME_COLOR.light;
}
