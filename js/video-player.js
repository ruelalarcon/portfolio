import {
  LOGO_ASCII,
  ASCII_CHARS,
  GLYPHS,
  logoElement,
  buttonContainer,
  logoLines,
} from "./constants.js";

export const VideoPlayer = {
  isPlaying: false,
  video: null,
  canvas: null,
  context: null,
  videoWidth: 0,
  videoHeight: 0,
  brightnessBuffer: null,
  animationFrameId: 0,

  play(videoUrl) {
    if (this.isPlaying) return;

    this.isPlaying = true;
    logoElement.style.cursor = "default";
    buttonContainer
      .querySelectorAll(".btn")
      .forEach((btn) => btn.classList.add("disabled"));

    this._setupVideo(videoUrl);
  },

  _setupVideo(videoUrl) {
    this.video = document.createElement("video");
    this.video.src = videoUrl;
    this.video.crossOrigin = "anonymous";
    this.video.volume = 1;
    this.video.muted = false;
    this.video.playsInline = true;

    this.canvas = document.createElement("canvas");
    this.context = this.canvas.getContext("2d", {
      willReadFrequently: true,
      alpha: false,
    });

    this.video.addEventListener("loadedmetadata", () => this._onVideoLoaded(), {
      once: true,
    });
    this.video.addEventListener("playing", () => this._renderFrame(), {
      once: true,
    });
    this.video.addEventListener("ended", () => this._onVideoEnded());
    this.video.addEventListener("error", () => this._onVideoError());

    this.video.load();
  },

  _onVideoLoaded() {
    const aspectRatio = this.video.videoWidth / this.video.videoHeight;
    this.videoWidth = 58;
    this.videoHeight = ~~(this.videoWidth / aspectRatio / 2);
    this.canvas.width = this.videoWidth;
    this.canvas.height = this.videoHeight;
    this.brightnessBuffer = new Uint8Array(this.videoWidth * this.videoHeight);

    this._morphToLoading();
  },

  _morphToLoading() {
    const targetText = "";
    const padding = ~~((this.videoWidth - targetText.length) / 2);
    let progress = 0;

    const morphStep = () => {
      progress += 0.1;
      let output = "";

      for (let y = 0; y < this.videoHeight; y++) {
        for (let x = 0; x < this.videoWidth; x++) {
          const targetChar =
            y === ~~(this.videoHeight / 2) &&
            x >= padding &&
            x < padding + targetText.length
              ? targetText[x - padding]
              : " ";
          output +=
            Math.random() < progress
              ? targetChar
              : GLYPHS[~~(Math.random() * GLYPHS.length)];
        }
        if (y < this.videoHeight - 1) output += "\n";
      }

      logoElement.textContent = output;
      progress < 1 ? requestAnimationFrame(morphStep) : this.video.play();
    };

    morphStep();
  },

  _renderFrame() {
    if (this.video.paused || this.video.ended) {
      this.isPlaying = false;
      logoElement.style.cursor = "crosshair";
      this._morphBackToLogo();
      return;
    }

    this.context.drawImage(this.video, 0, 0, this.videoWidth, this.videoHeight);
    const imageData = this.context.getImageData(
      0,
      0,
      this.videoWidth,
      this.videoHeight,
    ).data;

    // Calculate brightness
    for (
      let i = 0, length = this.videoWidth * this.videoHeight;
      i < length;
      i++
    ) {
      const pixelIndex = i << 2;
      this.brightnessBuffer[i] =
        (imageData[pixelIndex] * 77 +
          imageData[pixelIndex + 1] * 150 +
          imageData[pixelIndex + 2] * 29) >>
        8;
    }

    // Render ASCII art
    let output = "";
    const charCount = ASCII_CHARS.length - 1;

    for (let y = 0; y < this.videoHeight; y++) {
      for (let x = 0; x < this.videoWidth; x++) {
        const index = y * this.videoWidth + x;
        const pixelIndex = index << 2;
        const brightness = this.brightnessBuffer[index];
        const char = ASCII_CHARS[(brightness * charCount + 0.5) >> 8];
        const r = imageData[pixelIndex];
        const g = imageData[pixelIndex + 1];
        const b = imageData[pixelIndex + 2];

        output += `<s style=color:rgb(${r},${g},${b})>${char}</s>`;
      }
      if (y < this.videoHeight - 1) output += "\n";
    }

    logoElement.innerHTML = output;
    this.animationFrameId = requestAnimationFrame(() => this._renderFrame());
  },

  _morphBackToLogo() {
    cancelAnimationFrame(this.animationFrameId);
    let progress = 0;

    const morphStep = () => {
      progress += 0.05;
      let output = "";

      for (let y = 0; y < logoLines.length; y++) {
        for (let x = 0; x < logoLines[y].length; x++) {
          output +=
            Math.random() < progress
              ? logoLines[y][x]
              : GLYPHS[~~(Math.random() * GLYPHS.length)];
        }
        if (y < logoLines.length - 1) output += "\n";
      }

      logoElement.textContent = output;

      if (progress < 1) {
        requestAnimationFrame(morphStep);
      } else {
        this._onMorphComplete();
      }
    };

    morphStep();
  },

  _onMorphComplete() {
    logoElement.textContent = LOGO_ASCII;
    buttonContainer
      .querySelectorAll(".btn")
      .forEach((btn) => btn.classList.remove("disabled"));

    const videoButton = document.getElementById("videoBtn");
    if (videoButton) {
      videoButton.classList.add("revealed");
    }
  },

  _onVideoEnded() {
    this.isPlaying = false;
    logoElement.style.cursor = "crosshair";
    buttonContainer
      .querySelectorAll(".btn")
      .forEach((btn) => btn.classList.remove("disabled"));
    this._morphBackToLogo();
  },

  _onVideoError() {
    this.isPlaying = false;
    logoElement.style.cursor = "crosshair";
    buttonContainer
      .querySelectorAll(".btn")
      .forEach((btn) => btn.classList.remove("disabled"));
    logoElement.textContent = LOGO_ASCII;
  },
};
