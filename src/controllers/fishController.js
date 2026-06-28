import * as userModel from '../models/userModel.js';
import * as fishModel from '../models/fishModel.js';

export const getAllFish = async (req, res) => {
    try {
        const allFish = await fishModel.getAllFish();
        return res.status(200).json(allFish);
    } catch (error) {
        console.error('Error getting fish:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

export const getInventoryByUserId = async (req, res) => {
    try {
        const { user_id } = req.params;

        const user = await userModel.getUserById(user_id);

        if (!user) {
            return res.status(404).json({ message: 'User id not found.' });
        }

        const userInventory = await fishModel.getInventoryByUserId(user_id);
        return res.status(200).json(userInventory);
    } catch (error) {
        console.error('Error getting inventory:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

export const catchFish = async (req, res) => {
    try {
        const { user_id, fish_id, quantity } = req.body;

        if (!user_id || !fish_id || quantity === undefined) {
            return res.status(400).json({
                message: 'user_id, fish_id and quantity are required.'
            });
        }

        if (quantity <= 0) {
            return res.status(400).json({
                message: 'Quantity must be more than 0.'
            });
        }

        const user = await userModel.getUserById(user_id);

        if (!user) {
            return res.status(404).json({ message: 'User id not found.' });
        }

        const fishItem = await fishModel.getFishById(fish_id);

        if (!fishItem) {
            return res.status(404).json({ message: 'Fish id not found.' });
        }

        const inventoryItem = await fishModel.catchFish(user_id, fish_id, quantity);

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
export const catchFishBySpot = async (req, res) => {
    try {
        const { user_id, spot } = req.body;

        if (!user_id || !spot) {
            return res.status(400).json({
                message: 'user_id and spot are required.'
            });
        }

        const user = await userModel.getUserById(user_id);

        if (!user) {
            return res.status(404).json({ message: 'User id not found.' });
        }

        const availableFish = await fishModel.getFishBySpot(spot);

        if (availableFish.length === 0) {
            return res.status(404).json({
                message: 'No fish found at this fishing spot.'
            });
        }

        const randomIndex = Math.floor(Math.random() * availableFish.length);
        const fishItem = availableFish[randomIndex];

        const inventoryItem = await fishModel.catchFish(
            user_id,
            fishItem.fish_id,
            1
        );

        return res.status(201).json({
            message: 'Fish caught from fishing spot successfully.',
            spot,
            fish_caught: fishItem.fish_name,
            sell_price: fishItem.sell_price,
            inventory: inventoryItem
        });
    } catch (error) {
        console.error('Error catching fish by spot:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};
export const sellFish = async (req, res) => {
    try {
        const { user_id, fish_id, quantity } = req.body;

        if (!user_id || !fish_id || quantity === undefined) {
            return res.status(400).json({
                message: 'user_id, fish_id and quantity are required.'
            });
        }

        if (quantity <= 0) {
            return res.status(400).json({
                message: 'Quantity must be more than 0.'
            });
        }

        const user = await userModel.getUserById(user_id);

        if (!user) {
            return res.status(404).json({ message: 'User id not found.' });
        }

        const fishItem = await fishModel.getFishById(fish_id);

        if (!fishItem) {
            return res.status(404).json({ message: 'Fish id not found.' });
        }

        const inventoryItem = await fishModel.getInventoryItem(user_id, fish_id);

        if (!inventoryItem) {
            return res.status(404).json({
                message: 'This user does not have this fish.'
            });
        }

        if (inventoryItem.quantity < quantity) {
            return res.status(400).json({
                message: 'Not enough fish to sell.'
            });
        }

        const result = await fishModel.sellFish(
            user,
            fishItem,
            inventoryItem,
            quantity
        );

        return res.status(200).json({
            message: 'Fish sold successfully.',
            result
        });
    } catch (error) {
        console.error('Error selling fish:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};