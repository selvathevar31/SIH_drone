import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import cesium from 'vite-plugin-cesium'
import fs from 'fs'
import { execSync } from 'child_process'

try {
    const out = execSync('c:\\projects\\drone\\ml_inference\\run_inspection.bat').toString();
    fs.writeFileSync('c:\\projects\\drone\\ml_inference\\model_inspection.txt', out);
} catch (e) {
    fs.writeFileSync('c:\\projects\\drone\\ml_inference\\model_inspection.txt', e.toString() + '\\n' + (e.stdout ? e.stdout.toString() : ''));
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), cesium()],
})
