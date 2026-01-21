/**
 * About Section
 * Manages terminal-style about me display with three sections:
 * - Coding background and interests
 * - Anime passion
 * - Music (jazz piano and electronic music)
 * Each section has its own terminal animation followed by a WebGL ASCII visualization
 */

import { CodingAnimation } from "./coding/index.js";
import { AnimeAnimation } from "./anime/index.js";
import { MusicAnimation } from "./music/index.js";

function calculateAge() {
  const birthDate = new Date(2004, 11, 28);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

class About {
  constructor() {
    this.animations = [];
    this.terminalAnimator = null;
  }

  init(terminalAnimator) {
    this.terminalAnimator = terminalAnimator;
    this._initCodingSection();
  }

  _initCodingSection() {
    const visualElement = document.getElementById("codingVisual");

    this.terminalAnimator.registerTransformer("codingTerminal", "age", () =>
      calculateAge(),
    );
    this.terminalAnimator.registerCallback("codingTerminal", "showVisual", () =>
      this._showCodingVisual(visualElement),
    );
    this.terminalAnimator.arm("codingTerminal");
  }

  _initAnimeSection() {
    const visualElement = document.getElementById("animeVisual");

    this.terminalAnimator.registerCallback("animeTerminal", "showVisual", () =>
      this._showAnimeVisual(visualElement),
    );
    this.terminalAnimator.arm("animeTerminal");
  }

  _initMusicSection() {
    const visualElement = document.getElementById("musicVisual");

    this.terminalAnimator.registerCallback("musicTerminal", "showVisual", () =>
      this._showMusicVisual(visualElement),
    );
    this.terminalAnimator.arm("musicTerminal");
  }

  async _showCodingVisual(container) {
    if (!container) return;
    container.style.display = "flex";

    const animation = new CodingAnimation();
    await animation.init(container);
    this.animations.push(animation);

    this._initAnimeSection();
  }

  async _showAnimeVisual(container) {
    if (!container) return;
    container.style.display = "flex";

    const animation = new AnimeAnimation();
    await animation.init(container);
    this.animations.push(animation);

    this._initMusicSection();
  }

  async _showMusicVisual(container) {
    if (!container) return;
    container.style.display = "flex";

    const animation = new MusicAnimation();
    await animation.init(container);
    this.animations.push(animation);

    const thanksElement = document.querySelector(".about__thanks");
    if (thanksElement) {
      thanksElement.classList.add("visible");
    }
  }

  destroy() {
    this.animations.forEach((animation) => {
      if (animation && animation.destroy) {
        animation.destroy();
      }
    });
    this.animations = [];
  }
}

export { About };
