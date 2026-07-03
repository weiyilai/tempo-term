// Branch colours cycle per branch line (see CommitLayout.colorIndex), not per
// lane index, so concurrent lanes never share a colour. This is a fixed rainbow
// (red→violet), deliberately NOT theme tokens: branch colours are identifiers,
// not UI surfaces, so they stay constant across themes — and the theme's colour
// scales aren't remapped per theme anyway, so a token palette would wash out on
// the light themes. Hues are mid-lightness so each reads on both dark (#222) and
// light (#fff) backgrounds, and evenly spaced so adjacent lanes stay distinct.
//
// Shared by the full Git Graph tab and the sidebar's compact history graph so
// the same branch reads as the same colour in both places.
export const BRANCH_COLORS = [
  "#e0555f", // red
  "#e3712f", // orange (shifted redder to separate from yellow)
  "#e8c139", // yellow (brighter gold so it never reads like orange)
  "#46a758", // green
  "#3b8ee0", // blue
  "#6366d6", // indigo
  "#a857c4", // violet
];
