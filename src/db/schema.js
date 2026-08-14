import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
    user_id: text('user_id').primaryKey(),
    username: text('username').notNull().unique(),
    password: text('password').notNull(),
    coins: integer('coins').notNull().default(100)
});

export const fish = sqliteTable('fish', {
    fish_id: text('fish_id').primaryKey(),
    fish_name: text('fish_name').notNull(),
    sell_price: integer('sell_price').notNull(),
    location: text('location').notNull(), // pond | lake | sea
    rarity: text('rarity').notNull().default('common'), // common | uncommon | rare | epic | legendary
    min_weight: real('min_weight').notNull().default(0.1),
    max_weight: real('max_weight').notNull().default(1.0),
    emoji: text('emoji').notNull().default('🐟')
});

export const rods = sqliteTable('rods', {
    rod_id: text('rod_id').primaryKey(),
    rod_name: text('rod_name').notNull(),
    cost: integer('cost').notNull().default(0),
    power: integer('power').notNull().default(1),       // 1-5: affects weight roll
    luck: integer('luck').notNull().default(1),          // 1-5: affects rarity roll
    control: integer('control').notNull().default(1),    // 1-5: widens safe zone in mini-games
    rare_chance: real('rare_chance').notNull().default(0), // bonus % chance for rare+
    description: text('description').notNull().default('')
});

export const player_rods = sqliteTable('player_rods', {
    id: text('id').primaryKey(),
    user_id: text('user_id').notNull().references(() => users.user_id),
    rod_id: text('rod_id').notNull().references(() => rods.rod_id),
    equipped: integer('equipped').notNull().default(0) // 0 = false, 1 = true
});

export const missions = sqliteTable('missions', {
    mission_id: text('mission_id').primaryKey(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    type: text('type').notNull(), // catch_count | catch_species | catch_rarity | catch_weight | earn_coins
    target_value: integer('target_value').notNull().default(1),
    target_species: text('target_species'), // fish_id, null means any
    target_rarity: text('target_rarity'),   // rarity tier, null means any
    reward_coins: integer('reward_coins').notNull().default(50),
    unlock_location: text('unlock_location'), // lake | sea | null
    target_location: text('target_location'), // pond | lake | sea | null
    time_limit: integer('time_limit'), // seconds, null = unlimited
    attempt_limit: integer('attempt_limit'), // catches allowed, null = unlimited
    sort_order: integer('sort_order').notNull().default(0)
});

export const player_missions = sqliteTable('player_missions', {
    id: text('id').primaryKey(),
    user_id: text('user_id').notNull().references(() => users.user_id),
    mission_id: text('mission_id').notNull().references(() => missions.mission_id),
    progress: integer('progress').notNull().default(0),
    completed: integer('completed').notNull().default(0) // 0 = false, 1 = true
    , started_at: integer('started_at')
    , attempts_used: integer('attempts_used').notNull().default(0)
    , failed: integer('failed').notNull().default(0)
});

export const inventory = sqliteTable('inventory', {
    inventory_id: text('inventory_id').primaryKey(),
    user_id: text('user_id').notNull().references(() => users.user_id),
    fish_id: text('fish_id').notNull().references(() => fish.fish_id),
    quantity: integer('quantity').notNull().default(0)
});
