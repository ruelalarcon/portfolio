import { TextMorph } from "./js/text-morph.js";
import { LogoAnimation } from "./js/logo-animation.js";
import { RippleEffect } from "./js/ripple-effect.js";
import { NavigationTracker } from "./js/navigation-tracker.js";

// Initialize navigation tracking
const previousPage = NavigationTracker.init("home");

// Setup button hover effects
document.querySelectorAll(".btn").forEach((button) => {
  button.addEventListener("mouseenter", () =>
    TextMorph.morph(button, button.dataset.hover),
  );
  button.addEventListener("mouseleave", () =>
    TextMorph.morph(button, button.dataset.default),
  );
});

// Initialize ripple effect after logo animation completes
LogoAnimation._onComplete = () => {
  RippleEffect.init();
};

// Determine animation duration based on previous page
const animationDuration =
  previousPage === "home" || previousPage === null ? 2200 : 800;

// Start logo animation
LogoAnimation.init(animationDuration);
requestAnimationFrame((ts) => LogoAnimation.render(ts));
