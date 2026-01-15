/**
 * FocusManager
 * Singleton that manages render priority based on viewport proximity
 * Only the renderer closest to screen center gets the "focus lock" to do work
 */

class FocusManager {
  constructor() {
    if (FocusManager.instance) {
      return FocusManager.instance;
    }

    this.renderers = new Map(); // id -> { element, onFocusChange }
    this.focusedId = null;
    this.updateInterval = null;
    this.isRunning = false;

    FocusManager.instance = this;
  }

  /**
   * Register a renderer with the focus manager
   * @param {string} id - Unique identifier for this renderer
   * @param {HTMLElement} element - The DOM element to track
   * @param {Function} onFocusChange - Callback (hasFocus: boolean) => void
   */
  register(id, element, onFocusChange) {
    this.renderers.set(id, { element, onFocusChange });

    // Start tracking if this is the first renderer
    if (!this.isRunning) {
      this.start();
    }

    // Immediately check focus state
    this._updateFocus();
  }

  /**
   * Unregister a renderer
   * @param {string} id - Renderer identifier
   */
  unregister(id) {
    this.renderers.delete(id);

    // If the focused renderer was removed, recalculate
    if (this.focusedId === id) {
      this.focusedId = null;
      this._updateFocus();
    }

    // Stop tracking if no more renderers
    if (this.renderers.size === 0) {
      this.stop();
    }
  }

  /**
   * Start periodic focus updates
   */
  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    // Check focus every 100ms (10 times per second)
    this.updateInterval = setInterval(() => this._updateFocus(), 100);
    this._updateFocus(); // Initial check
  }

  /**
   * Stop periodic focus updates
   */
  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Calculate distance from element to screen center
   * @param {HTMLElement} element
   * @returns {number} Distance in pixels
   */
  _getDistanceToCenter(element) {
    const rect = element.getBoundingClientRect();
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    // Element center
    const elementCenterX = rect.left + rect.width / 2;
    const elementCenterY = rect.top + rect.height / 2;

    // Euclidean distance
    const dx = elementCenterX - centerX;
    const dy = elementCenterY - centerY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Update which renderer has focus
   */
  _updateFocus() {
    if (this.renderers.size === 0) {
      this.focusedId = null;
      return;
    }

    // Find renderer closest to screen center
    let closestId = null;
    let closestDistance = Infinity;

    for (const [id, { element }] of this.renderers) {
      const distance = this._getDistanceToCenter(element);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestId = id;
      }
    }

    // If focus changed, notify all renderers
    if (closestId !== this.focusedId) {
      const previousId = this.focusedId;
      this.focusedId = closestId;

      // Notify previous focused renderer it lost focus
      if (previousId && this.renderers.has(previousId)) {
        this.renderers.get(previousId).onFocusChange(false);
      }

      // Notify new focused renderer it gained focus
      if (closestId && this.renderers.has(closestId)) {
        this.renderers.get(closestId).onFocusChange(true);
      }
    }
  }

  /**
   * Check if a specific renderer has focus
   * @param {string} id - Renderer identifier
   * @returns {boolean}
   */
  hasFocus(id) {
    return this.focusedId === id;
  }
}

// Create singleton instance
const focusManager = new FocusManager();

export { focusManager };
