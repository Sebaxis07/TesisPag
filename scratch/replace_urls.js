const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'frontend', 'src');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(filePath);
      }
    }
  });
  return results;
}

const files = walk(srcDir);
console.log(`Encontrados ${files.length} archivos TypeScript.`);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // 1. Replace template string: `http://localhost:5000/api/some/path`
  // matches `http://localhost:5000/api
  content = content.replace(/`http:\/\/localhost:5000\/api/g, '`${import.meta.env.VITE_API_URL || \'http://localhost:5000/api\'}');

  // 2. Replace template string: `http://localhost:5000/some/path`
  // matches `http://localhost:5000
  // Note: we check if it is not followed by /api
  content = content.replace(/`http:\/\/localhost:5000(?!\/api)/g, '`${import.meta.env.VITE_BASE_URL || \'http://localhost:5000\'}');

  // 3. Replace single quoted strings: 'http://localhost:5000/api'
  content = content.replace(/'http:\/\/localhost:5000\/api'/g, "(import.meta.env.VITE_API_URL || 'http://localhost:5000/api')");

  // 4. Replace single quoted strings: 'http://localhost:5000'
  content = content.replace(/'http:\/\/localhost:5000'/g, "(import.meta.env.VITE_BASE_URL || 'http://localhost:5000')");

  // 5. Replace double quoted strings: "http://localhost:5000/api"
  content = content.replace(/"http:\/\/localhost:5000\/api"/g, "(import.meta.env.VITE_API_URL || 'http://localhost:5000/api')");

  // 6. Replace double quoted strings: "http://localhost:5000"
  content = content.replace(/"http:\/\/localhost:5000"/g, "(import.meta.env.VITE_BASE_URL || 'http://localhost:5000')");

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Actualizado: ${path.relative(srcDir, file)}`);
  }
});
console.log('Reemplazo completado.');
