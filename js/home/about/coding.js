/**
 * Coding Animation
 * Interactive 3D ASCII cube that rotates based on mouse movement
 */

import { WebGLASCIIRenderer } from "../../lib/ascii-renderer/webgl.js";
import { CubeRenderer } from "./coding/cube-renderer.js";

// Character set for WebGL renderer - must include all characters the cube uses
const ASCII_CHARS = " -|/\\⟋⟍";

class CodingAnimation {
  constructor() {
    this.renderer = null;
    this.cubeRenderer = null;
    this.width = 80;
    this.height = 36;
    this.animationId = null;

    // Cube configuration
    this.cubeSize = 17;
    this.sensitivity = 0.3;

    // Rotation angles
    this.rotationX = 0;
    this.rotationY = 0;
    this.rotationZ = 0;

    // Rotation velocities
    this.velocityX = 0.01;
    this.velocityY = 0.015;
    this.velocityZ = 0.005;
    this.friction = 0.9999;
    this.smoothing = 0.03;

    // Mouse tracking
    this.mouseX = 0;
    this.mouseY = 0;
    this.prevMouseX = 0;
    this.prevMouseY = 0;
    this.isFirstMove = true;
    this.container = null;

    // Bind methods
    this.handleMouseMove = this.handleMouseMove.bind(this);
  }

  /**
   * Initialize the animation
   */
  async init(container) {
    if (!container) return;
    this.container = container;

    this.renderer = new WebGLASCIIRenderer(this.width, this.height, {
      charSet: ASCII_CHARS,
      displayFontSize: 12,
    });

    await this.renderer.init(container);

    this.cubeRenderer = new CubeRenderer(
      this.width,
      this.height,
      this.cubeSize,
    );

    document.addEventListener("mousemove", this.handleMouseMove);

    this._startAnimation();
  }

  /**
   * Handle mouse movement
   */
  handleMouseMove(event) {
    this.mouseX = event.clientX;
    this.mouseY = event.clientY;

    if (this.isFirstMove) {
      this.prevMouseX = this.mouseX;
      this.prevMouseY = this.mouseY;
      this.isFirstMove = false;
    }
  }

  /**
   * Update rotation
   */
  updateRotation() {
    const deltaX = this.mouseX - this.prevMouseX;
    const deltaY = this.mouseY - this.prevMouseY;

    const targetVelocityY = deltaX * this.sensitivity * 0.01;
    const targetVelocityX = deltaY * this.sensitivity * 0.01;

    this.velocityY += (targetVelocityY - this.velocityY) * this.smoothing;
    this.velocityX += (targetVelocityX - this.velocityX) * this.smoothing;

    this.velocityX *= this.friction;
    this.velocityY *= this.friction;
    this.velocityZ *= this.friction;

    this.prevMouseX = this.mouseX;
    this.prevMouseY = this.mouseY;

    // Update rotation angles
    this.rotationX += this.velocityX;
    this.rotationY += this.velocityY;
    this.rotationZ += this.velocityZ;
  }

  /**
   * Start animation loop
   */
  _startAnimation() {
    const animate = () => {
      this.updateRotation();

      const chars = this.cubeRenderer.render(
        this.rotationX,
        this.rotationY,
        this.rotationZ,
      );

      const colors = chars.map(() => [100, 220, 120]);

      this.renderer.render({ chars, colors });

      this.animationId = requestAnimationFrame(animate);
    };

    animate();
  }

  /**
   * Update cube size
   */
  setSize(size) {
    this.cubeSize = size;
    if (this.cubeRenderer) {
      this.cubeRenderer.setSize(size);
    }
  }

  /**
   * Update sensitivity
   */
  setSensitivity(sensitivity) {
    this.sensitivity = sensitivity;
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    document.removeEventListener("mousemove", this.handleMouseMove);

    if (this.renderer && this.renderer.destroy) {
      this.renderer.destroy();
      this.renderer = null;
    }

    this.cubeRenderer = null;
  }
}

export { CodingAnimation };
