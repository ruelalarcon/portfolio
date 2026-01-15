import { TextMorph } from "./js/lib/text-morph.js";
import { Logo } from "./js/home/logo.js";
import { NavigationTracker } from "./js/core/navigation.js";
import { Description } from "./js/home/description.js";
import { Projects } from "./js/home/projects.js";
import { About } from "./js/home/about.js";
import { TerminalAnimator } from "./js/lib/terminal-animator.js";
import { preloader } from "./js/home/about/anime/preloader.js";

// Disable automatic scroll restoration on page reload
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

// Start preloading Live2D model early
preloader.preload();

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
const previousPage = NavigationTracker.init("home");

// Initialize description animation system
const descriptionElement = document.getElementById("heroDescription");
const description = new Description(descriptionElement);

// Button hover state
let currentHoveredButton = null;
let logoAnimationComplete = false;

// Setup button hover effects
document.querySelectorAll(".nav-link").forEach((button) => {
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
const logoElement = document.getElementById("heroLogo");
const contentElement = document.getElementById("heroContent");

// Initialize logo (combines animation and ripple effects)
const logo = new Logo(logoElement);

// Set up callback to reveal content when animation finishes
logo.onAnimationComplete = () => {
  contentElement.classList.add("show");
  logoAnimationComplete = true;

  // Show scroll indicator
  const heroScrollIndicator = document.getElementById("heroScrollIndicator");
  if (heroScrollIndicator) {
    heroScrollIndicator.classList.add("show");
  }
};

// Determine animation duration based on previous page
const animationDuration =
  previousPage === "home" || previousPage === null ? 2200 : 800;

// Start logo
logo.init(animationDuration);

// Setup hero scroll indicator click handler
const heroScrollIndicator = document.getElementById("heroScrollIndicator");
const bodyContent = document.getElementById("bodyContent");
if (heroScrollIndicator && bodyContent) {
  heroScrollIndicator.addEventListener("click", () => {
    const projectsSection = document.getElementById("projects");
    if (projectsSection) {
      // Get the SimpleBar instance and scroll to the projects section
      const simplebarInstance = window.SimpleBar.instances.get(bodyContent);
      if (simplebarInstance) {
        const scrollElement = simplebarInstance.getScrollElement();
        const targetOffset = projectsSection.offsetTop;
        scrollElement.scrollTo({ top: targetOffset, behavior: "smooth" });
      }
    }
  });
}

// Initialize projects section with terminal animation
const projectsTerminalElement = document.getElementById("projectsTerminal");
const projectsTerminalAnimator = new TerminalAnimator(projectsTerminalElement);
const projects = new Projects();

// Set up callback to initialize About section when Projects completes
projects.onComplete = () => {
  const aboutSection = document.getElementById("about");
  if (aboutSection) {
    aboutSection.classList.add("visible");
  }

  // Initialize about section
  const about = new About();
  about.init();
};

projects.init(projectsTerminalAnimator);
