/**
 * Handles text selection within the video player
 */
export class TextSelection {
  constructor(videoWidth, videoHeight, displayCharWidth, displayCharHeight) {
    this.videoWidth = videoWidth;
    this.videoHeight = videoHeight;
    this.displayCharWidth = displayCharWidth;
    this.displayCharHeight = displayCharHeight;

    this.isSelecting = false;
    this.selectionStart = null;
    this.selectionEnd = null;
    this.selectionOverlay = null;
    this.glCanvas = null;
    this.currentFrame = null;
  }

  /**
   * Initialize selection overlay and event handlers
   * @param {HTMLCanvasElement} glCanvas - The WebGL canvas to attach selection to
   * @param {HTMLElement} container - Container element for the overlay
   * @param {number} charWidth - Width of each character in pixels
   * @param {number} charHeight - Height of each character in pixels
   */
  init(glCanvas, container, charWidth, charHeight) {
    this.glCanvas = glCanvas;
    this.charWidth = charWidth;
    this.charHeight = charHeight;

    // Create selection overlay
    this.selectionOverlay = document.createElement("canvas");
    this.selectionOverlay.width = glCanvas.width;
    this.selectionOverlay.height = glCanvas.height;
    this.selectionOverlay.style.position = "absolute";
    this.selectionOverlay.style.top = "0";
    this.selectionOverlay.style.left = "0";
    this.selectionOverlay.style.width = glCanvas.style.width;
    this.selectionOverlay.style.height = glCanvas.style.height;
    this.selectionOverlay.style.pointerEvents = "none";

    container.style.position = "relative";
    container.appendChild(this.selectionOverlay);

    this._setupEventHandlers();
  }

  _setupEventHandlers() {
    const getCharCoords = (clientX, clientY) => {
      const rect = this.glCanvas.getBoundingClientRect();
      const x = Math.floor((clientX - rect.left) / this.displayCharWidth);
      const y = Math.floor((clientY - rect.top) / this.displayCharHeight);
      return {
        x: Math.max(0, Math.min(x, this.videoWidth - 1)),
        y: Math.max(0, Math.min(y, this.videoHeight - 1)),
        index: y * this.videoWidth + x,
      };
    };

    const clearSelection = () => {
      this.selectionStart = null;
      this.selectionEnd = null;
      const ctx = this.selectionOverlay.getContext("2d");
      ctx.clearRect(
        0,
        0,
        this.selectionOverlay.width,
        this.selectionOverlay.height,
      );
    };

    let hasMoved = false;

    const onMouseMove = (e) => {
      if (this.isSelecting) {
        hasMoved = true;
        this.selectionEnd = getCharCoords(e.clientX, e.clientY);
        this.render();
      }
    };

    const onMouseUp = () => {
      if (this.isSelecting) {
        this.isSelecting = false;

        // Clear selection if it was just a click (no drag)
        if (!hasMoved) {
          clearSelection();
        }

        hasMoved = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      }
    };

    const onMouseDown = (e) => {
      // Allow selection to start from anywhere on the page
      this.isSelecting = true;
      hasMoved = false;
      this.selectionStart = getCharCoords(e.clientX, e.clientY);
      this.selectionEnd = null; // Don't set end until we actually drag

      // Add document-level listeners for drag
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);

      // Only prevent default if clicking on the canvas
      if (this.glCanvas && this.glCanvas.contains(e.target)) {
        e.preventDefault();
      }
    };

    const onCopy = (e) => {
      if (this.selectionStart && this.selectionEnd && this.currentFrame) {
        e.preventDefault();
        const text = this.getSelectedText();
        e.clipboardData.setData("text/plain", text);
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("copy", onCopy);
  }

  /**
   * Update the current frame data for text extraction
   * @param {Array} frameData - Array of characters representing the current frame
   */
  setCurrentFrame(frameData) {
    this.currentFrame = frameData;
  }

  /**
   * Render the current selection overlay
   */
  render() {
    const ctx = this.selectionOverlay.getContext("2d");
    ctx.clearRect(
      0,
      0,
      this.selectionOverlay.width,
      this.selectionOverlay.height,
    );

    if (!this.selectionStart || !this.selectionEnd || !this.currentFrame)
      return;

    const start = Math.min(this.selectionStart.index, this.selectionEnd.index);
    const end = Math.max(this.selectionStart.index, this.selectionEnd.index);

    // Windows selection style: #0236a0 background
    ctx.fillStyle = "#0236a0";

    for (let i = start; i <= end; i++) {
      const x = (i % this.videoWidth) * this.charWidth;
      const y = Math.floor(i / this.videoWidth) * this.charHeight;
      ctx.fillRect(x, y, this.charWidth, this.charHeight);
    }

    // Draw white text over selection
    ctx.fillStyle = "white";
    ctx.font = `48px 'Cascadia Code', monospace`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    for (let i = start; i <= end; i++) {
      const char = this.currentFrame[i];
      const x = (i % this.videoWidth) * this.charWidth;
      const y = Math.floor(i / this.videoWidth) * this.charHeight;
      ctx.fillText(char, x, y);
    }
  }

  /**
   * Get the currently selected text
   * @returns {string} Selected text with line breaks preserved
   */
  getSelectedText() {
    if (!this.currentFrame || !this.selectionStart || !this.selectionEnd)
      return "";

    const start = Math.min(this.selectionStart.index, this.selectionEnd.index);
    const end = Math.max(this.selectionStart.index, this.selectionEnd.index);

    let text = "";
    for (let i = start; i <= end; i++) {
      const x = i % this.videoWidth;
      text += this.currentFrame[i];
      if (x === this.videoWidth - 1 && i < end) {
        text += "\n";
      }
    }

    return text;
  }

  /**
   * Check if there's an active selection
   * @returns {boolean} True if selection is active
   */
  hasSelection() {
    return this.selectionStart !== null && this.selectionEnd !== null;
  }
}
