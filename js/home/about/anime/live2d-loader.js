/**
 * Live2D Model Loader
 * Loads and manages the Live2D anime girl model using PixiJS and pixi-live2d-display
 */

import { preloader } from "./preloader.js";

class Live2DLoader {
  constructor() {
    this.app = null;
    this.model = null;
  }

  /**
   * Initialize PixiJS application and load Live2D model
   * @param {HTMLElement} container - Container element for the canvas
   */
  async init(container) {
    if (!container) return;

    // Create canvas element
    const canvas = document.createElement("canvas");
    canvas.id = "live2DCanvas";
    container.appendChild(canvas);

    // Initialize PixiJS application
    this.app = new PIXI.Application({
      view: canvas,
      autoStart: true,
      resizeTo: container,
      backgroundAlpha: 0, // Fully transparent background
      transparent: true, // Enable transparency
    });

    // Wait for preloaded data or load fresh if not available
    let json = preloader.getModelData();
    if (!json) {
      console.log("Model not preloaded, waiting for preload...");
      json = await preloader.waitForPreload();
    } else {
      console.log("Using preloaded model data");
    }

    // Load Live2D model from preloaded JSON
    this.model = await PIXI.live2d.Live2DModel.from(json);

    // Patch internal model parameters
    this._patchInternalModel(this.model.internalModel);

    // Add model to stage
    this.app.stage.addChild(this.model);

    // Position and scale model
    // Adjust these values to fit the model within the canvas:
    // - scale: Size of the model (0.5 = 50%, 1.0 = 100%, 1.5 = 150%)
    // - x: Horizontal position (negative = left, 0 = left edge, positive = right)
    // - y: Vertical position (negative = up, 0 = top edge, positive = down)
    // - anchor: Pivot point for positioning (0.5, 0.5 = center of model)

    this.model.anchor.set(0.5, 0.5); // Set anchor to center of model
    this.model.scale.set(0.5);
    this.model.x = this.app.screen.width / 2; // Center horizontally
    this.model.y = this.app.screen.height / 1.5; // Slightly below center
  }

  /**
   * Patch internal model parameters (snake_case to UPPER_CASE)
   * This fixes parameter naming issues with the Live2D model
   */
  _patchInternalModel(internalModel) {
    for (const prop of Object.keys(internalModel)) {
      if (prop.startsWith("idParam")) {
        internalModel[prop] = this._snakeCase(
          internalModel[prop],
        ).toUpperCase();
      }
    }
  }

  /**
   * Convert string to snake_case
   */
  _snakeCase(str) {
    return str
      .replace(/([a-z])([A-Z])/g, "$1_$2")
      .replace(/[\s-]+/g, "_")
      .toLowerCase();
  }

  /**
   * Cleanup method
   */
  destroy() {
    if (this.app) {
      this.app.destroy(true, {
        children: true,
        texture: true,
        baseTexture: true,
      });
      this.app = null;
    }
    this.model = null;
  }
}

export { Live2DLoader };
