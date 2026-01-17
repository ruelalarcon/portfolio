/**
 * Video Player for Music Section
 * Handles video playback and ASCII rendering via WebGL
 */

import { WebGLASCIIRenderer } from "../../../lib/ascii-renderer/webgl.js";

const ASCII_CHARS = ".:-=+*#%@";

export class VideoPlayer {
  constructor() {
    this.video = null;
    this.canvas = null;
    this.context = null;
    this.videoWidth = 0;
    this.videoHeight = 0;
    this.animationFrameId = 0;
    this.renderer = null;
    this.updateCallback = null;
  }

  /**
   * Initialize the video player
   * @param {HTMLElement} container - Container element for the video canvas
   * @param {Function} onReady - Callback when video is ready
   * @param {Function} onUpdate - Callback to update playbar each frame
   * @returns {HTMLVideoElement} The video element for playbar control
   */
  async init(container, onReady, onUpdate) {
    this.updateCallback = onUpdate;
    if (!container) return null;

    this.video = document.createElement("video");
    this.video.src = "resources/video.mp4";
    this.video.crossOrigin = "anonymous";
    this.video.volume = 0.2;
    this.video.muted = false;
    this.video.playsInline = true;

    this.canvas = document.createElement("canvas");
    this.context = this.canvas.getContext("2d", {
      willReadFrequently: true,
      alpha: false,
    });

    this.video.addEventListener(
      "loadedmetadata",
      () => this._onVideoLoaded(container, onReady),
      { once: true },
    );
    this.video.addEventListener("playing", () => this._renderFrame(), {
      once: true,
    });
    this.video.addEventListener("ended", () => this._onVideoEnded());

    this.video.load();
    return this.video;
  }

  async _onVideoLoaded(container, onReady) {
    this.videoWidth = 106;
    this.videoHeight = 35;
    this.canvas.width = this.videoWidth;
    this.canvas.height = this.videoHeight;

    await this._setupWebGL(container);

    if (onReady) {
      onReady();
    }

    this._renderFrame();
  }

  async _setupWebGL(container) {
    const tuiPane = document.createElement("div");
    tuiPane.className = "tui-pane";

    const borderTop = document.createElement("div");
    borderTop.className = "tui-pane__border-top";

    const title = document.createElement("span");
    title.className = "tui-pane__title";
    title.textContent = "linear ring - enchanted love";

    borderTop.appendChild(title);

    const content = document.createElement("div");
    content.className = "tui-pane__content";
    content.style.padding = "0";

    tuiPane.appendChild(borderTop);
    tuiPane.appendChild(content);
    container.appendChild(tuiPane);

    this.renderer = new WebGLASCIIRenderer(this.videoWidth, this.videoHeight, {
      charSet: ASCII_CHARS,
      font: "'Cascadia Code', monospace",
      textureFontSize: 48,
      displayFontSize: 12,
      enableTextSelection: true,
    });
    const { canvas } = await this.renderer.init(content);

    const totalPixels = this.videoWidth * this.videoHeight;
    const defaultChar = ASCII_CHARS[0];
    const defaultColor = [0.5, 0.5, 0.5];
    this.renderer.render({
      chars: new Array(totalPixels).fill(defaultChar),
      colors: new Array(totalPixels).fill(defaultColor),
    });

    canvas.style.opacity = "0";
    canvas.style.transition = "opacity 0.5s ease-in-out";
    requestAnimationFrame(() => {
      canvas.style.opacity = "1";
    });
  }

  _renderFrame() {
    this.context.drawImage(this.video, 0, 0, this.videoWidth, this.videoHeight);
    const imageData = this.context.getImageData(
      0,
      0,
      this.videoWidth,
      this.videoHeight,
    );

    const frameData = this._videoToFrameData(imageData);

    this.renderer.render(frameData);

    if (this.updateCallback) {
      this.updateCallback();
    }

    this.animationFrameId = requestAnimationFrame(() => this._renderFrame());
  }

  /**
   * Convert video ImageData to frame data for the renderer
   * Maps brightness to ASCII characters and extracts RGB colors
   * @param {ImageData} imageData - Raw pixel data from video
   * @returns {Object} Frame data with chars and colors arrays
   */
  _videoToFrameData(imageData) {
    const totalPixels = this.videoWidth * this.videoHeight;
    const chars = new Array(totalPixels);
    const colors = new Array(totalPixels);
    const charCount = ASCII_CHARS.length - 1;

    for (let i = 0; i < totalPixels; i++) {
      const pixelIndex = i << 2;
      const r = imageData.data[pixelIndex];
      const g = imageData.data[pixelIndex + 1];
      const b = imageData.data[pixelIndex + 2];

      const brightness = (r * 77 + g * 150 + b * 29) >> 8;

      const charIdx = ~~((brightness * charCount) / 255);
      chars[i] = ASCII_CHARS[charIdx];

      colors[i] = [r / 255, g / 255, b / 255];
    }

    return { chars, colors };
  }

  _onVideoEnded() {
    this.video.currentTime = 0;
    this.video.play();
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.video) {
      this.video.pause();
      this.video.src = "";
      this.video = null;
    }

    if (this.renderer && this.renderer.destroy) {
      this.renderer.destroy();
      this.renderer = null;
    }
  }
}
