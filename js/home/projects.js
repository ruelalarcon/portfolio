/**
 * Projects Section
 * Manages htop-style TUI project display with process list and detail panes
 * Parses project data from HTML for SEO, then removes the hidden data element
 */

import { noiseFunction } from "../core/math.js";
import { smoothScrollTo } from "../core/scroll.js";

const LANGUAGE_COLORS = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572a5",
  Lua: "#00a2ff",
  C: "#555555",
  "C++": "#f34b7d",
  "C#": "#178600",
  Rust: "#dea584",
  Go: "#00add8",
  Java: "#b07219",
  Ruby: "#701516",
  PHP: "#4f5d95",
  Swift: "#f05138",
  Kotlin: "#a97bff",
  GDScript: "#355570",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Shell: "#89e051",
  Svelte: "#ff3e00",
  React: "#61dafb",
  Text: "#888888",
};

class Projects {
  constructor() {
    this.projects = [];
    this.shownIndex = null;
    this.selectedIndex = null;
    this.previewIndex = null;
    this.mouseY = 0;
    this.processItems = [];
    this.noiseOffsets = [];
    this.onComplete = null;

    this.listElement = document.getElementById("projectsList");
    this.nameElement = document.getElementById("projectName");
    this.descriptionElement = document.getElementById(
      "projectDescriptionContent",
    );
    this.techElement = document.getElementById("projectTech");
    this.linksElement = document.getElementById("projectLinks");
    this.layoutElement = null;
  }

  init(terminalAnimator) {
    this._parseProjectsFromHTML();

    this.layoutElement = document.querySelector(".projects__layout");
    if (this.layoutElement) {
      this.layoutElement.style.display = "none";
    }

    const sequence = [
      { type: "command", text: "make" },
      { type: "pause", duration: 100 },
      {
        type: "output",
        lines: [
          "gcc -c src/project_manager.c -o build/project_manager.o",
          "gcc -c src/display_handler.c -o build/display_handler.o",
          "gcc -c src/process_monitor.c -o build/process_monitor.o",
          "gcc -c src/main.c -o build/main.o",
          "gcc build/project_manager.o build/display_handler.o build/process_monitor.o build/main.o -o build/my_projects",
          "ln -sf $(pwd)/build/my_projects /usr/local/bin/my_projects",
          "Build complete.",
        ],
        delay: 50,
      },
      { type: "pause", duration: 400 },
      { type: "command", text: "./my_projects --help" },
      { type: "pause", duration: 100 },
      {
        type: "output",
        lines: [
          "my_projects v1.0.0",
          "",
          "DESCRIPTION:",
          "    A top/htop-style resource monitor for displaying projects.",
          "    Shows active projects with details including PID, language,",
          "    command name, and memory usage.",
          "",
          "USAGE:",
          "    my_projects [OPTIONS]",
          "",
          "OPTIONS:",
          "    --help        Show this help message",
          "    --version     Show version information",
        ],
        delay: 0,
      },
      { type: "pause", duration: 600 },
      { type: "command", text: "./my_projects" },
      { type: "pause", duration: 200 },
      { type: "callback", fn: () => this._showTUI() },
    ];

    terminalAnimator.setupViewTrigger(sequence);
  }

  _showTUI() {
    if (this.layoutElement) {
      this.layoutElement.style.display = "grid";
    }

    this._renderProcessList();

    this._showDefaultState();

    this._setupMouseTracking();

    this._showScrollIndicator();

    if (this.onComplete) {
      this.onComplete();
    }
  }

  _showScrollIndicator() {
    const container = document.querySelector(".projects .section__container");
    if (!container) return;

    const indicator = document.createElement("div");
    indicator.className = "scroll-indicator show";
    indicator.innerHTML = `
      <span class="scroll-indicator__text">Scroll to 'About Me'</span>
      <span class="scroll-indicator__arrow">v</span>
    `;

    indicator.addEventListener("click", () => {
      const aboutSection = document.getElementById("about");
      const bodyContent = document.getElementById("bodyContent");
      if (aboutSection && bodyContent) {
        const simplebarInstance = window.SimpleBar.instances.get(bodyContent);
        if (simplebarInstance) {
          const scrollElement = simplebarInstance.getScrollElement();
          const targetOffset = aboutSection.offsetTop;
          smoothScrollTo(scrollElement, targetOffset);
        }
      }
    });

    container.appendChild(indicator);
  }

  _parseProjectsFromHTML() {
    const dataElement = document.getElementById("projectsData");
    if (!dataElement) return;

    const articles = dataElement.querySelectorAll("article");

    let currentPid = Math.floor(Math.random() * 40000) + 10000;

    this.projects = Array.from(articles).map((article) => {
      const pid = currentPid;
      currentPid += Math.floor(Math.random() * 450) + 50;

      const command = article.dataset.command || "";
      const language = article.dataset.language || "";
      const name = article.querySelector("h3")?.textContent || "";

      const descriptionContainer = article.querySelector("[data-description]");
      const description = descriptionContainer
        ? descriptionContainer.innerHTML
        : article.querySelector("p")?.textContent || "";

      const tech = article.querySelector("p[data-tech]")?.textContent || "";

      const links = Array.from(article.querySelectorAll("a")).map((link) => ({
        label: link.textContent,
        url: link.href,
      }));

      return { pid, command, language, name, description, tech, links };
    });

    dataElement.remove();
  }

