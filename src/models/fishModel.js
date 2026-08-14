import { db } from '../config/db.js';
import { fish, inventory, users } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

// ── Rarity configuration ─────────────────────────────────────────────────────

const RARITY_TIERS = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

/**
 * Base weights for each rarity tier (higher = more likely).
 * A rod's luck (1-5) and rare_chance bonus modify these.
 * Performance (0-100) from the mini-game also shifts the distribution.
 */
function buildRarityWeights(rod, performance) {
    const perf = Math.max(0, Math.min(100, performance ?? 50)) / 100; // 0-1
    const luck = rod?.luck ?? 1; // 1-5
    const bonus = rod?.rare_chance ?? 0; // 0-0.35

    // Base distribution sums to ~100
    const base = [50, 25, 15, 7, 3];

    // Luck shifts weight from common toward rare tiers
    // Each luck point above 1 moves 4 points from common → rare+
    const shift = (luck - 1) * 4;

    // Performance adds another 0-10 point shift
    const perfShift = perf * 10;

    const totalShift = shift + perfShift;

    const weights = [
        Math.max(5, base[0] - totalShift),                       // common
        base[1],                                                  // uncommon
        base[2] + totalShift * 0.5 + bonus * 30,                 // rare
        base[3] + totalShift * 0.3 + bonus * 20,                 // epic
        base[4] + totalShift * 0.2 + bonus * 10                  // legendary
    ];

    return weights;
}

function pickRarity(rod, performance) {
    const weights = buildRarityWeights(rod, performance);
    const total = weights.reduce((a, b) => a + b, 0);
    let rand = Math.random() * total;

    for (let i = 0; i < RARITY_TIERS.length; i++) {
        rand -= weights[i];
        if (rand <= 0) return RARITY_TIERS[i];
    }
    return 'common';
}

/**
 * Calculate catch weight.
 * Rod power (1-5) and performance (0-100) shift the roll toward max_weight.
 */
function rollWeight(fishItem, rod, performance) {
    const perf = Math.max(0, Math.min(100, performance ?? 50)) / 100;
    const power = (rod?.power ?? 1) / 5; // 0.2 – 1.0

    // Combined factor: 0 (all luck) → 1 (max weight)
    const factor = Math.random() * 0.4 + (perf * 0.35) + (power * 0.25);
    const clamped = Math.max(0, Math.min(1, factor));

    const w = fishItem.min_weight + (fishItem.max_weight - fishItem.min_weight) * clamped;
    return Math.round(w * 100) / 100; // round to 2dp
}

/**
 * Roll for a special catch.
 * Returns 'treasure' | 'rubbish' | null
 */
function rollSpecial() {
    const r = Math.random();
    if (r < 0.05) return 'treasure'; // 5%
    if (r < 0.13) return 'rubbish';  // 8%
    return null;
}

const SPECIAL_REWARDS = {
    treasure: { label: '💎 Treasure Chest!', bonus_coins: 75, message: 'You found a treasure chest!' },
    rubbish: { label: '🗑️ Old Boot', bonus_coins: 2, message: 'You pulled out an old boot...' }
};

// ── Basic queries ─────────────────────────────────────────────────────────────

export const getAllFish = async () => {
    return await db.select().from(fish);
};

export const getFishByLocation = async (location) => {
    return await db.select().from(fish).where(eq(fish.location, location));
};

export const getFishById = async (fish_id) => {
    const result = await db.select().from(fish).where(eq(fish.fish_id, fish_id));
    return result[0];
};

export const getInventoryItem = async (user_id, fish_id) => {
    const result = await db
        .select()
        .from(inventory)
        .where(and(eq(inventory.user_id, user_id), eq(inventory.fish_id, fish_id)));
    return result[0];
};

export const getInventoryByUserId = async (user_id) => {
    return await db
        .select({
            inventory_id: inventory.inventory_id,
            user_id: inventory.user_id,
            fish_id: fish.fish_id,
            fish_name: fish.fish_name,
            sell_price: fish.sell_price,
            rarity: fish.rarity,
            location: fish.location,
            emoji: fish.emoji,
            quantity: inventory.quantity
        })
        .from(inventory)
        .innerJoin(fish, eq(inventory.fish_id, fish.fish_id))
        .where(eq(inventory.user_id, user_id));
};

export const addToInventory = async (user_id, fish_id, quantity) => {
    const existingItem = await getInventoryItem(user_id, fish_id);

    if (existingItem) {
        await db
            .update(inventory)
            .set({ quantity: existingItem.quantity + quantity })
            .where(eq(inventory.inventory_id, existingItem.inventory_id));
        return await getInventoryItem(user_id, fish_id);
    }

    const newItem = {
        inventory_id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        user_id,
        fish_id,
        quantity
    };
    await db.insert(inventory).values(newItem);
    return await getInventoryItem(user_id, fish_id);
};

// Legacy alias kept for existing catchFish controller
export const catchFish = addToInventory;

export const sellFish = async (user, fishItem, inventoryItem, quantity) => {
    const coinsEarned = fishItem.sell_price * quantity;
    const remainingQty = inventoryItem.quantity - quantity;

    await db
        .update(users)
        .set({ coins: user.coins + coinsEarned })
        .where(eq(users.user_id, user.user_id));

    if (remainingQty === 0) {
        await db
            .delete(inventory)
            .where(eq(inventory.inventory_id, inventoryItem.inventory_id));
    } else {
        await db
            .update(inventory)
            .set({ quantity: remainingQty })
            .where(eq(inventory.inventory_id, inventoryItem.inventory_id));
    }

    return {
        fish_name: fishItem.fish_name,
        quantity_sold: quantity,
        coins_earned: coinsEarned,
        remaining_quantity: remainingQty
    };
};

// ── Enhanced catch-by-location with rarity, weight, rod, special ─────────────

/**
 * Pick a fish from the given location, applying rarity and weight rolls.
 * The caught fish's rarity must match or be achievable in the pool —
 * we filter to fish whose rarity can be rolled, then pick randomly from
 * fish that match the rolled rarity (falling back to common if none match).
 */
export const catchFishByLocation = async (user_id, location, rod, performance) => {
    const pool = await getFishByLocation(location);
    if (pool.length === 0) return null;

    // Roll rarity
    const rolledRarity = pickRarity(rod, performance);

    // Try to find a fish of that rarity in the pool
    let candidates = pool.filter(f => f.rarity === rolledRarity);

    // Fallback: if nothing matches, pick from common (always present)
    if (candidates.length === 0) {
        candidates = pool.filter(f => f.rarity === 'common');
    }
    if (candidates.length === 0) {
        candidates = pool; // absolute fallback
    }

    const fishItem = candidates[Math.floor(Math.random() * candidates.length)];
    const weight = rollWeight(fishItem, rod, performance);
    const special = rollSpecial();

    let bonus_coins = 0;
    let special_data = null;

    if (special) {
        special_data = SPECIAL_REWARDS[special];
        bonus_coins = special_data.bonus_coins;
    }

    return {
        fish: fishItem,
        rarity: fishItem.rarity,
        weight,
        coins_earned: fishItem.sell_price + bonus_coins,
        is_special: !!special,
        special_type: special,
        special_data
    };
};
