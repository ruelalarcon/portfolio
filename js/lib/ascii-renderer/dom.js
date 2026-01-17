/**
 * DOM-based character grid renderer
 * Renders colored character grids using DOM elements with optional transformations
 * Provides the same API as WebGLASCIIRenderer but uses span elements
 */

import { focusManager } from "../../core/focus-manager.js";

export class DOMASCIIRenderer {
  constructor(gridWidth, gridHeight, options = {}) {
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
    this.totalCells = gridWidth * gridHeight;

    if (!options.charSet) {
      throw new Error("DOMASCIIRenderer requires a charSet in options");
    }

    this.charSet = options.charSet;
    this.font = options.font || "'Cascadia Code', monospace";
    this.displayFontSize = options.displayFontSize || 12;
    this.enableTextSelection = options.enableTextSelection !== false;
    this.enableFocusOptimization = options.enableFocusOptimization !== false;

    this.container = null;
    this.charElements = [];
    this.displayCharWidth = 0;
    this.displayCharHeight = 0;

    this.hasFocus = false;
    this.focusId = null;
    this.pendingFrameData = null;
  }

  /**
   * Initialize DOM canvas and rendering context
   * @param {HTMLElement} container - Element to append the character grid to
   * @returns {Object} Character dimensions and canvas reference
   */
  async init(container) {
    await document.fonts.ready;

    const measureSpan = document.createElement("span");
    measureSpan.style.font = `${this.displayFontSize}px ${this.font}`;
    measureSpan.style.lineHeight = "1";
    measureSpan.style.position = "absolute";
    measureSpan.style.visibility = "hidden";
    measureSpan.textContent = "@";
    document.body.appendChild(measureSpan);

    const rect = measureSpan.getBoundingClientRect();
    this.displayCharWidth = rect.width;
    this.displayCharHeight = rect.height;
    document.body.removeChild(measureSpan);

    this.container = container;
    container.innerHTML = "";
    container.style.position = "relative";
    container.style.fontFamily = this.font;
    container.style.fontSize = `${this.displayFontSize}px`;
    container.style.lineHeight = "1";
    container.style.whiteSpace = "pre";
    container.style.userSelect = this.enableTextSelection ? "text" : "none";
    container.style.cursor = this.enableTextSelection ? "text" : "default";

    this._createCharElements();

    if (this.enableFocusOptimization) {
      this.focusId = `dom-renderer-${Date.now()}-${Math.random()}`;
      focusManager.register(this.focusId, this.container, (hasFocus) => {
        this._onFocusChange(hasFocus);
      });
      this.hasFocus = true;
    } else {
      this.hasFocus = true;
    }

    return {
      canvas: this.container,
      displayCharWidth: this.displayCharWidth,
      displayCharHeight: this.displayCharHeight,
      charWidth: this.displayCharWidth,
      charHeight: this.displayCharHeight,
    };
  }

  _createCharElements() {
    let output = "";
    let charIndex = 0;

    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        output += `<span class="char" data-idx="${charIndex}" style="color: rgb(255, 255, 255);"> </span>`;
        charIndex++;
      }
      if (y < this.gridHeight - 1) output += "\n";
    }

    this.container.innerHTML = output;

    this.charElements = Array.from(this.container.querySelectorAll("span"));

    this.charCache = new Array(this.totalCells);
    this.colorCache = new Array(this.totalCells);
    this.transformCache = new Array(this.totalCells);

    for (let i = 0; i < this.totalCells; i++) {
      this.charCache[i] = " ";
      this.colorCache[i] = "rgb(255, 255, 255)";
      this.transformCache[i] = null;
    }
  }

  _onFocusChange(hasFocus) {
    const wasAsleep = !this.hasFocus;
    this.hasFocus = hasFocus;

    if (wasAsleep && hasFocus && this.pendingFrameData) {
      this._renderFrame(this.pendingFrameData);
      this.pendingFrameData = null;
    }
  }

  /**
   * Render the character grid
   * @param {Object} frameData - Frame data with characters, colors, and optional transforms
   * @param {Array<string>} frameData.chars - Characters for each cell
   * @param {Array<Array<number>>} frameData.colors - RGB colors (0-1 range)
   * @param {Array<Object>} frameData.transforms - Optional per-cell transforms
   */
  render(frameData) {
    if (!this.hasFocus) {
      this.pendingFrameData = frameData;
      return;
    }

    this._renderFrame(frameData);
  }

  _renderFrame(frameData) {
    const { chars, colors, transforms } = frameData;

    if (chars.length !== this.totalCells || colors.length !== this.totalCells) {
      throw new Error(
        `Expected ${this.totalCells} chars and colors, got ${chars.length} and ${colors.length}`,
      );
    }

    for (let i = 0; i < this.totalCells; i++) {
      const element = this.charElements[i];
      if (!element) continue;

      const char = chars[i];
      const color = colors[i];
      const transform = transforms?.[i];

      const displayChar = char === " " ? "\u00A0" : char;

      const r = Math.round(color[0] * 255);
      const g = Math.round(color[1] * 255);
      const b = Math.round(color[2] * 255);
      const colorStr = `rgb(${r}, ${g}, ${b})`;

      let transformStr = null;
      if (transform) {
        const scale = transform.scale || 1.0;
        const scaleX =
          transform.scaleX !== undefined ? transform.scaleX : scale;
        const scaleY =
          transform.scaleY !== undefined ? transform.scaleY : scale;
        const offsetX = transform.offsetX || 0;
        const offsetY = transform.offsetY || 0;
        transformStr = `translate(${offsetX}px, ${offsetY}px) scale(${scaleX}, ${scaleY})`;
      }

      const charChanged = this.charCache[i] !== displayChar;
      const colorChanged = this.colorCache[i] !== colorStr;
      const transformChanged = this.transformCache[i] !== transformStr;

      if (charChanged || colorChanged || transformChanged) {
        if (charChanged) {
          element.textContent = displayChar;
          this.charCache[i] = displayChar;
        }

        if (colorChanged || transformChanged) {
          let cssText = `color: ${colorStr};`;

          if (transformStr) {
            cssText += ` transform: ${transformStr}; transform-origin: center center;`;
          }

          element.style.cssText = cssText;
          this.colorCache[i] = colorStr;
          this.transformCache[i] = transformStr;
        }
      }
    }
  }

  getCanvas() {
    return this.container;
  }

  getDimensions() {
    return {
      gridWidth: this.gridWidth,
      gridHeight: this.gridHeight,
      charWidth: this.displayCharWidth,
      charHeight: this.displayCharHeight,
      displayCharWidth: this.displayCharWidth,
      displayCharHeight: this.displayCharHeight,
    };
  }

  destroy() {
    if (this.enableFocusOptimization && this.focusId) {
      focusManager.unregister(this.focusId);
      this.focusId = null;
    }
  }
}
