/**
 * TerminalAnimator
 * Manager class for terminal command sequence animations
 * Parses sequences from semantic HTML and manages TerminalInstance objects
 *
 * HTML Format:
 * <div class="terminal-animation" id="myTerminal">
 *   <div data-command>command text</div>
 *   <div data-pause="100"></div>
 *   <div data-output data-delay="50">
 *     <p>Line 1</p>
 *     <p>Line 2</p>
 *   </div>
 *   <div data-callback="callbackName"></div>
 * </div>
 */

import { TerminalInstance } from "./instance.js";

class TerminalAnimator {
  constructor() {
    this.instances = new Map();
    this.transformers = new Map();
  }

  init() {
    const containers = document.querySelectorAll(".terminal-animation");

    containers.forEach((container) => {
      const targetId = container.id;
      if (!targetId) {
        console.warn("TerminalAnimator: .terminal-animation element missing id");
        return;
      }

      const sequence = this._parseContainer(container);
      const transformerFn = (html) => this._applyTransformers(html, targetId);
      const instance = new TerminalInstance(container, sequence, transformerFn);
      this.instances.set(targetId, instance);

      container.innerHTML = "";
    });
  }

  get(id) {
    return this.instances.get(id);
  }

  registerCallback(terminalId, name, fn) {
    const instance = this.instances.get(terminalId);
    if (instance) {
      instance.registerCallback(name, fn);
    } else {
      console.warn(`TerminalAnimator: terminal "${terminalId}" not found`);
    }
  }

  registerTransformer(terminalId, name, fn) {
    const key = `${terminalId}:${name}`;
    this.transformers.set(key, fn);
  }

  arm(terminalId) {
    const instance = this.instances.get(terminalId);
    if (instance) {
      instance.arm();
    } else {
      console.warn(`TerminalAnimator: terminal "${terminalId}" not found`);
    }
  }

  destroy() {
    this.instances.forEach((instance) => instance.destroy());
    this.instances.clear();
    this.transformers.clear();
  }

  _parseContainer(container) {
    const sequence = [];
    const children = container.children;

    for (const child of children) {
      if (child.hasAttribute("data-command")) {
        sequence.push({
          type: "command",
          text: child.textContent.trim(),
        });
      } else if (child.hasAttribute("data-pause")) {
        sequence.push({
          type: "pause",
          duration: parseInt(child.dataset.pause, 10) || 0,
        });
      } else if (child.hasAttribute("data-output")) {
        const delay = parseInt(child.dataset.delay, 10) || 0;
        const lines = this._parseOutputLines(child);
        sequence.push({
          type: "output",
          lines,
          delay,
        });
      } else if (child.hasAttribute("data-callback")) {
        sequence.push({
          type: "callback",
          name: child.dataset.callback,
        });
      }
    }

    return sequence;
  }

  _parseOutputLines(element) {
    const lines = [];
    const children = element.children;

    if (children.length === 0) {
      const text = element.innerHTML.trim();
      if (text) {
        lines.push(text);
      }
      return lines;
    }

    for (const child of children) {
      lines.push(child.innerHTML || "");
    }

    return lines;
  }

  _applyTransformers(html, terminalId) {
    const transformerPattern = /\{\{(\w+)\}\}/g;

    return html.replace(transformerPattern, (match, name) => {
      const key = `${terminalId}:${name}`;
      const transformer = this.transformers.get(key);

      if (transformer) {
        return transformer();
      }

      console.warn(
        `TerminalAnimator: transformer "${name}" not registered for "${terminalId}"`
      );
      return match;
    });
  }
}

export { TerminalAnimator };
