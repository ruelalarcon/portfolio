import { LOGO_ASCII, ANIMATION_DURATION, logoElement, buttonContainer, logoLines } from "./constants.js";
import { STATIC_CHARS, GLITCH_CHARS } from "./constants.js";
import { easeInOutCubic } from "./utilities.js";

export const LogoAnimation = {
  startTime: null,
  characterSeeds: [],

  init() {
    const totalCharacters = logoLines.reduce((sum, line) => sum + line.length, 0);
    this.characterSeeds = Array.from({ length: totalCharacters }, () => Math.random());
  },

  render(timestamp) {
    if (!this.startTime) this.startTime = timestamp;

    const elapsed = timestamp - this.startTime;
    const rawProgress = Math.min(elapsed / ANIMATION_DURATION, 1);
    const progress = easeInOutCubic(rawProgress);

    logoElement.textContent = this._renderFrame(progress, elapsed);

    if (rawProgress < 1) {
      requestAnimationFrame((ts) => this.render(ts));
    } else {
      logoElement.textContent = LOGO_ASCII;
      buttonContainer.classList.add("show");
      // RippleEffect will be initialized from main.js
      this._onComplete?.();
    }
  },

  _renderFrame(progress, elapsed) {
    let charIndex = 0;

    return logoLines.map((line) => {
      let result = "";
      for (let i = 0; i < line.length; i++) {
        result += this._renderChar(line[i], charIndex, progress, elapsed);
        charIndex++;
      }
      return result;
    }).join("\n");
  },

  _renderChar(char, index, progress, elapsed) {
    const seed = this.characterSeeds[index];
    const threshold = seed * 0.7 + 0.15;
    const noisePhase = (seed * 1000 + elapsed * 0.01) % 1;

    if (progress > threshold + 0.08) {
      return Math.random() < 0.003 && progress < 0.98
        ? GLITCH_CHARS[~~(Math.random() * GLITCH_CHARS.length)]
        : char;
    } else if (progress > threshold - 0.25) {
      const intensity = 1 - (progress - (threshold - 0.25)) / 0.33;
      return Math.random() < 0.3 + intensity * 0.5
        ? STATIC_CHARS[~~((noisePhase + Math.random()) * STATIC_CHARS.length) % STATIC_CHARS.length]
        : GLITCH_CHARS[~~(Math.random() * GLITCH_CHARS.length)];
    } else if (progress > threshold - 0.5) {
      return Math.random() < 0.15
        ? STATIC_CHARS[~~(Math.random() * STATIC_CHARS.length)]
        : " ";
    }
    return " ";
  },
};
