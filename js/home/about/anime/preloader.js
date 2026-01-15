/**
 * Live2D Model Preloader
 * Preloads the Live2D model data and assets early to avoid loading delays
 */

// Model URL - same as loader
const MODEL_URL = 'https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E5%B0%91%E5%A5%B3%E5%92%96%E5%95%A1%E6%9E%AA%20girls%20cafe%20gun/girl03/l2d04.u/l2d04.u.model3.json';

class Live2DPreloader {
  constructor() {
    this.modelData = null;
    this.preloadPromise = null;
  }

  /**
   * Start preloading the model JSON
   * This should be called early in the page lifecycle
   */
  async preload() {
    if (this.preloadPromise) {
      return this.preloadPromise;
    }

    this.preloadPromise = (async () => {
      try {
        const json = await fetch(MODEL_URL).then((res) => res.json());
        json.url = MODEL_URL;

        // Set idle motion
        json.FileReferences.Motions['Idle'] = [
          {
            'File': 'motions/Mgirl03_stand_c.motion3.json'
          },
        ];

        this.modelData = json;
        console.log('Live2D model data preloaded');
      } catch (error) {
        console.error('Failed to preload Live2D model:', error);
      }
    })();

    return this.preloadPromise;
  }

  /**
   * Get the preloaded model data
   * Returns null if not yet loaded
   */
  getModelData() {
    return this.modelData;
  }

  /**
   * Wait for preload to complete
   */
  async waitForPreload() {
    if (this.preloadPromise) {
      await this.preloadPromise;
    }
    return this.modelData;
  }
}

// Singleton instance
const preloader = new Live2DPreloader();

export { preloader };
