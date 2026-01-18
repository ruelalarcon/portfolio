/**
 * Singleton class for managing mobile/desktop state changes
 * Fires callbacks when transitioning between mobile (width < 1000px) and desktop
 */

const MOBILE_BREAKPOINT = 1000;

class MobileManager {
  constructor() {
    if (MobileManager.instance) {
      return MobileManager.instance;
    }

    this.isMobile = window.innerWidth < MOBILE_BREAKPOINT;
    this.listeners = new Map();
    this.listenerIdCounter = 0;

    this._handleResize = this._handleResize.bind(this);
    window.addEventListener("resize", this._handleResize);

    MobileManager.instance = this;
  }

  /**
   * Register a callback for mobile/desktop state changes
   * @param {Function} callback - Called with boolean (true = mobile, false = desktop)
   * @returns {number} Listener ID for later removal
   */
  register(callback) {
    const id = this.listenerIdCounter++;
    this.listeners.set(id, callback);
    callback(this.isMobile);
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
   * @returns {boolean} True if mobile, false if desktop
   */
  getIsMobile() {
    return this.isMobile;
  }

  _handleResize() {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth < MOBILE_BREAKPOINT;

    if (wasMobile !== this.isMobile) {
      this.listeners.forEach((callback) => callback(this.isMobile));
    }
  }

  destroy() {
    window.removeEventListener("resize", this._handleResize);
    this.listeners.clear();
    MobileManager.instance = null;
  }
}

export const mobileManager = new MobileManager();
