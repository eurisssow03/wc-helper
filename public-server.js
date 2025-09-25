// Public server for legal documents
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PUBLIC_PORT || 3002;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Root route - redirect to index
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Direct routes for legal documents
app.get('/privacy-policy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy-policy.html'));
});

app.get('/terms-of-service', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'terms-of-service.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'WC Helper Legal Documents Server'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🌐 Public Legal Server running on port ${PORT}`);
  console.log(`📄 Privacy Policy: http://localhost:${PORT}/privacy-policy`);
  console.log(`📋 Terms of Service: http://localhost:${PORT}/terms-of-service`);
  console.log(`🏠 Home: http://localhost:${PORT}/`);
});

export default app;
