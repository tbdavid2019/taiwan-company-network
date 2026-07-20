export function nodeSelectedOnPointerEnd({ cancelled, drag, remainingPointerCount }) {
  if (cancelled || remainingPointerCount > 0 || !drag || drag.moved) return "";
  return drag.id || "";
}
