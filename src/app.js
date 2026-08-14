import express from 'express';
import userRoutes from './routes/userRoutes.js';
import fishRoutes from './routes/fishRoutes.js';
import rodRoutes from './routes/rodRoutes.js';
import missionRoutes from './routes/missionRoutes.js';

const app = express();

app.use(express.json());
app.use(express.static('public'));

app.use('/users', userRoutes);
app.use('/fish', fishRoutes);
app.use('/rods', rodRoutes);
app.use('/missions', missionRoutes);

app.use((req, res) => {
    res.status(404).json({ message: 'Route not found.' });
});

export default app;
