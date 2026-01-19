/**
 * Video Player for Music Section
 * Unified video player with ASCII rendering and controls
 */

import { WebGLASCIIRenderer } from "../../../lib/ascii-renderer/webgl.js";
import { TextMorph } from "../../../lib/text-morph.js";
import { resizeManager } from "../../../core/resize-manager.js";

const ASCII_CHARS = ".:-=+*#%@";

export class VideoPlayer {
  constructor() {
    this.video = null;
    this.canvas = null;
    this.context = null;
    this.renderer = null;
    this.playButton = null;
    this.progressBar = null;
    this.animationFrameId = null;
    this.seekAnimationId = null;
    this.glCanvas = null;
    this.barWidth = 90;
  }

  async init(container) {
    if (!container) return;

    this._createVideo();
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
    this.video.load();

    resizeManager.register(() => this._updateBarWidth());
  }

  _createVideo() {
    this.video = document.createElement("video");
    this.video.src = "assets/video.mp4";
    this.video.crossOrigin = "anonymous";
    this.video.volume = 0.2;
    this.video.muted = false;
    this.video.playsInline = true;
  }

  async _onVideoLoaded(container) {
    const width = 106;
    const height = 35;
    this.canvas.width = width;
    this.canvas.height = height;

    await this._setupWebGL(container, width, height);
    this._setupControls(container);
    this._updateBarWidth();
    this._renderFrame();
  }

  async _setupWebGL(container, width, height) {
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

    this.renderer = new WebGLASCIIRenderer(width, height, {
      charSet: ASCII_CHARS,
      font: "'Cascadia Code', monospace",
      textureFontSize: 48,
      displayFontSize: 12,
      enableTextSelection: true,
    });

    const { canvas } = await this.renderer.init(content);
    this.glCanvas = canvas;

    const totalPixels = width * height;
    this.renderer.render({
      chars: new Array(totalPixels).fill(ASCII_CHARS[0]),
      colors: new Array(totalPixels).fill([0.5, 0.5, 0.5]),
    });

    canvas.style.opacity = "0";
    canvas.style.transition = "opacity 0.5s ease-in-out";
    requestAnimationFrame(() => {
      canvas.style.opacity = "1";
    });
  }

  _setupControls(container) {
    const controlsWrapper = document.createElement("div");
    controlsWrapper.className = "video-controls";

    this.progressBar = document.createElement("div");
    this.progressBar.className = "video-progress";
    this.progressBar.addEventListener("click", (e) =>
      this._handleProgressClick(e),
    );

    this.playButton = document.createElement("button");
    this.playButton.className = "video-play-button";
    this.playButton.textContent = "[ Play ]";
    this.playButton.addEventListener("click", () => this._togglePlayPause());

    controlsWrapper.appendChild(this.progressBar);
    controlsWrapper.appendChild(this.playButton);
    container.appendChild(controlsWrapper);
  }

  _updateBarWidth() {
    if (!this.glCanvas || !this.renderer) return;

    const canvasRect = this.glCanvas.getBoundingClientRect();
    const canvasWidth = canvasRect.width;
    const charWidth = this.renderer.displayCharWidth;

    this.barWidth = Math.floor(canvasWidth / charWidth) - 2;
  }

  _togglePlayPause() {
    if (this.video.paused) {
      this.video.play();
      this.playButton.classList.add("playing");
      TextMorph.morph(this.playButton, "[ Pause ]");
    } else {
      this.video.pause();
      this.playButton.classList.remove("playing");
      TextMorph.morph(this.playButton, "[ Play ]");
    }
  }

  _handleProgressClick(e) {
    const rect = this.progressBar.getBoundingClientRect();
    const text = this.progressBar.textContent;
    const charWidth = rect.width / text.length;
    const clickX = e.clientX - rect.left;
    const clickCharIndex = Math.floor(clickX / charWidth);

    const barStart = text.indexOf("[");
    const barEnd = text.lastIndexOf("]");
    const barClickIndex = clickCharIndex - barStart - 1;
    const barWidth = barEnd - barStart - 1;

    if (barClickIndex >= 0 && barClickIndex < barWidth) {
      const seekProgress = barClickIndex / barWidth;
      if (this.video.duration && isFinite(this.video.duration)) {
        const targetTime = seekProgress * this.video.duration;
        if (this._canSeek(targetTime)) {
          this._smoothSeek(targetTime);
        }
      }
    }
  }

  _canSeek(targetTime) {
    const seekable = this.video.seekable;
    for (let i = 0; i < seekable.length; i++) {
      if (targetTime >= seekable.start(i) && targetTime <= seekable.end(i)) {
        return true;
      }
    }
    return false;
  }

  _smoothSeek(targetTime) {
    if (this.seekAnimationId) {
      cancelAnimationFrame(this.seekAnimationId);
    }

    const startTime = this.video.currentTime;
    const startTimestamp = performance.now();
    const duration = 200;
    const wasPlaying = !this.video.paused;

    this.video.pause();

    const animate = (timestamp) => {
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      this.video.currentTime =
        startTime + (targetTime - startTime) * easedProgress;

      if (progress < 1) {
        this.seekAnimationId = requestAnimationFrame(animate);
      } else {
        this.video.currentTime = targetTime;
        this.seekAnimationId = null;
        if (wasPlaying) {
          this.video.play().catch((err) => console.error("Play error:", err));
        }
      }
    };

    this.seekAnimationId = requestAnimationFrame(animate);
  }

  _renderFrame() {
    this.context.drawImage(
      this.video,
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );
    const imageData = this.context.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );

    this.renderer.render(this._videoToFrameData(imageData));
    this._updateProgressBar();

    this.animationFrameId = requestAnimationFrame(() => this._renderFrame());
  }

  _videoToFrameData(imageData) {
    const totalPixels = this.canvas.width * this.canvas.height;
    const chars = new Array(totalPixels);
    const colors = new Array(totalPixels);
    const charCount = ASCII_CHARS.length - 1;

    for (let i = 0; i < totalPixels; i++) {
      const pixelIndex = i << 2;
      const r = imageData.data[pixelIndex];
      const g = imageData.data[pixelIndex + 1];
      const b = imageData.data[pixelIndex + 2];

      const brightness = (r * 77 + g * 150 + b * 29) >> 8;
      chars[i] = ASCII_CHARS[~~((brightness * charCount) / 255)];
      colors[i] = [r / 255, g / 255, b / 255];
    }

    return { chars, colors };
  }

  _updateProgressBar() {
    if (!this.progressBar || !this.video) return;

    const progress = this.video.duration
      ? this.video.currentTime / this.video.duration
      : 0;
    const filledWidth = Math.floor(progress * this.barWidth);

    let progressBarText = "[";
    for (let i = 0; i < this.barWidth; i++) {
      if (i < filledWidth) {
        progressBarText += "=";
      } else if (i === filledWidth) {
        progressBarText += ">";
      } else {
        progressBarText += " ";
      }
    }
    progressBarText += "]";

    this.progressBar.textContent = progressBarText;
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

    if (this.seekAnimationId) {
      cancelAnimationFrame(this.seekAnimationId);
      this.seekAnimationId = null;
    }

    if (this.video) {
      this.video.pause();
      this.video.src = "";
      this.video = null;
    }

    if (this.renderer?.destroy) {
      this.renderer.destroy();
      this.renderer = null;
    }
  }
}
