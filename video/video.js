import { StandaloneVideoPlayer } from "./video-player.js";
import { TextMorph } from "../js/text-morph.js";
import { NavigationTracker } from "../js/navigation-tracker.js";

const logoElement = document.getElementById("logo");
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
StandaloneVideoPlayer.play("../video.mp4", logoElement, buttonContainer);
