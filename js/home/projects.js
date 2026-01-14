/**
 * Projects Section
 * Manages htop-style TUI project display with process list and detail panes
 * Parses project data from HTML for SEO, then removes the hidden data element
 */

class Projects {
  constructor() {
    this.projects = [];
    this.selectedIndex = null;

    // DOM element references
    this.listElement = document.getElementById("projectsList");
    this.nameElement = document.getElementById("projectName");
    this.descriptionElement = document.getElementById("projectDescription");
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
   */
  _parseProjectsFromHTML() {
    const dataElement = document.getElementById("projectsData");
    if (!dataElement) return;

    const articles = dataElement.querySelectorAll("article");

    this.projects = Array.from(articles).map((article) => {
      const pid = parseInt(article.dataset.pid) || 0;
      const name = article.querySelector("h3")?.textContent || "";
      const paragraphs = article.querySelectorAll("p");
      const description = paragraphs[0]?.textContent || "";
      const tech = article.querySelector("p[data-tech]")?.textContent || "";

      const links = Array.from(article.querySelectorAll("a")).map((link) => ({
        label: link.textContent,
        url: link.href,
      }));

      return { pid, name, description, tech, links };
    });

    // Remove the data element from DOM
    dataElement.remove();
  }

  /**
   * Render the process list with header and project rows
   */
  _renderProcessList() {
    const header = `<div class="process-header"><span class="process-col process-col--pid">PID</span><span class="process-col process-col--name">Command</span></div>`;

    const rows = this.projects
      .map(
        (project, index) =>
          `<div class="process-item" data-index="${index}"><span class="process-col process-col--pid">${project.pid}</span><span class="process-col process-col--name">${project.name}</span></div>`,
      )
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
    this.descriptionElement.textContent = project.description;
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
