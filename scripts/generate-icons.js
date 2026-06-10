import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createCanvas } from "canvas";

const sizes = [72, 96, 128, 192, 512];
const outputDir = join(process.cwd(), "public", "icons");

mkdirSync(outputDir, { recursive: true });

for (const size of sizes) {
  const canvas = createCanvas(size, size);
  const context = canvas.getContext("2d");
  const radius = Math.round(size * 0.16);

  context.fillStyle = "#7C3AED";
  context.beginPath();
  context.roundRect(0, 0, size, size, radius);
  context.fill();

  context.fillStyle = "#FFFFFF";
  context.font = `700 ${Math.round(size * 0.36)}px Inter, Arial, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("PK", size / 2, size / 2 + Math.round(size * 0.02));

  writeFileSync(join(outputDir, `icon-${size}.png`), canvas.toBuffer("image/png"));
}

console.log(`Generated ${sizes.length} PaxKonnect PWA icons in ${outputDir}`);
