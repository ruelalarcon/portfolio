/**
 * Live2D Model Preloader
 * Preloads the Live2D model data and all assets early to avoid loading delays
 */

// Model URL - same as loader
const MODEL_URL =
  "https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E5%B0%91%E5%A5%B3%E5%92%96%E5%95%A1%E6%9E%AA%20girls%20cafe%20gun/girl03/l2d04.u/l2d04.u.model3.json";

class Live2DPreloader {
  constructor() {
    this.modelData = null;
    this.preloadPromise = null;
  }

  /**
   * Start preloading the model JSON and all referenced assets
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
        json.FileReferences.Motions["Idle"] = [
          {
            File: "motions/Mgirl03_stand_c.motion3.json",
          },
        ];

        // Preload all subfiles in parallel
        await this._preloadSubfiles(json);

        this.modelData = json;
        console.log("Live2D model data and assets preloaded");
      } catch (error) {
        console.error("Failed to preload Live2D model:", error);
      }
    })();

    return this.preloadPromise;
  }

  /**
   * Preload all referenced subfiles from the model JSON
   * @param {Object} json - The model JSON data
   */
  async _preloadSubfiles(json) {
    const baseUrl = MODEL_URL.substring(0, MODEL_URL.lastIndexOf("/") + 1);
    const refs = json.FileReferences;
    const fetchPromises = [];

    // Moc file (binary)
    if (refs.Moc) {
      fetchPromises.push(this._preloadFile(baseUrl + refs.Moc));
    }

    // Textures (images)
    if (refs.Textures && Array.isArray(refs.Textures)) {
      for (const texture of refs.Textures) {
        fetchPromises.push(this._preloadImage(baseUrl + texture));
      }
    }

    // Physics file (JSON)
    if (refs.Physics) {
      fetchPromises.push(this._preloadFile(baseUrl + refs.Physics));
    }

    // Motion files (JSON) - deduplicate since there can be duplicates
    if (refs.Motions) {
      const motionFiles = new Set();
      for (const group of Object.values(refs.Motions)) {
        if (Array.isArray(group)) {
          for (const motion of group) {
            if (motion.File) {
              motionFiles.add(motion.File);
            }
          }
        }
      }
      for (const file of motionFiles) {
        fetchPromises.push(this._preloadFile(baseUrl + file));
      }
    }

    // Wait for all preloads to complete (don't fail if some fail)
    await Promise.allSettled(fetchPromises);
  }

  /**
   * Preload a file (fetches and caches in browser)
   * @param {string} url - URL to preload
   */
  async _preloadFile(url) {
    await fetch(url);
  }

  /**
   * Preload an image (uses Image object for browser caching)
   * @param {string} url - Image URL to preload
   */
  _preloadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
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
