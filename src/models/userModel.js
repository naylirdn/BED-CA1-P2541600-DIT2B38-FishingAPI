import { db } from '../config/db.js';
import { users, inventory } from '../db/schema.js';
import { eq, like } from 'drizzle-orm';

export const getAllUsers = async (username) => {
    if (username) {
        return await db.select().from(users).where(like(users.username, `%${username}%`));
    }

    return await db.select().from(users);
};

export const getUserById = async (user_id) => {
    const result = await db.select().from(users).where(eq(users.user_id, user_id));
    return result[0];
};

export const getUserByUsername = async (username) => {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
};

export const createUser = async (newUser) => {
    await db.insert(users).values(newUser);
    return await getUserById(newUser.user_id);
};

export const updateUser = async (user_id, updatedData) => {
    await db.update(users).set(updatedData).where(eq(users.user_id, user_id));
    return await getUserById(user_id);
};

export const deleteUser = async (user_id) => {
    await db.delete(inventory).where(eq(inventory.user_id, user_id));
    await db.delete(users).where(eq(users.user_id, user_id));
};