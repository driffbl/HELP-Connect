require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'HELP Connect API',
    timestamp: new Date().toISOString(),
  });
});

// Routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

const profileRoutes = require('./routes/profileRoutes');
app.use('/api/profile', profileRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ HELP Connect API running on http://localhost:${PORT}`);
});