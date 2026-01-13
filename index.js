import { TextMorph } from "./js/lib/text-morph.js";
import { Logo } from "./js/home/logo.js";
import { NavigationTracker } from "./js/core/navigation.js";

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

// Setup button hover effects
document.querySelectorAll(".btn").forEach((button) => {
  button.addEventListener("mouseenter", () => {
    TextMorph.morph(button, button.dataset.hover);

    // Update description text from button's data-description attribute
    const descriptionElement = document.getElementById("description");
    if (descriptionElement && button.dataset.description) {
      descriptionElement.innerHTML =
        button.dataset.description + '<span class="cursor">_</span>';
    }
  });

  button.addEventListener("mouseleave", () => {
    TextMorph.morph(button, button.dataset.default);

    // Reset description text to default from description's data-default attribute
    const descriptionElement = document.getElementById("description");
    if (descriptionElement && descriptionElement.dataset.default) {
      descriptionElement.innerHTML =
        descriptionElement.dataset.default + '<span class="cursor">_</span>';
    }
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
};

// Determine animation duration based on previous page
const animationDuration =
  previousPage === "home" || previousPage === null ? 2200 : 800;

// Start logo
logo.init(animationDuration);
