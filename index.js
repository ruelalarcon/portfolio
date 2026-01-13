import { TextMorph } from "./js/lib/text-morph.js";
import { Logo } from "./js/home/logo.js";
import { NavigationTracker } from "./js/core/navigation.js";
import { Description } from "./js/home/description.js";

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
  const timeElement = document.getElementById("header-time");
  if (timeElement) {
    timeElement.textContent = `[${timeString}]`;
  }
}

// Update time immediately and then every second
updateTime();
setInterval(updateTime, 1000);

// Initialize navigation tracking
const previousPage = NavigationTracker.init("home");

// Initialize description animation system
const descriptionElement = document.getElementById("description");
const description = new Description(descriptionElement);

// Button hover state
let currentHoveredButton = null;
let logoAnimationComplete = false;

// Setup button hover effects
document.querySelectorAll(".btn").forEach((button) => {
  button.addEventListener("mouseenter", () => {
    // Don't do anything if logo animation hasn't completed yet
    if (!logoAnimationComplete) return;

    currentHoveredButton = button;
    TextMorph.morph(button, button.dataset.hover);

    // Animate description text change
    if (button.dataset.description) {
      description.animateChange(button.dataset.description);
    }
  });

  button.addEventListener("mouseleave", () => {
    // Don't do anything if logo animation hasn't completed yet
    if (!logoAnimationComplete) return;

    if (currentHoveredButton === button) {
      currentHoveredButton = null;
    }
    TextMorph.morph(button, button.dataset.default);

    // Animate back to default description text
    description.animateToDefault();
  });
});

// Get DOM elements
const logoElement = document.getElementById("logo");
const contentElement = document.getElementById("content");

// Initialize logo (combines animation and ripple effects)
const logo = new Logo(logoElement);

// Set up callback to reveal content when animation finishes
logo.onAnimationComplete = () => {
  contentElement.classList.add("show");
  logoAnimationComplete = true;
};

// Determine animation duration based on previous page
const animationDuration =
  previousPage === "home" || previousPage === null ? 2200 : 800;

// Start logo
logo.init(animationDuration);
