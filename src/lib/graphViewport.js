export const SITE_TITLE = "888台灣的公司關係網";

export function companyPageTitle(company) {
  return company ? `${company} - ${SITE_TITLE}` : SITE_TITLE;
}

export function clampZoom(zoom) {
  return Math.min(2.4, Math.max(0.65, zoom));
}

export function calculatePinchViewport({
  center,
  currentDistance,
  currentMidpoint,
  startDistance,
  startMidpoint,
  startPan,
  startZoom,
}) {
  const zoom = clampZoom(startZoom * (currentDistance / Math.max(startDistance, 1)));
  const anchor = {
    x: (startMidpoint.x - center.x - startPan.x) / startZoom,
    y: (startMidpoint.y - center.y - startPan.y) / startZoom,
  };

  return {
    pan: {
      x: currentMidpoint.x - center.x - zoom * anchor.x,
      y: currentMidpoint.y - center.y - zoom * anchor.y,
    },
    zoom,
  };
}
