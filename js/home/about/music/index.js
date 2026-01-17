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
  }

  /**
   * Initialize the video player and playbar
   * @param {HTMLElement} container - Container element for the video and playbar
   */
  async init(container) {
    if (!container) return;

    this.videoPlayer = new VideoPlayer();
    const videoElement = await this.videoPlayer.init(
      container,
      () => this._setupPlaybar(container, videoElement),
      () => this._updatePlaybar(),
    );
  }

  _setupPlaybar(container, videoElement) {
    this.playbar = new Playbar(videoElement, container);
    this.playbar.init();
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
