/**
 * Custom ASCII Filter for PixiJS using Cascadia Code font
 * Converts rendered content to ASCII art in real-time via GPU shader
 */

const ASCII_CHARS = ".:-=+*#%@";

/**
 * Create character texture atlas using Cascadia Code font
 * Measures at display size but renders at texture size for quality
 */
async function createCharAtlas(displayFontSize = 12, textureFontSize = 48) {
  await document.fonts.ready;

  const font = '"Cascadia Code", monospace';
  const cols = ASCII_CHARS.length;

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

  const charWidth = Math.ceil(
    (displayCharWidth * textureFontSize) / displayFontSize,
  );
  const charHeight = Math.ceil(
    (displayCharHeight * textureFontSize) / displayFontSize,
  );

  const atlasWidth = charWidth * cols;
  const atlasHeight = charHeight;
  const canvas = document.createElement("canvas");
  canvas.width = atlasWidth;
  canvas.height = atlasHeight;

  const ctx = canvas.getContext("2d", { willReadFrequently: false });

  ctx.clearRect(0, 0, atlasWidth, atlasHeight);

  ctx.font = `${textureFontSize}px ${font}`;
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  for (let i = 0; i < ASCII_CHARS.length; i++) {
    const char = ASCII_CHARS[i];
    const x = i * charWidth;
    ctx.fillText(char, x, 0);
  }

  return {
    canvas,
    charWidth,
    charHeight,
    displayCharWidth,
    displayCharHeight,
    cols,
  };
}

const VERTEX_SHADER = `
  attribute vec2 aVertexPosition;
  attribute vec2 aTextureCoord;

  uniform mat3 projectionMatrix;

  varying vec2 vTextureCoord;

  void main(void) {
    gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
    vTextureCoord = aTextureCoord;
  }
`;

const FRAGMENT_SHADER = `
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
    vec2 pixelPos = vTextureCoord * uResolution;
    vec2 cellSize = vec2(uDisplayCellWidth, uDisplayCellHeight);
    vec2 gridPos = floor(pixelPos / cellSize);
    vec2 cellPos = mod(pixelPos, cellSize);

    vec2 cellCenter = (gridPos + 0.5) * cellSize / uResolution;
    vec4 color = texture2D(uSampler, cellCenter);

    float brightness = 0.299 * color.r + 0.587 * color.g + 0.114 * color.b;

    float charIndex = floor(brightness * (uCharCount - 0.01));
    charIndex = clamp(charIndex, 0.0, uCharCount - 1.0);

    vec2 textureCellPos = cellPos * (uCharSize / cellSize);

    float charU = (charIndex * uCharSize.x + textureCellPos.x) / uAtlasSize.x;
    float charV = textureCellPos.y / uAtlasSize.y;

    vec4 charTexel = texture2D(uCharAtlas, vec2(charU, charV));

    float alpha = charTexel.r;

    gl_FragColor = vec4(color.rgb * alpha, color.a);
  }
`;

/**
 * Custom ASCII Filter using Cascadia Code font texture atlas
 */
class CascadiaASCIIFilter extends PIXI.Filter {
  constructor(cellSize = 12, textureFontSize = 48) {
    super(VERTEX_SHADER, FRAGMENT_SHADER, {
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

    this._initAtlas();
  }

  async _initAtlas() {
    this.atlas = await createCharAtlas(this.cellSize, this.textureFontSize);
    const atlasTexture = PIXI.Texture.from(this.atlas.canvas);

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
  }

  apply(filterManager, input, output, clear) {
    if (!this.isReady) {
      filterManager.applyFilter(this, input, output, clear);
      return;
    }

    this.uniforms.uResolution = [input.width, input.height];
    super.apply(filterManager, input, output, clear);
  }

  get size() {
    return this.cellSize;
  }

  set size(value) {
    this.cellSize = value;
    this._initAtlas();
  }
}

export { CascadiaASCIIFilter };
