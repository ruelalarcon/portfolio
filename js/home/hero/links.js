/**
 * Links - Navigation link management with text morphing and description updates
 */

import { TextMorph } from "../../lib/text-morph.js";

export class Links {
  constructor(linkElements, description) {
    this.linkElements = linkElements;
    this.description = description;
    this.currentHoveredButton = null;
    this.enabled = false;
  }

  init() {
    this.linkElements.forEach((button) => {
      button.addEventListener("mouseenter", () => {
        if (!this.enabled) return;

        this.currentHoveredButton = button;
        TextMorph.morph(button, button.dataset.hover);

        if (button.dataset.description) {
          this.description.animateChange(button.dataset.description);
        }
      });

      button.addEventListener("mouseleave", () => {
        if (!this.enabled) return;

        if (this.currentHoveredButton === button) {
          this.currentHoveredButton = null;
        }
        TextMorph.morph(button, button.dataset.default);

        this.description.animateToDefault();
      });
    });
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }
}
