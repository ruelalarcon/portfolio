/**
 * Main entry point for the portfolio homepage
 * Initializes all sections: logo, navigation, projects, and about
 */

import { TextMorph } from "./js/lib/text-morph.js";
import { Logo } from "./js/home/logo.js";
import { Description } from "./js/home/description.js";
import { Projects } from "./js/home/projects.js";
import { About } from "./js/home/about/index.js";
import { TerminalAnimator } from "./js/lib/terminal-animator.js";
import { preload as preloadLive2D } from "./js/home/about/anime/index.js";
import { preload as preloadVideo } from "./js/home/about/music/index.js";
import { smoothScrollTo } from "./js/core/scroll.js";

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

preloadLive2D();
preloadVideo();

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

updateTime();
setInterval(updateTime, 1000);

const descriptionElement = document.getElementById("heroDescription");
const description = new Description(descriptionElement);

let currentHoveredButton = null;
let logoAnimationComplete = false;

document.querySelectorAll(".nav-link").forEach((button) => {
  button.addEventListener("mouseenter", () => {
    if (!logoAnimationComplete) return;

    currentHoveredButton = button;
    TextMorph.morph(button, button.dataset.hover);

    if (button.dataset.description) {
      description.animateChange(button.dataset.description);
    }
  });

  button.addEventListener("mouseleave", () => {
    if (!logoAnimationComplete) return;

    if (currentHoveredButton === button) {
      currentHoveredButton = null;
    }
    TextMorph.morph(button, button.dataset.default);

    description.animateToDefault();
  });
});

const logoElement = document.getElementById("heroLogo");
const contentElement = document.getElementById("heroContent");

const logo = new Logo(logoElement);

logo.onAnimationComplete = () => {
  contentElement.classList.add("show");
  logoAnimationComplete = true;

  const heroScrollIndicator = document.getElementById("heroScrollIndicator");
  if (heroScrollIndicator) {
    heroScrollIndicator.classList.add("show");
  }
};

logo.init(2200);

const heroScrollIndicator = document.getElementById("heroScrollIndicator");
const bodyContent = document.getElementById("bodyContent");
if (heroScrollIndicator && bodyContent) {
  heroScrollIndicator.addEventListener("click", () => {
    const projectsSection = document.getElementById("projects");
    if (projectsSection) {
      const simplebarInstance = window.SimpleBar.instances.get(bodyContent);
      if (simplebarInstance) {
        const scrollElement = simplebarInstance.getScrollElement();
        const targetOffset = projectsSection.offsetTop;
        smoothScrollTo(scrollElement, targetOffset);
      }
    }
  });
}

const projectsTerminalElement = document.getElementById("projectsTerminal");
const projectsTerminalAnimator = new TerminalAnimator(projectsTerminalElement);
const projects = new Projects();

projects.onComplete = () => {
  const aboutSection = document.getElementById("about");
  if (aboutSection) {
    aboutSection.classList.add("visible");
  }

  const about = new About();
  about.init();
};

projects.init(projectsTerminalAnimator);
