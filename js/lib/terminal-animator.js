/**
 * TerminalAnimator
 * Reusable class for animating terminal command sequences
 * Supports typing commands, showing output, and pauses
 * Automatically triggers animation when container comes into view
 */

import { wait } from "../core/async.js";
import { noiseFunction } from "../core/math.js";

class TerminalAnimator {
  /**
   * @param {HTMLElement} container - The container element for terminal output
   * @param {Object} options - Configuration options
   * @param {string} options.prompt - Terminal prompt (e.g., "$", ">", "user@host:~$")
   * @param {number} options.typingSpeed - Base typing speed in ms per character
   * @param {number} options.typingVariance - Variance in typing speed in ms (default: 15, range will be ±variance)
   * @param {number} options.viewDelay - Delay in ms after coming into view before starting (default: 500)
   * @param {number} options.threshold - Intersection observer threshold (default: 0.1)
   */
  constructor(container, options = {}) {
    this.container = container;
    this.prompt = options.prompt || "$";
    this.typingSpeed = options.typingSpeed || 35;
    this.typingVariance =
      options.typingVariance !== undefined ? options.typingVariance : 15;
    this.viewDelay = options.viewDelay !== undefined ? options.viewDelay : 500;
    this.threshold = options.threshold !== undefined ? options.threshold : 0.1;

    this.currentLine = null;
    this.cursor = null;
    this.isCancelled = false;
    this.sequence = null;
    this.observer = null;
    this.isRunning = false;
  }

  /**
   * Setup intersection observer to run animation when container comes into view
   * @param {Array} sequence - Array of command objects (same format as run())
   * Each command object can be:
   * - { type: 'command', text: '...' } - Type a command
   * - { type: 'output', lines: [...] } - Show output lines instantly
   * - { type: 'pause', duration: ms } - Pause for duration
   * - { type: 'callback', fn: () => {} } - Execute callback function
   */
  setupViewTrigger(sequence) {
    this.sequence = sequence;
    this.hasRun = false;

    // Create intersection observer
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !this.isRunning && !this.hasRun) {
            this._onEnterView();
          }
        });
      },
      { threshold: this.threshold },
    );

    // Start observing
    this.observer.observe(this.container);
  }

  /**
   * Called when container enters view
   */
  async _onEnterView() {
    if (!this.sequence || this.isRunning || this.hasRun) return;

    // Mark as run so it only happens once
    this.hasRun = true;

    // Wait for viewDelay before starting
    await wait(this.viewDelay);

    // Run the sequence
    await this.run(this.sequence);
  }

  /**
   * Run a sequence of terminal commands and outputs
   * @param {Array} sequence - Array of command objects
   */
  async run(sequence) {
    this.isRunning = true;
    this.isCancelled = false;
    this.container.innerHTML = "";

    for (const step of sequence) {
      if (this.isCancelled) break;

      if (step.type === "command") {
        await this._typeCommand(step.text);
      } else if (step.type === "output") {
        await this._showOutput(step.lines, step.delay);
      } else if (step.type === "pause") {
        await wait(step.duration);
      } else if (step.type === "callback") {
        await step.fn();
      }
    }

    // Remove cursor at the end
    if (this.cursor && this.cursor.parentNode) {
      this.cursor.remove();
    }

    this.isRunning = false;
  }

  /**
   * Cancel the current animation
   */
  cancel() {
    this.isCancelled = true;
  }

  /**
   * Stop observing and cleanup
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.cancel();
  }

  /**
   * Type out a command with natural variation
   */
  async _typeCommand(text) {
    // Create new line with prompt
    const line = document.createElement("div");
    line.className = "terminal-line";

    const promptSpan = document.createElement("span");
    promptSpan.className = "terminal-prompt";
    promptSpan.textContent = this.prompt + " ";

    const commandSpan = document.createElement("span");
    commandSpan.className = "terminal-command";

    const cursor = document.createElement("span");
    cursor.className = "terminal-cursor terminal-cursor--block";
    cursor.textContent = "█";

    line.appendChild(promptSpan);
    line.appendChild(commandSpan);
    line.appendChild(cursor);

    this.container.appendChild(line);
    this.currentLine = commandSpan;
    this.cursor = cursor;

    // Type each character with natural variation
    for (let i = 0; i < text.length; i++) {
      if (this.isCancelled) return;

      commandSpan.textContent += text[i];

      // Natural typing variation using noise function
      const noise = (noiseFunction(i * 0.3, 0, i) + 1) / 2; // Convert from [-1,1] to [0,1], use i as time for variance
      const variation = noise * (this.typingVariance * 2) - this.typingVariance; // Range: -typingVariance to +typingVariance
      const delay = this.typingSpeed + variation;
      await wait(delay);

      // Occasional pause at spaces
      if (text[i] === " " && Math.random() < 0.3) {
        await wait(50 + Math.random() * 100);
      }
    }

    // Brief pause before pressing enter
    await wait(150 + Math.random() * 150);

    // Remove cursor from this line
    cursor.remove();
  }

  /**
   * Show output lines
   */
  async _showOutput(lines, delayBetweenLines = 0) {
    for (const lineText of lines) {
      if (this.isCancelled) return;

      const line = document.createElement("div");
      line.className = "terminal-output";
      // Use non-breaking space for empty lines to prevent collapse
      line.innerHTML = lineText || "&nbsp;";
      this.container.appendChild(line);

      if (delayBetweenLines > 0) {
        await wait(delayBetweenLines);
      }
    }
  }
}

export { TerminalAnimator };
