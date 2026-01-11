/**
 * DOM-based character grid renderer
 * General-purpose module for rendering colored character grids with transformations
 * Provides the same API as WebGLASCIIRenderer but uses DOM elements
 * No external dependencies
 */

export class DOMASCIIRenderer {
  constructor(gridWidth, gridHeight, options = {}) {
    // Grid dimensions
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
    this.totalCells = gridWidth * gridHeight;

    // Configuration
    if (!options.charSet) {
      throw new Error("DOMASCIIRenderer requires a charSet in options");
    }

    this.charSet = options.charSet;
    this.font = options.font || "'Cascadia Code', monospace";
    this.displayFontSize = options.displayFontSize || 12;
    this.backgroundColor = options.backgroundColor || null;
    this.enableTextSelection = options.enableTextSelection !== false;

    // DOM state
    this.container = null;
    this.charElements = [];
    this.displayCharWidth = 0;
    this.displayCharHeight = 0;
  }

  /**
   * Initialize DOM canvas and rendering context
   * @param {HTMLElement} container - Element to append the character grid to
   * @returns {Object} Character dimensions and canvas reference
   */
  async init(container) {
    // Wait for fonts to load
    await document.fonts.ready;

    // Measure character dimensions
    const measureSpan = document.createElement("span");
    measureSpan.style.font = `${this.displayFontSize}px ${this.font}`;
    measureSpan.style.position = "absolute";
    measureSpan.style.visibility = "hidden";
    measureSpan.textContent = "@";
    document.body.appendChild(measureSpan);

    const rect = measureSpan.getBoundingClientRect();
    this.displayCharWidth = rect.width;
    this.displayCharHeight = rect.height;
    document.body.removeChild(measureSpan);

    // Setup container
    this.container = container;
    container.innerHTML = "";
    container.style.position = "relative";
    container.style.fontFamily = this.font;
    container.style.fontSize = `${this.displayFontSize}px`;
    container.style.lineHeight = "1";
    container.style.whiteSpace = "pre";
    container.style.userSelect = this.enableTextSelection ? "text" : "none";
    container.style.cursor = this.enableTextSelection ? "text" : "default";

    if (this.backgroundColor) {
      container.style.backgroundColor = this.backgroundColor;
    }

    // Create character grid
    this._createCharElements();

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

    // Cache all span elements
    this.charElements = Array.from(this.container.querySelectorAll("span"));
  }

  /**
   * Render the character grid
   * @param {Object} frameData - Frame data with characters, colors, and optional transformations
   * @param {Array<string>} frameData.chars - Characters for each cell (length = gridWidth * gridHeight)
   * @param {Array<Array<number>>} frameData.colors - RGB colors for each cell [[r,g,b], ...] (0-1 range)
   * @param {Array<Object>} [frameData.transforms] - Optional transformations per cell
   * @param {number} [frameData.transforms[].scale] - Uniform scale factor (default: 1.0)
   * @param {number} [frameData.transforms[].scaleX] - X scale factor (default: 1.0)
   * @param {number} [frameData.transforms[].scaleY] - Y scale factor (default: 1.0)
   * @param {number} [frameData.transforms[].offsetX] - X offset in pixels (default: 0)
   * @param {number} [frameData.transforms[].offsetY] - Y offset in pixels (default: 0)
   */
  render(frameData) {
    const { chars, colors, transforms } = frameData;

    if (chars.length !== this.totalCells || colors.length !== this.totalCells) {
      throw new Error(
        `Expected ${this.totalCells} chars and colors, got ${chars.length} and ${colors.length}`,
      );
    }

    // Update each character element
    for (let i = 0; i < this.totalCells; i++) {
      const element = this.charElements[i];
      if (!element) continue;

      const char = chars[i];
      const color = colors[i];
      const transform = transforms?.[i] || {};

      // Update character
      const displayChar = char === " " ? "\u00A0" : char;
      if (element.textContent !== displayChar) {
        element.textContent = displayChar;
      }

      // Update color
      const r = Math.round(color[0] * 255);
      const g = Math.round(color[1] * 255);
      const b = Math.round(color[2] * 255);
      const colorStr = `rgb(${r}, ${g}, ${b})`;
      if (element.style.color !== colorStr) {
        element.style.color = colorStr;
      }

      // Update transformations
      if (transforms && transforms[i]) {
        const scale = transform.scale || 1.0;
        const scaleX =
          transform.scaleX !== undefined ? transform.scaleX : scale;
        const scaleY =
          transform.scaleY !== undefined ? transform.scaleY : scale;
        const offsetX = transform.offsetX || 0;
        const offsetY = transform.offsetY || 0;

        const transformStr = `translate(${offsetX}px, ${offsetY}px) scale(${scaleX}, ${scaleY})`;
        if (element.style.transform !== transformStr) {
          element.style.transform = transformStr;
          element.style.transformOrigin = "center center";
        }
      } else if (element.style.transform) {
        element.style.transform = "";
      }
    }
  }

  /**
   * Get the canvas element (returns container for DOM renderer)
   * @returns {HTMLElement}
   */
  getCanvas() {
    return this.container;
  }

  /**
   * Get character and grid dimensions
   * @returns {Object}
   */
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
}
