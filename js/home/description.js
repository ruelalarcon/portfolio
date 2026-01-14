import { noiseFunction } from "../core/math.js";
import { wait } from "../core/async.js";

/**
 * Description - Terminal-style typewriter animation system for button hover descriptions
 *
 * Features:
 * - Terminal cursor states: block mode (█) for idle, insert mode (|) for typing
 * - Natural typing speed with noise-based variation
 * - Highlighting and deletion animations
 * - Animation cancellation for seamless transitions
 * - Occasional typos for realism with QWERTY keyboard proximity
 */
export class Description {
  constructor(descriptionElement) {
    this.element = descriptionElement;
    this.textContent = descriptionElement.querySelector(
      ".hero__description-text",
    );
    this.cursor = descriptionElement.querySelector(".terminal-cursor");
    this.currentAnimation = null;
    this.defaultText = descriptionElement.dataset.default || "";

    // Configuration settings (all timing values in milliseconds)
    this.settings = {
      // Mode transitions
      pauseBeforeNormalMode: 300, // Pause before pressing Esc
      pauseInNormalMode: 100, // Brief pause after entering normal mode
      pauseBeforeInsertMode: 150, // Pause before entering insert mode (after delete)

      // Selection and deletion
      selectionDisplay: 400, // How long to show highlighted selection
      deletionPause: 100, // Pause after deleting text
      interruptedDeletionPause: 50, // Faster deletion when interrupted

      // Typing speeds
      typingBase: 30, // Base typing delay
      typingVariation: 15, // Max variation added by noise function
      typingThinkingPause: { min: 100, max: 200 }, // Random pause at spaces
      typingThinkingChance: 0.3, // 30% chance to pause at spaces

      // Typo behavior
      typoChance: 0.01, // 1% chance per character to make a typo
      typoLengthDistribution: {
        // Distribution of typo lengths
        1: 0.3, // 30% chance for 1-char typo
        2: 0.3, // 30% chance for 2-char typo
        3: 0.4, // 40% chance for 3-char typo (triggers word selection)
      },

      // Typo timing
      typoTypingSpeed: { min: 80, max: 120 }, // Faster typing during typo
      typoNoticePause: { min: 50, max: 100 }, // Pause when noticing typo
      typoBackspaceSpeed: { min: 50, max: 80 }, // Backspace speed
      typoWordSelectionDisplay: 200, // How long to show word selection for 3-char typos
      typoWordDeletionPause: 150, // Pause after deleting word
      typoBeforeCorrectChar: 100, // Pause before typing correct character
      typoAfterWordRetype: 100, // Pause after retyping whole word
    };

    // QWERTY keyboard layout mapping - each key maps to nearby keys
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
      // Return a random nearby key
      return nearby[Math.floor(Math.random() * nearby.length)];
    }

