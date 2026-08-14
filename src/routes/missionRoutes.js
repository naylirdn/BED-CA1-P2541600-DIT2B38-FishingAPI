import express from 'express';
import * as missionController from '../controllers/missionController.js';

const router = express.Router();

router.get('/unlocks/:user_id', missionController.getUnlocks);
router.post('/:mission_id/reset', missionController.resetMission);
router.get('/:user_id', missionController.getPlayerMissions);

export default router;
