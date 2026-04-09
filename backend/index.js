import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { initSocket } from './src/services/socket.js';
import authRoutes from './src/routes/auth.js';
import civilRoutes from './src/routes/civil.js';
import citizenRoutes from './src/routes/citizen.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Init Socket.IO
initSocket(server);

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/civil', civilRoutes);
app.use('/api/citizen', citizenRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'Government System Backend is Online', timestamp: new Date() });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
