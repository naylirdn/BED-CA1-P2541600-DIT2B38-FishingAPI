import * as userModel from '../models/userModel.js';
import * as rodModel from '../models/rodModel.js';

// GET /rods?user_id=xxx  — all rods with ownership/equipped flags
export const getAllRods = async (req, res) => {
    try {
        const { user_id } = req.query;
        const allRods = await rodModel.getAllRods();

        if (!user_id) {
            return res.status(200).json(allRods);
        }

        const playerRods = await rodModel.getPlayerRods(user_id);
        const ownedMap = {};
        for (const pr of playerRods) {
            ownedMap[pr.rod_id] = { owned: true, equipped: pr.equipped === 1 };
        }

        const rodsWithStatus = allRods.map(rod => ({
            ...rod,
            owned: !!ownedMap[rod.rod_id],
            equipped: ownedMap[rod.rod_id]?.equipped || false
        }));

        return res.status(200).json(rodsWithStatus);
    } catch (error) {
        console.error('Error getting rods:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

// GET /rods/player/:user_id  — only the rods this player owns
export const getPlayerRods = async (req, res) => {
    try {
        const { user_id } = req.params;

        const user = await userModel.getUserById(user_id);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        const playerRods = await rodModel.getPlayerRods(user_id);
        return res.status(200).json(playerRods);
    } catch (error) {
        console.error('Error getting player rods:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

// GET /rods/equipped/:user_id
export const getEquippedRod = async (req, res) => {
    try {
        const { user_id } = req.params;

        const user = await userModel.getUserById(user_id);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        const rod = await rodModel.getEquippedRod(user_id);
        return res.status(200).json(rod || { rod_id: null, rod_name: 'None' });
    } catch (error) {
        console.error('Error getting equipped rod:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

// POST /rods/buy  { user_id, rod_id }
export const buyRod = async (req, res) => {
    try {
        const { user_id, rod_id } = req.body;

        if (!user_id || !rod_id) {
            return res.status(400).json({ message: 'user_id and rod_id are required.' });
        }

        const user = await userModel.getUserById(user_id);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        const result = await rodModel.buyRod(user_id, rod_id);

        if (result.error === 'already_owned') {
            return res.status(409).json({ message: 'You already own this rod.' });
        }
        if (result.error === 'rod_not_found') {
            return res.status(404).json({ message: 'Rod not found.' });
        }
        if (result.error === 'insufficient_coins') {
            return res.status(400).json({
                message: `Not enough coins. You need ${result.need} more coins.`,
                need: result.need
            });
        }

        return res.status(201).json({
            message: `${result.rod.rod_name} purchased!`,
            rod: result.rod,
            coins_spent: result.coins_spent,
            new_coins: result.new_coins
        });
    } catch (error) {
        console.error('Error buying rod:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

// POST /rods/equip  { user_id, rod_id }
export const equipRod = async (req, res) => {
    try {
        const { user_id, rod_id } = req.body;

        if (!user_id || !rod_id) {
            return res.status(400).json({ message: 'user_id and rod_id are required.' });
        }

        const user = await userModel.getUserById(user_id);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        const result = await rodModel.equipRod(user_id, rod_id);

        if (result.error === 'not_owned') {
            return res.status(403).json({ message: 'You do not own this rod.' });
        }

        return res.status(200).json({
            message: `${result.equipped.rod_name} is now equipped!`,
            equipped: result.equipped
        });
    } catch (error) {
        console.error('Error equipping rod:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};
