// Run once: node generate-icons.mjs
// Requires: npm install -D sharp
import sharp from "sharp";
import { readFileSync } from "fs";

const svg = readFileSync("public/icon.svg");
await sharp(svg).resize(192).png().toFile("public/icon-192.png");
await sharp(svg).resize(512).png().toFile("public/icon-512.png");
console.log("Icons generated");
