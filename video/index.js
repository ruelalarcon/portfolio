import { VideoPlayer } from "../js/video/video-player.js";
import { TextMorph } from "../js/lib/text-morph.js";
import { NavigationTracker } from "../js/core/navigation.js";

// Update header time
function updateTime() {
  const now = new Date();
  const timeString = now.toLocaleTimeString("en-US", {
    timeZone: "America/Regina",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const timeElement = document.getElementById("terminalTime");
  if (timeElement) {
    timeElement.textContent = `[${timeString}]`;
  }
}

// Update time immediately and then every second
updateTime();
setInterval(updateTime, 1000);

// Initialize navigation tracking
NavigationTracker.init("video");

// Get DOM elements
const videoElement = document.getElementById("video");
const contentElement = document.getElementById("heroContent");

// Setup button hover effects
document.querySelectorAll(".nav-link").forEach((button) => {
  button.addEventListener("mouseenter", () =>
    TextMorph.morph(button, button.dataset.hover),
  );
  button.addEventListener("mouseleave", () =>
    TextMorph.morph(button, button.dataset.default),
  );
});

// Auto-play video when page loads
const videoPlayer = new VideoPlayer();
videoPlayer.play("../video.mp4", videoElement, contentElement);
