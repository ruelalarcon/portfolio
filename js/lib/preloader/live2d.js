/**
 * Live2D Model Preloader
 * Preloads Live2D model data and all assets early to avoid loading delays
 */

class Live2DPreloader {
  constructor(modelUrl) {
    this.modelUrl = modelUrl;
    this.modelData = null;
    this.preloadPromise = null;
  }

  /**
   * Start preloading the model JSON and all referenced assets
   * Should be called early in the page lifecycle
   */
  async preload() {
    if (this.preloadPromise) {
      return this.preloadPromise;
    }

    this.preloadPromise = (async () => {
      try {
        const json = await fetch(this.modelUrl).then((res) => res.json());
        json.url = this.modelUrl;

        if (this.modifier) {
          this.modifier(json);
        }

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
    const baseUrl = this.modelUrl.substring(
      0,
      this.modelUrl.lastIndexOf("/") + 1,
    );
    const refs = json.FileReferences;
    const fetchPromises = [];

    if (refs.Moc) {
      fetchPromises.push(this._preloadFile(baseUrl + refs.Moc));
    }

    if (refs.Textures && Array.isArray(refs.Textures)) {
      for (const texture of refs.Textures) {
        fetchPromises.push(this._preloadImage(baseUrl + texture));
      }
    }

    if (refs.Physics) {
      fetchPromises.push(this._preloadFile(baseUrl + refs.Physics));
    }

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

    await Promise.allSettled(fetchPromises);
  }

  /**
   * Preload a file via fetch for browser caching
   * @param {string} url - URL to preload
   */
  async _preloadFile(url) {
    await fetch(url);
  }

  /**
   * Preload an image using Image object for browser caching
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
   * @returns {Object|null} Model JSON data, or null if not yet loaded
   */
  getModelData() {
    return this.modelData;
  }

  /**
   * Modify the model data before it's used
   * @param {Function} modifier - Function that receives and modifies the JSON
   */
  modifyModelData(modifier) {
    this.modifier = modifier;
    if (this.modelData) {
      modifier(this.modelData);
    }
  }

  /**
   * Wait for preload to complete
   * @returns {Promise<Object>} The model data
   */
  async waitForPreload() {
    if (this.preloadPromise) {
      await this.preloadPromise;
    }
    return this.modelData;
  }
}

export { Live2DPreloader };
