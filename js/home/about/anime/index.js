/**
 * Anime Animation
 * Loads and manages a Live2D model with ASCII filter effect using PixiJS
 */

import { Live2DPreloader } from "../../../lib/preloader/live2d.js";
import { CascadiaASCIIFilter } from "./filter.js";
import { focusManager } from "../../../core/focus-manager.js";
import { resizeManager } from "../../../core/resize-manager.js";

const MODEL_URL =
  "https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E5%B0%91%E5%A5%B3%E5%92%96%E5%95%A1%E6%9E%AA%20girls%20cafe%20gun/girl03/l2d04.u/l2d04.u.model3.json";

const preloader = new Live2DPreloader(MODEL_URL);

/**
 * Start preloading the Live2D model assets
 * Should be called early in the page lifecycle
 */
function preload() {
  preloader.modifyModelData((json) => {
    json.FileReferences.Motions["Idle"] = [
      { File: "motions/Mgirl03_stand_c.motion3.json" },
    ];
  });
  return preloader.preload();
}

class AnimeAnimation {
  constructor() {
    this.app = null;
    this.model = null;
    this.container = null;
    this.tuiPane = null;
    this.canvas = null;

    this.hasFocus = false;
    this.focusId = null;
    this.mobileListenerId = null;
  }

  async init(container) {
    if (!container) return;
    this.container = container;

    await this._initializePixiApp();
    this._attachFocusManager();

    this.mobileListenerId = resizeManager.register(() =>
      this._handleMobileChange(),
    );
  }

  async _initializePixiApp() {
    if (this.tuiPane) {
      this.tuiPane.remove();
    }

    this.tuiPane = document.createElement("div");
    this.tuiPane.className = "tui-pane";

    const borderTop = document.createElement("div");
    borderTop.className = "tui-pane__border-top";

    const title = document.createElement("span");
    title.className = "tui-pane__title";
    title.textContent = "ジュノ·エモンズ";

    borderTop.appendChild(title);

    const content = document.createElement("div");
    content.className = "tui-pane__content tui-pane__content--live2d";
    content.style.padding = "0";

    this.tuiPane.appendChild(borderTop);
    this.tuiPane.appendChild(content);
    this.container.appendChild(this.tuiPane);

    const canvas = document.createElement("canvas");
    canvas.id = "live2DCanvas";
    content.appendChild(canvas);
    this.canvas = canvas;

    if (this.app) {
      this.app.destroy(true, {
        children: true,
        texture: true,
        baseTexture: true,
      });
    }

    this.app = new PIXI.Application({
      view: canvas,
      autoStart: true,
      resizeTo: content,
      backgroundAlpha: 0,
      transparent: true,
    });

    let json = preloader.getModelData();
    if (!json) {
      console.log("Model not preloaded, waiting for preload...");
      json = await preloader.waitForPreload();
    } else {
      console.log("Using preloaded model data");
    }

    this.model = await PIXI.live2d.Live2DModel.from(json);

    this._patchInternalModel(this.model.internalModel);

    const asciiFilter = new CascadiaASCIIFilter(12);
    this.model.filters = [asciiFilter];

    this.app.stage.addChild(this.model);

    this.model.anchor.set(0.5, 0.5);
    this.model.scale.set(0.5);
    this.model.x = this.app.screen.width / 2;

    const isMobile = resizeManager.getIsMobile();
    this.model.y = this.app.screen.height / (isMobile ? 1.1 : 1.5);

    this.model.motion("Idle");
  }

  async _handleMobileChange() {
    if (this.focusId) {
      focusManager.unregister(this.focusId);
      this.focusId = null;
    }

    await this._initializePixiApp();
    this._attachFocusManager();
  }

  _attachFocusManager() {
    this.focusId = `anime-${Date.now()}-${Math.random()}`;
    focusManager.register(this.focusId, this.canvas, (hasFocus) => {
      this._onFocusChange(hasFocus);
    });

    this.hasFocus = true;
  }

  _onFocusChange(hasFocus) {
    this.hasFocus = hasFocus;

    if (this.app) {
      if (hasFocus) {
        this.app.ticker.start();
      } else {
        this.app.ticker.stop();
      }
    }
  }

  _patchInternalModel(internalModel) {
    for (const prop of Object.keys(internalModel)) {
      if (prop.startsWith("idParam")) {
        internalModel[prop] = this._snakeCase(
          internalModel[prop],
        ).toUpperCase();
      }
    }
  }

  _snakeCase(str) {
    return str
      .replace(/([a-z])([A-Z])/g, "$1_$2")
      .replace(/[\s-]+/g, "_")
      .toLowerCase();
  }

  destroy() {
    if (this.mobileListenerId !== null) {
      resizeManager.unregister(this.mobileListenerId);
      this.mobileListenerId = null;
    }

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
    this.tuiPane = null;
  }
}

export { AnimeAnimation, preload };
