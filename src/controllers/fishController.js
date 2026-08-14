import * as userModel from '../models/userModel.js';
import * as fishModel from '../models/fishModel.js';
import * as rodModel from '../models/rodModel.js';
import * as missionModel from '../models/missionModel.js';

// GET /fish
export const getAllFish = async (req, res) => {
    try {
        const allFish = await fishModel.getAllFish();
        return res.status(200).json(allFish);
    } catch (error) {
        console.error('Error getting fish:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

// GET /fish/inventory/:user_id
export const getInventoryByUserId = async (req, res) => {
    try {
        const { user_id } = req.params;

        const user = await userModel.getUserById(user_id);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        const userInventory = await fishModel.getInventoryByUserId(user_id);
        return res.status(200).json(userInventory);
    } catch (error) {
        console.error('Error getting inventory:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

// POST /fish/catch  (legacy direct catch, kept for compatibility)
export const catchFish = async (req, res) => {
    try {
        const { user_id, fish_id, quantity } = req.body;

        if (!user_id || !fish_id || quantity === undefined) {
            return res.status(400).json({ message: 'user_id, fish_id and quantity are required.' });
        }
        if (quantity <= 0) {
            return res.status(400).json({ message: 'Quantity must be more than 0.' });
        }

        const user = await userModel.getUserById(user_id);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        const fishItem = await fishModel.getFishById(fish_id);
        if (!fishItem) return res.status(404).json({ message: 'Fish not found.' });

        const inventoryItem = await fishModel.addToInventory(user_id, fish_id, quantity);

        return res.status(201).json({
            message: 'Fish caught successfully.',
            fish_name: fishItem.fish_name,
            quantity_caught: quantity,
            inventory: inventoryItem
        });
    } catch (error) {
        console.error('Error catching fish:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

/**
 * POST /fish/catch-spot
 * Body: { user_id, spot, rod_id (optional), performance (0-100, optional) }
 *
 * Enhanced: rolls rarity, weight, special catches; updates missions; returns full result.
 */
export const catchFishBySpot = async (req, res) => {
    try {
        const { user_id, spot, rod_id, performance } = req.body;

        if (!user_id || !spot) {
            return res.status(400).json({ message: 'user_id and spot are required.' });
        }

        const user = await userModel.getUserById(user_id);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        // Resolve rod — use provided rod_id, fall back to equipped, fall back to twig defaults
        let rod = null;
        if (rod_id) {
            rod = await rodModel.getRodById(rod_id);
        }
        if (!rod) {
            rod = await rodModel.getEquippedRod(user_id);
        }
        // rod may still be null — catchFishByLocation handles null rod gracefully

        // Check location unlock
        const unlocked = await missionModel.checkLocationUnlocked(user_id, spot);
        if (!unlocked) {
            return res.status(403).json({ message: 'This location is not yet unlocked.' });
        }

        // Do the catch roll
        const catchResult = await fishModel.catchFishByLocation(user_id, spot, rod, performance);

        if (!catchResult) {
            return res.status(404).json({ message: 'No fish found at this location.' });
        }

        const { fish, rarity, weight, coins_earned, is_special, special_type, special_data } = catchResult;

        // Add to inventory
        const inventoryItem = await fishModel.addToInventory(user_id, fish.fish_id, 1);

        // Add bonus coins to user balance if special
        if (is_special && special_data?.bonus_coins > 0) {
            const freshUser = await userModel.getUserById(user_id);
            await userModel.updateUser(user_id, { coins: freshUser.coins + special_data.bonus_coins });
        }

        // Update mission progress
        const completedMissions = await missionModel.processCatchForMissions(user_id, {
            fish,
            rarity,
            weight,
            location: spot,
            performance: Math.max(0, Math.min(100, Number(performance) || 0)),
            coins_earned: 0 // sell coins tracked separately
        });

        // Fetch updated coins
        const updatedUser = await userModel.getUserById(user_id);

        return res.status(201).json({
            message: 'Fish caught!',
            fish,
            rarity,
            weight,
            sell_value: fish.sell_price,
            coins_earned,
            is_special,
            special_type,
            special_data: special_data || null,
            inventory: inventoryItem,
            completed_missions: completedMissions,
            new_coins: updatedUser.coins
        });
    } catch (error) {
        console.error('Error catching fish by spot:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

// POST /fish/sell  { user_id, fish_id, quantity }
export const sellFish = async (req, res) => {
    try {
        const { user_id, fish_id, quantity } = req.body;

        if (!user_id || !fish_id || quantity === undefined) {
            return res.status(400).json({ message: 'user_id, fish_id and quantity are required.' });
        }
        if (quantity <= 0) {
            return res.status(400).json({ message: 'Quantity must be more than 0.' });
        }

        const user = await userModel.getUserById(user_id);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        const fishItem = await fishModel.getFishById(fish_id);
        if (!fishItem) return res.status(404).json({ message: 'Fish not found.' });

        const inventoryItem = await fishModel.getInventoryItem(user_id, fish_id);
        if (!inventoryItem) {
            return res.status(404).json({ message: 'You do not have this fish in your inventory.' });
        }
        if (inventoryItem.quantity < quantity) {
            return res.status(400).json({ message: 'Not enough fish to sell.' });
        }

        const result = await fishModel.sellFish(user, fishItem, inventoryItem, quantity);

        // Update coin-earning missions
        const completedMissions = await missionModel.processSellForMissions(user_id, result.coins_earned);

        // Fetch updated coins
        const updatedUser = await userModel.getUserById(user_id);

        return res.status(200).json({
            message: 'Fish sold!',
            result,
            completed_missions: completedMissions,
            new_coins: updatedUser.coins
        });
    } catch (error) {
        console.error('Error selling fish:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};
