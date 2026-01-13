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
 * - Occasional typos for realism
 */
export class Description {
  constructor(descriptionElement) {
    this.element = descriptionElement;
    this.textContent = descriptionElement.querySelector(".text-content");
    this.cursor = descriptionElement.querySelector(".cursor");
    this.currentAnimation = null;
    this.defaultText = descriptionElement.dataset.default || "";

    // Typo character set (common typo keys)
    this.typoChars = "sdrei";
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

    // Move cursor to end and pause
    this.cursor.classList.add("animating");
    await wait(100);
    if (animation.cancel) return;

    // Highlight text by wrapping each character
    this.textContent.innerHTML = currentText
      .split("")
      .map((char) => `<span class="highlighted">${char}</span>`)
      .join("");
    await wait(400);

    if (animation.cancel) {
      // If interrupted, skip to deletion and start new text
      this.textContent.innerHTML = "";
      this.cursor.classList.remove("block");
      this.cursor.classList.add("insert");
      this.cursor.textContent = "";
      await wait(50);
    } else {
      // Delete highlighted text
      this.textContent.innerHTML = "";
      await wait(100);
      if (animation.cancel) return;

      // Switch to insert mode cursor
      this.cursor.classList.remove("block");
      this.cursor.classList.add("insert");
      this.cursor.textContent = "";
      await wait(300);
    }

    if (animation.cancel) return;

    // Type new text with natural variation and occasional typos
    this.textContent.textContent = "";
    const typingStartTime = performance.now();

    for (let i = 0; i < newText.length; i++) {
      if (animation.cancel) return;

      // Small chance to make a typo (but not on spaces or last character)
      const shouldTypo =
        Math.random() < 0.02 && newText[i] !== " " && i < newText.length - 1;

      if (shouldTypo) {
        // Type wrong character
        const wrongChar =
          this.typoChars[Math.floor(Math.random() * this.typoChars.length)];
        this.textContent.textContent += wrongChar;
        await wait(200);
        if (animation.cancel) return;

        // Backspace
        this.textContent.textContent = this.textContent.textContent.slice(
          0,
          -1,
        );
        await wait(100);
        if (animation.cancel) return;
      }

      // Type correct character
      this.textContent.textContent += newText[i];

      // Use noise function for natural variation
      const noise = noiseFunction(i, 0, typingStartTime * 0.001);
      const baseDelay = 30 + noise * 45;

      // Burst typing: longer pause at spaces (Medium chance for "thinking" pause)
      if (newText[i] === " " && Math.random() < 0.3) {
        await wait(100 + Math.random() * 100);
      } else {
        await wait(baseDelay);
      }
    }

    await wait(200);
    if (animation.cancel) return;

    // Switch back to block mode cursor
    this.cursor.classList.remove("insert", "animating");
    this.cursor.classList.add("block");
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
