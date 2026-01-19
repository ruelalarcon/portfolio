/**
 * Music Animation
 * Coordinates video player for the music section
 */

import { VideoPlayer } from "./video-player.js";
import { VideoPreloader } from "../../../lib/preloader/video.js";

const VIDEO_URL = "assets/video.mp4";

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
  }

  /**
   * Initialize the video player
   * @param {HTMLElement} container - Container element for the video and controls
   */
  async init(container) {
    if (!container) return;

    this.videoPlayer = new VideoPlayer();
    await this.videoPlayer.init(container);
  }

  destroy() {
    if (this.videoPlayer && this.videoPlayer.destroy) {
      this.videoPlayer.destroy();
      this.videoPlayer = null;
    }
  }
}

export { MusicAnimation, preload };
