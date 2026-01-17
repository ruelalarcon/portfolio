/**
 * Video Preloader
 * Preloads video files early to avoid loading delays
 */

class VideoPreloader {
  constructor(videoUrl) {
    this.videoUrl = videoUrl;
    this.preloadPromise = null;
  }

  /**
   * Start preloading the video
   * Should be called early in the page lifecycle
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

      video.src = this.videoUrl;
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

export { VideoPreloader };
