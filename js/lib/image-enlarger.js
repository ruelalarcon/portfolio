/**
 * ImageEnlarger
 * Handles click-to-enlarge functionality for images
 * Shows dark overlay with text on hover and enlarges images in a fullscreen overlay
 */

class ImageEnlarger {
  constructor() {
    this.overlay = null;
    this.enlargedImg = null;
    this.currentImg = null;
  }

  init(containerSelector = "body") {
    this._createOverlay();
    this._attachListeners(containerSelector);
  }

  _createOverlay() {
    this.overlay = document.createElement("div");
    this.overlay.className = "image-enlarger-overlay";
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;

    this.enlargedImg = document.createElement("img");
    this.enlargedImg.classList.add("no-enlarge");
    this.enlargedImg.style.cssText = `
      max-width: 90vw;
      max-height: 90vh;
      object-fit: contain;
      border: 1px solid #555;
      transform: scale(0.9);
      transition: transform 0.3s ease;
      cursor: pointer;
    `;

    this.overlay.appendChild(this.enlargedImg);
    document.body.appendChild(this.overlay);

    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) {
        this._closeEnlarged();
      }
    });

    this.enlargedImg.addEventListener("click", (e) => {
      e.stopPropagation();
      this._closeEnlarged();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.overlay.style.display === "flex") {
        this._closeEnlarged();
      }
    });
  }

  _attachListeners(containerSelector) {
    const container =
      containerSelector === "body"
        ? document.body
        : document.querySelector(containerSelector);

    if (!container) return;

    container.addEventListener("mouseover", (e) => {
      if (e.target.tagName === "IMG" && this._isEnlargeable(e.target)) {
        this._showImageOverlay(e.target);
        e.target.style.cursor = "pointer";
      }
    });

    container.addEventListener("mouseout", (e) => {
      if (e.target.tagName === "IMG") {
        this._hideImageOverlay(e.target);
      }
    });

    container.addEventListener("click", (e) => {
      if (e.target.tagName === "IMG" && this._isEnlargeable(e.target)) {
        e.preventDefault();
        e.stopPropagation();
        this._enlargeImage(e.target);
      }
    });
  }

  _isEnlargeable(img) {
    return !img.classList.contains("no-enlarge");
  }

  _showImageOverlay(img) {
    if (img.parentElement?.classList.contains("image-enlarger-wrapper")) return;

    const wrapper = document.createElement("div");
    wrapper.className = "image-enlarger-wrapper";

    img.parentNode.insertBefore(wrapper, img);
    wrapper.appendChild(img);

    requestAnimationFrame(() => {
      wrapper.classList.add("show");
    });
  }

  _hideImageOverlay(img) {
    const wrapper = img.parentElement;
    if (!wrapper?.classList.contains("image-enlarger-wrapper")) return;

    wrapper.classList.remove("show");

    setTimeout(() => {
      if (wrapper && wrapper.parentNode) {
        wrapper.parentNode.insertBefore(img, wrapper);
        wrapper.remove();
      }
    }, 200);
  }

  _enlargeImage(img) {
    this._hideImageOverlay(img);

    this.enlargedImg.src = img.src;
    this.enlargedImg.alt = img.alt;

    this.overlay.style.display = "flex";

    requestAnimationFrame(() => {
      this.overlay.style.opacity = "1";
      this.enlargedImg.style.transform = "scale(1)";
    });
  }

  _closeEnlarged() {
    this.overlay.style.opacity = "0";
    this.enlargedImg.style.transform = "scale(0.9)";

    const allImages = document.querySelectorAll("img");
    allImages.forEach((img) => {
      if (!img.classList.contains("no-enlarge")) {
        this._hideImageOverlay(img);
      }
    });

    setTimeout(() => {
      this.overlay.style.display = "none";
      this.enlargedImg.src = "";
    }, 300);
  }

  destroy() {
    if (this.overlay) {
      this.overlay.remove();
    }
  }
}

export { ImageEnlarger };
