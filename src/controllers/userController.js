import * as userModel from '../models/userModel.js';

export const getAllUsers = async (req, res) => {
    try {
        const { username } = req.query;
        const allUsers = await userModel.getAllUsers(username);
        return res.status(200).json(allUsers);
    } catch (error) {
        console.error('Error getting users:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

export const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await userModel.getUserById(id);

        if (!user) {
            return res.status(404).json({ message: 'User id not found.' });
        }

        return res.status(200).json(user);
    } catch (error) {
        console.error('Error getting user:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

export const createUser = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username) {
            return res.status(400).json({ message: 'Username is required.' });
        }

        if (!password) {
            return res.status(400).json({ message: 'Password is required.' });
        }

        const existingUser = await userModel.getUserByUsername(username);

        if (existingUser) {
            return res.status(409).json({ message: 'Username already exists.' });
        }

        const newUser = {
            user_id: `user_${Date.now()}`,
            username,
            password,
            coins: 100
        };

        const createdUser = await userModel.createUser(newUser);
        return res.status(201).json(createdUser);
    } catch (error) {
        console.error('Error creating user:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { username } = req.body;

        if (!username) {
            return res.status(400).json({ message: 'Username is required.' });
        }

        const user = await userModel.getUserById(id);

        if (!user) {
            return res.status(404).json({ message: 'User id not found.' });
        }

        const existingUsername = await userModel.getUserByUsername(username);

        if (existingUsername && existingUsername.user_id !== id) {
            return res.status(409).json({ message: 'Username already exists.' });
        }

        const updatedUser = await userModel.updateUser(id, { username });
        return res.status(200).json(updatedUser);
    } catch (error) {
        console.error('Error updating user:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await userModel.getUserById(id);

        if (!user) {
            return res.status(404).json({ message: 'User id not found.' });
        }

        await userModel.deleteUser(id);
        return res.status(204).send();
    } catch (error) {
        console.error('Error deleting user:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};