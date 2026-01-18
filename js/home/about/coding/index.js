/**
 * Coding Animation
 * Interactive 3D ASCII cube that rotates based on mouse movement
 */

import { WebGLASCIIRenderer } from "../../../lib/ascii-renderer/webgl.js";
import { CubeRenderer } from "./cube-renderer.js";
import { resizeManager } from "../../../core/resize-manager.js";

const ASCII_CHARS = " -|/\\⟋⟍";

const DESKTOP_CUBE_SIZE = 17;
const MOBILE_CUBE_SIZE = 15;
const DESKTOP_FONT_SIZE = 12;
const MOBILE_FONT_SIZE = 11;

class CodingAnimation {
  constructor() {
    this.renderer = null;
    this.cubeRenderer = null;
    this.container = null;
    this.animationId = null;
    this.mobileListenerId = null;

    this.width = 62;
    this.height = 35;

    this.rotationX = 0;
    this.rotationY = 0;
    this.rotationZ = 0;

    this.velocityX = 0.01;
    this.velocityY = 0.015;
    this.velocityZ = 0.005;
    this.friction = 0.9999;
    this.smoothing = 0.03;
    this.sensitivity = 0.3;

    this.mouseX = 0;
    this.mouseY = 0;
    this.prevMouseX = 0;
    this.prevMouseY = 0;
    this.isFirstMove = true;

    this._handleMouseMove = this._handleMouseMove.bind(this);
  }

  async init(container) {
    if (!container) return;
    this.container = container;

    await this._initializeRenderer();
    this._attachEventListeners();

    this.mobileListenerId = resizeManager.register(() =>
      this._handleMobileChange(),
    );

    this._startAnimation();
  }

  async _initializeRenderer() {
    const isMobile = resizeManager.getIsMobile();
    const cubeSize = isMobile ? MOBILE_CUBE_SIZE : DESKTOP_CUBE_SIZE;
    const fontSize = isMobile ? MOBILE_FONT_SIZE : DESKTOP_FONT_SIZE;

    if (this.renderer) {
      this.renderer.destroy();
    }

    this.renderer = new WebGLASCIIRenderer(this.width, this.height, {
      charSet: ASCII_CHARS,
      displayFontSize: fontSize,
    });

    await this.renderer.init(this.container);

    this.cubeRenderer = new CubeRenderer(this.width, this.height, cubeSize);
  }

  async _handleMobileChange() {
    await this._initializeRenderer();
  }

  _attachEventListeners() {
    document.addEventListener("mousemove", this._handleMouseMove);
  }

  _handleMouseMove(event) {
    this.mouseX = event.clientX;
    this.mouseY = event.clientY;

    if (this.isFirstMove) {
      this.prevMouseX = this.mouseX;
      this.prevMouseY = this.mouseY;
      this.isFirstMove = false;
    }
  }

  _updateRotation() {
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

    this.rotationX += this.velocityX;
    this.rotationY += this.velocityY;
    this.rotationZ += this.velocityZ;
  }

  _startAnimation() {
    const animate = () => {
      this._updateRotation();

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

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.mobileListenerId !== null) {
      resizeManager.unregister(this.mobileListenerId);
      this.mobileListenerId = null;
    }

    document.removeEventListener("mousemove", this._handleMouseMove);

    if (this.renderer) {
      this.renderer.destroy();
      this.renderer = null;
    }

    this.cubeRenderer = null;
  }
}

export { CodingAnimation };