  _renderProcessList() {
    const rows = this.projects
      .map((project, index) => {
        const color = LANGUAGE_COLORS[project.language] || "#666";
        return `<tr class="process-item" data-index="${index}">
          <td>${project.pid}</td>
          <td style="color: ${color}">${project.language}</td>
          <td>${project.command}</td>
          <td><span class="mem-value">0</span> <span class="mem-bar">░░░░░░</span></td>
        </tr>`;
      })
      .join("");

    this.listElement.innerHTML = `
      <table class="process-table">
        <thead>
          <tr class="process-header">
            <th>PID</th>
            <th>LANG</th>
            <th>COMMAND</th>
            <th>MEM (MB)</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;

    this.processItems = Array.from(
      this.listElement.querySelectorAll(".process-item"),
    );

    this.processItems.forEach((item) => {
      item.addEventListener("mouseenter", () => {
        this.previewProject(parseInt(item.dataset.index));
      });
      item.addEventListener("click", () => {
        this.toggleSelection(parseInt(item.dataset.index));
      });
    });

    this.listElement.addEventListener("mouseleave", () => {
      this.clearPreview();
    });
  }

  previewProject(index) {
    if (this.selectedIndex !== null) return;

    this.previewIndex = index;
    this.shownIndex = index;
    const project = this.projects[index];

    this._updateActiveState();
    this._updateDetailPanes(project);
  }

  clearPreview() {
    if (this.selectedIndex !== null) {
      this.shownIndex = this.selectedIndex;
      this.previewIndex = null;
      const project = this.projects[this.selectedIndex];
      this._updateActiveState();
      this._updateDetailPanes(project);
    } else {
      this.shownIndex = null;
      this.previewIndex = null;
      this._updateActiveState();
      this._showDefaultState();
    }
  }

  toggleSelection(index) {
    if (this.selectedIndex === index) {
      this.selectedIndex = null;
      this.previewIndex = null;
      this.shownIndex = null;
    } else {
      this.selectedIndex = index;
      this.previewIndex = null;
      this.shownIndex = index;
      const project = this.projects[index];
      this._updateDetailPanes(project);
    }
    this._updateActiveState();
  }

  selectProject(index) {
    this.selectedIndex = index;
    this.shownIndex = index;
    const project = this.projects[index];
    this._updateActiveState();
    this._updateDetailPanes(project);
  }

  _updateActiveState() {
    this.listElement.querySelectorAll(".process-item").forEach((item, i) => {
      const isShown = i === this.shownIndex;
      const isSelected = i === this.selectedIndex;

      item.classList.toggle("shown", isShown);
      item.classList.toggle("selected", isSelected);
    });
  }

  _updateDetailPanes(project) {
    this.nameElement.textContent = project.name;
    this.descriptionElement.innerHTML = project.description;
    this.techElement.textContent = project.tech;
    this._renderLinks(project.links);
  }

  _renderLinks(links) {
    if (links.length === 0) {
      this.linksElement.innerHTML =
        '<span class="tui-pane__placeholder">No links available</span>';
      return;
    }

    this.linksElement.innerHTML = links
      .map(
        (link) =>
          `<a href="${link.url}" class="project-link" target="_blank" rel="noopener noreferrer">${link.label} -></a>`,
      )
      .join("");
  }

  _showDefaultState() {
    const placeholderText = "Hover over a project to preview, click to view";
    this.nameElement.innerHTML = `<span class="tui-pane__placeholder">${placeholderText}</span>`;
    this.descriptionElement.innerHTML = `<span class="tui-pane__placeholder">${placeholderText}</span>`;
    this.techElement.innerHTML = `<span class="tui-pane__placeholder">${placeholderText}</span>`;
    this.linksElement.innerHTML = `<span class="tui-pane__placeholder">${placeholderText}</span>`;
  }

  _setupMouseTracking() {
    this.noiseOffsets = this.projects.map(() => Math.random() * 1000);

    document.addEventListener("mousemove", (e) => {
      this.mouseY = e.clientY;
    });

    this._startMemoryAnimation();
  }

  _startMemoryAnimation() {
    const animate = () => {
      this._updateMemoryBars();
      requestAnimationFrame(animate);
    };
    animate();
  }

  _updateMemoryBars() {
    const time = Date.now() / 1000;

    this.processItems.forEach((item, index) => {
      const rect = item.getBoundingClientRect();
      const itemCenterY = rect.top + rect.height / 2;

      const distance = Math.abs(this.mouseY - itemCenterY);

      const maxDistance = 200;
      const proximity = Math.max(0, 1 - distance / maxDistance);

      const noiseOffset = this.noiseOffsets[index];
      const noise = noiseFunction(noiseOffset, index, time) * 0.5;

      const proximityValue = proximity * 85;

      const noiseVariation = 20 + noise * 40;

      const combinedValue = Math.max(
        0,
        Math.min(99, proximityValue + noiseVariation),
      );
      const memValue = Math.floor(combinedValue);

      const barFillValue = combinedValue / 100;
      const barFill = Math.floor(barFillValue * 6 + 0.5);

      const filledBar = "█".repeat(barFill);
      const emptyBar = "░".repeat(6 - barFill);
      const bar = filledBar + emptyBar;

      const memValueSpan = item.querySelector(".mem-value");
      const memBarSpan = item.querySelector(".mem-bar");

      if (memValueSpan && memBarSpan) {
        const formattedValue = memValue.toString().padEnd(2, "\u00A0");
        memValueSpan.textContent = formattedValue;
        memBarSpan.textContent = bar;
      }
    });
  }
}

export { Projects };
