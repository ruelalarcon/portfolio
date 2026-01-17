/**
 * Mathematical utility functions
 * Standalone module with no dependencies
 */

/**
 * Cubic ease-in-out timing function
 * @param {number} t - Progress value between 0 and 1
 * @returns {number} Eased value between 0 and 1
 */
export function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Generate 3D noise value from coordinates and time
 * Used for ripple effects and procedural animations
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} time - Time value for animation
 * @returns {number} Noise value between -1 and 1
 */
export function noiseFunction(x, y, time) {
  return (
    Math.sin(x * 0.5 + time) *
    Math.cos(y * 0.7 + time * 1.3) *
    Math.sin((x + y) * 0.3 + time * 0.7)
  );
}
