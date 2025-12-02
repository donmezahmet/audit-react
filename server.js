import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

// Serve static files from dist directory
const distPath = join(__dirname, 'dist');

// Middleware to serve static files
app.use(express.static(distPath));

// Handle client-side routing - return index.html for all routes
app.get('*', (req, res) => {
  const indexPath = join(distPath, 'index.html');
  
  if (existsSync(indexPath)) {
    const indexContent = readFileSync(indexPath, 'utf-8');
    res.setHeader('Content-Type', 'text/html');
    res.send(indexContent);
  } else {
    res.status(404).send('Build files not found. Please run "npm run build" first.');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Serving files from: ${distPath}`);
});

