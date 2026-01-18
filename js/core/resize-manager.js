/**
 * Singleton class for managing resize events with intelligent debouncing
 * - Mobile/desktop transitions (width crosses 1000px threshold): fires immediately
 * - Resize events below threshold: debounced by 0.5 seconds
 */

const MOBILE_THRESHOLD = 1000;
const DEBOUNCE_MS = 500;

class ResizeManager {
  constructor() {
    if (ResizeManager.instance) {
      return ResizeManager.instance;
    }

    this.isMobile = window.innerWidth < MOBILE_THRESHOLD;
    this.listeners = new Map();
    this.listenerIdCounter = 0;
    this.debounceTimeout = null;

    this._handleResize = this._handleResize.bind(this);
    window.addEventListener("resize", this._handleResize);

    ResizeManager.instance = this;
  }

  /**
   * Register a callback for resize events
   * Callback fires immediately on mobile/desktop transitions, debounced for other resizes below threshold
   * @param {Function} callback - Called on resize events
   * @returns {number} Listener ID for later removal
   */
  register(callback) {
    const id = this.listenerIdCounter++;
    this.listeners.set(id, callback);
    callback();
    return id;
  }

  /**
   * Unregister a previously registered callback
   * @param {number} id - Listener ID returned from register()
   */
  unregister(id) {
    this.listeners.delete(id);
  }

  /**
   * Get current mobile state
   * @returns {boolean} True if mobile (width < 1000px), false if desktop
   */
  getIsMobile() {
    return this.isMobile;
  }

  _handleResize() {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth < MOBILE_THRESHOLD;

    if (wasMobile !== this.isMobile) {
      if (this.debounceTimeout) {
        clearTimeout(this.debounceTimeout);
        this.debounceTimeout = null;
      }
      this.listeners.forEach((callback) => callback());
    } else if (this.isMobile) {
      if (this.debounceTimeout) {
        clearTimeout(this.debounceTimeout);
      }
      this.debounceTimeout = setTimeout(() => {
        this.listeners.forEach((callback) => callback());
        this.debounceTimeout = null;
      }, DEBOUNCE_MS);
    }
  }

  destroy() {
    window.removeEventListener("resize", this._handleResize);
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    this.listeners.clear();
    ResizeManager.instance = null;
  }
}

export const resizeManager = new ResizeManager();
