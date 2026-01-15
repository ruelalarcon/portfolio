/**
 * Anime Animation
 * Connector module that loads the Live2D anime girl model
 */

import { Live2DLoader } from "./anime/live2d-loader.js";

class AnimeAnimation {
  constructor() {
    this.loader = null;
  }

  /**
   * Initialize the animation
   * @param {HTMLElement} container - Container element for the canvas
   */
  async init(container) {
    if (!container) return;

    this.loader = new Live2DLoader();
    await this.loader.init(container);
  }

  /**
   * Cleanup method
   */
  destroy() {
    if (this.loader && this.loader.destroy) {
      this.loader.destroy();
      this.loader = null;
    }
  }
}

export { AnimeAnimation };
