/**
 * Universal navigation tracking system
 * Tracks page navigation using sessionStorage
 */
export const NavigationTracker = {
  /**
   * Initialize navigation tracking for the current page
   * @param {string} pageName - Identifier for the current page (e.g., "home", "video")
   * @returns {string|null} - The previous page identifier, or null if none
   */
  init(pageName) {
    const previousPage = sessionStorage.getItem("currentPage");

    // Store current page for next navigation
    sessionStorage.setItem("currentPage", pageName);

    // Setup tracking on all internal links
    this._setupLinkTracking(pageName);

    return previousPage;
  },

  /**
   * Setup click tracking on all internal links
   * @private
   */
  _setupLinkTracking(currentPage) {
    document.querySelectorAll("a").forEach((link) => {
      const href = link.getAttribute("href");

      // Only track internal links (not external http/https links)
      if (href && !href.startsWith("http")) {
        link.addEventListener("click", () => {
          sessionStorage.setItem("previousPage", currentPage);
        });
      }
    });
  },

  /**
   * Get the previous page identifier
   * @returns {string|null}
   */
  getPreviousPage() {
    return sessionStorage.getItem("previousPage");
  },

  /**
   * Clear navigation history
   */
  clear() {
    sessionStorage.removeItem("currentPage");
    sessionStorage.removeItem("previousPage");
  },
};
