import { db } from '../config/db.js';
import { fish, inventory, users } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

export const getAllFish = async () => {
    return await db.select().from(fish);
};

export const getFishBySpot = async (spot) => {
    return await db.select().from(fish).where(eq(fish.spot, spot));
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
            quantity: inventory.quantity
        })
        .from(inventory)
        .innerJoin(fish, eq(inventory.fish_id, fish.fish_id))
        .where(eq(inventory.user_id, user_id));
};

export const catchFish = async (user_id, fish_id, quantity) => {
    const existingItem = await getInventoryItem(user_id, fish_id);

    if (existingItem) {
        await db
            .update(inventory)
            .set({ quantity: existingItem.quantity + quantity })
            .where(eq(inventory.inventory_id, existingItem.inventory_id));

        return await getInventoryItem(user_id, fish_id);
    }

    const newInventoryItem = {
        inventory_id: `inv_${Date.now()}`,
        user_id,
        fish_id,
        quantity
    };

    await db.insert(inventory).values(newInventoryItem);
    return await getInventoryItem(user_id, fish_id);
};

export const sellFish = async (user, fishItem, inventoryItem, quantity) => {
    const coinsEarned = fishItem.sell_price * quantity;
    const remainingQuantity = inventoryItem.quantity - quantity;

    await db
        .update(users)
        .set({ coins: user.coins + coinsEarned })
        .where(eq(users.user_id, user.user_id));

    if (remainingQuantity === 0) {
        await db
            .delete(inventory)
            .where(eq(inventory.inventory_id, inventoryItem.inventory_id));
    } else {
        await db
            .update(inventory)
            .set({ quantity: remainingQuantity })
            .where(eq(inventory.inventory_id, inventoryItem.inventory_id));
    }

    return {
        fish_name: fishItem.fish_name,
        quantity_sold: quantity,
        coins_earned: coinsEarned,
        remaining_quantity: remainingQuantity
    };
};