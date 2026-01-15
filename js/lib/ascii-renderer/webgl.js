/**
 * WebGL-based character grid renderer
 * General-purpose module for rendering colored character grids with transformations
 */

import { focusManager } from "../../core/focus-manager.js";

export class WebGLASCIIRenderer {
  constructor(gridWidth, gridHeight, options = {}) {
    // Grid dimensions
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
    this.totalCells = gridWidth * gridHeight;

    // Configuration
    if (!options.charSet) {
      throw new Error("WebGLASCIIRenderer requires a charSet in options");
    }

    this.charSet = options.charSet;
    this.font = options.font || "'Cascadia Code', monospace";
    this.textureFontSize = options.textureFontSize || 48;
    this.displayFontSize = options.displayFontSize || 12;
    this.enableTextSelection = options.enableTextSelection !== false;
    this.enableFocusOptimization = options.enableFocusOptimization !== false; // Default: enabled

    // WebGL state
    this.gl = null;
    this.glCanvas = null;
    this.charTexture = null;
    this.program = null;
    this.buffers = null;
    this.charWidth = 0;
    this.charHeight = 0;
    this.displayCharWidth = 0;
    this.displayCharHeight = 0;

    // Character map for quick lookups
    this.charToIndex = new Map();
    for (let i = 0; i < this.charSet.length; i++) {
      this.charToIndex.set(this.charSet[i], i);
    }

    // Text selection state
    this.selectionOverlay = null;
    this.isSelecting = false;
    this.selectionStart = null;
    this.selectionEnd = null;
    this.currentChars = null;

    // Focus optimization state
    this.hasFocus = false;
    this.focusId = null;
    this.pendingFrameData = null; // Store frame data when sleeping
  }

