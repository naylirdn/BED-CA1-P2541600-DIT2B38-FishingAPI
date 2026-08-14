import express from 'express';
import * as rodController from '../controllers/rodController.js';

const router = express.Router();

router.get('/', rodController.getAllRods);
router.get('/player/:user_id', rodController.getPlayerRods);
router.get('/equipped/:user_id', rodController.getEquippedRod);
router.post('/buy', rodController.buyRod);
router.post('/equip', rodController.equipRod);

export default router;
