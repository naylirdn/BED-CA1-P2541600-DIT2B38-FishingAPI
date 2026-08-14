import { db } from '../config/db.js';
import { rods, player_rods, users } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

export const getAllRods = async () => {
    return await db.select().from(rods).orderBy(rods.cost);
};

export const getRodById = async (rod_id) => {
    const result = await db.select().from(rods).where(eq(rods.rod_id, rod_id));
    return result[0];
};

export const getPlayerRods = async (user_id) => {
    return await db
        .select({
            id: player_rods.id,
            user_id: player_rods.user_id,
            rod_id: rods.rod_id,
            rod_name: rods.rod_name,
            cost: rods.cost,
            power: rods.power,
            luck: rods.luck,
            control: rods.control,
            rare_chance: rods.rare_chance,
            description: rods.description,
            equipped: player_rods.equipped
        })
        .from(player_rods)
        .innerJoin(rods, eq(player_rods.rod_id, rods.rod_id))
        .where(eq(player_rods.user_id, user_id));
};

export const getEquippedRod = async (user_id) => {
    const result = await db
        .select({
            rod_id: rods.rod_id,
            rod_name: rods.rod_name,
            power: rods.power,
            luck: rods.luck,
            control: rods.control,
            rare_chance: rods.rare_chance
        })
        .from(player_rods)
        .innerJoin(rods, eq(player_rods.rod_id, rods.rod_id))
        .where(and(eq(player_rods.user_id, user_id), eq(player_rods.equipped, 1)));
    return result[0] || null;
};

export const getPlayerRodEntry = async (user_id, rod_id) => {
    const result = await db
        .select()
        .from(player_rods)
        .where(and(eq(player_rods.user_id, user_id), eq(player_rods.rod_id, rod_id)));
    return result[0];
};

export const giveStarterRod = async (user_id) => {
    const existing = await getPlayerRodEntry(user_id, 'rod_twig');
    if (existing) return existing;

    const newEntry = {
        id: `pr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        user_id,
        rod_id: 'rod_twig',
        equipped: 1
    };
    await db.insert(player_rods).values(newEntry);
    return newEntry;
};

export const buyRod = async (user_id, rod_id) => {
    // Guard: already owned
    const existing = await getPlayerRodEntry(user_id, rod_id);
    if (existing) {
        return { error: 'already_owned' };
    }

    const rod = await getRodById(rod_id);
    if (!rod) return { error: 'rod_not_found' };

    // Get user coins
    const userRows = await db.select().from(users).where(eq(users.user_id, user_id));
    const user = userRows[0];
    if (!user) return { error: 'user_not_found' };

    if (user.coins < rod.cost) {
        return { error: 'insufficient_coins', need: rod.cost - user.coins };
    }

    // Claim ownership first. The database's unique user/rod index prevents
    // two rapid purchase requests from charging for the same rod twice.
    const newEntry = {
        id: `pr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        user_id,
        rod_id,
        equipped: 0
    };
    try {
        await db.insert(player_rods).values(newEntry);
    } catch (error) {
        if (String(error.message).includes('UNIQUE')) return { error: 'already_owned' };
        throw error;
    }

    await db.update(users).set({ coins: user.coins - rod.cost }).where(eq(users.user_id, user_id));

    return { success: true, rod, coins_spent: rod.cost, new_coins: user.coins - rod.cost };
};

export const equipRod = async (user_id, rod_id) => {
    // Must own the rod
    const owned = await getPlayerRodEntry(user_id, rod_id);
    if (!owned) return { error: 'not_owned' };

    // Un-equip all rods for this user
    await db
        .update(player_rods)
        .set({ equipped: 0 })
        .where(eq(player_rods.user_id, user_id));

    // Equip the target rod
    await db
        .update(player_rods)
        .set({ equipped: 1 })
        .where(and(eq(player_rods.user_id, user_id), eq(player_rods.rod_id, rod_id)));

    const rod = await getRodById(rod_id);
    return { success: true, equipped: rod };
};
