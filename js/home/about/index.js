/**
 * About Section
 * Manages terminal-style about me display with three sections:
 * - Coding background and interests
 * - Anime passion
 * - Music (jazz piano and electronic music)
 * Each section has its own terminal animation followed by a WebGL ASCII visualization
 */

import { TerminalAnimator } from "../../lib/terminal-animator.js";
import { CodingAnimation } from "./coding/index.js";
import { AnimeAnimation } from "./anime/index.js";
import { MusicAnimation } from "./music/index.js";

function calculateAge() {
  const birthDate = new Date(2004, 11, 28);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

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
    this._initCodingSection();
  }

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
      { type: "command", text: "poetry install" },
      { type: "pause", duration: 100 },
      {
        type: "output",
        lines: [
          "Installing dependencies from lock file",
          "",
          "Package operations: 1 install, 0 updates, 0 removals",
          "",
          "  - Installing ascii-bresenham (1.2.0)",
        ],
        delay: 50,
      },
      { type: "pause", duration: 200 },
      { type: "command", text: "poetry run python cube.py" },
      { type: "pause", duration: 100 },
      { type: "callback", fn: () => this._showCodingVisual(visualElement) },
    ];

    animator.setupViewTrigger(sequence);
  }

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
          "Watching anime has always been one of my favorite hobbies, ever since I was a kid. Nothing beats watching an anime as its episodes release week by week.",
          "",
          "In general I'd say anime has been a pretty foundational inspiration for my creative projects in both music and programming.",
        ],
        delay: 0,
      },
      { type: "pause", duration: 400 },
      { type: "command", text: "vcpkg install" },
      { type: "pause", duration: 100 },
      {
        type: "output",
        lines: [
          "Detecting compiler hash...",
          "The following packages will be built and installed:",
          "    live2d[core]",
          "Starting package 1/1: live2d",
          "Building live2d...",
          "Installing live2d...",
          "Elapsed time to handle live2d: 2.1 s",
          "Total install time: 2.1 s",
        ],
        delay: 50,
      },
      { type: "pause", duration: 200 },
      { type: "command", text: "cmake --build build" },
      { type: "pause", duration: 100 },
      {
        type: "output",
        lines: [
          "[ 20%] Building CXX object CMakeFiles/waifu.dir/src/main.cpp.o",
          "[ 40%] Building CXX object CMakeFiles/waifu.dir/src/renderer.cpp.o",
          "[ 60%] Building CXX object CMakeFiles/waifu.dir/src/model.cpp.o",
          "[ 80%] Building CXX object CMakeFiles/waifu.dir/src/physics.cpp.o",
          "[ 90%] Linking CXX executable waifu",
          "[100%] Built target waifu",
        ],
        delay: 30,
      },
      { type: "pause", duration: 200 },
      { type: "command", text: "./build/waifu" },
      { type: "pause", duration: 100 },
      { type: "callback", fn: () => this._showAnimeVisual(visualElement) },
    ];

    animator.setupViewTrigger(sequence);
  }

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
          "Another fun fact about me is that I'm also a professional jazz pianist! Very occasionally, you may find me doing gigs at various places such as the Sundog Arts & Entertainment Faire. After an introductory few years of classical lessons, I began self-teaching jazz piano and have been for over 10 years.",
          "",
          "I also grew up listening to dubstep and EDM, so I've come to absolutely love electronic music, as well as genres that blend jazzy harmonies with interesting sound design, like Future Bass, Glitch Hop, and other EDM genres.",
          "",
          "Below is one of my favorite songs! Simply scroll down and hit play.",
        ],
        delay: 0,
      },
      { type: "pause", duration: 400 },
      { type: "command", text: "cargo build" },
      { type: "pause", duration: 100 },
      {
        type: "output",
        lines: [
          "   Compiling ffmpeg-sys v0.5.2",
          "   Compiling ansi_colours v1.2.2",
          "   Compiling music_video v0.1.0",
          "    Finished dev [unoptimized + debuginfo] target(s) in 3.47s",
        ],
        delay: 60,
      },
      { type: "pause", duration: 200 },
      { type: "command", text: "cargo run" },
      { type: "pause", duration: 100 },
      {
        type: "output",
        lines: [
          "    Finished dev [unoptimized + debuginfo] target(s) in 0.08s",
          "     Running `target/debug/music_video`",
        ],
        delay: 80,
      },
      { type: "pause", duration: 100 },
      { type: "callback", fn: () => this._showMusicVisual(visualElement) },
    ];

    animator.setupViewTrigger(sequence);
  }

  async _showCodingVisual(container) {
    if (!container) return;
    container.style.display = "flex";

    const animation = new CodingAnimation();
    await animation.init(container);
    this.animations.push(animation);

    this.codingComplete = true;
    this._initAnimeSection();
  }

  async _showAnimeVisual(container) {
    if (!container) return;
    container.style.display = "flex";

    const animation = new AnimeAnimation();
    await animation.init(container);
    this.animations.push(animation);

    this.animeComplete = true;
    this._initMusicSection();
  }

  async _showMusicVisual(container) {
    if (!container) return;
    container.style.display = "flex";

    const animation = new MusicAnimation();
    await animation.init(container);
    this.animations.push(animation);

    const thanksElement = document.querySelector(".about__thanks");
    if (thanksElement) {
      thanksElement.classList.add("visible");
    }
  }

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
