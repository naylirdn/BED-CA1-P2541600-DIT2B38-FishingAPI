import express from 'express';
import * as fishController from '../controllers/fishController.js';

const router = express.Router();

router.get('/', fishController.getAllFish);
router.get('/inventory/:user_id', fishController.getInventoryByUserId);
router.post('/catch', fishController.catchFish);
router.post('/catch-spot', fishController.catchFishBySpot);
router.post('/sell', fishController.sellFish);

export default router;