import { VideoPlayer } from "../js/video/video-player.js";
import { TextMorph } from "../js/lib/text-morph.js";
import { NavigationTracker } from "../js/core/navigation.js";

const videoElement = document.getElementById("video");
const buttonContainer = document.getElementById("buttons");

// Initialize navigation tracking
NavigationTracker.init("video");

// Setup button hover effects
document.querySelectorAll(".btn").forEach((button) => {
  button.addEventListener("mouseenter", () =>
    TextMorph.morph(button, button.dataset.hover),
  );
  button.addEventListener("mouseleave", () =>
    TextMorph.morph(button, button.dataset.default),
  );
});

// Auto-play video when page loads
const videoPlayer = new VideoPlayer();
videoPlayer.play("../video.mp4", videoElement, buttonContainer);