  /**
   * Initialize WebGL canvas and rendering context
   * @param {HTMLElement} container - Element to append the canvas to
   * @returns {Object} Character dimensions and canvas reference
   */
  async init(container) {
    // Wait for fonts to load
    await document.fonts.ready;

    // Measure character dimensions using actual DOM rendering (same method as DOMASCIIRenderer)
    // This ensures 1:1 sizing between both renderers
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

    // Calculate texture dimensions by scaling up from display dimensions
    this.charWidth = Math.ceil(
      (this.displayCharWidth * this.textureFontSize) / this.displayFontSize,
    );
    this.charHeight = Math.ceil(
      (this.displayCharHeight * this.textureFontSize) / this.displayFontSize,
    );

    // Create WebGL canvas
    this.glCanvas = document.createElement("canvas");
    this.glCanvas.width = this.gridWidth * this.charWidth;
    this.glCanvas.height = this.gridHeight * this.charHeight;
    this.glCanvas.style.width = `${this.gridWidth * this.displayCharWidth}px`;
    this.glCanvas.style.height = `${this.gridHeight * this.displayCharHeight}px`;
    this.glCanvas.style.imageRendering = "auto";

    // Setup container
    container.innerHTML = "";

    // Create wrapper for canvas + overlay positioning
    const canvasWrapper = document.createElement("div");
    canvasWrapper.style.position = "relative";
    canvasWrapper.style.display = "inline-block";

    canvasWrapper.appendChild(this.glCanvas);
    container.appendChild(canvasWrapper);

    // Initialize WebGL
    this.gl = this.glCanvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: false,
    });

    if (!this.gl) {
      throw new Error("WebGL not supported");
    }

    await this._initWebGL();

    // Optional text selection
    if (this.enableTextSelection) {
      this._initTextSelection(container);
    }

    // Register with focus manager if optimization is enabled
    if (this.enableFocusOptimization) {
      this.focusId = `webgl-renderer-${Date.now()}-${Math.random()}`;
      focusManager.register(this.focusId, this.glCanvas, (hasFocus) => {
        this._onFocusChange(hasFocus);
      });
      // Start with focus initially
      this.hasFocus = true;
    } else {
      // Always have focus if optimization is disabled
      this.hasFocus = true;
    }

    return {
      canvas: this.glCanvas,
      displayCharWidth: this.displayCharWidth,
      displayCharHeight: this.displayCharHeight,
      charWidth: this.charWidth,
      charHeight: this.charHeight,
    };
  }

  async _initWebGL() {
    const gl = this.gl;

    // Create character texture atlas
    this._createCharTexture();

    // Vertex shader with transformation support
    const vsSource = `
      attribute vec2 aPosition;
      attribute vec2 aTexCoord;
      attribute vec3 aColor;
      attribute float aCharIndex;
      attribute vec2 aScale;
      attribute vec2 aOffset;
      attribute vec2 aCenter;

      varying vec2 vTexCoord;
      varying vec3 vColor;
      varying float vCharIndex;

      void main() {
        // Apply scale relative to character center, then offset
        vec2 localPos = aPosition - aCenter;
        vec2 scaledPos = localPos * aScale;
        vec2 finalPos = scaledPos + aCenter + aOffset;
        gl_Position = vec4(finalPos, 0.0, 1.0);
        vTexCoord = aTexCoord;
        vColor = aColor;
        vCharIndex = aCharIndex;
      }
    `;

    // Fragment shader
    const fsSource = `
      precision mediump float;

      varying vec2 vTexCoord;
      varying vec3 vColor;
      varying float vCharIndex;

      uniform sampler2D uCharTexture;
      uniform float uAtlasCols;
      uniform float uAtlasRows;

      void main() {
        // Calculate atlas coordinates
        float charX = mod(vCharIndex, uAtlasCols);
        float charY = floor(vCharIndex / uAtlasCols);

        vec2 atlasCoord = vec2(
          (charX + vTexCoord.x) / uAtlasCols,
          (charY + vTexCoord.y) / uAtlasRows
        );

        float alpha = texture2D(uCharTexture, atlasCoord).r;
        if (alpha < 0.1) discard;

        gl_FragColor = vec4(vColor, 1.0);
      }
    `;

    // Compile and link shaders
    const vertexShader = this._createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = this._createShader(gl, gl.FRAGMENT_SHADER, fsSource);

    this.program = gl.createProgram();
    gl.attachShader(this.program, vertexShader);
    gl.attachShader(this.program, fragmentShader);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      throw new Error(
        "Program link error: " + gl.getProgramInfoLog(this.program),
      );
    }

    gl.useProgram(this.program);

    // Set uniform values
    const atlasColsLoc = gl.getUniformLocation(this.program, "uAtlasCols");
    const atlasRowsLoc = gl.getUniformLocation(this.program, "uAtlasRows");
    const atlasCols = 16;
    const atlasRows = Math.ceil(this.charSet.length / atlasCols);
    gl.uniform1f(atlasColsLoc, atlasCols);
    gl.uniform1f(atlasRowsLoc, atlasRows);

    // Setup buffers
    this._setupBuffers();

    // Get background color from document body
    const bgColor = getComputedStyle(document.body).backgroundColor;
    const rgb = bgColor.match(/\d+/g).map((n) => parseInt(n) / 255);
    gl.clearColor(rgb[0], rgb[1], rgb[2], 1.0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  _createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error("Shader compile error: " + error);
    }

    return shader;
  }

  _createCharTexture() {
    const gl = this.gl;
    const atlasCols = 16;
    const atlasRows = Math.ceil(this.charSet.length / atlasCols);

    // Create canvas for character atlas
    const charCanvas = document.createElement("canvas");
    charCanvas.width = this.charWidth * atlasCols;
    charCanvas.height = this.charHeight * atlasRows;
    const ctx = charCanvas.getContext("2d");

    // Background from document body
    const bgColor = getComputedStyle(document.body).backgroundColor;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, charCanvas.width, charCanvas.height);

    // Render characters
    ctx.fillStyle = "white";
    ctx.font = `${this.textureFontSize}px ${this.font}`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    for (let i = 0; i < this.charSet.length; i++) {
      const x = (i % atlasCols) * this.charWidth;
      const y = Math.floor(i / atlasCols) * this.charHeight;
      ctx.fillText(this.charSet[i], x, y);
    }

    // Create WebGL texture
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.LUMINANCE,
      gl.LUMINANCE,
      gl.UNSIGNED_BYTE,
      charCanvas,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.charTexture = texture;
  }

  _setupBuffers() {
    const gl = this.gl;

    this.buffers = {
      position: gl.createBuffer(),
      texCoord: gl.createBuffer(),
      color: gl.createBuffer(),
      charIndex: gl.createBuffer(),
      scale: gl.createBuffer(),
      offset: gl.createBuffer(),
      center: gl.createBuffer(),
      indices: gl.createBuffer(),
    };

    // Generate static geometry for all character quads
    const positions = new Float32Array(this.totalCells * 8);
    const texCoords = new Float32Array(this.totalCells * 8);
    const centers = new Float32Array(this.totalCells * 8);
    const indices = new Uint16Array(this.totalCells * 6);

    const cellWidth = 2.0 / this.gridWidth;
    const cellHeight = 2.0 / this.gridHeight;

    for (let i = 0; i < this.totalCells; i++) {
      const x = i % this.gridWidth;
      const y = Math.floor(i / this.gridWidth);

      const px = -1.0 + x * cellWidth;
      const py = 1.0 - y * cellHeight;

      const vi = i * 8;
      // Quad vertices
      const halfW = cellWidth / 2;
      const halfH = cellHeight / 2;
      const cx = px + halfW;
      const cy = py - halfH;

      positions[vi] = cx - halfW;
      positions[vi + 1] = cy + halfH;
      positions[vi + 2] = cx + halfW;
      positions[vi + 3] = cy + halfH;
      positions[vi + 4] = cx + halfW;
      positions[vi + 5] = cy - halfH;
      positions[vi + 6] = cx - halfW;
      positions[vi + 7] = cy - halfH;

      // Center position for each vertex (same for all 4 vertices of the quad)
      centers[vi] = cx;
      centers[vi + 1] = cy;
      centers[vi + 2] = cx;
      centers[vi + 3] = cy;
      centers[vi + 4] = cx;
      centers[vi + 5] = cy;
      centers[vi + 6] = cx;
      centers[vi + 7] = cy;

      // Texture coordinates
      texCoords[vi] = 0;
      texCoords[vi + 1] = 0;
      texCoords[vi + 2] = 1;
      texCoords[vi + 3] = 0;
      texCoords[vi + 4] = 1;
      texCoords[vi + 5] = 1;
      texCoords[vi + 6] = 0;
      texCoords[vi + 7] = 1;

      // Indices
      const ii = i * 6;
      const base = i * 4;
      indices[ii] = base;
      indices[ii + 1] = base + 1;
      indices[ii + 2] = base + 2;
      indices[ii + 3] = base;
      indices[ii + 4] = base + 2;
      indices[ii + 5] = base + 3;
    }

    // Upload static data
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.texCoord);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.center);
    gl.bufferData(gl.ARRAY_BUFFER, centers, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    // Allocate dynamic buffers (4 vertices per cell)
    const vertexCount = this.totalCells * 4;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.color);
    gl.bufferData(gl.ARRAY_BUFFER, vertexCount * 3 * 4, gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.charIndex);
    gl.bufferData(gl.ARRAY_BUFFER, vertexCount * 4, gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.scale);
    gl.bufferData(gl.ARRAY_BUFFER, vertexCount * 2 * 4, gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.offset);
    gl.bufferData(gl.ARRAY_BUFFER, vertexCount * 2 * 4, gl.DYNAMIC_DRAW);
  }

  /**
   * Handle focus change from FocusManager
   * @param {boolean} hasFocus - Whether this renderer now has focus
   */
  _onFocusChange(hasFocus) {
    const wasAsleep = !this.hasFocus;
    this.hasFocus = hasFocus;

    // If waking up and we have pending frame data, render it
    if (wasAsleep && hasFocus && this.pendingFrameData) {
      this._renderFrame(this.pendingFrameData);
      this.pendingFrameData = null;
    }
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
   * @param {number} [frameData.transforms[].offsetX] - X offset in clip space (default: 0)
   * @param {number} [frameData.transforms[].offsetY] - Y offset in clip space (default: 0)
   */
  render(frameData) {
    // If we don't have focus, store the frame data and skip rendering
    if (!this.hasFocus) {
      this.pendingFrameData = frameData;
      return;
    }

    // Render immediately if we have focus
    this._renderFrame(frameData);
  }

  /**
   * Internal render method that actually performs WebGL rendering
   * @param {Object} frameData - Frame data
   */
  _renderFrame(frameData) {
    const gl = this.gl;
    const { chars, colors, transforms } = frameData;

    if (chars.length !== this.totalCells || colors.length !== this.totalCells) {
      throw new Error(
        `Expected ${this.totalCells} chars and colors, got ${chars.length} and ${colors.length}`,
      );
    }

    // Store current frame for text selection
    if (this.enableTextSelection) {
      this.currentChars = chars;
    }

    // Prepare data arrays
    const vertexCount = this.totalCells * 4;
    const colorData = new Float32Array(vertexCount * 3);
    const charIndexData = new Float32Array(vertexCount);
    const scaleData = new Float32Array(vertexCount * 2);
    const offsetData = new Float32Array(vertexCount * 2);

    for (let i = 0; i < this.totalCells; i++) {
      const char = chars[i];
      const color = colors[i];
      const transform = transforms?.[i] || {};

      // Get character index
      const charIdx = this.charToIndex.get(char) || 0;

      // Extract transformation values
      const scale = transform.scale || 1.0;
      const scaleX = transform.scaleX !== undefined ? transform.scaleX : scale;
      const scaleY = transform.scaleY !== undefined ? transform.scaleY : scale;
      const offsetX = transform.offsetX || 0;
      const offsetY = transform.offsetY || 0;

      // Set data for all 4 vertices of this quad
      for (let v = 0; v < 4; v++) {
        const vi = i * 4 + v;

        // Color
        colorData[vi * 3] = color[0];
        colorData[vi * 3 + 1] = color[1];
        colorData[vi * 3 + 2] = color[2];

        // Character index
        charIndexData[vi] = charIdx;

        // Scale
        scaleData[vi * 2] = scaleX;
        scaleData[vi * 2 + 1] = scaleY;

        // Offset
        offsetData[vi * 2] = offsetX;
        offsetData[vi * 2 + 1] = offsetY;
      }
    }

    // Update buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.color);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, colorData);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.charIndex);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, charIndexData);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.scale);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, scaleData);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.offset);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, offsetData);

    // Set up attributes
    const posLoc = gl.getAttribLocation(this.program, "aPosition");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const texCoordLoc = gl.getAttribLocation(this.program, "aTexCoord");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.texCoord);
    gl.enableVertexAttribArray(texCoordLoc);
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);

    const colorLoc = gl.getAttribLocation(this.program, "aColor");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.color);
    gl.enableVertexAttribArray(colorLoc);
    gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, 0, 0);

    const charIndexLoc = gl.getAttribLocation(this.program, "aCharIndex");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.charIndex);
    gl.enableVertexAttribArray(charIndexLoc);
    gl.vertexAttribPointer(charIndexLoc, 1, gl.FLOAT, false, 0, 0);

    const scaleLoc = gl.getAttribLocation(this.program, "aScale");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.scale);
    gl.enableVertexAttribArray(scaleLoc);
    gl.vertexAttribPointer(scaleLoc, 2, gl.FLOAT, false, 0, 0);

    const offsetLoc = gl.getAttribLocation(this.program, "aOffset");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.offset);
    gl.enableVertexAttribArray(offsetLoc);
    gl.vertexAttribPointer(offsetLoc, 2, gl.FLOAT, false, 0, 0);

    const centerLoc = gl.getAttribLocation(this.program, "aCenter");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.center);
    gl.enableVertexAttribArray(centerLoc);
    gl.vertexAttribPointer(centerLoc, 2, gl.FLOAT, false, 0, 0);

    // Draw
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.indices);
    gl.drawElements(gl.TRIANGLES, this.totalCells * 6, gl.UNSIGNED_SHORT, 0);

    // Update selection overlay if active
    if (this.enableTextSelection && this.selectionStart && this.selectionEnd) {
      this._renderSelection();
    }
  }

  /**
   * Initialize text selection overlay and event handlers
   * @param {HTMLElement} container - Container element for the overlay
   */
  _initTextSelection(container) {
    // Create selection overlay
    this.selectionOverlay = document.createElement("canvas");
    this.selectionOverlay.width = this.glCanvas.width;
    this.selectionOverlay.height = this.glCanvas.height;
    this.selectionOverlay.style.position = "absolute";
    this.selectionOverlay.style.top = "0";
    this.selectionOverlay.style.left = "0";
    this.selectionOverlay.style.width = this.glCanvas.style.width;
    this.selectionOverlay.style.height = this.glCanvas.style.height;
    this.selectionOverlay.style.pointerEvents = "none";

    // Append to the canvas wrapper (parent of glCanvas)
    this.glCanvas.parentElement.appendChild(this.selectionOverlay);

    this._setupSelectionHandlers();
  }

  _setupSelectionHandlers() {
    const getCharCoords = (clientX, clientY) => {
      const rect = this.selectionOverlay.getBoundingClientRect();
      const x = Math.floor((clientX - rect.left) / this.displayCharWidth);
      const y = Math.floor((clientY - rect.top) / this.displayCharHeight);
      return {
        x: Math.max(0, Math.min(x, this.gridWidth - 1)),
        y: Math.max(0, Math.min(y, this.gridHeight - 1)),
        index: y * this.gridWidth + x,
      };
    };

    const clearSelection = () => {
      this.selectionStart = null;
      this.selectionEnd = null;
      const ctx = this.selectionOverlay.getContext("2d");
      ctx.clearRect(
        0,
        0,
        this.selectionOverlay.width,
        this.selectionOverlay.height,
      );
    };

    let hasMoved = false;

    const onMouseMove = (e) => {
      if (this.isSelecting) {
        hasMoved = true;
        this.selectionEnd = getCharCoords(e.clientX, e.clientY);
        this._renderSelection();
      }
    };

    const onMouseUp = () => {
      if (this.isSelecting) {
        this.isSelecting = false;

        if (!hasMoved) {
          clearSelection();
        }

        hasMoved = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      }
    };

    const onMouseDown = (e) => {
      this.isSelecting = true;
      hasMoved = false;
      this.selectionStart = getCharCoords(e.clientX, e.clientY);
      this.selectionEnd = null;

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);

      if (this.glCanvas && this.glCanvas.contains(e.target)) {
        e.preventDefault();
      }
    };

    const onCopy = (e) => {
      // Only intercept copy if we have an active selection in this renderer
      if (
        this.selectionStart &&
        this.selectionEnd &&
        this.currentChars &&
        this.selectionStart.index !== this.selectionEnd.index
      ) {
        e.preventDefault();
        const text = this._getSelectedText();
        e.clipboardData.setData("text/plain", text);
      }
      // Otherwise, let the browser handle the copy event normally
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("copy", onCopy);
  }

  _renderSelection() {
    const ctx = this.selectionOverlay.getContext("2d");
    ctx.clearRect(
      0,
      0,
      this.selectionOverlay.width,
      this.selectionOverlay.height,
    );

    if (!this.selectionStart || !this.selectionEnd || !this.currentChars)
      return;

    const start = Math.min(this.selectionStart.index, this.selectionEnd.index);
    const end = Math.max(this.selectionStart.index, this.selectionEnd.index);

    // Windows selection style
    ctx.fillStyle = "#0236a0";

    for (let i = start; i <= end; i++) {
      const x = (i % this.gridWidth) * this.charWidth;
      const y = Math.floor(i / this.gridWidth) * this.charHeight;
      ctx.fillRect(x, y, this.charWidth, this.charHeight);
    }

    // Draw white text over selection
    ctx.fillStyle = "white";
    ctx.font = `${this.textureFontSize}px ${this.font}`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    for (let i = start; i <= end; i++) {
      const char = this.currentChars[i];
      const x = (i % this.gridWidth) * this.charWidth;
      const y = Math.floor(i / this.gridWidth) * this.charHeight;
      ctx.fillText(char, x, y);
    }
  }

  _getSelectedText() {
    if (!this.currentChars || !this.selectionStart || !this.selectionEnd)
      return "";

    const start = Math.min(this.selectionStart.index, this.selectionEnd.index);
    const end = Math.max(this.selectionStart.index, this.selectionEnd.index);

    let text = "";
    for (let i = start; i <= end; i++) {
      const x = i % this.gridWidth;
      const char = this.currentChars[i];
      // Skip undefined characters (shouldn't happen, but safety check)
      if (char !== undefined) {
        text += char;
      }
      if (x === this.gridWidth - 1 && i < end) {
        text += "\n";
      }
    }

    return text;
  }

  /**
   * Get the canvas element
   * @returns {HTMLCanvasElement}
   */
  getCanvas() {
    return this.glCanvas;
  }

  /**
   * Get character and grid dimensions
   * @returns {Object}
   */
  getDimensions() {
    return {
      gridWidth: this.gridWidth,
      gridHeight: this.gridHeight,
      charWidth: this.charWidth,
      charHeight: this.charHeight,
      displayCharWidth: this.displayCharWidth,
      displayCharHeight: this.displayCharHeight,
    };
  }

  /**
   * Cleanup method - unregister from focus manager
   */
  destroy() {
    if (this.enableFocusOptimization && this.focusId) {
      focusManager.unregister(this.focusId);
      this.focusId = null;
    }
  }
}
