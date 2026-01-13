/**
 * Async utility functions
 * Standalone module with no dependencies
 */

export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
