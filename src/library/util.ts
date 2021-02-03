// ----------
export function mapLinear(
  x: number,
  a1: number,
  a2: number,
  b1: number,
  b2: number,
  clamp?: boolean
): number {
  console.assert(a1 !== a2, 'a1 and a2 must be different');
  var output = b1 + ((x - a1) * (b2 - b1)) / (a2 - a1);
  if (clamp) {
    var min = Math.min(b1, b2);
    var max = Math.max(b1, b2);
    return Math.max(min, Math.min(max, output));
  }

  return output;
}

// ----------
export function vectorToPolar(x: number, y: number): { radians: number; distance: number } {
  return {
    radians: Math.atan2(y, x),
    distance: Math.sqrt(x * x + y * y)
  };
}

// ----------
export function polarToVector(radians: number, distance: number): { x: number; y: number } {
  return {
    x: Math.cos(radians) * distance,
    y: Math.sin(radians) * distance
  };
}

// ----------
export function clamp(x: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, x));
}

// ----------
export function sign(x: number) {
  if (x < 0) {
    return -1;
  }

  if (x > 0) {
    return 1;
  }

  return 0;
}