    // Fallback to original character if not in mapping
    return char;
  }

  /**
   * Animates text change with terminal-style effects
   * @param {string} newText - The text to animate to
   */
  async animateChange(newText) {
    // Cancel any ongoing animation
    if (this.currentAnimation) {
      this.currentAnimation.cancel = true;
    }

    if (!this.textContent || !this.cursor) return;

    const currentText = this.textContent.textContent;

    // Create animation controller
    const animation = { cancel: false };
    this.currentAnimation = animation;

    // Pause before switching to normal mode
    await wait(this.settings.pauseBeforeNormalMode);
    if (animation.cancel) return;

    // Switch to block mode cursor (normal mode) for editing
    this.cursor.classList.remove("terminal-cursor--insert");
    this.cursor.classList.add("terminal-cursor--block", "animating");
    this.cursor.textContent = "█";
    await wait(this.settings.pauseInNormalMode);
    if (animation.cancel) return;

    // Highlight text by wrapping each character
    this.textContent.innerHTML = currentText
      .split("")
      .map((char) => `<span class="highlighted">${char}</span>`)
      .join("");

    // Hide cursor during selection (cursor is "on top" of first selected char)
    this.cursor.textContent = "";
    await wait(this.settings.selectionDisplay);

    if (animation.cancel) {
      // If interrupted, skip to deletion and start new text
      this.textContent.innerHTML = "";
      await wait(this.settings.interruptedDeletionPause);
    } else {
      // Delete highlighted text
      this.textContent.innerHTML = "";
      await wait(this.settings.deletionPause);
      if (animation.cancel) return;
    }

    // Switch to insert mode cursor immediately (like pressing 'c' to change)
    this.cursor.classList.remove("terminal-cursor--block", "animating");
    this.cursor.classList.add("terminal-cursor--insert");
    this.cursor.textContent = "";
    await wait(this.settings.pauseBeforeInsertMode);
    if (animation.cancel) return;

    // Type new text with natural variation and occasional typos
    this.textContent.textContent = "";
    const typingStartTime = performance.now();

    for (let i = 0; i < newText.length; i++) {
      if (animation.cancel) return;

      // Small chance to make a typo (but not on spaces or last character)
      const shouldTypo =
        Math.random() < this.settings.typoChance &&
        newText[i] !== " " &&
        i < newText.length - 1;

      if (shouldTypo) {
        // Generate 1-3 typo characters based on distribution
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

        // First character is wrong (nearby key), rest are correct
        typoChars.push(this.getNearbyKey(newText[i]));
        for (let t = 1; t < typoLength; t++) {
          // Subsequent characters are the correct characters from the intended word
          if (i + t < newText.length) {
            typoChars.push(newText[i + t]);
          }
        }

        // Type wrong characters
        for (const wrongChar of typoChars) {
          this.textContent.textContent += wrongChar;
          const { min, max } = this.settings.typoTypingSpeed;
          await wait(min + Math.random() * (max - min));
          if (animation.cancel) return;
        }

        const { min, max } = this.settings.typoNoticePause;
        await wait(min + Math.random() * (max - min));
        if (animation.cancel) return;

        // For 3-character typos, select and delete the whole word
        if (typoLength === 3) {
          // Pause before switching to normal mode
          await wait(this.settings.pauseBeforeNormalMode);
          if (animation.cancel) return;

          // Switch to block mode cursor (normal mode)
          this.cursor.classList.remove("terminal-cursor--insert");
          this.cursor.classList.add("terminal-cursor--block");
          this.cursor.textContent = "█";
          await wait(this.settings.pauseInNormalMode);
          if (animation.cancel) return;

          // Find the start of the current word
          const currentText = this.textContent.textContent;
          let wordStart = currentText.length - typoLength;

          // Move back to find the start of the word (last space or beginning)
          while (wordStart > 0 && currentText[wordStart - 1] !== " ") {
            wordStart--;
          }

          // Get the word with typos
          const wordWithTypos = currentText.slice(wordStart);

          // Highlight the word by wrapping characters
          const beforeWord = currentText.slice(0, wordStart);
          const highlightedWord = wordWithTypos
            .split("")
            .map((char) => `<span class="highlighted">${char}</span>`)
            .join("");

          this.textContent.innerHTML = beforeWord + highlightedWord;

          // Hide cursor during selection (cursor is "on top" of first selected char)
          this.cursor.textContent = "";
          await wait(this.settings.typoWordSelectionDisplay);
          if (animation.cancel) return;

          // Delete the whole word (still in normal mode)
          this.textContent.innerHTML = beforeWord;
          this.textContent.textContent = beforeWord; // Convert back to plain text
          await wait(this.settings.typoWordDeletionPause);
          if (animation.cancel) return;

          // Switch back to insert mode for retyping
          this.cursor.classList.remove("terminal-cursor--block");
          this.cursor.classList.add("terminal-cursor--insert");
          this.cursor.textContent = "";
          await wait(this.settings.pauseBeforeInsertMode);
          if (animation.cancel) return;

          // Find where the current word ends in newText (find next space or end)
          let wordEnd = i + 1;
          while (wordEnd < newText.length && newText[wordEnd] !== " ") {
            wordEnd++;
          }

          // Retype the word correctly from wordStart position to wordEnd
          for (let w = wordStart; w < wordEnd; w++) {
            this.textContent.textContent += newText[w];
            const noise = noiseFunction(w, 0, typingStartTime * 0.001);
            await wait(
              this.settings.typingBase + noise * this.settings.typingVariation,
            );
            if (animation.cancel) return;
          }

          // Skip ahead in the main loop since we've already typed this word
          i = wordEnd - 1; // -1 because loop will increment

          await wait(this.settings.typoAfterWordRetype);
          if (animation.cancel) return;
          continue; // Skip the normal character typing below
        } else {
          // For 1-2 character typos, just backspace
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

      // Type correct character
      this.textContent.textContent += newText[i];

      // Use noise function for natural variation
      const noise = noiseFunction(i, 0, typingStartTime * 0.001);
      const baseDelay =
        this.settings.typingBase + noise * this.settings.typingVariation;

      // Burst typing: longer pause at spaces
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

    // Switch back to block mode cursor
    this.cursor.classList.remove("terminal-cursor--insert", "animating");
    this.cursor.classList.add("terminal-cursor--block");
    this.cursor.textContent = "█";

    this.currentAnimation = null;
  }

  /**
   * Animates back to default text
   */
  animateToDefault() {
    return this.animateChange(this.defaultText);
  }
}
