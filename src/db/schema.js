import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

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
    spot: text('spot').notNull()
});

export const inventory = sqliteTable('inventory', {
    inventory_id: text('inventory_id').primaryKey(),
    user_id: text('user_id')
        .notNull()
        .references(() => users.user_id),
    fish_id: text('fish_id')
        .notNull()
        .references(() => fish.fish_id),
    quantity: integer('quantity').notNull().default(0)
});