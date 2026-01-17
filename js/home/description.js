/**
 * Description - Terminal-style typewriter animation for button hover descriptions
 *
 * Features:
 * - Terminal cursor states: block mode (█) for idle, insert mode (|) for typing
 * - Natural typing speed with noise-based variation
 * - Highlighting and deletion animations
 * - Animation cancellation for seamless transitions
 * - Occasional typos with QWERTY keyboard proximity
 */

import { noiseFunction } from "../core/math.js";
import { wait } from "../core/async.js";

export class Description {
  constructor(descriptionElement) {
    this.element = descriptionElement;
    this.textContent = descriptionElement.querySelector(
      ".hero__description-text",
    );
    this.cursor = descriptionElement.querySelector(".terminal-cursor");
    this.currentAnimation = null;
    this.defaultText = descriptionElement.dataset.default || "";

    this.settings = {
      pauseBeforeNormalMode: 300,
      pauseInNormalMode: 100,
      pauseBeforeInsertMode: 150,

      selectionDisplay: 400,
      deletionPause: 100,
      interruptedDeletionPause: 50,

      typingBase: 30,
      typingVariation: 15,
      typingThinkingPause: { min: 100, max: 200 },
      typingThinkingChance: 0.3,

      typoChance: 0.01,
      typoLengthDistribution: {
        1: 0.3,
        2: 0.3,
        3: 0.4,
      },

      typoTypingSpeed: { min: 80, max: 120 },
      typoNoticePause: { min: 50, max: 100 },
      typoBackspaceSpeed: { min: 50, max: 80 },
      typoWordSelectionDisplay: 200,
      typoWordDeletionPause: 150,
      typoBeforeCorrectChar: 100,
      typoAfterWordRetype: 100,
    };

    this.keyboardProximity = {
      q: ["w", "a", "s"],
      w: ["q", "e", "a", "s", "d"],
      e: ["w", "r", "s", "d", "f"],
      r: ["e", "t", "d", "f", "g"],
      t: ["r", "y", "f", "g", "h"],
      y: ["t", "u", "g", "h", "j"],
      u: ["y", "i", "h", "j", "k"],
      i: ["u", "o", "j", "k", "l"],
      o: ["i", "p", "k", "l"],
      p: ["o", "l"],
      a: ["q", "w", "s", "z"],
      s: ["a", "w", "e", "d", "z", "x"],
      d: ["s", "e", "r", "f", "x", "c"],
      f: ["d", "r", "t", "g", "c", "v"],
      g: ["f", "t", "y", "h", "v", "b"],
      h: ["g", "y", "u", "j", "b", "n"],
      j: ["h", "u", "i", "k", "n", "m"],
      k: ["j", "i", "o", "l", "m"],
      l: ["k", "o", "p"],
      z: ["a", "s", "x"],
      x: ["z", "s", "d", "c"],
      c: ["x", "d", "f", "v"],
      v: ["c", "f", "g", "b"],
      b: ["v", "g", "h", "n"],
      n: ["b", "h", "j", "m"],
      m: ["n", "j", "k"],
    };
  }

  /**
   * Gets a nearby key for a character based on QWERTY keyboard layout
   * @param {string} char - The character to find a nearby typo for
   * @returns {string} A nearby character on the keyboard
   */
  getNearbyKey(char) {
    const lowerChar = char.toLowerCase();
    const nearby = this.keyboardProximity[lowerChar];

    if (nearby && nearby.length > 0) {
      return nearby[Math.floor(Math.random() * nearby.length)];
    }

    return char;
  }

