/**
 * Projects Section
 * Manages htop-style TUI project display with process list and detail panes
 * Parses project data from HTML for SEO, then removes the hidden data element
 */

// GitHub language colors mapping
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
    this.shownIndex = null; // Currently shown project (preview or selected)
    this.selectedIndex = null; // Selected/locked project (clicked)
    this.previewIndex = null; // Preview project (hovered)
    this.mouseY = 0;
    this.processItems = [];
    this.noiseOffsets = []; // Per-process noise offsets for smooth animation

    // DOM element references
    this.listElement = document.getElementById("projectsList");
    this.nameElement = document.getElementById("projectName");
    this.descriptionElement = document.getElementById(
      "projectDescriptionContent",
    );
    this.techElement = document.getElementById("projectTech");
    this.linksElement = document.getElementById("projectLinks");
  }

  init() {
    this._parseProjectsFromHTML();
    this._renderProcessList();

    // Show default state initially
    this._showDefaultState();

    // Track mouse position for memory proximity calculation
    this._setupMouseTracking();
  }

  /**
   * Parse project data from hidden HTML element and remove it
   * Automatically generates random PIDs for each project
   */
  _parseProjectsFromHTML() {
    const dataElement = document.getElementById("projectsData");
    if (!dataElement) return;

    const articles = dataElement.querySelectorAll("article");

    // Generate random starting PID (10000-50000 range for realistic process IDs)
    let currentPid = Math.floor(Math.random() * 40000) + 10000;

    this.projects = Array.from(articles).map((article) => {
      // Use current PID and increment by random amount (50-500) for next one
      const pid = currentPid;
      currentPid += Math.floor(Math.random() * 450) + 50;

      const command = article.dataset.command || "";
      const language = article.dataset.language || "";
      const name = article.querySelector("h3")?.textContent || "";

      // Check for rich HTML description container, fallback to first <p> text
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

    // Remove the data element from DOM
    dataElement.remove();
  }

  /**
   * Render the process list with header and project rows
   */
  _renderProcessList() {
    const header = `<div class="process-header"><span class="process-col process-col--pid">PID</span><span class="process-col process-col--language">LANG</span><span class="process-col process-col--name">COMMAND</span><span class="process-col process-col--mem">MEM (MB)</span></div>`;

    const rows = this.projects
      .map((project, index) => {
        const color = LANGUAGE_COLORS[project.language] || "#666";
        return `<div class="process-item" data-index="${index}"><span class="process-col process-col--pid">${project.pid}</span><span class="process-col process-col--language" style="color: ${color}">${project.language}</span><span class="process-col process-col--name">${project.command}</span><span class="process-col process-col--mem"><span class="mem-value">0</span> <span class="mem-bar">░░░░░░</span></span></div>`;
      })
      .join("");

    this.listElement.innerHTML = header + rows;

    // Store process item elements for memory updates
    this.processItems = Array.from(
      this.listElement.querySelectorAll(".process-item"),
    );

    // Add hover and click listeners to process items
    this.processItems.forEach((item) => {
      item.addEventListener("mouseenter", () => {
        this.previewProject(parseInt(item.dataset.index));
      });
      item.addEventListener("click", () => {
        this.toggleSelection(parseInt(item.dataset.index));
      });
    });

    // Clear preview when mouse leaves the list
    this.listElement.addEventListener("mouseleave", () => {
      this.clearPreview();
    });
  }

  /**
   * Preview a project on hover (only if not selected)
   */
  previewProject(index) {
    // If selected, ignore preview
    if (this.selectedIndex !== null) return;

    this.previewIndex = index;
    this.shownIndex = index;
    const project = this.projects[index];

    this._updateActiveState();
    this._updateDetailPanes(project);
  }

  /**
   * Clear preview and return to selected state or default
   */
  clearPreview() {
    if (this.selectedIndex !== null) {
      // If selected, return to selected project
      this.shownIndex = this.selectedIndex;
      this.previewIndex = null;
      const project = this.projects[this.selectedIndex];
      this._updateActiveState();
      this._updateDetailPanes(project);
    } else {
      // If not selected, return to default empty state
      this.shownIndex = null;
      this.previewIndex = null;
      this._updateActiveState();
      this._showDefaultState();
    }
  }

  /**
   * Toggle selection on a project
   */
  toggleSelection(index) {
    if (this.selectedIndex === index) {
      // Clicking the selected item unselects it
      this.selectedIndex = null;
      this.previewIndex = null;
      this.shownIndex = null;
    } else {
      // Select this item
      this.selectedIndex = index;
      this.previewIndex = null;
      this.shownIndex = index;
      const project = this.projects[index];
      this._updateDetailPanes(project);
    }
    this._updateActiveState();
  }

  /**
   * Select a project without toggling
   */
  selectProject(index) {
    this.selectedIndex = index;
    this.shownIndex = index;
    const project = this.projects[index];
    this._updateActiveState();
    this._updateDetailPanes(project);
  }

  /**
   * Update active state in process list
   */
  _updateActiveState() {
    this.listElement.querySelectorAll(".process-item").forEach((item, i) => {
      const isShown = i === this.shownIndex;
      const isSelected = i === this.selectedIndex;

      item.classList.toggle("shown", isShown);
      item.classList.toggle("selected", isSelected);
    });
  }

  /**
   * Update all detail panes with project data
   */
  _updateDetailPanes(project) {
    this.nameElement.textContent = project.name;
    this.descriptionElement.innerHTML = project.description;
    this.techElement.textContent = project.tech;
    this._renderLinks(project.links);
  }

  /**
   * Render links pane content
   */
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

  /**
   * Show default empty state
   */
  _showDefaultState() {
    const placeholderText = "Hover over a project to preview, click to view";
    this.nameElement.innerHTML = `<span class="tui-pane__placeholder">${placeholderText}</span>`;
    this.descriptionElement.innerHTML = `<span class="tui-pane__placeholder">${placeholderText}</span>`;
    this.techElement.innerHTML = `<span class="tui-pane__placeholder">${placeholderText}</span>`;
    this.linksElement.innerHTML = `<span class="tui-pane__placeholder">${placeholderText}</span>`;
  }

  /**
   * Setup mouse tracking for memory proximity calculation
   */
  _setupMouseTracking() {
    // Initialize random noise offsets for each process
    this.noiseOffsets = this.projects.map(() => Math.random() * 1000);

    document.addEventListener("mousemove", (e) => {
      this.mouseY = e.clientY;
    });

    // Start animation loop
    this._startMemoryAnimation();
  }

  /**
   * Start continuous memory bar animation
   */
  _startMemoryAnimation() {
    const animate = () => {
      this._updateMemoryBars();
      requestAnimationFrame(animate);
    };
    animate();
  }

  /**
   * Update memory bars based on vertical proximity to cursor
   */
  _updateMemoryBars() {
    const time = Date.now() / 1000; // Time in seconds

    this.processItems.forEach((item, index) => {
      const rect = item.getBoundingClientRect();
      const itemCenterY = rect.top + rect.height / 2;

      // Calculate vertical distance
      const distance = Math.abs(this.mouseY - itemCenterY);

      // Calculate proximity factor (closer = higher value)
      // Max distance of 200px for full falloff
      const maxDistance = 200;
      const proximity = Math.max(0, 1 - distance / maxDistance);

      // Add smooth noise for activity variation
      // Use sine waves with different frequencies for smooth variation
      const noiseOffset = this.noiseOffsets[index];
      const noise1 = Math.sin((time + noiseOffset) * 0.5) * 0.5 + 0.5; // Slow wave
      const noise2 = Math.sin((time + noiseOffset) * 1.3) * 0.5 + 0.5; // Medium wave
      const combinedNoise = noise1 * 0.7 + noise2 * 0.3 - 0.5; // Range: -0.5 to 0.5

      // Calculate base value from proximity (0-85, weighted at 85%)
      const proximityValue = proximity * 85;

      // Add noise variation
      const noiseVariation = 20 + combinedNoise * 40;

      // Combine proximity and noise, clamped to 0-99
      const combinedValue = Math.max(
        0,
        Math.min(99, proximityValue + noiseVariation),
      );
      const memValue = Math.floor(combinedValue);

      // Calculate bar fill (0-6 characters) using the same combined value
      const barFillValue = combinedValue / 100;
      const barFill = Math.floor(barFillValue * 6 + 0.5);

      // Build bar with filled and empty characters
      const filledBar = "█".repeat(barFill);
      const emptyBar = "░".repeat(6 - barFill);
      const bar = filledBar + emptyBar;

      // Update DOM
      const memValueSpan = item.querySelector(".mem-value");
      const memBarSpan = item.querySelector(".mem-bar");

      if (memValueSpan && memBarSpan) {
        // Use non-breaking space for trailing space so HTML doesn't collapse it
        const formattedValue = memValue.toString().padEnd(2, "\u00A0");
        memValueSpan.textContent = formattedValue;
        memBarSpan.textContent = bar;
      }
    });
  }
}

export { Projects };
