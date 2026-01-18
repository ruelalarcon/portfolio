/**
 * Video Player for Music Section
 * Handles video playback and ASCII rendering via WebGL
 */

import { WebGLASCIIRenderer } from "../../../lib/ascii-renderer/webgl.js";
import { mobileManager } from "../../../core/mobile-manager.js";

const ASCII_CHARS_SIMPLE = ".:-=+*#%@";
const ASCII_CHARS_DENSE =
  " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
const DENSE_CHARSET_THRESHOLD = 10;

const DESKTOP_GRID_WIDTH = 106;
const DESKTOP_GRID_HEIGHT = 35;
const DESKTOP_FONT_SIZE = 12;

const MIN_FONT_SIZE = 8;
const MIN_GRID_WIDTH = 60;
const MIN_GRID_HEIGHT = 20;
const VIDEO_ASPECT_RATIO = 16 / 9;
const CHAR_ASPECT_RATIO = 0.6;
const MOBILE_CONTAINER_PADDING = 40;
const MOBILE_CONTAINER_HEIGHT_RATIO = 0.5;

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
    this.onGridSizeChange = null;
    this.mobileListenerId = null;
    this.container = null;
    this.tuiPane = null;
    this.currentFontSize = DESKTOP_FONT_SIZE;
    this.currentCharSet = ASCII_CHARS_SIMPLE;
  }

  /**
   * Calculate optimal grid dimensions and font size based on container size
   * @param {HTMLElement} container - Container element
   * @returns {Object} Grid dimensions, font size, and character set
   */
  _calculateDimensions(container) {
    const isMobile = mobileManager.getIsMobile();

    if (!isMobile) {
      return {
        width: DESKTOP_GRID_WIDTH,
        height: DESKTOP_GRID_HEIGHT,
        fontSize: DESKTOP_FONT_SIZE,
        charSet: ASCII_CHARS_SIMPLE,
      };
    }

    const containerWidth = container.clientWidth - MOBILE_CONTAINER_PADDING;
    const containerHeight = window.innerHeight * MOBILE_CONTAINER_HEIGHT_RATIO;

    let gridWidth, gridHeight;

    const widthBasedHeight = Math.floor(containerWidth / VIDEO_ASPECT_RATIO);

    if (widthBasedHeight <= containerHeight) {
      gridWidth = Math.floor(
        containerWidth / (MIN_FONT_SIZE * CHAR_ASPECT_RATIO),
      );
      gridHeight = Math.floor(
        (gridWidth * CHAR_ASPECT_RATIO) / VIDEO_ASPECT_RATIO,
      );
    } else {
      gridHeight = Math.floor(containerHeight / MIN_FONT_SIZE);
      gridWidth = Math.floor(
        (gridHeight / CHAR_ASPECT_RATIO) * VIDEO_ASPECT_RATIO,
      );
    }

    gridWidth = Math.max(
      MIN_GRID_WIDTH,
      Math.min(gridWidth, DESKTOP_GRID_WIDTH),
    );
    gridHeight = Math.max(
      MIN_GRID_HEIGHT,
      Math.min(gridHeight, DESKTOP_GRID_HEIGHT),
    );

    const fontSizeByWidth = containerWidth / (gridWidth * CHAR_ASPECT_RATIO);
    const fontSizeByHeight = containerHeight / gridHeight;
    const fontSize = Math.floor(
      Math.max(
        MIN_FONT_SIZE,
        Math.min(fontSizeByWidth, fontSizeByHeight, DESKTOP_FONT_SIZE),
      ),
    );

    const charSet =
      fontSize <= DENSE_CHARSET_THRESHOLD
        ? ASCII_CHARS_DENSE
        : ASCII_CHARS_SIMPLE;

    return { width: gridWidth, height: gridHeight, fontSize, charSet };
  }

  /**
   * Initialize the video player
   * @param {HTMLElement} container - Container element for the video canvas
   * @param {Function} onGridSizeChange - Callback when grid dimensions change (receives gridWidth, pixelWidth)
   * @param {Function} onUpdate - Callback to update playbar each frame
   * @returns {HTMLVideoElement} The video element for playbar control
   */
  async init(container, onGridSizeChange, onUpdate) {
    this.updateCallback = onUpdate;
    this.onGridSizeChange = onGridSizeChange;
    if (!container) return null;

    this.container = container;

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
      () => this._onVideoLoaded(container),
      { once: true },
    );
    this.video.addEventListener("playing", () => this._renderFrame(), {
      once: true,
    });
    this.video.addEventListener("ended", () => this._onVideoEnded());

    this.mobileListenerId = mobileManager.register(() =>
      this._handleMobileChange(),
    );

    this.video.load();
    return this.video;
  }

  async _initializeRenderer() {
    const dimensions = this._calculateDimensions(this.container);

    this.videoWidth = dimensions.width;
    this.videoHeight = dimensions.height;
    this.currentFontSize = dimensions.fontSize;
    this.currentCharSet = dimensions.charSet;

    this.canvas.width = this.videoWidth;
    this.canvas.height = this.videoHeight;

    if (this.renderer) {
      this.renderer.destroy();
      this.renderer = null;
    }

    const content = this.tuiPane?.querySelector(".tui-pane__content");
    if (!content) return;

    content.innerHTML = "";

    this.renderer = new WebGLASCIIRenderer(this.videoWidth, this.videoHeight, {
      charSet: this.currentCharSet,
      font: "'Cascadia Code', monospace",
      textureFontSize: 48,
      displayFontSize: this.currentFontSize,
      enableTextSelection: true,
    });

    const { canvas } = await this.renderer.init(content);

    const totalPixels = this.videoWidth * this.videoHeight;
    const defaultChar = this.currentCharSet[0];
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

    if (this.onGridSizeChange) {
      const pixelWidth =
        this.videoWidth * this.currentFontSize * CHAR_ASPECT_RATIO;
      this.onGridSizeChange(this.videoWidth, pixelWidth);
    }
  }

  async _handleMobileChange() {
    if (!this.container || !this.video || this.video.readyState < 1) return;

    await this._initializeRenderer();
  }

  async _onVideoLoaded(container) {
    await this._setupTuiPane(container);
    await this._initializeRenderer();

    this._renderFrame();
  }

  async _setupTuiPane(container) {
    this.tuiPane = document.createElement("div");
    this.tuiPane.className = "tui-pane";

    const borderTop = document.createElement("div");
    borderTop.className = "tui-pane__border-top";

    const title = document.createElement("span");
    title.className = "tui-pane__title";
    title.textContent = "linear ring - enchanted love";

    borderTop.appendChild(title);

    const content = document.createElement("div");
    content.className = "tui-pane__content";
    content.style.padding = "0";

    this.tuiPane.appendChild(borderTop);
    this.tuiPane.appendChild(content);
    container.appendChild(this.tuiPane);
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
    const charCount = this.currentCharSet.length - 1;

    for (let i = 0; i < totalPixels; i++) {
      const pixelIndex = i << 2;
      const r = imageData.data[pixelIndex];
      const g = imageData.data[pixelIndex + 1];
      const b = imageData.data[pixelIndex + 2];

      const brightness = (r * 77 + g * 150 + b * 29) >> 8;

      const charIdx = ~~((brightness * charCount) / 255);
      chars[i] = this.currentCharSet[charIdx];

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

    if (this.mobileListenerId !== null) {
      mobileManager.unregister(this.mobileListenerId);
      this.mobileListenerId = null;
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
