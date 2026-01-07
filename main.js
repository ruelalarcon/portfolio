import { TextMorph } from "./js/text-morph.js";
import { LogoAnimation } from "./js/logo-animation.js";
import { VideoPlayer } from "./js/video-player.js";
import { RippleEffect } from "./js/ripple-effect.js";

// Setup button hover effects
document.querySelectorAll(".btn").forEach((button) => {
  button.addEventListener("mouseenter", () =>
    TextMorph.morph(button, button.dataset.hover),
  );
  button.addEventListener("mouseleave", () =>
    TextMorph.morph(button, button.dataset.default),
  );
});

// Setup video button
document.getElementById("videoBtn").addEventListener("click", (event) => {
  event.preventDefault();
  VideoPlayer.play("/video.mp4");
});

// Initialize ripple effect after logo animation completes
LogoAnimation._onComplete = () => {
  RippleEffect.init();
};

// Start logo animation
LogoAnimation.init();
requestAnimationFrame((ts) => LogoAnimation.render(ts));
