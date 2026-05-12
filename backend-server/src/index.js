const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

const authRoutes = require('./routes/authRoutes');
const buildsRoutes = require('./routes/buildsRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/builds', buildsRoutes);

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
