import {
  LOGO_ASCII,
  ANIMATION_DURATION,
  logoElement,
  buttonContainer,
  logoLines,
} from "./constants.js";
import { STATIC_CHARS, GLITCH_CHARS } from "./constants.js";
import { easeInOutCubic } from "./utilities.js";

export const LogoAnimation = {
  startTime: null,
  characterSeeds: [],
  charElements: [],

  init() {
    const totalCharacters = logoLines.reduce(
      (sum, line) => sum + line.length,
      0,
    );
    this.characterSeeds = Array.from({ length: totalCharacters }, () =>
      Math.random(),
    );
    this._createCharElements();
  },

  _createCharElements() {
    let output = "";
    let charIndex = 0;

    for (let y = 0; y < logoLines.length; y++) {
      for (let x = 0; x < logoLines[y].length; x++) {
        const char = logoLines[y][x];
        const charClass = char === " " ? "char char-space" : "char char-text";
        output += `<span class="${charClass}" data-idx="${charIndex}">${char === " " ? "&nbsp;" : " "}</span>`;
        charIndex++;
      }
      if (y < logoLines.length - 1) output += "\n";
    }

    logoElement.innerHTML = output;

    // Cache all span elements
    this.charElements = Array.from(logoElement.querySelectorAll("span"));
  },

  render(timestamp) {
    if (!this.startTime) this.startTime = timestamp;

    const elapsed = timestamp - this.startTime;
    const rawProgress = Math.min(elapsed / ANIMATION_DURATION, 1);
    const progress = easeInOutCubic(rawProgress);

    this._renderFrame(progress, elapsed);

    if (rawProgress < 1) {
      requestAnimationFrame((ts) => this.render(ts));
    } else {
      this._renderFinalFrame();
      buttonContainer.classList.add("show");
      // RippleEffect will be initialized from main.js
      this._onComplete?.();
    }
  },

  _renderFrame(progress, elapsed) {
    let charIndex = 0;

    for (let y = 0; y < logoLines.length; y++) {
      for (let x = 0; x < logoLines[y].length; x++) {
        const char = logoLines[y][x];
        const newChar = this._renderChar(char, charIndex, progress, elapsed);
        const element = this.charElements[charIndex];

        if (element && element.textContent !== newChar) {
          element.textContent = newChar;
        }

        charIndex++;
      }
    }
  },

  _renderFinalFrame() {
    let charIndex = 0;
    for (let y = 0; y < logoLines.length; y++) {
      for (let x = 0; x < logoLines[y].length; x++) {
        const char = logoLines[y][x];
        const element = this.charElements[charIndex];
        if (element) {
          element.textContent = char === " " ? "\u00A0" : char;
        }
        charIndex++;
      }
    }
  },

  _renderChar(char, index, progress, elapsed) {
    if (char === " ") return "\u00A0";

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
        ? STATIC_CHARS[
            ~~((noisePhase + Math.random()) * STATIC_CHARS.length) %
              STATIC_CHARS.length
          ]
        : GLITCH_CHARS[~~(Math.random() * GLITCH_CHARS.length)];
    } else if (progress > threshold - 0.5) {
      return Math.random() < 0.15
        ? STATIC_CHARS[~~(Math.random() * STATIC_CHARS.length)]
        : "\u00A0";
    }
    return "\u00A0";
  },
};
