/**
 * TerminalInstance
 * Individual terminal animation instance
 * Handles typing commands, showing output, and executing callbacks
 */

import { wait } from "../../core/async.js";
import { noiseFunction } from "../../core/math.js";

class TerminalInstance {
  constructor(container, sequence, transformerFn, options = {}) {
    this.container = container;
    this.sequence = sequence;
    this.transformerFn = transformerFn;
    this.prompt = options.prompt || "$";
    this.typingSpeed = options.typingSpeed || 35;
    this.typingVariance =
      options.typingVariance !== undefined ? options.typingVariance : 15;
    this.viewDelay = options.viewDelay !== undefined ? options.viewDelay : 500;
    this.threshold = options.threshold !== undefined ? options.threshold : 0.1;

    this.callbacks = {};
    this.currentLine = null;
    this.cursor = null;
    this.isCancelled = false;
    this.observer = null;
    this.isRunning = false;
    this.hasRun = false;
  }

  registerCallback(name, fn) {
    this.callbacks[name] = fn;
  }

  arm() {
    if (this.observer) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !this.isRunning && !this.hasRun) {
            this._onEnterView();
          }
        });
      },
      { threshold: this.threshold }
    );

    this.observer.observe(this.container);
  }

  async _onEnterView() {
    if (this.isRunning || this.hasRun) return;

    this.hasRun = true;
    await wait(this.viewDelay);
    await this.run();
  }

  async run() {
    this.isRunning = true;
    this.isCancelled = false;
    this.container.innerHTML = "";

    for (const step of this.sequence) {
      if (this.isCancelled) break;

      if (step.type === "command") {
        await this._typeCommand(step.text);
      } else if (step.type === "output") {
        const lines = step.lines.map((line) => this.transformerFn(line));
        await this._showOutput(lines, step.delay);
      } else if (step.type === "pause") {
        await wait(step.duration);
      } else if (step.type === "callback") {
        const fn = this.callbacks[step.name];
        if (fn) {
          await fn();
        } else {
          console.warn(
            `TerminalInstance: callback "${step.name}" not registered`
          );
        }
      }
    }

    if (this.cursor && this.cursor.parentNode) {
      this.cursor.remove();
    }

    this.isRunning = false;
  }

  cancel() {
    this.isCancelled = true;
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.cancel();
  }

  async _typeCommand(text) {
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

    for (let i = 0; i < text.length; i++) {
      if (this.isCancelled) return;

      commandSpan.textContent += text[i];

      const noise = (noiseFunction(i * 0.3, 0, i) + 1) / 2;
      const variation = noise * (this.typingVariance * 2) - this.typingVariance;
      const delay = this.typingSpeed + variation;
      await wait(delay);

      if (text[i] === " " && Math.random() < 0.3) {
        await wait(50 + Math.random() * 100);
      }
    }

    await wait(150 + Math.random() * 150);

    cursor.remove();
  }

  async _showOutput(lines, delayBetweenLines = 0) {
    for (const lineText of lines) {
      if (this.isCancelled) return;

      const line = document.createElement("div");
      line.className = "terminal-output";
      line.innerHTML = lineText || "&nbsp;";
      this.container.appendChild(line);

      if (delayBetweenLines > 0) {
        await wait(delayBetweenLines);
      }
    }
  }
}

export { TerminalInstance };
