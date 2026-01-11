import { TextMorph } from "./js/lib/text-morph.js";
import { LogoAnimation } from "./js/home/logo-animation.js";
import { RippleEffect } from "./js/home/ripple-effect.js";
import { NavigationTracker } from "./js/core/navigation.js";

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

// Get DOM elements
const logoElement = document.getElementById("logo");
const buttonContainer = document.getElementById("buttons");

// Initialize logo animation
const logoAnimation = new LogoAnimation(logoElement, buttonContainer);

// Initialize ripple effect after logo animation completes
logoAnimation.onComplete = () => {
  const rippleEffect = new RippleEffect(logoElement);
  rippleEffect.init();
};

// Determine animation duration based on previous page
const animationDuration =
  previousPage === "home" || previousPage === null ? 2200 : 800;

// Start logo animation
logoAnimation.init(animationDuration);
requestAnimationFrame((ts) => logoAnimation.render(ts));
