/**
 * Mathematical utility functions
 * Standalone module with no dependencies
 */

export function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function noiseFunction(x, y, time) {
  return (
    Math.sin(x * 0.5 + time) *
    Math.cos(y * 0.7 + time * 1.3) *
    Math.sin((x + y) * 0.3 + time * 0.7)
  );
}
