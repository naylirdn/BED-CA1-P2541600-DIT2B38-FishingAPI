import * as userModel from '../models/userModel.js';
import * as missionModel from '../models/missionModel.js';

// GET /missions/:user_id
export const getPlayerMissions = async (req, res) => {
    try {
        const { user_id } = req.params;

        const user = await userModel.getUserById(user_id);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        const playerMissions = await missionModel.getPlayerMissions(user_id);
        return res.status(200).json(playerMissions);
    } catch (error) {
        console.error('Error getting player missions:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

// GET /missions/unlocks/:user_id  — returns which locations are unlocked
export const getUnlocks = async (req, res) => {
    try {
        const { user_id } = req.params;

        const user = await userModel.getUserById(user_id);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        const [pond, lake, sea] = await Promise.all([
            missionModel.checkLocationUnlocked(user_id, 'pond'),
            missionModel.checkLocationUnlocked(user_id, 'lake'),
            missionModel.checkLocationUnlocked(user_id, 'sea')
        ]);

        return res.status(200).json({ pond, lake, sea });
    } catch (error) {
        console.error('Error getting unlocks:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

export const resetMission = async (req, res) => {
    try {
        const mission = await missionModel.resetMission(req.body.user_id, req.params.mission_id);
        if (!mission) return res.status(404).json({ message: 'Mission not found.' });
        return res.status(200).json(mission);
    } catch (error) {
        console.error('Error resetting mission:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};
