/**
 * Main entry point for the portfolio homepage
 * Initializes all sections: hero, projects, and about
 */

import { Hero } from "./js/home/hero/index.js";
import { Projects } from "./js/home/projects.js";
import { About } from "./js/home/about/index.js";
import { TerminalAnimator } from "./js/lib/terminal-animator.js";
import { ImageEnlarger } from "./js/lib/image-enlarger.js";
import { preload as preloadLive2D } from "./js/home/about/anime/index.js";
import { preload as preloadVideo } from "./js/home/about/music/index.js";

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

const hero = new Hero();
hero.init(2200);

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

const imageEnlarger = new ImageEnlarger();
imageEnlarger.init();
