/**
 * Custom ASCII Filter for PixiJS using Cascadia Code font
 * Similar to WebGLASCIIRenderer but as a PixiJS filter
 */

// ASCII character set - same as video player (ordered by visual density)
const ASCII_CHARS = ".:-=+*#%@";

/**
 * Create character texture atlas using Cascadia Code font
 * Measures at display size but renders at texture size (same as webgl.js)
 */
async function createCharAtlas(displayFontSize = 12, textureFontSize = 48) {
  // Wait for fonts to load
  await document.fonts.ready;

  const font = '"Cascadia Code", monospace';
  const cols = ASCII_CHARS.length; // One row of characters
  const rows = 1;

  // Measure character dimensions at DISPLAY size (same as webgl.js)
  const measureSpan = document.createElement("span");
  measureSpan.style.font = `${displayFontSize}px ${font}`;
  measureSpan.style.lineHeight = "1";
  measureSpan.style.position = "absolute";
  measureSpan.style.visibility = "hidden";
  measureSpan.textContent = "@";
  document.body.appendChild(measureSpan);

  const rect = measureSpan.getBoundingClientRect();
  const displayCharWidth = rect.width;
  const displayCharHeight = rect.height;

  document.body.removeChild(measureSpan);

  // Calculate texture dimensions by scaling up from display dimensions
  const charWidth = Math.ceil(
    (displayCharWidth * textureFontSize) / displayFontSize,
  );
  const charHeight = Math.ceil(
    (displayCharHeight * textureFontSize) / displayFontSize,
  );

  // Create atlas canvas at TEXTURE size
  const atlasWidth = charWidth * cols;
  const atlasHeight = charHeight;
  const canvas = document.createElement("canvas");
  canvas.width = atlasWidth;
  canvas.height = atlasHeight;

  const ctx = canvas.getContext("2d", { willReadFrequently: false });

  // Clear to transparent
  ctx.clearRect(0, 0, atlasWidth, atlasHeight);

  // Set up text rendering at TEXTURE font size
  ctx.font = `${textureFontSize}px ${font}`;
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  // Draw each character
  for (let i = 0; i < ASCII_CHARS.length; i++) {
    const char = ASCII_CHARS[i];
    const x = i * charWidth;
    ctx.fillText(char, x, 0);
  }

  console.log("Character atlas created:", {
    displayFontSize,
    textureFontSize,
    displayCharWidth,
    displayCharHeight,
    charWidth,
    charHeight,
    atlasWidth,
    atlasHeight,
    charCount: ASCII_CHARS.length,
  });

  return {
    canvas,
    charWidth, // Texture size
    charHeight, // Texture size
    displayCharWidth, // Display size (what user sees)
    displayCharHeight, // Display size (what user sees)
    cols,
    rows,
  };
}

/**
 * Custom ASCII Filter using Cascadia Code font texture atlas
 */
class CascadiaASCIIFilter extends PIXI.Filter {
  constructor(cellSize = 12, textureFontSize = 48) {
    // Vertex shader (standard)
    const vertexShader = `
      attribute vec2 aVertexPosition;
      attribute vec2 aTextureCoord;

      uniform mat3 projectionMatrix;

      varying vec2 vTextureCoord;

      void main(void) {
        gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
        vTextureCoord = aTextureCoord;
      }
    `;

    // Fragment shader (ASCII conversion with texture atlas sampling)
    const fragmentShader = `
      precision highp float;

      varying vec2 vTextureCoord;

      uniform sampler2D uSampler;
      uniform sampler2D uCharAtlas;
      uniform vec2 uResolution;
      uniform float uDisplayCellWidth;
      uniform float uDisplayCellHeight;
      uniform float uCharCount;
      uniform vec2 uCharSize;
      uniform vec2 uAtlasSize;

      void main(void) {
        // Calculate which grid cell this pixel belongs to (using display dimensions)
        vec2 pixelPos = vTextureCoord * uResolution;
        vec2 cellSize = vec2(uDisplayCellWidth, uDisplayCellHeight);
        vec2 gridPos = floor(pixelPos / cellSize);
        vec2 cellPos = mod(pixelPos, cellSize);

        // Sample color from center of grid cell
        vec2 cellCenter = (gridPos + 0.5) * cellSize / uResolution;
        vec4 color = texture2D(uSampler, cellCenter);

        // Calculate brightness (weighted RGB - same as video player)
        float brightness = 0.299 * color.r + 0.587 * color.g + 0.114 * color.b;

        // Map brightness to character index (0 = darkest '.', 8 = brightest '@')
        float charIndex = floor(brightness * (uCharCount - 0.01));
        charIndex = clamp(charIndex, 0.0, uCharCount - 1.0);

        // Scale cellPos from display size to texture size for sampling
        vec2 textureCellPos = cellPos * (uCharSize / cellSize);

        // Calculate UV coordinates in the character atlas
        // Characters are laid out horizontally in a single row
        float charU = (charIndex * uCharSize.x + textureCellPos.x) / uAtlasSize.x;
        float charV = textureCellPos.y / uAtlasSize.y;

        // Sample character from atlas
        vec4 charTexel = texture2D(uCharAtlas, vec2(charU, charV));

        // Use character's alpha/intensity to determine if we show the color
        // White text on transparent background - use red channel as mask
        float alpha = charTexel.r;

        // Apply original color where character is visible
        gl_FragColor = vec4(color.rgb * alpha, color.a);
      }
    `;

    // Initialize with placeholder uniforms
    super(vertexShader, fragmentShader, {
      uCharAtlas: PIXI.Texture.EMPTY,
      uResolution: [800, 600],
      uDisplayCellWidth: cellSize,
      uDisplayCellHeight: cellSize,
      uCharCount: ASCII_CHARS.length,
      uCharSize: [48, 48],
      uAtlasSize: [432, 48],
    });

    this.cellSize = cellSize;
    this.textureFontSize = textureFontSize;
    this.atlas = null;
    this.isReady = false;

    // Initialize atlas asynchronously
    this._initAtlas();
  }

  async _initAtlas() {
    // Create character atlas
    this.atlas = await createCharAtlas(this.cellSize, this.textureFontSize);
    const atlasTexture = PIXI.Texture.from(this.atlas.canvas);

    // Update individual uniform values
    this.uniforms.uCharAtlas = atlasTexture;
    this.uniforms.uDisplayCellWidth = this.atlas.displayCharWidth;
    this.uniforms.uDisplayCellHeight = this.atlas.displayCharHeight;
    this.uniforms.uCharCount = ASCII_CHARS.length;
    this.uniforms.uCharSize = [this.atlas.charWidth, this.atlas.charHeight];
    this.uniforms.uAtlasSize = [
      this.atlas.canvas.width,
      this.atlas.canvas.height,
    ];

    this.isReady = true;
    console.log("CascadiaASCIIFilter ready");
  }

  /**
   * Override apply to update resolution
   */
  apply(filterManager, input, output, clear) {
    if (!this.isReady) {
      // Filter not ready yet, just pass through
      filterManager.applyFilter(this, input, output, clear);
      return;
    }

    this.uniforms.uResolution = [input.width, input.height];
    super.apply(filterManager, input, output, clear);
  }

  /**
   * Get/set cell size
   */
  get size() {
    return this.cellSize;
  }

  set size(value) {
    this.cellSize = value;
    // Need to recreate atlas with new display size
    this._initAtlas();
  }
}

export { CascadiaASCIIFilter };
