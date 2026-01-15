/**
 * Coding Animation
 * WebGL ASCII visualization for the coding section
 */

import { WebGLASCIIRenderer } from "../../lib/ascii-renderer/webgl.js";

// ASCII character set for WebGL renderer (simple dot pattern for now)
const ASCII_CHARS = ".";

class CodingAnimation {
  constructor() {
    this.renderer = null;
    this.width = 80;
    this.height = 30;
    this.animationId = null;
  }

  /**
   * Initialize the animation
   * @param {HTMLElement} container - Container element for the canvas
   */
  async init(container) {
    if (!container) return;

    this.renderer = new WebGLASCIIRenderer(this.width, this.height, {
      charSet: ASCII_CHARS,
      displayFontSize: 12,
    });

    await this.renderer.init(container);
    this._startAnimation();
  }

  /**
   * Start animation loop
   */
  _startAnimation() {
    const animate = () => {
      const time = Date.now() / 1000;
      const colors = [];
      const chars = [];

      // Fill with dots and varying green colors
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          // Create a simple wave pattern with noise
          const wave = Math.sin(x * 0.1 + time) * 0.5 + 0.5;
          const noise = Math.sin(y * 0.2 + time * 0.5) * 0.5 + 0.5;
          const brightness = wave * noise;

          // Green color with varying intensity [r, g, b]
          colors.push([
            Math.floor(brightness * 80), // R
            Math.floor(brightness * 200 + 55), // G
            Math.floor(brightness * 80), // B
          ]);

          // All dots for now
          chars.push(".");
        }
      }

      this.renderer.render({ chars, colors });
      this.animationId = requestAnimationFrame(animate);
    };

    animate();
  }

  /**
   * Cleanup method
   */
  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.renderer && this.renderer.destroy) {
      this.renderer.destroy();
      this.renderer = null;
    }
  }
}

export { CodingAnimation };