  /**
   * Animates text change with terminal-style effects
   * @param {string} newText - The text to animate to
   */
  async animateChange(newText) {
    if (this.currentAnimation) {
      this.currentAnimation.cancel = true;
    }

    if (!this.textContent || !this.cursor) return;

    const currentText = this.textContent.textContent;

    const animation = { cancel: false };
    this.currentAnimation = animation;

    await wait(this.settings.pauseBeforeNormalMode);
    if (animation.cancel) return;

    this.cursor.classList.remove("terminal-cursor--insert");
    this.cursor.classList.add("terminal-cursor--block", "animating");
    this.cursor.textContent = "█";
    await wait(this.settings.pauseInNormalMode);
    if (animation.cancel) return;

    this.textContent.innerHTML = currentText
      .split("")
      .map((char) => `<span class="highlighted">${char}</span>`)
      .join("");

    this.cursor.textContent = "";
    await wait(this.settings.selectionDisplay);

    if (animation.cancel) {
      this.textContent.innerHTML = "";
      await wait(this.settings.interruptedDeletionPause);
    } else {
      this.textContent.innerHTML = "";
      await wait(this.settings.deletionPause);
      if (animation.cancel) return;
    }

    this.cursor.classList.remove("terminal-cursor--block", "animating");
    this.cursor.classList.add("terminal-cursor--insert");
    this.cursor.textContent = "";
    await wait(this.settings.pauseBeforeInsertMode);
    if (animation.cancel) return;

    this.textContent.textContent = "";
    const typingStartTime = performance.now();

    for (let i = 0; i < newText.length; i++) {
      if (animation.cancel) return;

      const shouldTypo =
        Math.random() < this.settings.typoChance &&
        newText[i] !== " " &&
        i < newText.length - 1;

      if (shouldTypo) {
        const rand = Math.random();
        let typoLength;
        if (rand < this.settings.typoLengthDistribution[1]) {
          typoLength = 1;
        } else if (
          rand <
          this.settings.typoLengthDistribution[1] +
            this.settings.typoLengthDistribution[2]
        ) {
          typoLength = 2;
        } else {
          typoLength = 3;
        }
        const typoChars = [];

        typoChars.push(this.getNearbyKey(newText[i]));
        for (let t = 1; t < typoLength; t++) {
          if (i + t < newText.length) {
            typoChars.push(newText[i + t]);
          }
        }

        for (const wrongChar of typoChars) {
          this.textContent.textContent += wrongChar;
          const { min, max } = this.settings.typoTypingSpeed;
          await wait(min + Math.random() * (max - min));
          if (animation.cancel) return;
        }

        const { min, max } = this.settings.typoNoticePause;
        await wait(min + Math.random() * (max - min));
        if (animation.cancel) return;

        if (typoLength === 3) {
          await wait(this.settings.pauseBeforeNormalMode);
          if (animation.cancel) return;

          this.cursor.classList.remove("terminal-cursor--insert");
          this.cursor.classList.add("terminal-cursor--block");
          this.cursor.textContent = "█";
          await wait(this.settings.pauseInNormalMode);
          if (animation.cancel) return;

          const currentText = this.textContent.textContent;
          let wordStart = currentText.length - typoLength;

          while (wordStart > 0 && currentText[wordStart - 1] !== " ") {
            wordStart--;
          }

          const wordWithTypos = currentText.slice(wordStart);

          const beforeWord = currentText.slice(0, wordStart);
          const highlightedWord = wordWithTypos
            .split("")
            .map((char) => `<span class="highlighted">${char}</span>`)
            .join("");

          this.textContent.innerHTML = beforeWord + highlightedWord;

          this.cursor.textContent = "";
          await wait(this.settings.typoWordSelectionDisplay);
          if (animation.cancel) return;

          this.textContent.innerHTML = beforeWord;
          this.textContent.textContent = beforeWord;
          await wait(this.settings.typoWordDeletionPause);
          if (animation.cancel) return;

          this.cursor.classList.remove("terminal-cursor--block");
          this.cursor.classList.add("terminal-cursor--insert");
          this.cursor.textContent = "";
          await wait(this.settings.pauseBeforeInsertMode);
          if (animation.cancel) return;

          let wordEnd = i + 1;
          while (wordEnd < newText.length && newText[wordEnd] !== " ") {
            wordEnd++;
          }

          for (let w = wordStart; w < wordEnd; w++) {
            this.textContent.textContent += newText[w];
            const noise = noiseFunction(w, 0, typingStartTime * 0.001);
            await wait(
              this.settings.typingBase + noise * this.settings.typingVariation,
            );
            if (animation.cancel) return;
          }

          i = wordEnd - 1;

          await wait(this.settings.typoAfterWordRetype);
          if (animation.cancel) return;
          continue;
        } else {
          for (let t = 0; t < typoLength; t++) {
            this.textContent.textContent = this.textContent.textContent.slice(
              0,
              -1,
            );
            const { min, max } = this.settings.typoBackspaceSpeed;
            await wait(min + Math.random() * (max - min));
            if (animation.cancel) return;
          }

          await wait(this.settings.typoBeforeCorrectChar);
          if (animation.cancel) return;
        }
      }

      this.textContent.textContent += newText[i];

      const noise = noiseFunction(i, 0, typingStartTime * 0.001);
      const baseDelay =
        this.settings.typingBase + noise * this.settings.typingVariation;

      if (
        newText[i] === " " &&
        Math.random() < this.settings.typingThinkingChance
      ) {
        const { min, max } = this.settings.typingThinkingPause;
        await wait(min + Math.random() * (max - min));
      } else {
        await wait(baseDelay);
      }
    }

    await wait(200);
    if (animation.cancel) return;

    this.cursor.classList.remove("terminal-cursor--insert", "animating");
    this.cursor.classList.add("terminal-cursor--block");
    this.cursor.textContent = "█";

    this.currentAnimation = null;
  }

  animateToDefault() {
    return this.animateChange(this.defaultText);
  }
}
