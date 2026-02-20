export function getReadableColor() {
  let color;
  let attempts = 0;

  do {
    color = randomColor({ luminosity: "dark" });
    attempts++;
  } while (!hasGoodContrast(color, "#ffffff") && attempts < 10);

  return color;
}

function hasGoodContrast(bg: string, fg: string) {
  const luminance = (hex: string) => {
    const c = hex.substring(1);
    const rgb = [
      parseInt(c.substr(0, 2), 16),
      parseInt(c.substr(2, 2), 16),
      parseInt(c.substr(4, 2), 16),
    ].map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  };

  const L1 = luminance(bg);
  const L2 = luminance(fg);

  const contrast = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);

  return contrast >= 4.5;
}
