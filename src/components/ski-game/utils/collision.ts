/**
 * Axis-aligned box overlap in screen space with per-box inset padding.
 */
export function aabbIntersectsWithPadding(
  aLeft: number,
  aTop: number,
  aWidth: number,
  aHeight: number,
  aPadding: number,
  bLeft: number,
  bTop: number,
  bWidth: number,
  bHeight: number,
  bPadding: number,
): boolean {
  const aInnerLeft = aLeft + aPadding;
  const aInnerTop = aTop + aPadding;
  const aInnerRight = aLeft + aWidth - aPadding;
  const aInnerBottom = aTop + aHeight - aPadding;

  if (aInnerLeft >= aInnerRight || aInnerTop >= aInnerBottom) {
    return false;
  }

  const bInnerLeft = bLeft + bPadding;
  const bInnerTop = bTop + bPadding;
  const bInnerRight = bLeft + bWidth - bPadding;
  const bInnerBottom = bTop + bHeight - bPadding;

  if (bInnerLeft >= bInnerRight || bInnerTop >= bInnerBottom) {
    return false;
  }

  return (
    aInnerLeft < bInnerRight &&
    aInnerRight > bInnerLeft &&
    aInnerTop < bInnerBottom &&
    aInnerBottom > bInnerTop
  );
}
