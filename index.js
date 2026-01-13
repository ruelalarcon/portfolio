import { TextMorph } from "./js/lib/text-morph.js";
import { Logo } from "./js/home/logo.js";
import { NavigationTracker } from "./js/core/navigation.js";
import { noiseFunction } from "./js/core/math.js";
import { wait } from "./js/core/async.js";

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

// Description animation state
let currentDescriptionAnimation = null;
let currentHoveredButton = null;
let logoAnimationComplete = false;

// Animate description text change with terminal-style cursor
async function animateDescriptionChange(newText) {
  // Cancel any ongoing animation
  if (currentDescriptionAnimation) {
    currentDescriptionAnimation.cancel = true;
  }

  const descriptionElement = document.getElementById("description");
  if (!descriptionElement) return;

  const textContent = descriptionElement.querySelector(".text-content");
  const cursor = descriptionElement.querySelector(".cursor");
  const currentText = textContent.textContent;

  if (!textContent || !cursor) return;

  // Create animation controller
  const animation = { cancel: false };
  currentDescriptionAnimation = animation;

  // Move cursor to end and pause
  cursor.classList.add("animating");
  await wait(100);
  if (animation.cancel) return;

  // Highlight text by wrapping each character
  textContent.innerHTML = currentText
    .split("")
    .map((char) => `<span class="highlighted">${char}</span>`)
    .join("");
  await wait(400);
  if (animation.cancel) {
    // If interrupted, skip to deletion and start new text
    textContent.innerHTML = "";
    cursor.classList.remove("block");
    cursor.classList.add("insert");
    cursor.textContent = "";
    await wait(50);
  } else {
    // Delete highlighted text all at once
    textContent.innerHTML = "";
    await wait(100);
    if (animation.cancel) return;

    // Switch to insert mode cursor
    cursor.classList.remove("block");
    cursor.classList.add("insert");
    cursor.textContent = "";
    await wait(300);
  }

  if (animation.cancel) return;

  // Type new text with burst typing and occasional typos
  textContent.textContent = "";
  const typingStartTime = performance.now();
  const typoChars = "sdrei";

  for (let i = 0; i < newText.length; i++) {
    if (animation.cancel) return;

    // Small chance to make a typo (but not on spaces or last character)
    const shouldTypo =
      Math.random() < 0.02 && newText[i] !== " " && i < newText.length - 1;

    if (shouldTypo) {
      // Type wrong character
      const wrongChar = typoChars[Math.floor(Math.random() * typoChars.length)];
      textContent.textContent += wrongChar;
      await wait(200);
      if (animation.cancel) return;

      // Backspace
      textContent.textContent = textContent.textContent.slice(0, -1);
      await wait(100);
      if (animation.cancel) return;
    }

    // Type correct character
    textContent.textContent += newText[i];

    // Use noise function for natural variation
    const noise = noiseFunction(i, 0, typingStartTime * 0.001);
    const baseDelay = 30 + noise * 45;

    // Burst typing: longer pause at spaces (30% chance for "thinking" pause)
    if (newText[i] === " " && Math.random() < 0.3) {
      await wait(100 + Math.random() * 100);
    } else {
      await wait(baseDelay);
    }
  }

  await wait(200);
  if (animation.cancel) return;

  // Step 6: Switch back to block mode cursor
  cursor.classList.remove("insert", "animating");
  cursor.classList.add("block");
  cursor.textContent = "█";

  currentDescriptionAnimation = null;
}

// Setup button hover effects
document.querySelectorAll(".btn").forEach((button) => {
  button.addEventListener("mouseenter", () => {
    // Don't do anything if logo animation hasn't completed yet
    if (!logoAnimationComplete) return;

    currentHoveredButton = button;
    TextMorph.morph(button, button.dataset.hover);

    // Animate description text change
    if (button.dataset.description) {
      animateDescriptionChange(button.dataset.description);
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
    const descriptionElement = document.getElementById("description");
    if (descriptionElement && descriptionElement.dataset.default) {
      animateDescriptionChange(descriptionElement.dataset.default);
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
  logoAnimationComplete = true;
};

// Determine animation duration based on previous page
const animationDuration =
  previousPage === "home" || previousPage === null ? 2200 : 800;

// Start logo
logo.init(animationDuration);
