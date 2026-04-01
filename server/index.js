// Load .env manually since dotenv v17 changed behavior
const fs = require('fs');
const envPath = require('path').join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2] || '';
    }
  }
}
const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const routes = require('./api/routes');

const app = express();

app.use(cors());
app.use(express.json());

// API routes
app.use('/api', routes);

// Serve React frontend (production build)
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message });
});

app.listen(config.port, () => {
  console.log(`Story Generator server running on http://localhost:${config.port}`);
});
