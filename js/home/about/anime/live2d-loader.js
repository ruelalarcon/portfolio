/**
 * Live2D Model Loader
 * Loads and manages the Live2D anime girl model using PixiJS and pixi-live2d-display
 */

import { preloader } from "./preloader.js";
import { CascadiaASCIIFilter } from "./ascii-filter.js";
import { focusManager } from "../../../core/focus-manager.js";

class Live2DLoader {
  constructor() {
    this.app = null;
    this.model = null;
    this.hasFocus = false;
    this.focusId = null;
    this.canvas = null;
  }

  /**
   * Initialize PixiJS application and load Live2D model
   * @param {HTMLElement} container - Container element for the canvas
   */
  async init(container) {
    if (!container) return;

    // Create TUI pane wrapper with border
    const tuiPane = document.createElement("div");
    tuiPane.className = "tui-pane";

    const borderTop = document.createElement("div");
    borderTop.className = "tui-pane__border-top";

    const title = document.createElement("span");
    title.className = "tui-pane__title";
    title.textContent = "anime girl :3";

    borderTop.appendChild(title);

    const content = document.createElement("div");
    content.className = "tui-pane__content tui-pane__content--live2d";
    content.style.padding = "0"; // No padding for canvas

    tuiPane.appendChild(borderTop);
    tuiPane.appendChild(content);
    container.appendChild(tuiPane);

    // Create canvas element inside TUI pane content
    const canvas = document.createElement("canvas");
    canvas.id = "live2DCanvas";
    content.appendChild(canvas);
    this.canvas = canvas; // Store reference for focus manager

    // Initialize PixiJS application (resize to content div, not container)
    this.app = new PIXI.Application({
      view: canvas,
      autoStart: true,
      resizeTo: content,
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

    // Apply ASCII filter with Cascadia Code font
    const asciiFilter = new CascadiaASCIIFilter(12); // 12px cell size
    this.model.filters = [asciiFilter];

    // Register with focus manager
    this.focusId = `live2d-loader-${Date.now()}-${Math.random()}`;
    focusManager.register(this.focusId, this.canvas, (hasFocus) => {
      this._onFocusChange(hasFocus);
    });

    // Start with focus initially
    this.hasFocus = true;
  }

  /**
   * Handle focus change from FocusManager
   * @param {boolean} hasFocus - Whether this loader now has focus
   */
  _onFocusChange(hasFocus) {
    this.hasFocus = hasFocus;

    if (this.app) {
      if (hasFocus) {
        // Resume PixiJS ticker when gaining focus
        this.app.ticker.start();
      } else {
        // Pause PixiJS ticker when losing focus
        this.app.ticker.stop();
      }
    }
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
    // Unregister from focus manager
    if (this.focusId) {
      focusManager.unregister(this.focusId);
      this.focusId = null;
    }

    if (this.app) {
      this.app.destroy(true, {
        children: true,
        texture: true,
        baseTexture: true,
      });
      this.app = null;
    }
    this.model = null;
    this.canvas = null;
  }
}

export { Live2DLoader };
