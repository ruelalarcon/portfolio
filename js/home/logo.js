/**
 * Logo component with animation and interactive ripple effects
 * Combines glitch reveal animation and ripple effects using DOMASCIIRenderer
 */

import { DOMASCIIRenderer } from "../lib/ascii-renderer/dom.js";
import { easeInOutCubic, noiseFunction } from "../core/math.js";

// Logo data
const LOGO_ASCII = atob(
  "ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAsLCAgICAgICAgICAgICAgICAgICAgICAsLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIApgN01NIiIiTXEuICAgICAgICAgICAgICAgICAgICBgN01NICAgICAgICAgICAgZGIgICAgICBgN01NICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgTU0gICBgTU0uICAgICAgICAgICAgICAgICAgICAgTU0gICAgICAgICAgIDtNTTogICAgICAgTU0gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICBNTSAgICxNOSBgN01NIiBgN01NICAuZ1AiWWEgICBNTSAgICAgICAgICAsVl5NTS4gICAgICBNTSAgICw2IlliLiAgYDdNYixvZDggLHA2ImJvICAgLHBXIldxLmA3TU1wTU1NYi4gIAogIE1NbW1kTTkgICAgTU0gICAgTU0gLE0nICAgWWIgIE1NICAgICAgICAgLE0gIGBNTSAgICAgIE1NICA4KSAgIE1NICAgIE1NJyAiJzZNJyAgT08gIDZXJyAgIGBXYiBNTSAgICBNTSAgCiAgTU0gIFlNLiAgICBNTSAgICBNTSA4TSIiIiIiIiAgTU0gICAgICAgICBBYm1tbXFNQSAgICAgTU0gICAscG05TU0gICAgTU0gICAgOE0gICAgICAgOE0gICAgIE04IE1NICAgIE1NICAKICBNTSAgIGBNYi4gIE1NICAgIE1NIFlNLiAgICAsICBNTSAgICAgICAgQScgICAgIFZNTCAgICBNTSAgOE0gICBNTSAgICBNTSAgICBZTS4gICAgLCBZQS4gICAsQTkgTU0gICAgTU0gIAouSk1NTC4gLkpNTS4gYE1ib2QiWU1MLmBNYm1tZCcuSk1NTC4gICAgLkFNQS4gICAuQU1NQS4uSk1NTC5gTW9vOV5Zby4uSk1NTC4gICBZTWJtZCcgICBgWWJtZDknLkpNTUwgIEpNTUwu",
);
const LOGO_LINES = LOGO_ASCII.split("\n");

// Animation character sets
const STATIC_CHARS = "░▒▓█▀▄▌▐■□▪▫●○◐◑◒◓";
const GLITCH_CHARS = "╔╗╚╝║═╠╣╦╩╬├┤┬┴┼│─";

// Complete character set for renderer (all unique chars in logo + animation chars)
const ALL_CHARS = [...new Set(LOGO_ASCII + STATIC_CHARS + GLITCH_CHARS)].join(
  "",
);

// Default animation duration
const DEFAULT_ANIMATION_DURATION = 2200;

export class Logo {
  constructor(containerElement, buttonContainer) {
    this.containerElement = containerElement;
    this.buttonContainer = buttonContainer;

    // Calculate grid dimensions
    this.gridWidth = LOGO_LINES[0].length;
    this.gridHeight = LOGO_LINES.length;
    this.totalCells = this.gridWidth * this.gridHeight;

    // Renderer
    this.renderer = null;

    // Animation state
    this.animationDuration = DEFAULT_ANIMATION_DURATION;
    this.animationStartTime = null;
    this.characterSeeds = [];
    this.isAnimating = true;
    this.animationComplete = false;

    // Ripple effect state
    this.rippleState = {
      ripples: [],
      sparks: [],
      trails: [],
      globalMouseX: 0,
      globalMouseY: 0,
      mouseX: 0,
      mouseY: 0,
      lastMouseX: 0,
      lastMouseY: 0,
      isHovering: false,
      globalTime: 0,
      lastFrameTime: 0,
      lastCleanupTime: 0,
    };

    this.onComplete = null;
  }

  async init(duration = DEFAULT_ANIMATION_DURATION) {
    this.animationDuration = duration;

    // Generate character seeds for animation
    this.characterSeeds = Array.from({ length: this.totalCells }, () =>
      Math.random(),
    );

    // Initialize renderer
    this.renderer = new DOMASCIIRenderer(this.gridWidth, this.gridHeight, {
      charSet: ALL_CHARS,
      font: "'Cascadia Code', monospace",
      displayFontSize: 12,
      enableTextSelection: true,
    });

    await this.renderer.init(this.containerElement);

    // Setup ripple event listeners
    this._initGlobalMouseTracking();
    this._attachEventListeners();

    // Start animation loop
    requestAnimationFrame((ts) => this._animate(ts));
  }

