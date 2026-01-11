/**
 * Main video player coordinator
 * Manages video playback, rendering, and controls
 */

import { WebGLASCIIRenderer } from "../lib/ascii-renderer/webgl.js";
import { Playbar } from "./playbar.js";

const ASCII_CHARS = ".:-=+*#%@";

export class VideoPlayer {
  constructor() {
    this.video = null;
    this.canvas = null;
    this.context = null;
    this.videoWidth = 0;
    this.videoHeight = 0;
    this.animationFrameId = 0;
    this.videoElement = null;

    this.renderer = null;
    this.playbar = null;
  }

  /**
   * Initialize and start playing a video
   * @param {string} videoUrl - URL of the video to play
   * @param {HTMLElement} videoEl - Container element for the video
   * @param {HTMLElement} playbarContainer - Container for the playbar
   */
  play(videoUrl, videoEl, playbarContainer) {
    this.videoElement = videoEl;
    this._setupVideo(videoUrl, playbarContainer);
  }

  _setupVideo(videoUrl, playbarContainer) {
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

    this.video.addEventListener(
      "loadedmetadata",
      () => this._onVideoLoaded(playbarContainer),
      {
        once: true,
      },
    );
    this.video.addEventListener("playing", () => this._renderFrame(), {
      once: true,
    });
    this.video.addEventListener("ended", () => this._onVideoEnded());

    this.video.load();
  }

  async _onVideoLoaded(playbarContainer) {
    const aspectRatio = this.video.videoWidth / this.video.videoHeight;
    this.videoWidth = 106;
    this.videoHeight = ~~(this.videoWidth / aspectRatio / 2);
    this.canvas.width = this.videoWidth;
    this.canvas.height = this.videoHeight;

    await this._setupWebGL();
    this._setupPlaybar(playbarContainer);
    this.video.play();
  }

  async _setupWebGL() {
    // Initialize WebGL renderer with video-specific configuration
    this.renderer = new WebGLASCIIRenderer(this.videoWidth, this.videoHeight, {
      charSet: ASCII_CHARS,
      font: "'Cascadia Code', monospace",
      textureFontSize: 48,
      displayFontSize: 12,
      enableTextSelection: true,
    });
    const { canvas } = await this.renderer.init(this.videoElement);

    // Handle fade-in animation
    canvas.style.opacity = "0";
    canvas.style.transition = "opacity 0.5s ease-in-out";
    requestAnimationFrame(() => {
      canvas.style.opacity = "1";
    });
  }

  _setupPlaybar(playbarContainer) {
    this.playbar = new Playbar(this.video, playbarContainer);
    this.playbar.init(() => this._updatePlaybar());
  }

  _updatePlaybar() {
    if (this.playbar) {
      this.playbar.update();
    }
  }

  _renderFrame() {
    if (this.video.ended || this.video.paused) {
      this._updatePlaybar();
      this.animationFrameId = requestAnimationFrame(() => this._renderFrame());
      return;
    }

    // Draw video to canvas and get image data
    this.context.drawImage(this.video, 0, 0, this.videoWidth, this.videoHeight);
    const imageData = this.context.getImageData(
      0,
      0,
      this.videoWidth,
      this.videoHeight,
    );

    // Convert video data to character grid format
    const frameData = this._videoToFrameData(imageData);

    // Render with WebGL
    this.renderer.render(frameData);

    this._updatePlaybar();
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

      // Calculate brightness (weighted RGB)
      const brightness = (r * 77 + g * 150 + b * 29) >> 8;

      // Map brightness to character index
      const charIdx = ~~((brightness * charCount) / 255);
      chars[i] = ASCII_CHARS[charIdx];

      // Convert RGB to 0-1 range
      colors[i] = [r / 255, g / 255, b / 255];
    }

    return { chars, colors };
  }

  _onVideoEnded() {
    this.video.currentTime = 0;
    this.video.play();
  }
}
