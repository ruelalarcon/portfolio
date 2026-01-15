/**
 * ASCII Cube Renderer
 * Renders a rotating 3D cube using ASCII characters with simple Euler angles
 */

// Character aspect ratio (height/width) for monospace font
const CHAR_ASPECT_RATIO = 2.0;

// Angle to character mappings for line rendering
const ANGLE_CHAR_MAP = [
  { angle: 0, char: "-" },
  { angle: 45, char: "⟍" },
  { angle: 63.5, char: "\\" },
  { angle: 90, char: "|" },
  { angle: 115.5, char: "/" },
  { angle: 135, char: "⟋" },
  { angle: 180, char: "-" },
  { angle: -45, char: "⟋" },
  { angle: -63.5, char: "/" },
  { angle: -90, char: "|" },
  { angle: -115.5, char: "\\" },
  { angle: -135, char: "⟍" },
];

// Cube edges (pairs of vertex indices)
const CUBE_EDGES = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0], // Back face
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 4], // Front face
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7], // Connecting edges
];

class CubeRenderer {
  constructor(width, height, size = 15) {
    this.width = width;
    this.height = height;
    this.size = size;
    this.grid = [];
    this.initGrid();
  }

  /**
   * Initialize empty grid
   */
  initGrid() {
    this.grid = [];
    for (let y = 0; y < this.height; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.width; x++) {
        this.grid[y][x] = " ";
      }
    }
  }

  /**
   * Get character and threshold based on angle
   */
  getCharForAngle(angleDegrees) {
    let closestMapping = null;
    let minDiff = Infinity;

    for (let mapping of ANGLE_CHAR_MAP) {
      let diff = Math.abs(mapping.angle - angleDegrees);
      diff = Math.min(diff, Math.abs(diff - 360), Math.abs(diff + 360));

      if (diff < minDiff) {
        minDiff = diff;
        closestMapping = mapping;
      }
    }

    if (!closestMapping) return { char: ".", threshold: 0.5 };

    const angleRange = this.calculateAngleRange(closestMapping);
    const threshold = Math.max(0.4, Math.min(1.2, angleRange / 45.0));

    return { char: closestMapping.char, threshold: threshold };
  }

  /**
   * Calculate the angle range covered by a mapping
   */
  calculateAngleRange(mapping) {
    if (ANGLE_CHAR_MAP.length <= 1) return 45;

    const distances = ANGLE_CHAR_MAP.filter((m) => m !== mapping)
      .map((m) => {
        let diff = Math.abs(m.angle - mapping.angle);
        diff = Math.min(diff, Math.abs(diff - 360), Math.abs(diff + 360));
        return diff;
      })
      .sort((a, b) => a - b);

    return distances[0] || 45;
  }

  /**
   * Calculate angle between two points
   */
  calculateAngle(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const visualDy = dy * CHAR_ASPECT_RATIO;
    const angle = Math.atan2(visualDy, dx) * (180 / Math.PI);
    return angle;
  }

  /**
   * Calculate distance from point to line segment
   */
  distanceToLineSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) {
      const dpx = px - x1;
      const dpy = py - y1;
      return Math.sqrt(dpx * dpx + dpy * dpy);
    }

    let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
    t = Math.max(0, Math.min(1, t));

    const projX = x1 + t * dx;
    const projY = y1 + t * dy;

    const dpx = px - projX;
    const dpy = py - projY;
    return Math.sqrt(dpx * dpx + dpy * dpy);
  }

  /**
   * Draw line using ASCII characters
   */
  drawLine(x0, y0, x1, y1, char, threshold) {
    if (x0 === x1 && y0 === y1) {
      if (x0 >= 0 && x0 < this.width && y0 >= 0 && y0 < this.height) {
        this.grid[Math.round(y0)][Math.round(x0)] = char;
      }
      return;
    }

    const dx = x1 - x0;
    const dy = (y1 - y0) * CHAR_ASPECT_RATIO;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    const minX = Math.min(x0, x1) - (absDx >= absDy ? 0 : 1);
    const maxX = Math.max(x0, x1) + (absDx >= absDy ? 0 : 1);
    const minY = Math.min(y0, y1) - (absDx >= absDy ? 1 : 0);
    const maxY = Math.max(y0, y1) + (absDx >= absDy ? 1 : 0);

    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      for (let x = Math.floor(minX); x <= Math.ceil(maxX); x++) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) continue;

        const dist = this.distanceToLineSegment(
          x,
          y * CHAR_ASPECT_RATIO,
          x0,
          y0 * CHAR_ASPECT_RATIO,
          x1,
          y1 * CHAR_ASPECT_RATIO,
        );

        if (dist < threshold) {
          this.grid[y][x] = char;
        }
      }
    }
  }

  /**
   * 3D rotation around X axis
   */
  rotateX(point, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x: point.x,
      y: point.y * cos - point.z * sin,
      z: point.y * sin + point.z * cos,
    };
  }

  /**
   * 3D rotation around Y axis
   */
  rotateY(point, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x: point.x * cos + point.z * sin,
      y: point.y,
      z: -point.x * sin + point.z * cos,
    };
  }

  /**
   * 3D rotation around Z axis
   */
  rotateZ(point, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x: point.x * cos - point.y * sin,
      y: point.x * sin + point.y * cos,
      z: point.z,
    };
  }

  /**
   * Project 3D point to 2D screen
   */
  project3D(point) {
    const scale = 200 / (200 + point.z);
    return {
      x: point.x * scale + this.width / 2,
      y: (point.y * scale) / CHAR_ASPECT_RATIO + this.height / 2,
      z: point.z,
    };
  }

  /**
   * Get cube vertices
   */
  getCubeVertices() {
    const s = this.size;
    return [
      { x: -s, y: -s, z: -s }, // 0
      { x: s, y: -s, z: -s }, // 1
      { x: s, y: s, z: -s }, // 2
      { x: -s, y: s, z: -s }, // 3
      { x: -s, y: -s, z: s }, // 4
      { x: s, y: -s, z: s }, // 5
      { x: s, y: s, z: s }, // 6
      { x: -s, y: s, z: s }, // 7
    ];
  }

  /**
   * Render the cube at given rotation angles
   * @param {number} rotationX - Rotation angle around X axis
   * @param {number} rotationY - Rotation angle around Y axis
   * @param {number} rotationZ - Rotation angle around Z axis
   * @returns {Array<string>} Array of characters for grid
   */
  render(rotationX, rotationY, rotationZ) {
    this.initGrid();

    const vertices = this.getCubeVertices();

    // Rotate all vertices
    const rotatedVertices = vertices.map((v) => {
      let rotated = this.rotateX(v, rotationX);
      rotated = this.rotateY(rotated, rotationY);
      rotated = this.rotateZ(rotated, rotationZ);
      return rotated;
    });

    // Project to 2D
    const projectedVertices = rotatedVertices.map((v) => this.project3D(v));

    // Sort edges by average Z depth (painter's algorithm)
    const edgesWithDepth = CUBE_EDGES.map((edge) => {
      const avgZ =
        (rotatedVertices[edge[0]].z + rotatedVertices[edge[1]].z) / 2;
      return { edge, avgZ };
    });
    edgesWithDepth.sort((a, b) => a.avgZ - b.avgZ);

    // Draw all edges
    edgesWithDepth.forEach(({ edge }) => {
      const v1 = projectedVertices[edge[0]];
      const v2 = projectedVertices[edge[1]];

      const angle = this.calculateAngle(v1.x, v1.y, v2.x, v2.y);
      const charInfo = this.getCharForAngle(angle);

      this.drawLine(v1.x, v1.y, v2.x, v2.y, charInfo.char, charInfo.threshold);
    });

    // Flatten grid to character array
    const chars = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        chars.push(this.grid[y][x]);
      }
    }

    return chars;
  }

  /**
   * Update cube size
   */
  setSize(size) {
    this.size = size;
  }
}

export { CubeRenderer };
