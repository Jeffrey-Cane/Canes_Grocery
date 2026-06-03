const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'main');
const dest = path.join(__dirname, 'public');

async function copyFrontend() {
  try {
    if (!fs.existsSync(src)) {
      console.log('⚠️  No frontend source found at', src);
      return;
    }

    if (fs.existsSync(dest)) {
      console.log('ℹ️  Frontend already copied at', dest);
      return;
    }

    // Use fs.cp if available (Node 16+), fallback to recursive copy
    if (fs.promises && fs.promises.cp) {
      await fs.promises.cp(src, dest, { recursive: true });
    } else {
      // Simple recursive copy
      const copyRecursive = (srcDir, destDir) => {
        fs.mkdirSync(destDir, { recursive: true });
        const entries = fs.readdirSync(srcDir, { withFileTypes: true });
        for (const entry of entries) {
          const srcPath = path.join(srcDir, entry.name);
          const destPath = path.join(destDir, entry.name);
          if (entry.isDirectory()) copyRecursive(srcPath, destPath);
          else fs.copyFileSync(srcPath, destPath);
        }
      };
      copyRecursive(src, dest);
    }

    console.log('✅ Frontend copied to', dest);
  } catch (err) {
    console.error('❌ Failed to copy frontend:', err && err.message);
  }
}

copyFrontend();
