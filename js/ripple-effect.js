import { LOGO_ASCII, logoElement, logoLines } from "./constants.js";
import { noiseFunction } from "./utilities.js";
import { VideoPlayer } from "./video-player.js";

export const RippleEffect = {
  state: {
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
    isAnimating: false,
    lastFrameTime: 0,
    globalTime: 0,
    lastCleanupTime: 0,
  },

  charWidth: 0,
  charHeight: 0,

  init() {
    const rect = logoElement.getBoundingClientRect();
    this.charWidth = rect.width / logoLines[0].length;
    this.charHeight = rect.height / logoLines.length;

    this._initGlobalMouseTracking();
    this._attachEventListeners();
    this._startAnimation();
  },

  _initGlobalMouseTracking() {
    // Use a single global mousemove listener to track cursor position
    document.addEventListener("mousemove", (e) => {
      this.state.globalMouseX = e.clientX;
      this.state.globalMouseY = e.clientY;
    });
  },

  _startAnimation() {
    if (!this.state.isAnimating) {
      this.state.isAnimating = true;
      this.state.lastFrameTime = performance.now();
      requestAnimationFrame((ts) => this._animate(ts));
    }
  },

  _attachEventListeners() {
    logoElement.addEventListener("mousedown", (e) => this._onClick(e));
  },

  _onClick(event) {
    if (VideoPlayer.isPlaying || !this.state.isHovering) return;

    const rect = logoElement.getBoundingClientRect();
    const clickX = (event.clientX - rect.left) / this.charWidth;
    const clickY = (event.clientY - rect.top) / this.charHeight;

    // Create multiple ripples for click effect
    for (let i = 0; i < 8; i++) {
      this.state.ripples.push({
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
      this.state.sparks.push({
        x: clickX,
        y: clickY,
        velocityX: Math.cos(angle) * sparkSpeed,
        velocityY: Math.sin(angle) * sparkSpeed,
        time: performance.now(),
        hue: (i * 12) % 360,
        lifetime: 0.5 + Math.random() * 0.7,
      });
    }
  },

  _animate(timestamp) {
    if (VideoPlayer.isPlaying) {
      this.state.isAnimating = false;
      return;
    }

    timestamp = timestamp || performance.now();

    const deltaTime = this.state.lastFrameTime
      ? Math.min((timestamp - this.state.lastFrameTime) / 1000, 0.1)
      : 0.016;

    this.state.lastFrameTime = timestamp;
    this.state.globalTime += deltaTime;

    this._updateMousePosition();
    this._updateEffects(deltaTime);
    this._cleanupOldEffects(timestamp);
    this._updateSparks(deltaTime);

    this._renderFrame(timestamp);
    requestAnimationFrame((ts) => this._animate(ts));
  },

  _updateMousePosition() {
    const rect = logoElement.getBoundingClientRect();
    this.state.mouseX = (this.state.globalMouseX - rect.left) / this.charWidth;
    this.state.mouseY = (this.state.globalMouseY - rect.top) / this.charHeight;

    // Check if hovering over the logo AND over a non-space character
    const isOverLogo =
      this.state.globalMouseX >= rect.left &&
      this.state.globalMouseX <= rect.right &&
      this.state.globalMouseY >= rect.top &&
      this.state.globalMouseY <= rect.bottom;

    if (isOverLogo) {
      const charX = Math.floor(this.state.mouseX);
      const charY = Math.floor(this.state.mouseY);
      if (
        charY >= 0 &&
        charY < logoLines.length &&
        charX >= 0 &&
        charX < logoLines[charY].length
      ) {
        const hoveredChar = logoLines[charY][charX];
        this.state.isHovering = hoveredChar !== " ";
      } else {
        this.state.isHovering = false;
      }
    } else {
      this.state.isHovering = false;
    }

    if (!this.state.isHovering) {
      this.state.trails = [];
    }
  },

  _updateEffects(deltaTime) {
    if (!this.state.isHovering || VideoPlayer.isPlaying) return;

    const velocity = Math.sqrt(
      (this.state.mouseX - this.state.lastMouseX) ** 2 +
        (this.state.mouseY - this.state.lastMouseY) ** 2,
    );

    this.state.lastMouseX = this.state.mouseX;
    this.state.lastMouseY = this.state.mouseY;
    // Only create effects if mouse is actually moving
    if (velocity < 0.01) return;

    this._addTrail(velocity);
    this._maybeAddRipple(velocity);
  },

  _addTrail(velocity) {
    this.state.trails.push({
      x: this.state.mouseX,
      y: this.state.mouseY,
      time: performance.now(),
      hue: (this.state.globalTime * 60) % 360,
    });

    if (this.state.trails.length > 20) this.state.trails.shift();
  },

  _maybeAddRipple(velocity) {
    if (Math.random() < Math.min(0.8, 0.3 + velocity * 0.15)) {
      this.state.ripples.push({
        x: this.state.mouseX,
        y: this.state.mouseY,
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
        this.state.sparks.push({
          x: this.state.mouseX,
          y: this.state.mouseY,
          velocityX: Math.cos(angle) * sparkSpeed,
          velocityY: Math.sin(angle) * sparkSpeed,
          time: performance.now(),
          hue: Math.random() * 360,
          lifetime: 0.3 + Math.random() * 0.5,
        });
      }
    }
  },

  _cleanupOldEffects(now) {
    if (now - this.state.lastCleanupTime < 100) return;

    this.state.lastCleanupTime = now;
    this.state.ripples = this.state.ripples.filter((r) => now - r.time <= 2500);
    this.state.sparks = this.state.sparks.filter(
      (s) => now - s.time <= s.lifetime * 1000,
    );
    this.state.trails = this.state.trails.filter((t) => now - t.time <= 400);
  },

  _updateSparks(deltaTime) {
    for (const spark of this.state.sparks) {
      spark.x += spark.velocityX * deltaTime * 0.8;
      spark.y += spark.velocityY * deltaTime * 0.5;
      spark.velocityX *= 0.95;
      spark.velocityY *= 0.95;
    }
  },

  _renderFrame(now) {
    let output = "";

    for (let y = 0; y < logoLines.length; y++) {
      for (let x = 0; x < logoLines[y].length; x++) {
        output += this._renderCharacter(x, y, logoLines[y][x], now);
      }
      if (y < logoLines.length - 1) output += "\n";
    }

    logoElement.innerHTML = output;
  },

  _renderCharacter(x, y, char, now) {
    const effects = this._calculateEffects(x, y, char, now);

    if (effects.intensity > 0.01 && char !== " ") {
      return this._renderStyledChar(char, effects);
    } else {
      const charClass = char === " " ? "char char-space" : "char char-text";
      return `<span class="${charClass}">${char === " " ? "&nbsp;" : char}</span>`;
    }
  },

  _calculateEffects(x, y, char, now) {
    let intensity = 0;
    let blendedHue = 0;
    let hueWeight = 0;
    let glowIntensity = 0;
    let scale = 1;

    const noise = noiseFunction(x, y, this.state.globalTime) * 0.5 + 0.5;

    // Trail effects
    for (const trail of this.state.trails) {
      const impact = this._calculateTrailImpact(x, y, trail, now);
      intensity = Math.min(1, intensity + impact.intensity);
      blendedHue += trail.hue * impact.intensity;
      hueWeight += impact.intensity;
      glowIntensity = Math.max(glowIntensity, impact.glow);
    }

    // Hover effects
    if (this.state.isHovering) {
      const impact = this._calculateHoverImpact(x, y);
      intensity = Math.min(1, intensity + impact.intensity);
      blendedHue += ((this.state.globalTime * 80) % 360) * impact.intensity;
      hueWeight += impact.intensity;
      glowIntensity = Math.max(glowIntensity, impact.glow);
    }

    // Ripple effects
    for (const ripple of this.state.ripples) {
      const impact = this._calculateRippleImpact(x, y, ripple, now);
      intensity = Math.min(1, intensity + impact.intensity);
      blendedHue += impact.hue;
      hueWeight += impact.weight;
      glowIntensity = Math.max(glowIntensity, impact.glow);
      scale = Math.max(scale, impact.scale);
    }

    // Spark effects
    for (const spark of this.state.sparks) {
      const impact = this._calculateSparkImpact(x, y, spark, now);
      intensity = Math.min(1, intensity + impact.intensity);
      blendedHue += spark.hue * impact.intensity;
      hueWeight += impact.intensity;
      glowIntensity = Math.max(glowIntensity, impact.glow);
    }

    // Ambient noise when hovering
    if (this.state.isHovering && char !== " ") {
      intensity = Math.min(
        1,
        intensity +
          (Math.sin(x * 0.4 + y * 0.6 + this.state.globalTime * 5) * 0.04 +
            0.04) *
            noise,
      );
    }

    if (hueWeight > 0) blendedHue /= hueWeight;
    blendedHue = (blendedHue + this.state.globalTime * 15) % 360;

    return { intensity, blendedHue, glowIntensity, scale };
  },

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
  },

  _calculateHoverImpact(x, y) {
    const dx = x - this.state.mouseX;
    const dy = (y - this.state.mouseY) * 2.2;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 5) {
      const impactIntensity = (1 - distance / 5) * 0.6;
      return {
        intensity: impactIntensity,
        glow: impactIntensity * 0.7,
      };
    }
    return { intensity: 0, glow: 0 };
  },

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
        1 + ring * 0.4 + Math.sin(this.state.globalTime * 5 + ring) * 0.3;
      const ringDistance = Math.abs(distance - ringRadius);

      if (ringDistance < ringWidth) {
        const wave = Math.cos((ringDistance / ringWidth) * Math.PI * 0.5);
        const fade = Math.pow(Math.max(0, 1 - age / 2.5), 1.5);
        const ringFade = 1 - ring * 0.15;
        const pulse =
          0.9 + Math.sin(this.state.globalTime * 12 + ring * 2.5) * 0.1;
        const impactIntensity = wave * fade * ringFade * pulse;

        if (impactIntensity > 0) {
          totalIntensity += impactIntensity * 0.7;
          const hueShift =
            age * 100 +
            ring * 60 +
            Math.sin(distance * 0.5 + this.state.globalTime * 4) * 50;
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
  },

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
  },

  _renderStyledChar(char, effects) {
    const saturation = Math.min(100, 50 + effects.intensity * 60);
    const lightness = 40 + effects.intensity * 55;
    const colorMix = Math.min(1, effects.intensity * 2.5);
    const finalSaturation = saturation * colorMix;
    const finalLightness = lightness * colorMix + 95 * (1 - colorMix);

    let style = `color:hsl(${effects.blendedHue},${finalSaturation}%,${Math.min(finalLightness, 95)}%);`;

    if (effects.glowIntensity > 0.1) {
      const glowSize1 = ~~(effects.glowIntensity * 12);
      const glowSize2 = ~~(effects.glowIntensity * 24);
      const hue2 = (effects.blendedHue + 60) % 360;
      style += `text-shadow:0 0 ${glowSize1}px hsl(${effects.blendedHue},100%,70%),0 0 ${glowSize2}px hsl(${hue2},100%,50%);`;
    }

    if (effects.scale > 1.05) {
      style += `transform:scale(${effects.scale.toFixed(2)});`;
    }

    return `<span class="char char-text" style="${style}">${char}</span>`;
  },
};
