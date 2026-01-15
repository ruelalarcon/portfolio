/**
 * Music Animation
 * Coordinator for video player in the music section
 */

import { VideoPlayer } from "./music/video-player.js";
import { Playbar } from "./music/playbar.js";

class MusicAnimation {
  constructor() {
    this.videoPlayer = null;
    this.playbar = null;
  }

  /**
   * Initialize the animation
   * @param {HTMLElement} container - Container element for the video and playbar
   */
  async init(container) {
    if (!container) return;

    // Initialize video player
    this.videoPlayer = new VideoPlayer();
    const videoElement = await this.videoPlayer.init(
      container,
      () => {
        // Setup playbar after video is ready
        this._setupPlaybar(container, videoElement);
      },
      () => {
        // Update playbar each frame
        this._updatePlaybar();
      },
    );
  }

  /**
   * Setup playbar controls
   * @param {HTMLElement} container - Container for the playbar
   * @param {HTMLVideoElement} videoElement - Video element to control
   */
  _setupPlaybar(container, videoElement) {
    this.playbar = new Playbar(videoElement, container);
    this.playbar.init();
  }

  /**
   * Update playbar display
   */
  _updatePlaybar() {
    if (this.playbar) {
      this.playbar.update();
    }
  }

  /**
   * Cleanup method
   */
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

export { MusicAnimation };
