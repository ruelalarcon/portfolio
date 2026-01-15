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
          `Hiya~ I'm currently ${age} years old and originally from the Philippines, though I moved away by the time I was 1. My beginnings as a programmer started in elementary school, where I learned the basics of Lua by editing and writing scripts for Roblox exploits. From that point I became interested in stuff like Minecraft server plugins and eventually networking.`,
          "",
          "Now, I'm always working on my next project. I usually like keeping up with stuff like developments in AI (not strictly LLMs) and web technologies. That said, I also have a deep fondness for low-level code and code optimization, especially as scalability becomes more and more important for the internet.",
        ],
        delay: 0,
      },
      { type: "pause", duration: 400 },
      { type: "command", text: "lua cube.lua" },
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
          "Though it's been pretty difficult, even since I was a kid I'd usually try to watch as many seasonal animes as I could. Nothing beats watching an anime as it releases its episodes week by week.",
          "",
          "In general I'd say anime has been a pretty foundational part of my life, from entertainment to also being a major source of inspiration for my creative projects from music to programming.",
        ],
        delay: 0,
      },
      { type: "pause", duration: 400 },
      { type: "command", text: "make" },
      { type: "pause", duration: 100 },
      {
        type: "output",
        lines: ["gcc -c waifu.c -o waifu.o", "gcc waifu.o -o waifu"],
        delay: 50,
      },
      { type: "pause", duration: 200 },
      { type: "command", text: "./waifu" },
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
          "I'm also a professional jazz pianist! Though very occasionally, you may find me doing gigs at various places. After an introductory few years of classical lessons, I began self-teaching jazz piano and have been for over 10 years.",
          "",
          "I also grew up listening to dubstep and EDM, so I've come to absolutely love electronic music, as well as genres that blend jazzy harmonies with interesting sound design, like Future Bass, Glitch Hop, and other EDM genres.",
          "",
          "Here's one of my favorite songs: linear ring - enchanted love. Simply scroll down and hit play.",
        ],
        delay: 0,
      },
      { type: "pause", duration: 400 },
      { type: "command", text: "cd music_video/ && cargo run" },
      { type: "pause", duration: 100 },
      {
        type: "output",
        lines: [
          "   Compiling music_video v0.1.0",
          "    Finished dev [unoptimized + debuginfo] target(s) in 0.83s",
          "     Running `target/debug/music_video`",
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
