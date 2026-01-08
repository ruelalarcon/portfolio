import { WebGLRenderer } from "./webgl-renderer.js";
import { TextSelection } from "./text-selection.js";
import { Playbar } from "./playbar.js";
import { ASCII_CHARS } from "../js/constants.js";

/**
 * Main video player that coordinates rendering, selection, and controls
 */
export const StandaloneVideoPlayer = {
  video: null,
  canvas: null,
  context: null,
  videoWidth: 0,
  videoHeight: 0,
  animationFrameId: 0,
  videoElement: null,

  renderer: null,
  textSelection: null,
  playbar: null,

  /**
   * Initialize and start playing a video
   * @param {string} videoUrl - URL of the video to play
   * @param {HTMLElement} videoEl - Container element for the video
   * @param {HTMLElement} playbarContainer - Container for the playbar
   */
  play(videoUrl, videoEl, playbarContainer) {
    this.videoElement = videoEl;
    this._setupVideo(videoUrl, playbarContainer);
  },

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
  },

  async _onVideoLoaded(playbarContainer) {
    const aspectRatio = this.video.videoWidth / this.video.videoHeight;
    this.videoWidth = 106;
    this.videoHeight = ~~(this.videoWidth / aspectRatio / 2);
    this.canvas.width = this.videoWidth;
    this.canvas.height = this.videoHeight;

    await this._setupWebGL();
    this._setupPlaybar(playbarContainer);
    this.video.play();
  },

  async _setupWebGL() {
    try {
      // Initialize WebGL renderer
      this.renderer = new WebGLRenderer(this.videoWidth, this.videoHeight);
      const { displayCharWidth, displayCharHeight } = await this.renderer.init(
        this.videoElement,
      );

      // Initialize text selection
      this.textSelection = new TextSelection(
        this.videoWidth,
        this.videoHeight,
        displayCharWidth,
        displayCharHeight,
      );

      const { charWidth, charHeight } = this.renderer.getCharDimensions();
      this.textSelection.init(
        this.renderer.getCanvas(),
        this.videoElement,
        charWidth,
        charHeight,
      );
    } catch (error) {
      console.error("WebGL setup failed:", error);
      this._useFallback();
    }
  },

  _setupPlaybar(playbarContainer) {
    this.playbar = new Playbar(this.video, playbarContainer);
    this.playbar.init(() => this._updatePlaybar());
  },

  _updatePlaybar() {
    if (this.playbar) {
      this.playbar.update();
    }
  },

  _renderFrame() {
    if (this.video.ended || this.video.paused) {
      this._updatePlaybar();
      this.animationFrameId = requestAnimationFrame(() => this._renderFrame());
      return;
    }

    if (!this.renderer) {
      this._renderFrameDOM();
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

    // Render with WebGL
    const currentFrame = this.renderer.render(imageData);

    // Update text selection with current frame
    if (this.textSelection) {
      this.textSelection.setCurrentFrame(currentFrame);

      // Redraw selection overlay if active
      if (this.textSelection.hasSelection()) {
        this.textSelection.render();
      }
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
    this.renderer = null;
    this.videoElement.innerHTML = "";
  },

  _onVideoEnded() {
    this.video.currentTime = 0;
    this.video.play();
  },
};