  _initGlobalMouseTracking() {
    document.addEventListener("mousemove", (e) => {
      this.rippleState.globalMouseX = e.clientX;
      this.rippleState.globalMouseY = e.clientY;
    });
  }

  _attachEventListeners() {
    this.containerElement.addEventListener("mousedown", (e) =>
      this._onClick(e),
    );
  }

  _onClick(event) {
    if (!this.rippleState.isHovering || this.isAnimating) return;

    const rect = this.containerElement.getBoundingClientRect();
    const charWidth = rect.width / this.gridWidth;
    const charHeight = rect.height / this.gridHeight;
    const clickX = (event.clientX - rect.left) / charWidth;
    const clickY = (event.clientY - rect.top) / charHeight;

    // Create multiple ripples for click effect
    for (let i = 0; i < 8; i++) {
      this.rippleState.ripples.push({
        x: clickX,
        y: clickY,
        time: performance.now() + i * 30,
        hue: (Math.random() * 360 + i * 45) % 360,
        pattern: i % 3,
        speed: 30 + i * 5,
      });
    }

    // Create sparks
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const sparkSpeed = 4 + Math.random() * 10;
      this.rippleState.sparks.push({
        x: clickX,
        y: clickY,
        velocityX: Math.cos(angle) * sparkSpeed,
        velocityY: Math.sin(angle) * sparkSpeed,
        time: performance.now(),
        hue: (i * 12) % 360,
        lifetime: 0.5 + Math.random() * 0.7,
      });
    }
  }

  _animate(timestamp) {
    if (!this.animationStartTime) {
      this.animationStartTime = timestamp;
    }

    const deltaTime = this.rippleState.lastFrameTime
      ? Math.min((timestamp - this.rippleState.lastFrameTime) / 1000, 0.1)
      : 0.016;

    this.rippleState.lastFrameTime = timestamp;
    this.rippleState.globalTime += deltaTime;

    // Update mouse position for ripple effects
    if (!this.isAnimating) {
      this._updateMousePosition();
      this._updateRippleEffects(deltaTime);
      this._cleanupOldEffects(timestamp);
      this._updateSparks(deltaTime);
    }

    // Render frame
    this._renderFrame(timestamp);

    // Continue animation loop
    requestAnimationFrame((ts) => this._animate(ts));
  }

  _renderFrame(timestamp) {
    const chars = new Array(this.totalCells);
    const colors = new Array(this.totalCells);
    const transforms = new Array(this.totalCells);

    if (this.isAnimating) {
      // Animation phase: glitch reveal
      const elapsed = timestamp - this.animationStartTime;
      const rawProgress = Math.min(elapsed / this.animationDuration, 1);
      const progress = easeInOutCubic(rawProgress);

      let charIndex = 0;
      for (let y = 0; y < this.gridHeight; y++) {
        for (let x = 0; x < this.gridWidth; x++) {
          const originalChar = LOGO_LINES[y][x];
          chars[charIndex] = this._getAnimationChar(
            originalChar,
            charIndex,
            progress,
            elapsed,
          );
          colors[charIndex] = [1, 1, 1]; // White during animation
          transforms[charIndex] = {}; // No transforms during animation
          charIndex++;
        }
      }

      // Check if animation is complete
      if (rawProgress >= 1 && !this.animationComplete) {
        this.animationComplete = true;
        this.isAnimating = false;
        this.buttonContainer.classList.add("show");
        this.onComplete?.();
      }
    } else {
      // Ripple effect phase
      let charIndex = 0;
      for (let y = 0; y < this.gridHeight; y++) {
        for (let x = 0; x < this.gridWidth; x++) {
          const originalChar = LOGO_LINES[y][x];
          const effects = this._calculateRippleEffects(
            x,
            y,
            originalChar,
            timestamp,
          );

          chars[charIndex] = originalChar;

          if (effects.intensity > 0.01 && originalChar !== " ") {
            // Apply colored effect
            const saturation = Math.min(100, 50 + effects.intensity * 60);
            const lightness = 40 + effects.intensity * 55;
            const colorMix = Math.min(1, effects.intensity * 2.5);
            const finalSaturation = saturation * colorMix;
            const finalLightness = lightness * colorMix + 95 * (1 - colorMix);

            // Convert HSL to RGB
            const rgb = this._hslToRgb(
              effects.blendedHue / 360,
              finalSaturation / 100,
              Math.min(finalLightness, 95) / 100,
            );
            colors[charIndex] = rgb;
          } else {
            // Default white
            colors[charIndex] = [1, 1, 1];
          }

          // Apply scale transform through renderer
          if (effects.scale > 1.0) {
            transforms[charIndex] = { scale: effects.scale };
          } else {
            transforms[charIndex] = {};
          }

          charIndex++;
        }
      }
    }

    this.renderer.render({ chars, colors, transforms });

    // Apply glow effects via direct DOM manipulation (not supported by WebGL)
    if (!this.isAnimating) {
      this._applyGlowEffects(timestamp);
    }
  }

  _getAnimationChar(char, index, progress, elapsed) {
    if (char === " ") return " ";

    const seed = this.characterSeeds[index];
    const threshold = seed * 0.7 + 0.15;
    const noisePhase = (seed * 1000 + elapsed * 0.01) % 1;

    if (progress > threshold + 0.08) {
      return Math.random() < 0.003 && progress < 0.98
        ? GLITCH_CHARS[~~(Math.random() * GLITCH_CHARS.length)]
        : char;
    } else if (progress > threshold - 0.25) {
      const intensity = 1 - (progress - (threshold - 0.25)) / 0.33;
      return Math.random() < 0.3 + intensity * 0.5
        ? STATIC_CHARS[
            ~~((noisePhase + Math.random()) * STATIC_CHARS.length) %
              STATIC_CHARS.length
          ]
        : GLITCH_CHARS[~~(Math.random() * GLITCH_CHARS.length)];
    } else if (progress > threshold - 0.5) {
      return Math.random() < 0.15
        ? STATIC_CHARS[~~(Math.random() * STATIC_CHARS.length)]
        : " ";
    }
    return " ";
  }

  _updateMousePosition() {
    const rect = this.containerElement.getBoundingClientRect();
    const charWidth = rect.width / this.gridWidth;
    const charHeight = rect.height / this.gridHeight;

    this.rippleState.mouseX =
      (this.rippleState.globalMouseX - rect.left) / charWidth;
    this.rippleState.mouseY =
      (this.rippleState.globalMouseY - rect.top) / charHeight;

    // Check if hovering over the logo AND over a non-space character
    const isOverLogo =
      this.rippleState.globalMouseX >= rect.left &&
      this.rippleState.globalMouseX <= rect.right &&
      this.rippleState.globalMouseY >= rect.top &&
      this.rippleState.globalMouseY <= rect.bottom;

    if (isOverLogo) {
      const charX = Math.floor(this.rippleState.mouseX);
      const charY = Math.floor(this.rippleState.mouseY);
      if (
        charY >= 0 &&
        charY < LOGO_LINES.length &&
        charX >= 0 &&
        charX < LOGO_LINES[charY].length
      ) {
        const hoveredChar = LOGO_LINES[charY][charX];
        this.rippleState.isHovering = hoveredChar !== " ";
      } else {
        this.rippleState.isHovering = false;
      }
    } else {
      this.rippleState.isHovering = false;
    }

    if (!this.rippleState.isHovering) {
      this.rippleState.trails = [];
    }
  }

  _updateRippleEffects(deltaTime) {
    if (!this.rippleState.isHovering) return;

    const velocity = Math.sqrt(
      (this.rippleState.mouseX - this.rippleState.lastMouseX) ** 2 +
        (this.rippleState.mouseY - this.rippleState.lastMouseY) ** 2,
    );

    this.rippleState.lastMouseX = this.rippleState.mouseX;
    this.rippleState.lastMouseY = this.rippleState.mouseY;

    // Only create effects if mouse is actually moving
    if (velocity < 0.01) return;

    this._addTrail(velocity);
    this._maybeAddRipple(velocity);
  }

  _addTrail(velocity) {
    this.rippleState.trails.push({
      x: this.rippleState.mouseX,
      y: this.rippleState.mouseY,
      time: performance.now(),
      hue: (this.rippleState.globalTime * 60) % 360,
    });

    if (this.rippleState.trails.length > 20) this.rippleState.trails.shift();
  }

  _maybeAddRipple(velocity) {
    if (Math.random() < Math.min(0.8, 0.3 + velocity * 0.15)) {
      this.rippleState.ripples.push({
        x: this.rippleState.mouseX,
        y: this.rippleState.mouseY,
        time: performance.now(),
        hue: Math.random() * 360,
        pattern: ~~(Math.random() * 3),
        speed: 25 + velocity * 5,
      });

      // Add sparks
      const sparkCount = ~~(2 + velocity * 2);
      for (let i = 0; i < sparkCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const sparkSpeed = 3 + Math.random() * 6 + velocity * 2;
        this.rippleState.sparks.push({
          x: this.rippleState.mouseX,
          y: this.rippleState.mouseY,
          velocityX: Math.cos(angle) * sparkSpeed,
          velocityY: Math.sin(angle) * sparkSpeed,
          time: performance.now(),
          hue: Math.random() * 360,
          lifetime: 0.3 + Math.random() * 0.5,
        });
      }
    }
  }

  _cleanupOldEffects(now) {
    if (now - this.rippleState.lastCleanupTime < 100) return;

    this.rippleState.lastCleanupTime = now;
    this.rippleState.ripples = this.rippleState.ripples.filter(
      (r) => now - r.time <= 2500,
    );
    this.rippleState.sparks = this.rippleState.sparks.filter(
      (s) => now - s.time <= s.lifetime * 1000,
    );
    this.rippleState.trails = this.rippleState.trails.filter(
      (t) => now - t.time <= 400,
    );
  }

  _updateSparks(deltaTime) {
    for (const spark of this.rippleState.sparks) {
      spark.x += spark.velocityX * deltaTime * 0.8;
      spark.y += spark.velocityY * deltaTime * 0.5;
      spark.velocityX *= 0.95;
      spark.velocityY *= 0.95;
    }
  }

  _calculateRippleEffects(x, y, char, now) {
    let intensity = 0;
    let blendedHue = 0;
    let hueWeight = 0;
    let glowIntensity = 0;
    let scale = 1;

    const noise = noiseFunction(x, y, this.rippleState.globalTime) * 0.5 + 0.5;

    // Trail effects
    for (const trail of this.rippleState.trails) {
      const impact = this._calculateTrailImpact(x, y, trail, now);
      intensity = Math.min(1, intensity + impact.intensity);
      blendedHue += trail.hue * impact.intensity;
      hueWeight += impact.intensity;
      glowIntensity = Math.max(glowIntensity, impact.glow);
    }

    // Hover effects
    if (this.rippleState.isHovering) {
      const impact = this._calculateHoverImpact(x, y);
      intensity = Math.min(1, intensity + impact.intensity);
      blendedHue +=
        ((this.rippleState.globalTime * 80) % 360) * impact.intensity;
      hueWeight += impact.intensity;
      glowIntensity = Math.max(glowIntensity, impact.glow);
    }

    // Ripple effects
    for (const ripple of this.rippleState.ripples) {
      const impact = this._calculateRippleImpact(x, y, ripple, now);
      intensity = Math.min(1, intensity + impact.intensity);
      blendedHue += impact.hue;
      hueWeight += impact.weight;
      glowIntensity = Math.max(glowIntensity, impact.glow);
      scale = Math.max(scale, impact.scale);
    }

    // Spark effects
    for (const spark of this.rippleState.sparks) {
      const impact = this._calculateSparkImpact(x, y, spark, now);
      intensity = Math.min(1, intensity + impact.intensity);
      blendedHue += spark.hue * impact.intensity;
      hueWeight += impact.intensity;
      glowIntensity = Math.max(glowIntensity, impact.glow);
    }

    // Ambient noise when hovering
    if (this.rippleState.isHovering && char !== " ") {
      intensity = Math.min(
        1,
        intensity +
          (Math.sin(x * 0.4 + y * 0.6 + this.rippleState.globalTime * 5) *
            0.04 +
            0.04) *
            noise,
      );
    }

    if (hueWeight > 0) blendedHue /= hueWeight;
    blendedHue = (blendedHue + this.rippleState.globalTime * 15) % 360;

    return { intensity, blendedHue, glowIntensity, scale };
  }

  _calculateTrailImpact(x, y, trail, now) {
    const dx = x - trail.x;
    const dy = (y - trail.y) * 2.2;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const age = (now - trail.time) / 400;

    if (distance < 3 && age < 1) {
      const impactIntensity = (1 - distance / 3) * (1 - age) * 0.7;
      return {
        intensity: impactIntensity,
        glow: impactIntensity * 0.5,
      };
    }
    return { intensity: 0, glow: 0 };
  }

  _calculateHoverImpact(x, y) {
    const dx = x - this.rippleState.mouseX;
    const dy = (y - this.rippleState.mouseY) * 2.2;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 5) {
      const impactIntensity = (1 - distance / 5) * 0.6;
      return {
        intensity: impactIntensity,
        glow: impactIntensity * 0.7,
      };
    }
    return { intensity: 0, glow: 0 };
  }

  _calculateRippleImpact(x, y, ripple, now) {
    const dx = x - ripple.x;
    const dy = (y - ripple.y) * 2.2;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const age = Math.max(0, (now - ripple.time) / 1000);

    const ringCount = ripple.pattern === 0 ? 5 : ripple.pattern === 1 ? 3 : 4;
    const baseSpeed = ripple.speed || 25;

    let totalIntensity = 0;
    let totalHue = 0;
    let totalWeight = 0;
    let maxGlow = 0;

    // Multi-ring effect
    for (let ring = 0; ring < ringCount; ring++) {
      const ringSpeed = baseSpeed - ring * 3;
      const ringRadius = age * ringSpeed;
      const ringWidth =
        1 + ring * 0.4 + Math.sin(this.rippleState.globalTime * 5 + ring) * 0.3;
      const ringDistance = Math.abs(distance - ringRadius);

      if (ringDistance < ringWidth) {
        const wave = Math.cos((ringDistance / ringWidth) * Math.PI * 0.5);
        const fade = Math.pow(Math.max(0, 1 - age / 2.5), 1.5);
        const ringFade = 1 - ring * 0.15;
        const pulse =
          0.9 + Math.sin(this.rippleState.globalTime * 12 + ring * 2.5) * 0.1;
        const impactIntensity = wave * fade * ringFade * pulse;

        if (impactIntensity > 0) {
          totalIntensity += impactIntensity * 0.7;
          const hueShift =
            age * 100 +
            ring * 60 +
            Math.sin(distance * 0.5 + this.rippleState.globalTime * 4) * 50;
          totalHue += (ripple.hue + hueShift) * impactIntensity;
          totalWeight += impactIntensity;
          if (ring === 0) maxGlow = Math.max(maxGlow, impactIntensity * 0.9);
        }
      }
    }

    // Center glow
    let scale = 1;
    if (age < 0.4 && distance < 5) {
      const glow = (1 - distance / 5) * (1 - age / 0.4);
      totalIntensity += glow * 0.8;
      maxGlow = Math.max(maxGlow, glow);
      totalHue += ripple.hue * glow;
      totalWeight += glow;
      scale = 1 + glow * 0.4;
    }

    return {
      intensity: totalIntensity,
      hue: totalHue,
      weight: totalWeight,
      glow: maxGlow,
      scale,
    };
  }

  _calculateSparkImpact(x, y, spark, now) {
    const dx = x - spark.x;
    const dy = (y - spark.y) * 2.2;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const age = (now - spark.time) / 1000;
    const fade = Math.max(0, 1 - age / spark.lifetime);

    if (distance < 3 && fade > 0) {
      const impactIntensity = (1 - distance / 3) * fade;
      return {
        intensity: impactIntensity * 0.9,
        glow: impactIntensity * 0.7,
      };
    }
    return { intensity: 0, glow: 0 };
  }

  _applyGlowEffects(now) {
    // Apply text-shadow glow effects via direct DOM manipulation
    // (not supported by WebGL renderer, so this is DOM-specific enhancement)
    const charElements = this.renderer.charElements;

    // Skip if using WebGL renderer (no charElements property)
    if (!charElements) return;

    let charIndex = 0;
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const originalChar = LOGO_LINES[y][x];
        const effects = this._calculateRippleEffects(x, y, originalChar, now);
        const element = charElements[charIndex];

        if (element && effects.intensity > 0.01 && originalChar !== " ") {
          // Apply glow via text-shadow
          if (effects.glowIntensity > 0.1) {
            const glowSize1 = ~~(effects.glowIntensity * 12);
            const glowSize2 = ~~(effects.glowIntensity * 24);
            const hue2 = (effects.blendedHue + 60) % 360;
            element.style.textShadow = `0 0 ${glowSize1}px hsl(${effects.blendedHue},100%,70%),0 0 ${glowSize2}px hsl(${hue2},100%,50%)`;
          } else if (element.style.textShadow) {
            element.style.textShadow = "";
          }
        } else if (element && element.style.textShadow) {
          // Clear glow
          element.style.textShadow = "";
        }

        charIndex++;
      }
    }
  }

  _hslToRgb(h, s, l) {
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return [r, g, b];
  }
}
