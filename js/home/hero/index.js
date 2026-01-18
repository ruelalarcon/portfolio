/**
 * Hero - Coordinates all hero section components (logo, links, description, scroll indicator)
 */

import { Logo } from "./logo.js";
import { Description } from "./description.js";
import { Links } from "./links.js";
import { smoothScrollTo } from "../../core/scroll.js";

export class Hero {
  constructor() {
    this.logoElement = document.getElementById("heroLogo");
    this.contentElement = document.getElementById("heroContent");
    this.descriptionElement = document.getElementById("heroDescription");
    this.scrollIndicator = document.getElementById("heroScrollIndicator");
    this.linkElements = document.querySelectorAll(".nav-link");

    this.logo = new Logo(this.logoElement);
    this.description = new Description(this.descriptionElement);
    this.links = new Links(this.linkElements, this.description);

    this.onComplete = null;
  }

  async init(duration = 2200) {
    this.links.init();

    this.logo.onAnimationComplete = () => {
      this._onLogoComplete();
    };

    this._setupScrollIndicator();

    await this.logo.init(duration);
  }

  _onLogoComplete() {
    this.contentElement.classList.add("show");
    this.links.enable();

    if (this.scrollIndicator) {
      this.scrollIndicator.classList.add("show");
    }

    if (this.onComplete) {
      this.onComplete();
    }
  }

  _setupScrollIndicator() {
    if (!this.scrollIndicator) return;

    const bodyContent = document.getElementById("bodyContent");
    if (!bodyContent) return;

    this.scrollIndicator.addEventListener("click", () => {
      const projectsSection = document.getElementById("projects");
      if (!projectsSection) return;

      const simplebarInstance = window.SimpleBar.instances.get(bodyContent);
      if (simplebarInstance) {
        const scrollElement = simplebarInstance.getScrollElement();
        const targetOffset = projectsSection.offsetTop;
        smoothScrollTo(scrollElement, targetOffset);
      }
    });
  }
}
