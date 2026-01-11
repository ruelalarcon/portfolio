import { TextMorph } from "./js/lib/text-morph.js";
import { Logo } from "./js/home/logo.js";
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

// Initialize logo (combines animation and ripple effects)
const logo = new Logo(logoElement, buttonContainer);

// Determine animation duration based on previous page
const animationDuration =
  previousPage === "home" || previousPage === null ? 2200 : 800;

// Start logo
logo.init(animationDuration);
