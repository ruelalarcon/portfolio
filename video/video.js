import { StandaloneVideoPlayer } from "./video-player.js";
import { TextMorph } from "../js/text-morph.js";

const logoElement = document.getElementById("logo");
const buttonContainer = document.getElementById("buttons");

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
