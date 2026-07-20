const DEFAULT_DRAG_THRESHOLD = 6;

export function pointerMovementExceedsThreshold({ current, start, threshold = DEFAULT_DRAG_THRESHOLD }) {
  if (!current || !start) return false;
  return Math.hypot(current.x - start.x, current.y - start.y) > threshold;
}

export function nodeSelectedOnPointerEnd({ cancelled, drag, remainingPointerCount }) {
  if (cancelled || remainingPointerCount > 0 || !drag || drag.moved) return "";
  return drag.id || "";
}
