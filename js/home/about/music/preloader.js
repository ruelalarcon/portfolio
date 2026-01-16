/**
 * Video Preloader
 * Preloads the video file early to avoid loading delays
 */

const VIDEO_URL = "resources/video.mp4";

class VideoPreloader {
  constructor() {
    this.preloadPromise = null;
  }

  /**
   * Start preloading the video
   * This should be called early in the page lifecycle
   */
  preload() {
    if (this.preloadPromise) {
      return this.preloadPromise;
    }

    this.preloadPromise = new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "auto";
      video.muted = true;

      video.addEventListener(
        "canplaythrough",
        () => {
          console.log("Video preloaded");
          resolve();
        },
        { once: true },
      );

      video.addEventListener(
        "error",
        () => {
          console.error("Failed to preload video");
          resolve();
        },
        { once: true },
      );

      video.src = VIDEO_URL;
      video.load();
    });

    return this.preloadPromise;
  }

  /**
   * Wait for preload to complete
   */
  async waitForPreload() {
    if (this.preloadPromise) {
      await this.preloadPromise;
    }
  }
}

// Singleton instance
const videoPreloader = new VideoPreloader();

export { videoPreloader };
