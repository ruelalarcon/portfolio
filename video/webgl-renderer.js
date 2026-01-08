import { ASCII_CHARS } from "../js/constants.js";

/**
 * Handles WebGL rendering of ASCII characters
 */
export class WebGLRenderer {
  constructor(videoWidth, videoHeight) {
    this.videoWidth = videoWidth;
    this.videoHeight = videoHeight;
    this.gl = null;
    this.glCanvas = null;
    this.charTextures = null;
    this.program = null;
    this.buffers = null;
    this.charWidth = 0;
    this.charHeight = 0;
    this.currentFrame = null;
  }

  /**
   * Initialize WebGL canvas and rendering context
   * @param {HTMLElement} container - Element to append the canvas to
   * @returns {Object} Character dimensions for display
   */
  async init(container) {
    // Measure Cascadia Code character dimensions
    const measureCanvas = document.createElement("canvas");
    const measureCtx = measureCanvas.getContext("2d");
    const fontSize = 48;
    measureCtx.font = `${fontSize}px 'Cascadia Code', monospace`;
    const metrics = measureCtx.measureText("@");
    this.charWidth = Math.ceil(metrics.width);
    this.charHeight = Math.ceil(fontSize * 1.2);

    // Create WebGL canvas with high res textures
    this.glCanvas = document.createElement("canvas");
    this.glCanvas.width = this.videoWidth * this.charWidth;
    this.glCanvas.height = this.videoHeight * this.charHeight;

    // Display at smaller size (12px font equiv)
    const displayFontSize = 12;
    const displayCharWidth = Math.ceil(
      (this.charWidth * displayFontSize) / fontSize,
    );
    const displayCharHeight = Math.ceil(
      (this.charHeight * displayFontSize) / fontSize,
    );
    this.glCanvas.style.width = `${this.videoWidth * displayCharWidth}px`;
    this.glCanvas.style.height = `${this.videoHeight * displayCharHeight}px`;
    this.glCanvas.style.imageRendering = "auto";
    this.glCanvas.style.opacity = "0";
    this.glCanvas.style.transition = "opacity 0.5s ease-in-out";
    this.glCanvas.style.cursor = "text";

    // Clear and add WebGL canvas
    container.innerHTML = "";
    container.appendChild(this.glCanvas);

    this.gl = this.glCanvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: false,
    });

    if (!this.gl) {
      throw new Error("WebGL not supported");
    }

    await this._initWebGL();

    // Trigger fade-in animation
    requestAnimationFrame(() => {
      this.glCanvas.style.opacity = "1";
    });

    return {
      displayCharWidth,
      displayCharHeight,
    };
  }

  async _initWebGL() {
    const gl = this.gl;

    // Wait for fonts to load
    await document.fonts.ready;

    // Create character textures
    this._createCharTextures();

    // Vertex shader - positions and colors
    const vsSource = `
      attribute vec2 aPosition;
      attribute vec2 aTexCoord;
      attribute vec3 aColor;
      attribute float aCharIndex;

      varying vec2 vTexCoord;
      varying vec3 vColor;
      varying float vCharIndex;

      void main() {
        gl_Position = vec4(aPosition, 0.0, 1.0);
        vTexCoord = aTexCoord;
        vColor = aColor;
        vCharIndex = aCharIndex;
      }
    `;

    // Fragment shader - sample character texture
    const fsSource = `
      precision mediump float;

      varying vec2 vTexCoord;
      varying vec3 vColor;
      varying float vCharIndex;

      uniform sampler2D uCharTexture;

      void main() {
        // Calculate which character in the texture atlas
        float cols = 16.0;
        float charX = mod(vCharIndex, cols);
        float charY = floor(vCharIndex / cols);

        vec2 atlasCoord = vec2(
          (charX + vTexCoord.x) / cols,
          (charY + vTexCoord.y) / ceil(${ASCII_CHARS.length}.0 / cols)
        );

        float alpha = texture2D(uCharTexture, atlasCoord).r;
        if (alpha < 0.1) discard;

        gl_FragColor = vec4(vColor, 1.0);
      }
    `;

    // Compile shaders and create program
    const vertexShader = this._createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = this._createShader(gl, gl.FRAGMENT_SHADER, fsSource);

    this.program = gl.createProgram();
    gl.attachShader(this.program, vertexShader);
    gl.attachShader(this.program, fragmentShader);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      throw new Error("Program link error: " + gl.getProgramInfoLog(this.program));
    }

    gl.useProgram(this.program);

    // Setup buffers for rendering
    this._setupBuffers();

    // Get background color from page
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

  _createCharTextures() {
    const gl = this.gl;

    // Measure actual Cascadia Code character dimensions
    const measureCanvas = document.createElement("canvas");
    const measureCtx = measureCanvas.getContext("2d");
    const fontSize = 48;
    measureCtx.font = `${fontSize}px 'Cascadia Code', monospace`;

    const metrics = measureCtx.measureText("@");
    const charWidth = Math.ceil(metrics.width);
    const charHeight = Math.ceil(fontSize * 1.2);

    const cols = 16;
    const rows = Math.ceil(ASCII_CHARS.length / cols);

    // Create canvas to render characters
    const charCanvas = document.createElement("canvas");
    charCanvas.width = charWidth * cols;
    charCanvas.height = charHeight * rows;
    const ctx = charCanvas.getContext("2d");

    // Get background color from page
    const bgColor = getComputedStyle(document.body).backgroundColor;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, charCanvas.width, charCanvas.height);

    ctx.fillStyle = "white";
    ctx.font = `${fontSize}px 'Cascadia Code', monospace`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    // Render each character to the atlas
    for (let i = 0; i < ASCII_CHARS.length; i++) {
      const x = (i % cols) * charWidth;
      const y = Math.floor(i / cols) * charHeight;
      ctx.fillText(ASCII_CHARS[i], x, y);
    }

    // Create WebGL texture from canvas
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

    this.charTextures = texture;
  }

  _setupBuffers() {
    const gl = this.gl;
    const totalPixels = this.videoWidth * this.videoHeight;

    this.buffers = {
      position: gl.createBuffer(),
      texCoord: gl.createBuffer(),
      color: gl.createBuffer(),
      charIndex: gl.createBuffer(),
      indices: gl.createBuffer(),
    };

    // Static quad vertices (will be positioned per character)
    const positions = new Float32Array(totalPixels * 8);
    const texCoords = new Float32Array(totalPixels * 8);
    const indices = new Uint16Array(totalPixels * 6);

    const charWidth = 2.0 / this.videoWidth;
    const charHeight = 2.0 / this.videoHeight;

    for (let i = 0; i < totalPixels; i++) {
      const x = i % this.videoWidth;
      const y = Math.floor(i / this.videoWidth);

      const px = -1.0 + x * charWidth;
      const py = 1.0 - y * charHeight;

      const vi = i * 8;
      // Quad vertices
      positions[vi] = px;
      positions[vi + 1] = py;
      positions[vi + 2] = px + charWidth;
      positions[vi + 3] = py;
      positions[vi + 4] = px + charWidth;
      positions[vi + 5] = py - charHeight;
      positions[vi + 6] = px;
      positions[vi + 7] = py - charHeight;

      // Texture coordinates
      texCoords[vi] = 0;
      texCoords[vi + 1] = 0;
      texCoords[vi + 2] = 1;
      texCoords[vi + 3] = 0;
      texCoords[vi + 4] = 1;
      texCoords[vi + 5] = 1;
      texCoords[vi + 6] = 0;
      texCoords[vi + 7] = 1;

      // Indices for two triangles
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

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    // Allocate dynamic buffers (4 vertices per character)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.color);
    gl.bufferData(gl.ARRAY_BUFFER, totalPixels * 4 * 3 * 4, gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.charIndex);
    gl.bufferData(gl.ARRAY_BUFFER, totalPixels * 4 * 4, gl.DYNAMIC_DRAW);
  }

  /**
   * Render a frame from video image data
   * @param {ImageData} imageData - Raw pixel data from video
   * @returns {Array} Current frame characters for text selection
   */
  render(imageData) {
    const gl = this.gl;
    const charCount = ASCII_CHARS.length - 1;
    const totalPixels = this.videoWidth * this.videoHeight;

    const colors = new Float32Array(totalPixels * 12);
    const charIndices = new Float32Array(totalPixels * 4);

    if (!this.currentFrame) {
      this.currentFrame = new Array(totalPixels);
    }

    for (let i = 0; i < totalPixels; i++) {
      const pixelIndex = i << 2;
      const r = imageData.data[pixelIndex] / 255;
      const g = imageData.data[pixelIndex + 1] / 255;
      const b = imageData.data[pixelIndex + 2] / 255;

      const brightness =
        (imageData.data[pixelIndex] * 77 +
          imageData.data[pixelIndex + 1] * 150 +
          imageData.data[pixelIndex + 2] * 29) >>
        8;
      const charIdx = ~~((brightness * charCount) / 255);

      // Store character for selection
      this.currentFrame[i] = ASCII_CHARS[charIdx];

      // Set color for all 4 vertices of this quad
      const ci = i * 12;
      for (let v = 0; v < 4; v++) {
        const vi = ci + v * 3;
        colors[vi] = r;
        colors[vi + 1] = g;
        colors[vi + 2] = b;
      }

      // Set character index for all 4 vertices
      const chi = i * 4;
      charIndices[chi] =
        charIndices[chi + 1] =
        charIndices[chi + 2] =
        charIndices[chi + 3] =
          charIdx;
    }

    // Update buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.color);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, colors);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.charIndex);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, charIndices);

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

    // Draw
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.indices);
    gl.drawElements(gl.TRIANGLES, totalPixels * 6, gl.UNSIGNED_SHORT, 0);

    return this.currentFrame;
  }

  getCanvas() {
    return this.glCanvas;
  }

  getCharDimensions() {
    return {
      charWidth: this.charWidth,
      charHeight: this.charHeight,
    };
  }
}
