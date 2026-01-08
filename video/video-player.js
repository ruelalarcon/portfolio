import { ASCII_CHARS } from "../js/constants.js";

export const StandaloneVideoPlayer = {
  video: null,
  canvas: null,
  context: null,
  videoWidth: 0,
  videoHeight: 0,
  animationFrameId: 0,
  playbarElement: null,
  videoElement: null,

  // WebGL resources
  gl: null,
  glCanvas: null,
  charTextures: null,
  program: null,
  buffers: null,

  // Selection tracking
  isSelecting: false,
  selectionStart: null,
  selectionEnd: null,
  currentFrame: null,
  selectionOverlay: null,
  charWidth: 0,
  charHeight: 0,

  play(videoUrl, videoEl, playbarContainer) {
    this.videoElement = videoEl;
    this.playbarElement = document.createElement("div");
    this.playbarElement.id = "playbar";
    playbarContainer.insertBefore(
      this.playbarElement,
      playbarContainer.firstChild,
    );

    this._setupVideo(videoUrl);
  },

  _setupVideo(videoUrl) {
    this.video = document.createElement("video");
    this.video.src = videoUrl;
    this.video.crossOrigin = "anonymous";
    this.video.volume = 0.2;
    this.video.muted = false;
    this.video.playsInline = true;

    this.canvas = document.createElement("canvas");
    this.context = this.canvas.getContext("2d", {
      willReadFrequently: true,
      alpha: false,
    });

    this.video.addEventListener("loadedmetadata", () => this._onVideoLoaded(), {
      once: true,
    });
    this.video.addEventListener("playing", () => this._renderFrame(), {
      once: true,
    });
    this.video.addEventListener("ended", () => this._onVideoEnded());

    this.video.load();
  },

  _onVideoLoaded() {
    const aspectRatio = this.video.videoWidth / this.video.videoHeight;
    this.videoWidth = 105;
    this.videoHeight = ~~(this.videoWidth / aspectRatio / 2);
    this.canvas.width = this.videoWidth;
    this.canvas.height = this.videoHeight;

    this._setupWebGL();
    this._setupPlaybarControls();
    this.video.play();
  },

  _setupWebGL() {
    // Measure Cascadia Code character dimensions
    const measureCanvas = document.createElement("canvas");
    const measureCtx = measureCanvas.getContext("2d");
    const fontSize = 48;
    measureCtx.font = `${fontSize}px 'Cascadia Code', monospace`;
    const metrics = measureCtx.measureText("@");
    const charWidth = Math.ceil(metrics.width);
    const charHeight = Math.ceil(fontSize * 1.2);

    // Store for selection rendering
    this.charWidth = charWidth;
    this.charHeight = charHeight;

    // Create WebGL canvas with high res textures
    this.glCanvas = document.createElement("canvas");
    this.glCanvas.width = this.videoWidth * charWidth;
    this.glCanvas.height = this.videoHeight * charHeight;

    // Display at smaller size (12px font equiv)
    const displayFontSize = 12;
    const displayCharWidth = Math.ceil(
      (charWidth * displayFontSize) / fontSize,
    );
    const displayCharHeight = Math.ceil(
      (charHeight * displayFontSize) / fontSize,
    );
    this.glCanvas.style.width = `${this.videoWidth * displayCharWidth}px`;
    this.glCanvas.style.height = `${this.videoHeight * displayCharHeight}px`;
    this.glCanvas.style.imageRendering = "auto";

    // Clear and add WebGL canvas
    this.videoElement.innerHTML = "";
    this.videoElement.appendChild(this.glCanvas);

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
    this.videoElement.style.position = "relative";
    this.videoElement.appendChild(this.selectionOverlay);

    // Set text cursor
    this.glCanvas.style.cursor = "text";

    // Setup selection handlers
    this._setupSelection(
      charWidth,
      charHeight,
      displayCharWidth,
      displayCharHeight,
    );

    this.gl = this.glCanvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: false,
    });

    if (!this.gl) {
      console.error("WebGL not supported, falling back to DOM");
      this._useFallback();
      return;
    }

    this._initWebGL();
  },

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
      console.error("Program link error:", gl.getProgramInfoLog(this.program));
      return;
    }

    gl.useProgram(this.program);

    // Setup buffers for instanced rendering
    this._setupBuffers();

    // Get background color from page
    const bgColor = getComputedStyle(document.body).backgroundColor;
    const rgb = bgColor.match(/\d+/g).map((n) => parseInt(n) / 255);
    gl.clearColor(rgb[0], rgb[1], rgb[2], 1.0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  },

  _createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Shader compile error:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  },

  _createCharTextures() {
    const gl = this.gl;

    // Measure actual Cascadia Code character dimensions
    const measureCanvas = document.createElement("canvas");
    const measureCtx = measureCanvas.getContext("2d");
    const fontSize = 48;
    measureCtx.font = `${fontSize}px 'Cascadia Code', monospace`;

    // Measure a typical character
    const metrics = measureCtx.measureText("@");
    const charWidth = Math.ceil(metrics.width);
    const charHeight = Math.ceil(fontSize * 1.2); // Standard line height

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
  },

  _setupBuffers() {
    const gl = this.gl;
    const totalPixels = this.videoWidth * this.videoHeight;

    // We'll update these buffers each frame
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
    gl.bufferData(gl.ARRAY_BUFFER, totalPixels * 4 * 3 * 4, gl.DYNAMIC_DRAW); // 4 verts * 3 RGB * 4 bytes

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.charIndex);
    gl.bufferData(gl.ARRAY_BUFFER, totalPixels * 4 * 4, gl.DYNAMIC_DRAW); // 4 verts * 4 bytes
  },

  _setupPlaybarControls() {
    this.playbarElement.addEventListener("click", (e) => {
      const text = this.playbarElement.textContent;
      const rect = this.playbarElement.getBoundingClientRect();
      const charWidth = rect.width / text.length;
      const clickX = e.clientX - rect.left;
      const clickCharIndex = Math.floor(clickX / charWidth);

      const buttonEnd = text.indexOf("]") + 1;

      if (clickCharIndex < buttonEnd) {
        this._togglePlayPause();
      } else {
        const barStart = text.indexOf("[", buttonEnd);
        if (barStart === -1) return;

        const barClickIndex = clickCharIndex - barStart - 1;
        const barWidth = 90;

        if (barClickIndex >= 0 && barClickIndex < barWidth) {
          const seekProgress = barClickIndex / barWidth;
          if (this.video.duration && isFinite(this.video.duration)) {
            const targetTime = seekProgress * this.video.duration;

            // Check if the target time is seekable
            const seekable = this.video.seekable;
            let canSeek = false;
            for (let i = 0; i < seekable.length; i++) {
              if (
                targetTime >= seekable.start(i) &&
                targetTime <= seekable.end(i)
              ) {
                canSeek = true;
                break;
              }
            }

            if (canSeek) {
              const wasPlaying = !this.video.paused;
              this.video.currentTime = targetTime;
              if (wasPlaying) {
                this.video
                  .play()
                  .catch((err) => console.error("Play error:", err));
              }
              this._updatePlaybar();
            }
          }
        }
      }
    });

    this._updatePlaybar();
  },

  _updatePlaybar() {
    if (!this.playbarElement || !this.video) return;

    const isPaused = this.video.paused;
    const button = isPaused ? " [ Play ]" : "[ Pause ]";

    const progress = this.video.duration
      ? this.video.currentTime / this.video.duration
      : 0;
    const barWidth = 90;
    const filledWidth = Math.floor(progress * barWidth);

    let progressBar = "[";
    for (let i = 0; i < barWidth; i++) {
      if (i < filledWidth) {
        progressBar += "=";
      } else if (i === filledWidth) {
        progressBar += ">";
      } else {
        progressBar += " ";
      }
    }
    progressBar += "]";

    this.playbarElement.textContent = `${button} ${progressBar}`;
  },

  _togglePlayPause() {
    if (this.video.paused) {
      this.video.play();
    } else {
      this.video.pause();
    }
    this._updatePlaybar();
  },

  _renderFrame() {
    if (this.video.ended || this.video.paused) {
      this._updatePlaybar();
      this.animationFrameId = requestAnimationFrame(() => this._renderFrame());
      return;
    }

    if (!this.gl) {
      // Fallback to DOM rendering
      this._renderFrameDOM();
      return;
    }

    this.context.drawImage(this.video, 0, 0, this.videoWidth, this.videoHeight);
    const imageData = this.context.getImageData(
      0,
      0,
      this.videoWidth,
      this.videoHeight,
    ).data;

    const gl = this.gl;
    const charCount = ASCII_CHARS.length - 1;
    const totalPixels = this.videoWidth * this.videoHeight;

    // Prepare data arrays
    const colors = new Float32Array(totalPixels * 12); // 4 vertices * 3 components
    const charIndices = new Float32Array(totalPixels * 4); // 4 vertices

    // Store current frame for text selection
    if (!this.currentFrame) {
      this.currentFrame = new Array(totalPixels);
    }

    for (let i = 0; i < totalPixels; i++) {
      const pixelIndex = i << 2;
      const r = imageData[pixelIndex] / 255;
      const g = imageData[pixelIndex + 1] / 255;
      const b = imageData[pixelIndex + 2] / 255;

      const brightness =
        (imageData[pixelIndex] * 77 +
          imageData[pixelIndex + 1] * 150 +
          imageData[pixelIndex + 2] * 29) >>
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

    // Redraw selection overlay if active
    if (this.selectionStart && this.selectionEnd) {
      this._redrawSelection();
    }

    this._updatePlaybar();
    this.animationFrameId = requestAnimationFrame(() => this._renderFrame());
  },

  _renderFrameDOM() {
    // Fallback DOM rendering
    this.context.drawImage(this.video, 0, 0, this.videoWidth, this.videoHeight);
    const imageData = this.context.getImageData(
      0,
      0,
      this.videoWidth,
      this.videoHeight,
    ).data;

    const charCount = ASCII_CHARS.length - 1;
    let output = "";

    for (let y = 0; y < this.videoHeight; y++) {
      for (let x = 0; x < this.videoWidth; x++) {
        const index = (y * this.videoWidth + x) << 2;
        const r = imageData[index];
        const g = imageData[index + 1];
        const b = imageData[index + 2];

        const brightness = (r * 77 + g * 150 + b * 29) >> 8;
        const char = ASCII_CHARS[~~((brightness * charCount) / 255)];

        output += `<s style=color:rgb(${r},${g},${b})>${char}</s>`;
      }
      if (y < this.videoHeight - 1) output += "\n";
    }

    this.videoElement.innerHTML = output;
    this._updatePlaybar();
    this.animationFrameId = requestAnimationFrame(() => this._renderFrame());
  },

  _useFallback() {
    this.gl = null;
    this.videoElement.innerHTML = "";
  },

  _onVideoEnded() {
    this.video.currentTime = 0;
    this.video.play();
  },

  _setupSelection(charWidth, charHeight, displayCharWidth, displayCharHeight) {
    const getCharCoords = (clientX, clientY) => {
      const rect = this.glCanvas.getBoundingClientRect();
      const x = Math.floor((clientX - rect.left) / displayCharWidth);
      const y = Math.floor((clientY - rect.top) / displayCharHeight);
      return {
        x: Math.max(0, Math.min(x, this.videoWidth - 1)),
        y: Math.max(0, Math.min(y, this.videoHeight - 1)),
        index: y * this.videoWidth + x,
      };
    };

    let hasMoved = false;

    const onMouseMove = (e) => {
      if (this.isSelecting) {
        hasMoved = true;
        this.selectionEnd = getCharCoords(e.clientX, e.clientY);
        this._drawSelection(charWidth, charHeight);
      }
    };

    const onMouseUp = () => {
      if (this.isSelecting) {
        this.isSelecting = false;

        // Clear selection if it was just a click (no drag)
        if (!hasMoved) {
          this.selectionStart = null;
          this.selectionEnd = null;
          const ctx = this.selectionOverlay.getContext("2d");
          ctx.clearRect(
            0,
            0,
            this.selectionOverlay.width,
            this.selectionOverlay.height,
          );
        }

        hasMoved = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      }
    };

    this.glCanvas.addEventListener("mousedown", (e) => {
      this.isSelecting = true;
      hasMoved = false;
      this.selectionStart = getCharCoords(e.clientX, e.clientY);
      this.selectionEnd = this.selectionStart;

      // Add document-level listeners for drag outside
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });

    // Clear selection when clicking outside
    document.addEventListener("mousedown", (e) => {
      if (
        !this.glCanvas.contains(e.target) &&
        !this.selectionOverlay.contains(e.target)
      ) {
        this.selectionStart = null;
        this.selectionEnd = null;
        const ctx = this.selectionOverlay.getContext("2d");
        ctx.clearRect(
          0,
          0,
          this.selectionOverlay.width,
          this.selectionOverlay.height,
        );
      }
    });

    // Copy handler
    document.addEventListener("copy", (e) => {
      if (this.selectionStart && this.selectionEnd && this.currentFrame) {
        e.preventDefault();
        const text = this._getSelectedText();
        e.clipboardData.setData("text/plain", text);
      }
    });
  },

  _drawSelection(charWidth, charHeight) {
    this._renderSelection(charWidth, charHeight);
  },

  _redrawSelection() {
    this._renderSelection(this.charWidth, this.charHeight);
  },

  _renderSelection(charWidth, charHeight) {
    const ctx = this.selectionOverlay.getContext("2d");
    ctx.clearRect(
      0,
      0,
      this.selectionOverlay.width,
      this.selectionOverlay.height,
    );

    if (!this.selectionStart || !this.selectionEnd || !this.currentFrame)
      return;

    const start = Math.min(this.selectionStart.index, this.selectionEnd.index);
    const end = Math.max(this.selectionStart.index, this.selectionEnd.index);

    // Windows selection style: #0236a0 background
    ctx.fillStyle = "#0236a0";

    for (let i = start; i <= end; i++) {
      const x = (i % this.videoWidth) * charWidth;
      const y = Math.floor(i / this.videoWidth) * charHeight;
      ctx.fillRect(x, y, charWidth, charHeight);
    }

    // Draw white text over selection
    ctx.fillStyle = "white";
    ctx.font = `48px 'Cascadia Code', monospace`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    for (let i = start; i <= end; i++) {
      const char = this.currentFrame[i];
      const x = (i % this.videoWidth) * charWidth;
      const y = Math.floor(i / this.videoWidth) * charHeight;
      ctx.fillText(char, x, y);
    }
  },

  _getSelectedText() {
    if (!this.currentFrame || !this.selectionStart || !this.selectionEnd)
      return "";

    const start = Math.min(this.selectionStart.index, this.selectionEnd.index);
    const end = Math.max(this.selectionStart.index, this.selectionEnd.index);

    let text = "";
    for (let i = start; i <= end; i++) {
      const x = i % this.videoWidth;
      text += this.currentFrame[i];
      if (x === this.videoWidth - 1 && i < end) {
        text += "\n";
      }
    }

    return text;
  },
};
