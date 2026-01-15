/**
 * About Section
 * Manages terminal-style about me display with three sections:
 * - Coding background and interests
 * - Anime passion
 * - Music (jazz piano and electronic music)
 * Each section has its own terminal animation followed by a WebGL ASCII visualization
 */

import { TerminalAnimator } from "../lib/terminal-animator.js";
import { CodingAnimation } from "./about/coding.js";
import { AnimeAnimation } from "./about/anime.js";
import { MusicAnimation } from "./about/music.js";

/**
 * Calculate current age dynamically
 * Born: December 28, 2004
 */
function calculateAge() {
  const birthDate = new Date(2004, 11, 28); // Month is 0-indexed
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  // Adjust if birthday hasn't occurred this year yet
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
    this.codingComplete = false;
    this.animeComplete = false;
  }

  init() {
    // Initialize first section - others will initialize when previous completes
    this._initCodingSection();
  }

  /**
   * Initialize coding section with terminal animation
   */
  _initCodingSection() {
    const terminalElement = document.getElementById("codingTerminal");
    const visualElement = document.getElementById("codingVisual");
    const age = calculateAge();

    const animator = new TerminalAnimator(terminalElement);

    const sequence = [
      { type: "command", text: "cat coding.txt" },
      { type: "pause", duration: 100 },
      {
        type: "output",
        lines: [
          `I'm ${age} years old and originally from the Philippines, though I moved away by the time I was 1. My beginnings as a programmer started in elementary school, where I learned the basics of Lua by editing and writing scripts for Roblox exploits.`,
          "",
          "These days, I'm always working on my next project. I also try to keep up with newer developments in AI (not strictly LLMs) and web technologies. That said, I also have a deep fondness for lower-level code and microoptimization—there's something satisfying about squeezing out every bit of performance.",
        ],
        delay: 0,
      },
      { type: "pause", duration: 400 },
      { type: "command", text: "lua animation.lua" },
      { type: "pause", duration: 100 },
      { type: "callback", fn: () => this._showCodingVisual(visualElement) },
    ];

    animator.setupViewTrigger(sequence);
  }

  /**
   * Initialize anime section with terminal animation
   */
  _initAnimeSection() {
    const terminalElement = document.getElementById("animeTerminal");
    const visualElement = document.getElementById("animeVisual");

    const animator = new TerminalAnimator(terminalElement);

    const sequence = [
      { type: "command", text: "cat anime.txt" },
      { type: "pause", duration: 100 },
      {
        type: "output",
        lines: [
          "Though it's been a struggle, I usually try to schedule and watch as many seasonal animes as I can each season, watching each episode as they release week by week for dozens of shows.",
          "",
          "Anime has been a foundational part of me as I've grown up with it, along with reading plenty of manga and light novels. It's shaped my interests, aesthetics, and even how I approach creative projects.",
        ],
        delay: 0,
      },
      { type: "pause", duration: 400 },
      { type: "command", text: "make" },
      { type: "pause", duration: 100 },
      {
        type: "output",
        lines: [
          "gcc -c animation.c -o animation.o",
          "gcc animation.o -o animation",
        ],
        delay: 50,
      },
      { type: "pause", duration: 200 },
      { type: "command", text: "./animation" },
      { type: "pause", duration: 100 },
      { type: "callback", fn: () => this._showAnimeVisual(visualElement) },
    ];

    animator.setupViewTrigger(sequence);
  }

  /**
   * Initialize music section with terminal animation
   */
  _initMusicSection() {
    const terminalElement = document.getElementById("musicTerminal");
    const visualElement = document.getElementById("musicVisual");

    const animator = new TerminalAnimator(terminalElement);

    const sequence = [
      { type: "command", text: "cat music.txt" },
      { type: "pause", duration: 100 },
      {
        type: "output",
        lines: [
          "I'm also a professional jazz pianist! Very occasionally I'll be doing gigs at various places. After a first few years of classical lessons, I began self-teaching jazz piano and have been for over 10 years.",
          "",
          "I also grew up listening to dubstep and EDM, so I've come to absolutely love electronic music, as well as genres that blend jazzy harmonies with interesting sound design, like Future Bass, Glitch Hop, and other EDM genres.",
        ],
        delay: 0,
      },
      { type: "pause", duration: 400 },
      { type: "command", text: "cd animation && cargo run" },
      { type: "pause", duration: 100 },
      {
        type: "output",
        lines: [
          "   Compiling animation v0.1.0",
          "    Finished dev [unoptimized + debuginfo] target(s) in 0.83s",
          "     Running `target/debug/animation`",
        ],
        delay: 80,
      },
      { type: "pause", duration: 100 },
      { type: "callback", fn: () => this._showMusicVisual(visualElement) },
    ];

    animator.setupViewTrigger(sequence);
  }

  /**
   * Show coding visual after terminal animation
   */
  async _showCodingVisual(container) {
    if (!container) return;
    container.style.display = "flex";

    const animation = new CodingAnimation();
    await animation.init(container);
    this.animations.push(animation);

    // Mark as complete and initialize next section
    this.codingComplete = true;
    this._initAnimeSection();
  }

  /**
   * Show anime visual after terminal animation
   */
  async _showAnimeVisual(container) {
    if (!container) return;
    container.style.display = "flex";

    const animation = new AnimeAnimation();
    await animation.init(container);
    this.animations.push(animation);

    // Mark as complete and initialize next section
    this.animeComplete = true;
    this._initMusicSection();
  }

  /**
   * Show music visual after terminal animation
   */
  async _showMusicVisual(container) {
    if (!container) return;
    container.style.display = "flex";

    const animation = new MusicAnimation();
    await animation.init(container);
    this.animations.push(animation);
  }

  /**
   * Cleanup method
   */
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
