import { db } from '../config/db.js';
import { missions, player_missions, users, player_rods } from '../db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';

const RARITY_RANK = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };

export const getAllMissions = async () => {
    return await db.select().from(missions).orderBy(missions.sort_order);
};

/**
 * Get all missions for a user, auto-initialising any missing player_mission rows.
 */
export const getPlayerMissions = async (user_id) => {
    const allMissions = await getAllMissions();

    // Ensure a player_mission row exists for every mission
    const existing = await db
        .select()
        .from(player_missions)
        .where(eq(player_missions.user_id, user_id));

    const existingIds = new Set(existing.map(pm => pm.mission_id));

    for (const m of allMissions) {
        if (!existingIds.has(m.mission_id)) {
            await db.insert(player_missions).values({
                id: `pm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                user_id,
                mission_id: m.mission_id,
                progress: 0,
                completed: 0
            });
        }
    }

    // Return joined data
    return await db
        .select({
            mission_id: missions.mission_id,
            title: missions.title,
            description: missions.description,
            type: missions.type,
            target_value: missions.target_value,
            target_species: missions.target_species,
            target_rarity: missions.target_rarity,
            reward_coins: missions.reward_coins,
            unlock_location: missions.unlock_location,
            target_location: missions.target_location,
            time_limit: missions.time_limit,
            attempt_limit: missions.attempt_limit,
            sort_order: missions.sort_order,
            progress: player_missions.progress,
            completed: player_missions.completed
            ,started_at: player_missions.started_at
            ,attempts_used: player_missions.attempts_used
            ,failed: player_missions.failed
        })
        .from(player_missions)
        .innerJoin(missions, eq(player_missions.mission_id, missions.mission_id))
        .where(eq(player_missions.user_id, user_id))
        .orderBy(missions.sort_order);
};

/**
 * Process a catch event and update relevant mission progress.
 * Returns an array of missions that were newly completed.
 */
export const processCatchForMissions = async (user_id, catchData) => {
    const { fish, rarity, weight, location, coins_earned = 0 } = catchData;
    const playerMissions = await getPlayerMissions(user_id);
    const newlyCompleted = [];

    for (const pm of playerMissions) {
        if (pm.completed || pm.failed) continue;

        if (pm.target_location && pm.target_location !== location) continue;

        const now = Date.now();
        const startedAt = pm.started_at || now;
        const attemptsUsed = pm.attempts_used + 1;
        if (!pm.started_at || pm.attempt_limit) {
            await db.update(player_missions).set({
                started_at: startedAt,
                attempts_used: attemptsUsed
            }).where(and(eq(player_missions.user_id, user_id), eq(player_missions.mission_id, pm.mission_id)));
        }
        if (pm.time_limit && now - startedAt > pm.time_limit * 1000) {
            await db.update(player_missions).set({ failed: 1 })
                .where(and(eq(player_missions.user_id, user_id), eq(player_missions.mission_id, pm.mission_id)));
            continue;
        }

        let delta = 0;

        switch (pm.type) {
            case 'catch_count':
                // Count fish caught at a specific location (mission_5 checks lake species variety separately)
                delta = 1;
                break;

            case 'catch_species':
                if (pm.target_species && fish.fish_id === pm.target_species) {
                    delta = 1;
                }
                break;

            case 'catch_rarity':
                if (pm.target_rarity) {
                    const targetRank = RARITY_RANK[pm.target_rarity] ?? 0;
                    const catchRank = RARITY_RANK[rarity] ?? 0;
                    if (catchRank >= targetRank) delta = 1;
                }
                break;

            case 'catch_weight':
                // Progress is set to the max single-fish weight ever caught
                if (weight >= pm.target_value && pm.progress < pm.target_value) {
                    delta = pm.target_value - pm.progress; // jump to target
                }
                break;

            case 'total_weight':
                delta = weight;
                break;

            case 'challenge_score':
                delta = catchData.performance >= (pm.target_species ? Number(pm.target_species) : 70) ? 1 : 0;
                break;

            case 'earn_coins':
                delta = coins_earned;
                break;
        }

        if (delta <= 0) {
            if (pm.attempt_limit && attemptsUsed >= pm.attempt_limit) {
                await db.update(player_missions).set({ failed: 1 })
                    .where(and(eq(player_missions.user_id, user_id), eq(player_missions.mission_id, pm.mission_id)));
            }
            continue;
        }

        const newProgress = Math.min(pm.progress + delta, pm.target_value);

        await db
            .update(player_missions)
            .set({ progress: newProgress })
            .where(
                and(
                    eq(player_missions.user_id, user_id),
                    eq(player_missions.mission_id, pm.mission_id)
                )
            );

        // Check completion
        if (newProgress >= pm.target_value) {
            const completed = await completeMission(user_id, pm.mission_id);
            if (completed) {
                newlyCompleted.push({ ...pm, progress: newProgress });
            }
        } else if (pm.attempt_limit && attemptsUsed >= pm.attempt_limit) {
            await db.update(player_missions).set({ failed: 1 })
                .where(and(eq(player_missions.user_id, user_id), eq(player_missions.mission_id, pm.mission_id)));
        }
    }

    return newlyCompleted;
};

/**
 * Process a sell event for coin-based missions.
 */
export const processSellForMissions = async (user_id, coins_earned) => {
    const playerMissions = await getPlayerMissions(user_id);
    const newlyCompleted = [];

    for (const pm of playerMissions) {
        if (pm.completed || pm.type !== 'earn_coins') continue;

        const newProgress = Math.min(pm.progress + coins_earned, pm.target_value);

        await db
            .update(player_missions)
            .set({ progress: newProgress })
            .where(
                and(
                    eq(player_missions.user_id, user_id),
                    eq(player_missions.mission_id, pm.mission_id)
                )
            );

        if (newProgress >= pm.target_value) {
            const completed = await completeMission(user_id, pm.mission_id);
            if (completed) {
                newlyCompleted.push({ ...pm, progress: newProgress });
            }
        }
    }

    return newlyCompleted;
};

/**
 * Mark a mission as complete and award coins. Idempotent — won't double-reward.
 * Returns the mission data if it was just completed, null if already done.
 */
export const completeMission = async (user_id, mission_id) => {
    const pmRows = await db
        .select()
        .from(player_missions)
        .where(
            and(
                eq(player_missions.user_id, user_id),
                eq(player_missions.mission_id, mission_id)
            )
        );

    const pm = pmRows[0];
    if (!pm || pm.completed) return null; // already completed — no double reward

    const missionRows = await db
        .select()
        .from(missions)
        .where(eq(missions.mission_id, mission_id));
    const mission = missionRows[0];
    if (!mission) return null;

    // Claim completion atomically so rapid duplicate catch/sell requests cannot
    // award the same mission twice.
    const claimed = await db.update(player_missions).set({ completed: 1 })
        .where(and(
            eq(player_missions.user_id, user_id),
            eq(player_missions.mission_id, mission_id),
            eq(player_missions.completed, 0)
        ));
    if (!claimed.rowsAffected) return null;

    const userRows = await db
        .select()
        .from(users)
        .where(eq(users.user_id, user_id));
    const user = userRows[0];
    if (!user) return null;

    await db
        .update(users)
        .set({ coins: user.coins + mission.reward_coins })
        .where(eq(users.user_id, user_id));

    return mission;
};

export const resetMission = async (user_id, mission_id) => {
    await db.update(player_missions).set({ progress: 0, started_at: null, attempts_used: 0, failed: 0 })
        .where(and(eq(player_missions.user_id, user_id), eq(player_missions.mission_id, mission_id), eq(player_missions.completed, 0)));
    return (await getPlayerMissions(user_id)).find(m => m.mission_id === mission_id);
};

/**
 * Check if a location is unlocked for a user.
 * pond is always open.
 * lake: unlocked if owns Steel/Crystal/Dragon Rod OR mission_1 complete
 * sea:  unlocked if owns Crystal/Dragon Rod OR mission_3 complete
 */
export const checkLocationUnlocked = async (user_id, location) => {
    if (location === 'pond') return true;

    const playerMissions = await getPlayerMissions(user_id);
    const missionMap = {};
    for (const pm of playerMissions) missionMap[pm.mission_id] = pm;

    if (location === 'lake') {
        if (missionMap['mission_1']?.completed) return true;
        const lockRods = await db
            .select()
            .from(player_rods)
            .where(
                and(
                    eq(player_rods.user_id, user_id),
                    inArray(player_rods.rod_id, ['rod_steel', 'rod_crystal', 'rod_dragon'])
                )
            );
        return lockRods.length > 0;
    }

    if (location === 'sea') {
        if (missionMap['mission_3']?.completed) return true;
        const lockRods = await db
            .select()
            .from(player_rods)
            .where(
                and(
                    eq(player_rods.user_id, user_id),
                    inArray(player_rods.rod_id, ['rod_crystal', 'rod_dragon'])
                )
            );
        return lockRods.length > 0;
    }

    return false;
};
