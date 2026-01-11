/**
 * Logo glitch reveal animation
 * Standalone module with integrated constants
 */

import { easeInOutCubic } from "../core/math.js";

// Logo data
const LOGO_ASCII = atob(
  "ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAsLCAgICAgICAgICAgICAgICAgICAgICAsLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIApgN01NIiIiTXEuICAgICAgICAgICAgICAgICAgICBgN01NICAgICAgICAgICAgZGIgICAgICBgN01NICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgTU0gICBgTU0uICAgICAgICAgICAgICAgICAgICAgTU0gICAgICAgICAgIDtNTTogICAgICAgTU0gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICBNTSAgICxNOSBgN01NIiBgN01NICAuZ1AiWWEgICBNTSAgICAgICAgICAsVl5NTS4gICAgICBNTSAgICw2IlliLiAgYDdNYixvZDggLHA2ImJvICAgLHBXIldxLmA3TU1wTU1NYi4gIAogIE1NbW1kTTkgICAgTU0gICAgTU0gLE0nICAgWWIgIE1NICAgICAgICAgLE0gIGBNTSAgICAgIE1NICA4KSAgIE1NICAgIE1NJyAiJzZNJyAgT08gIDZXJyAgIGBXYiBNTSAgICBNTSAgCiAgTU0gIFlNLiAgICBNTSAgICBNTSA4TSIiIiIiIiAgTU0gICAgICAgICBBYm1tbXFNQSAgICAgTU0gICAscG05TU0gICAgTU0gICAgOE0gICAgICAgOE0gICAgIE04IE1NICAgIE1NICAKICBNTSAgIGBNYi4gIE1NICAgIE1NIFlNLiAgICAsICBNTSAgICAgICAgQScgICAgIFZNTCAgICBNTSAgOE0gICBNTSAgICBNTSAgICBZTS4gICAgLCBZQS4gICAsQTkgTU0gICAgTU0gIAouSk1NTC4gLkpNTS4gYE1ib2QiWU1MLmBNYm1tZCcuSk1NTC4gICAgLkFNQS4gICAuQU1NQS4uSk1NTC5gTW9vOV5Zby4uSk1NTC4gICBZTWJtZCcgICBgWWJtZDknLkpNTUwgIEpNTUwu",
);
const LOGO_LINES = LOGO_ASCII.split("\n");

// Animation character sets
const STATIC_CHARS = "░▒▓█▀▄▌▐■□▪▫●○◐◑◒◓";
const GLITCH_CHARS = "╔╗╚╝║═╠╣╦╩╬├┤┬┴┼│─";

// Default animation duration
const DEFAULT_ANIMATION_DURATION = 2200;

export class LogoAnimation {
  constructor(logoElement, buttonContainer) {
    this.logoElement = logoElement;
    this.buttonContainer = buttonContainer;
    this.startTime = null;
    this.characterSeeds = [];
    this.charElements = [];
    this.duration = DEFAULT_ANIMATION_DURATION;
    this.onComplete = null;
  }

  init(duration = DEFAULT_ANIMATION_DURATION) {
    this.duration = duration;
    const totalCharacters = LOGO_LINES.reduce(
      (sum, line) => sum + line.length,
      0,
    );
    this.characterSeeds = Array.from({ length: totalCharacters }, () =>
      Math.random(),
    );
    this._createCharElements();
  }

  _createCharElements() {
    let output = "";
    let charIndex = 0;

    for (let y = 0; y < LOGO_LINES.length; y++) {
      for (let x = 0; x < LOGO_LINES[y].length; x++) {
        const char = LOGO_LINES[y][x];
        const charClass = char === " " ? "char char-space" : "char char-text";
        output += `<span class="${charClass}" data-idx="${charIndex}">${char === " " ? "&nbsp;" : " "}</span>`;
        charIndex++;
      }
      if (y < LOGO_LINES.length - 1) output += "\n";
    }

    this.logoElement.innerHTML = output;

    // Cache all span elements
    this.charElements = Array.from(this.logoElement.querySelectorAll("span"));
  }

  render(timestamp) {
    if (!this.startTime) this.startTime = timestamp;

    const elapsed = timestamp - this.startTime;
    const rawProgress = Math.min(elapsed / this.duration, 1);
    const progress = easeInOutCubic(rawProgress);

    this._renderFrame(progress, elapsed);

    if (rawProgress < 1) {
      requestAnimationFrame((ts) => this.render(ts));
    } else {
      this._renderFinalFrame();
      this.buttonContainer.classList.add("show");
      this.onComplete?.();
    }
  }

  _renderFrame(progress, elapsed) {
    let charIndex = 0;

    for (let y = 0; y < LOGO_LINES.length; y++) {
      for (let x = 0; x < LOGO_LINES[y].length; x++) {
        const char = LOGO_LINES[y][x];
        const newChar = this._renderChar(char, charIndex, progress, elapsed);
        const element = this.charElements[charIndex];

        if (element && element.textContent !== newChar) {
          element.textContent = newChar;
        }

        charIndex++;
      }
    }
  }

  _renderFinalFrame() {
    let charIndex = 0;
    for (let y = 0; y < LOGO_LINES.length; y++) {
      for (let x = 0; x < LOGO_LINES[y].length; x++) {
        const char = LOGO_LINES[y][x];
        const element = this.charElements[charIndex];
        if (element) {
          element.textContent = char === " " ? "\u00A0" : char;
        }
        charIndex++;
      }
    }
  }

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
  }
}
