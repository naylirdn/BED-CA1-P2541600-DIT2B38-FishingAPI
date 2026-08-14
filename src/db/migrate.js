/**
 * Direct migration using the existing @libsql/client driver.
 * Creates all tables and seeds data without drizzle-kit interactive prompts.
 * Run with: node src/db/migrate.js
 */
import 'dotenv/config';
import { createClient } from '@libsql/client';

const client = createClient({ url: process.env.DATABASE_URL });

async function run() {
    try {
        // ── CREATE TABLES ────────────────────────────────────────────────────

        await client.executeMultiple(`
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    user_id   TEXT PRIMARY KEY,
    username  TEXT NOT NULL UNIQUE,
    password  TEXT NOT NULL,
    coins     INTEGER NOT NULL DEFAULT 100
);

CREATE TABLE IF NOT EXISTS rods (
    rod_id      TEXT PRIMARY KEY,
    rod_name    TEXT NOT NULL,
    cost        INTEGER NOT NULL DEFAULT 0,
    power       INTEGER NOT NULL DEFAULT 1,
    luck        INTEGER NOT NULL DEFAULT 1,
    control     INTEGER NOT NULL DEFAULT 1,
    rare_chance REAL NOT NULL DEFAULT 0,
    description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS fish (
    fish_id    TEXT PRIMARY KEY,
    fish_name  TEXT NOT NULL,
    sell_price INTEGER NOT NULL,
    location   TEXT NOT NULL,
    rarity     TEXT NOT NULL DEFAULT 'common',
    min_weight REAL NOT NULL DEFAULT 0.1,
    max_weight REAL NOT NULL DEFAULT 1.0,
    emoji      TEXT NOT NULL DEFAULT '🐟'
);

CREATE TABLE IF NOT EXISTS player_rods (
    id       TEXT PRIMARY KEY,
    user_id  TEXT NOT NULL REFERENCES users(user_id),
    rod_id   TEXT NOT NULL REFERENCES rods(rod_id),
    equipped INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS missions (
    mission_id       TEXT PRIMARY KEY,
    title            TEXT NOT NULL,
    description      TEXT NOT NULL,
    type             TEXT NOT NULL,
    target_value     INTEGER NOT NULL DEFAULT 1,
    target_species   TEXT,
    target_rarity    TEXT,
    reward_coins     INTEGER NOT NULL DEFAULT 50,
    unlock_location  TEXT,
    target_location  TEXT,
    time_limit       INTEGER,
    attempt_limit    INTEGER,
    sort_order       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS player_missions (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(user_id),
    mission_id TEXT NOT NULL REFERENCES missions(mission_id),
    progress   INTEGER NOT NULL DEFAULT 0,
    completed  INTEGER NOT NULL DEFAULT 0,
    started_at INTEGER,
    attempts_used INTEGER NOT NULL DEFAULT 0,
    failed INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS inventory (
    inventory_id TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL REFERENCES users(user_id),
    fish_id      TEXT NOT NULL REFERENCES fish(fish_id),
    quantity     INTEGER NOT NULL DEFAULT 0
);
        `);
        async function addColumnIfMissing(table, column, definition) {
            const info = await client.execute(`PRAGMA table_info(${table})`);
            if (!info.rows.some(row => row.name === column)) {
                await client.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
            }
        }
        await addColumnIfMissing('missions', 'target_location', 'TEXT');
        await addColumnIfMissing('missions', 'time_limit', 'INTEGER');
        await addColumnIfMissing('missions', 'attempt_limit', 'INTEGER');
        await addColumnIfMissing('player_missions', 'started_at', 'INTEGER');
        await addColumnIfMissing('player_missions', 'attempts_used', 'INTEGER NOT NULL DEFAULT 0');
        await addColumnIfMissing('player_missions', 'failed', 'INTEGER NOT NULL DEFAULT 0');
        await client.executeMultiple(`
CREATE UNIQUE INDEX IF NOT EXISTS idx_player_rods_unique ON player_rods(user_id, rod_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_unique ON inventory(user_id, fish_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_player_missions_unique ON player_missions(user_id, mission_id);
        `);
        console.log('✅ Tables created / verified without deleting player data.');

        // ── SEED RODS ────────────────────────────────────────────────────────

        await client.executeMultiple(`
INSERT OR IGNORE INTO rods VALUES ('rod_twig',   'Twig Rod',    0,    1, 1, 1, 0,    'A wobbly stick with some string. It works... barely.');
INSERT OR IGNORE INTO rods VALUES ('rod_bamboo', 'Bamboo Rod',  50,   2, 2, 1, 0.05, 'Lightweight and flexible. A big upgrade from a twig.');
INSERT OR IGNORE INTO rods VALUES ('rod_steel',  'Steel Rod',   200,  3, 3, 3, 0.12, 'Sturdy and reliable. Opens up the Lake to you.');
INSERT OR IGNORE INTO rods VALUES ('rod_crystal','Crystal Rod', 600,  4, 5, 4, 0.22, 'Glows with an otherworldly shimmer. The Sea calls.');
INSERT OR IGNORE INTO rods VALUES ('rod_dragon', 'Dragon Rod',  1500, 5, 5, 5, 0.35, 'Forged from dragon scales. Legendary fish fear this rod.');
        `);
        console.log('✅ Rods seeded.');

        // ── SEED FISH ────────────────────────────────────────────────────────

        await client.executeMultiple(`
INSERT OR IGNORE INTO fish VALUES ('fish_minnow',    'Minnow',         5,   'pond', 'common',    0.05,  0.2,    '🐟');
INSERT OR IGNORE INTO fish VALUES ('fish_catfish',   'Catfish',        12,  'pond', 'common',    0.5,   2.0,    '🐡');
INSERT OR IGNORE INTO fish VALUES ('fish_carp',      'Golden Carp',    25,  'pond', 'uncommon',  1.0,   4.0,    '🐠');
INSERT OR IGNORE INTO fish VALUES ('fish_frog',      'Frog',           15,  'pond', 'uncommon',  0.1,   0.4,    '🐸');
INSERT OR IGNORE INTO fish VALUES ('fish_koi',       'Koi',            60,  'pond', 'rare',      1.5,   5.0,    '🎏');
INSERT OR IGNORE INTO fish VALUES ('fish_turtle',    'Snapping Turtle',80,  'pond', 'epic',      3.0,   8.0,    '🐢');
INSERT OR IGNORE INTO fish VALUES ('fish_dragonkoi', 'Dragon Koi',     250, 'pond', 'legendary', 5.0,   12.0,   '🐉');
INSERT OR IGNORE INTO fish VALUES ('fish_bass',      'Bass',           20,  'lake', 'common',    0.8,   3.0,    '🐟');
INSERT OR IGNORE INTO fish VALUES ('fish_perch',     'Perch',          18,  'lake', 'common',    0.3,   1.5,    '🐡');
INSERT OR IGNORE INTO fish VALUES ('fish_trout',     'Rainbow Trout',  45,  'lake', 'uncommon',  1.0,   4.5,    '🐠');
INSERT OR IGNORE INTO fish VALUES ('fish_pike',      'Pike',           70,  'lake', 'rare',      2.0,   8.0,    '🦈');
INSERT OR IGNORE INTO fish VALUES ('fish_eel',       'Electric Eel',   90,  'lake', 'rare',      1.5,   6.0,    '🐍');
INSERT OR IGNORE INTO fish VALUES ('fish_axolotl',   'Axolotl',        150, 'lake', 'epic',      0.2,   0.8,    '🦎');
INSERT OR IGNORE INTO fish VALUES ('fish_lochness',  'Loch Ness',      500, 'lake', 'legendary', 50.0,  200.0,  '🦕');
INSERT OR IGNORE INTO fish VALUES ('fish_sardine',   'Sardine',        10,  'sea',  'common',    0.05,  0.3,    '🐟');
INSERT OR IGNORE INTO fish VALUES ('fish_tuna',      'Tuna',           55,  'sea',  'uncommon',  5.0,   20.0,   '🐡');
INSERT OR IGNORE INTO fish VALUES ('fish_swordfish', 'Swordfish',      120, 'sea',  'rare',      8.0,   35.0,   '⚔️');
INSERT OR IGNORE INTO fish VALUES ('fish_shark',     'Shark',          200, 'sea',  'epic',      20.0,  80.0,   '🦈');
INSERT OR IGNORE INTO fish VALUES ('fish_octopus',   'Giant Octopus',  180, 'sea',  'epic',      10.0,  40.0,   '🐙');
INSERT OR IGNORE INTO fish VALUES ('fish_kraken',    'Kraken',         999, 'sea',  'legendary', 500.0, 2000.0, '🦑');
        `);
        console.log('✅ Fish seeded.');

        // ── SEED MISSIONS ────────────────────────────────────────────────────

        await client.executeMultiple(`
INSERT OR IGNORE INTO missions (mission_id,title,description,type,target_value,target_species,target_rarity,reward_coins,unlock_location,target_location,time_limit,attempt_limit,sort_order) VALUES
('mission_1','First Cast','Catch 5 fish from the Pond.','catch_count',5,NULL,NULL,30,'lake','pond',NULL,NULL,1),
('mission_2','Golden Dreams','Catch a Golden Carp.','catch_species',1,'fish_carp',NULL,50,NULL,'pond',NULL,NULL,2),
('mission_3','Rarity Hunter','Catch 3 Rare or better fish.','catch_rarity',3,NULL,'rare',100,'sea',NULL,NULL,NULL,3),
('mission_4','Heavy Haul','Catch a single fish weighing over 10kg.','catch_weight',10,NULL,NULL,80,NULL,NULL,NULL,NULL,4),
('mission_5','Lake Explorer','Catch 3 fish from the Lake.','catch_count',3,NULL,NULL,120,NULL,'lake',NULL,NULL,5),
('mission_6','Deep Sea Diver','Catch 10 fish from the Sea.','catch_count',10,NULL,NULL,200,NULL,'sea',NULL,NULL,6),
('mission_7','Coin Collector','Earn 500 coins from selling fish.','earn_coins',500,NULL,NULL,150,NULL,NULL,NULL,NULL,7),
('mission_8','Legend of the Sea','Catch a Legendary fish.','catch_rarity',1,NULL,'legendary',500,NULL,'sea',NULL,NULL,8),
('mission_9','Pond Sprint','Land 3 skilled Pond catches in 60 seconds.','challenge_score',3,'70',NULL,90,NULL,'pond',60,NULL,9),
('mission_10','Lake Precision','Land 2 skilled Lake catches within 4 attempts.','challenge_score',2,'75',NULL,140,NULL,'lake',NULL,4,10),
('mission_11','Weight of the World','Catch 100 kg of fish in total.','total_weight',100,NULL,NULL,250,NULL,NULL,NULL,NULL,11);
UPDATE missions SET target_location='pond' WHERE mission_id IN ('mission_1','mission_2');
UPDATE missions SET target_location='lake' WHERE mission_id='mission_5';
UPDATE missions SET target_location='sea' WHERE mission_id IN ('mission_6','mission_8');
        `);
        console.log('✅ Missions seeded.');

        console.log('\n🎣 Migration complete! Database is ready.');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    } finally {
        client.close();
    }
}

run();
