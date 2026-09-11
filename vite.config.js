import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import cesium from 'vite-plugin-cesium'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

// Dynamically resolve the absolute path based on the current host machine
const scriptPath = path.resolve('./ml_inference/run_inspection.bat');
const outputPath = path.resolve('./ml_inference/model_inspection.txt');

try {
  // The path is wrapped in quotes to prevent crashes if the folder path contains spaces
  const out = execSync(`"${scriptPath}"`).toString();
  fs.writeFileSync(outputPath, out);
} catch (e) {
  fs.writeFileSync(outputPath, e.toString() + '\n' + (e.stdout ? e.stdout.toString() : ''));
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), cesium()],
})