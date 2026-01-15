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
    this.selectedIndex = null;

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

    // Auto-select first project
    if (this.projects.length > 0) {
      this.selectProject(0);
    }
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
    const header = `<div class="process-header"><span class="process-col process-col--pid">PID</span><span class="process-col process-col--language">LANG</span><span class="process-col process-col--name">COMMAND</span></div>`;

    const rows = this.projects
      .map((project, index) => {
        const color = LANGUAGE_COLORS[project.language] || "#666";
        return `<div class="process-item" data-index="${index}"><span class="process-col process-col--pid">${project.pid}</span><span class="process-col process-col--language" style="color: ${color}">${project.language}</span><span class="process-col process-col--name">${project.command}</span></div>`;
      })
      .join("");

    this.listElement.innerHTML = header + rows;

    // Add click listeners to process items
    this.listElement.querySelectorAll(".process-item").forEach((item) => {
      item.addEventListener("click", () => {
        this.selectProject(parseInt(item.dataset.index));
      });
    });
  }

  /**
   * Select a project and update all detail panes
   */
  selectProject(index) {
    // Ignore if already selected
    if (index === this.selectedIndex) return;

    this.selectedIndex = index;
    const project = this.projects[index];

    this._updateActiveState(index);
    this._updateDetailPanes(project);
  }

  /**
   * Update active state in process list
   */
  _updateActiveState(index) {
    this.listElement.querySelectorAll(".process-item").forEach((item, i) => {
      item.classList.toggle("active", i === index);
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
}

export { Projects };
