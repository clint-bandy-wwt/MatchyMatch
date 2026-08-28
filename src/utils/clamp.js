/**
 * Clamps a value between a minimum and maximum value
 * @param {number} value - The value to clamp
 * @param {number} min - The minimum value
 * @param {number} max - The maximum value
 * @returns {number} - The clamped value
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
