/**
 * Music Animation
 * Coordinates video player and playbar for the music section
 */

import { VideoPlayer } from "./video-player.js";
import { Playbar } from "./playbar.js";
import { VideoPreloader } from "../../../lib/preloader/video.js";

const VIDEO_URL = "resources/video.mp4";

const preloader = new VideoPreloader(VIDEO_URL);

/**
 * Start preloading the video
 * Should be called early in the page lifecycle
 */
function preload() {
  return preloader.preload();
}

class MusicAnimation {
  constructor() {
    this.videoPlayer = null;
    this.playbar = null;
    this.container = null;
    this.videoElement = null;
  }

  /**
   * Initialize the video player and playbar
   * @param {HTMLElement} container - Container element for the video and playbar
   */
  async init(container) {
    if (!container) return;

    this.container = container;

    this.videoPlayer = new VideoPlayer();
    this.videoElement = await this.videoPlayer.init(
      container,
      (gridWidth, pixelWidth) => this._onGridSizeChange(gridWidth, pixelWidth),
      () => this._updatePlaybar(),
    );
  }

  _onGridSizeChange(gridWidth, pixelWidth) {
    if (!this.playbar && this.videoElement && this.container) {
      this.playbar = new Playbar(this.videoElement, this.container);
      this.playbar.init();
    }

    if (this.playbar) {
      this.playbar.setBarWidth(pixelWidth);
      this.playbar.update();
    }
  }

  _updatePlaybar() {
    if (this.playbar) {
      this.playbar.update();
    }
  }

  destroy() {
    if (this.videoPlayer && this.videoPlayer.destroy) {
      this.videoPlayer.destroy();
      this.videoPlayer = null;
    }

    if (this.playbar) {
      this.playbar = null;
    }
  }
}

export { MusicAnimation, preload };
