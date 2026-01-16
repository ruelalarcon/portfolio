/**
 * Smooth scroll utility
 * Provides consistent cross-browser smooth scrolling using requestAnimationFrame
 * Standalone module - only imports easing function from math.js
 */

import { easeInOutCubic } from "./math.js";

/**
 * Smoothly scroll an element to a target position
 * @param {HTMLElement} element - The scrollable element
 * @param {number} targetTop - Target scroll position (top offset)
 * @param {number} duration - Animation duration in milliseconds (default: 600)
 * @returns {Promise<void>} Resolves when scroll animation completes
 */
export function smoothScrollTo(element, targetTop, duration = 600) {
  return new Promise((resolve) => {
    const startTop = element.scrollTop;
    const distance = targetTop - startTop;
    const startTime = performance.now();

    // Skip animation if already at target
    if (Math.abs(distance) < 1) {
      resolve();
      return;
    }

    function step(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeInOutCubic(progress);

      element.scrollTop = startTop + distance * easedProgress;

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        resolve();
      }
    }

    requestAnimationFrame(step);
  });
}
