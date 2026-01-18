/**
 * Links - Navigation link management with text morphing and description updates
 */

import { TextMorph } from "../../lib/text-morph.js";
import { mobileManager } from "../../core/mobile-manager.js";

export class Links {
  constructor(linkElements, description) {
    this.linkElements = linkElements;
    this.description = description;
    this.currentHoveredButton = null;
    this.currentActiveButton = null;
    this.enabled = false;
    this.isMobile = mobileManager.getIsMobile();

    mobileManager.register((isMobile) => {
      this.isMobile = isMobile;
      this._resetState();
    });
  }

  init() {
    this.linkElements.forEach((button) => {
      const wrapper = button.closest(".nav-link-wrapper");
      const infoButton = wrapper?.querySelector(".nav-link-info");

      button.addEventListener("mouseenter", () => {
        if (!this.enabled || this.isMobile) return;

        this.currentHoveredButton = button;
        TextMorph.morph(button, button.dataset.hover);

        if (button.dataset.description) {
          this.description.animateChange(button.dataset.description);
        }
      });

      button.addEventListener("mouseleave", () => {
        if (!this.enabled || this.isMobile) return;

        if (this.currentHoveredButton === button) {
          this.currentHoveredButton = null;
        }
        TextMorph.morph(button, button.dataset.default);

        this.description.animateToDefault();
      });

      if (infoButton) {
        infoButton.addEventListener("click", (e) => {
          if (!this.enabled || !this.isMobile) return;
          e.preventDefault();

          if (this.currentActiveButton === button) {
            this._deactivateButton(button, infoButton);
          } else {
            if (this.currentActiveButton) {
              const currentWrapper =
                this.currentActiveButton.closest(".nav-link-wrapper");
              const currentInfoButton =
                currentWrapper?.querySelector(".nav-link-info");
              this._deactivateButton(
                this.currentActiveButton,
                currentInfoButton,
              );
            }
            this._activateButton(button, infoButton);
          }
        });
      }
    });
  }

  _activateButton(button, infoButton) {
    this.currentActiveButton = button;
    button.classList.add("active");
    infoButton.classList.add("active");

    TextMorph.morph(button, button.dataset.hover);
    TextMorph.morph(infoButton, infoButton.dataset.active);

    if (button.dataset.description) {
      this.description.animateChange(button.dataset.description);
    }
  }

  _deactivateButton(button, infoButton) {
    this.currentActiveButton = null;
    button.classList.remove("active");
    infoButton.classList.remove("active");

    TextMorph.morph(button, button.dataset.default);
    TextMorph.morph(infoButton, infoButton.dataset.default);

    this.description.animateToDefault();
  }

  _resetState() {
    if (this.currentActiveButton && !this.isMobile) {
      const wrapper = this.currentActiveButton.closest(".nav-link-wrapper");
      const infoButton = wrapper?.querySelector(".nav-link-info");
      if (infoButton) {
        this._deactivateButton(this.currentActiveButton, infoButton);
      }
    }

    if (this.isMobile) {
      this.linkElements.forEach((button) => {
        TextMorph.morph(button, button.dataset.default);
      });
    }
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }
}
