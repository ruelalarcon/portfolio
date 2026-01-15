/**
 * Video playbar controls
 * Standalone module with integrated constants
 */

const GLYPHS = "░▒▓█▀▄▌▐╔╗╚╝║═╠╣╦╩╬├┤┬┴┼│─■□◊◦•○●";

export class Playbar {
  constructor(video, container) {
    this.video = video;
    this.playbarElement = document.createElement("div");
    this.playbarElement.id = "playbar";
    container.appendChild(this.playbarElement);

    this.buttonMorphing = false;
    this.buttonTargetText = "";
    this.buttonMorphAnimationId = null;

    this.isSeeking = false;
    this.seekStartTime = null;
    this.seekTargetTime = null;
    this.seekAnimationId = null;

    this.onTogglePlayPause = null;
  }

  /**
   * Initialize playbar controls
   * @param {Function} onTogglePlayPause - Callback for play/pause toggle
   */
  init(onTogglePlayPause) {
    this.onTogglePlayPause = onTogglePlayPause;
    this._setupEventHandlers();
    this.update();
  }

  _setupEventHandlers() {
    this.playbarElement.addEventListener("click", (e) => {
      const text = this.playbarElement.textContent;
      const rect = this.playbarElement.getBoundingClientRect();
      const charWidth = rect.width / text.length;
      const clickX = e.clientX - rect.left;
      const clickCharIndex = Math.floor(clickX / charWidth);

      const buttonEnd = text.indexOf("]") + 1;

      if (clickCharIndex < buttonEnd) {
        this._handlePlayPauseClick();
      } else {
        const barStart = text.indexOf("[", buttonEnd);
        if (barStart === -1) return;

        const barClickIndex = clickCharIndex - barStart - 1;
        const barWidth = 90;

        if (barClickIndex >= 0 && barClickIndex < barWidth) {
          const seekProgress = barClickIndex / barWidth;
          if (this.video.duration && isFinite(this.video.duration)) {
            const targetTime = seekProgress * this.video.duration;

            // Check if the target time is seekable
            const seekable = this.video.seekable;
            let canSeek = false;
            for (let i = 0; i < seekable.length; i++) {
              if (
                targetTime >= seekable.start(i) &&
                targetTime <= seekable.end(i)
              ) {
                canSeek = true;
                break;
              }
            }

            if (canSeek) {
              this.smoothSeek(targetTime);
            }
          }
        }
      }
    });
  }

  _handlePlayPauseClick() {
    if (this.video.paused) {
      this.video.play();
      this.morphButton("[ Pause ]");
    } else {
      this.video.pause();
      this.morphButton(" [ Play ]");
    }
    if (this.onTogglePlayPause) {
      this.onTogglePlayPause();
    }
    this.update();
  }

  /**
   * Smoothly seek to a target time with animation
   * @param {number} targetTime - Target time in seconds
   */
  smoothSeek(targetTime) {
    // Cancel any ongoing seek animation
    if (this.seekAnimationId) {
      cancelAnimationFrame(this.seekAnimationId);
    }

    const startTime = this.video.currentTime;
    const startTimestamp = performance.now();
    const duration = 200; // 0.2s in milliseconds
    const wasPlaying = !this.video.paused;

    // Pause video during seek
    this.video.pause();
    this.isSeeking = true;
    this.seekStartTime = startTime;
    this.seekTargetTime = targetTime;

    const animate = (timestamp) => {
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic for smooth deceleration
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      // Interpolate between start and target time
      const currentTime = startTime + (targetTime - startTime) * easedProgress;
      this.video.currentTime = currentTime;

      if (progress < 1) {
        this.seekAnimationId = requestAnimationFrame(animate);
      } else {
        // Ensure we land exactly on target
        this.video.currentTime = targetTime;
        this.isSeeking = false;
        this.seekAnimationId = null;

        // Resume playback if it was playing before
        if (wasPlaying) {
          this.video.play().catch((err) => console.error("Play error:", err));
        }
      }
    };

    this.seekAnimationId = requestAnimationFrame(animate);
  }

  /**
   * Update the playbar display
   */
  update() {
    if (!this.playbarElement || !this.video) return;

    const isPaused = this.video.paused;
    const button = isPaused ? " [ Play ]" : "[ Pause ]";

    const progress = this.video.duration
      ? this.video.currentTime / this.video.duration
      : 0;
    const barWidth = 90;
    const filledWidth = Math.floor(progress * barWidth);

    let progressBar = "[";
    for (let i = 0; i < barWidth; i++) {
      if (i < filledWidth) {
        progressBar += "=";
      } else if (i === filledWidth) {
        progressBar += ">";
      } else {
        progressBar += " ";
      }
    }
    progressBar += "]";

    this.playbarElement.textContent = `${button} ${progressBar}`;
  }

  /**
   * Animate button text morphing
   * @param {string} targetText - Target text to morph to
   * @param {number} duration - Animation duration in milliseconds
   */
  morphButton(targetText, duration = 400) {
    if (this.buttonMorphing && this.buttonTargetText === targetText) return;

    if (this.buttonMorphAnimationId) {
      cancelAnimationFrame(this.buttonMorphAnimationId);
    }

    this.buttonMorphing = true;
    this.buttonTargetText = targetText;

    const fullText = this.playbarElement.textContent;
    const startText = fullText.substring(0, targetText.length);
    const progressBarText = fullText.substring(targetText.length);

    const startTimestamp = performance.now();
    const characterDelays = Array.from(
      { length: targetText.length },
      () => Math.random() * 0.5,
    );

    const animate = (timestamp) => {
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      let result = "";
      for (let i = 0; i < targetText.length; i++) {
        const charDelay = characterDelays[i];
        const charProgress = (easedProgress - charDelay * 0.3) / 0.7;
        const targetChar = targetText[i];
        const startChar = startText[i];

        if (charProgress >= 1) {
          result += targetChar;
        } else if (charProgress > 0) {
          result += this._getMorphChar(charProgress, startChar, targetChar);
        } else {
          result += startChar;
        }
      }

      this.playbarElement.textContent = result + progressBarText;

      if (progress < 1) {
        this.buttonMorphAnimationId = requestAnimationFrame(animate);
      } else {
        this.playbarElement.textContent = targetText + progressBarText;
        this.buttonMorphing = false;
        this.buttonMorphAnimationId = null;
      }
    };

    this.buttonMorphAnimationId = requestAnimationFrame(animate);
  }

  _getMorphChar(charProgress, startChar, targetChar) {
    const phase = charProgress * 4;

    if (phase < 1) {
      return Math.random() < 0.3
        ? GLYPHS[~~(Math.random() * GLYPHS.length)]
        : startChar;
    } else if (phase < 2) {
      return GLYPHS[~~(Math.random() * GLYPHS.length)];
    } else if (phase < 3) {
      return Math.random() < 0.5
        ? targetChar
        : GLYPHS[~~(Math.random() * GLYPHS.length)];
    } else {
      return Math.random() < 0.15
        ? GLYPHS[~~(Math.random() * GLYPHS.length)]
        : targetChar;
    }
  }

  /**
   * Check if currently seeking
   * @returns {boolean} True if seeking
   */
  isSeekingVideo() {
    return this.isSeeking;
  }
}
