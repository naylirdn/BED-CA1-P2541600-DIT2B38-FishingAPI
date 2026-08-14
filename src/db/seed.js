import { db } from '../config/db.js';
import { fish, rods, missions } from './schema.js';

async function seed() {
    try {
        // ── RODS ──────────────────────────────────────────────────────────────
        await db.insert(rods).values([
            {
                rod_id: 'rod_twig',
                rod_name: 'Twig Rod',
                cost: 0,
                power: 1,
                luck: 1,
                control: 1,
                rare_chance: 0,
                description: 'A wobbly stick with some string. It works… barely.'
            },
            {
                rod_id: 'rod_bamboo',
                rod_name: 'Bamboo Rod',
                cost: 50,
                power: 2,
                luck: 2,
                control: 1,
                rare_chance: 0.05,
                description: 'Lightweight and flexible. A big upgrade from a twig.'
            },
            {
                rod_id: 'rod_steel',
                rod_name: 'Steel Rod',
                cost: 200,
                power: 3,
                luck: 3,
                control: 3,
                rare_chance: 0.12,
                description: 'Sturdy and reliable. Opens up the Lake to you.'
            },
            {
                rod_id: 'rod_crystal',
                rod_name: 'Crystal Rod',
                cost: 600,
                power: 4,
                luck: 5,
                control: 4,
                rare_chance: 0.22,
                description: 'Glows with an otherworldly shimmer. The Sea calls.'
            },
            {
                rod_id: 'rod_dragon',
                rod_name: 'Dragon Rod',
                cost: 1500,
                power: 5,
                luck: 5,
                control: 5,
                rare_chance: 0.35,
                description: 'Forged from dragon scales. Legendary fish fear this rod.'
            }
        ]);

        // ── FISH ──────────────────────────────────────────────────────────────
        await db.insert(fish).values([
            // POND (7 fish)
            {
                fish_id: 'fish_minnow',
                fish_name: 'Minnow',
                sell_price: 5,
                location: 'pond',
                rarity: 'common',
                min_weight: 0.05,
                max_weight: 0.2,
                emoji: '🐟'
            },
            {
                fish_id: 'fish_catfish',
                fish_name: 'Catfish',
                sell_price: 12,
                location: 'pond',
                rarity: 'common',
                min_weight: 0.5,
                max_weight: 2.0,
                emoji: '🐡'
            },
            {
                fish_id: 'fish_carp',
                fish_name: 'Golden Carp',
                sell_price: 25,
                location: 'pond',
                rarity: 'uncommon',
                min_weight: 1.0,
                max_weight: 4.0,
                emoji: '🐠'
            },
            {
                fish_id: 'fish_frog',
                fish_name: 'Frog',
                sell_price: 15,
                location: 'pond',
                rarity: 'uncommon',
                min_weight: 0.1,
                max_weight: 0.4,
                emoji: '🐸'
            },
            {
                fish_id: 'fish_koi',
                fish_name: 'Koi',
                sell_price: 60,
                location: 'pond',
                rarity: 'rare',
                min_weight: 1.5,
                max_weight: 5.0,
                emoji: '🎏'
            },
            {
                fish_id: 'fish_turtle',
                fish_name: 'Snapping Turtle',
                sell_price: 80,
                location: 'pond',
                rarity: 'epic',
                min_weight: 3.0,
                max_weight: 8.0,
                emoji: '🐢'
            },
            {
                fish_id: 'fish_dragonkoi',
                fish_name: 'Dragon Koi',
                sell_price: 250,
                location: 'pond',
                rarity: 'legendary',
                min_weight: 5.0,
                max_weight: 12.0,
                emoji: '🐉'
            },

            // LAKE (7 fish)
            {
                fish_id: 'fish_bass',
                fish_name: 'Bass',
                sell_price: 20,
                location: 'lake',
                rarity: 'common',
                min_weight: 0.8,
                max_weight: 3.0,
                emoji: '🐟'
            },
            {
                fish_id: 'fish_perch',
                fish_name: 'Perch',
                sell_price: 18,
                location: 'lake',
                rarity: 'common',
                min_weight: 0.3,
                max_weight: 1.5,
                emoji: '🐡'
            },
            {
                fish_id: 'fish_trout',
                fish_name: 'Rainbow Trout',
                sell_price: 45,
                location: 'lake',
                rarity: 'uncommon',
                min_weight: 1.0,
                max_weight: 4.5,
                emoji: '🐠'
            },
            {
                fish_id: 'fish_pike',
                fish_name: 'Pike',
                sell_price: 70,
                location: 'lake',
                rarity: 'rare',
                min_weight: 2.0,
                max_weight: 8.0,
                emoji: '🦈'
            },
            {
                fish_id: 'fish_eel',
                fish_name: 'Electric Eel',
                sell_price: 90,
                location: 'lake',
                rarity: 'rare',
                min_weight: 1.5,
                max_weight: 6.0,
                emoji: '🐍'
            },
            {
                fish_id: 'fish_axolotl',
                fish_name: 'Axolotl',
                sell_price: 150,
                location: 'lake',
                rarity: 'epic',
                min_weight: 0.2,
                max_weight: 0.8,
                emoji: '🦎'
            },
            {
                fish_id: 'fish_lochness',
                fish_name: 'Loch Ness',
                sell_price: 500,
                location: 'lake',
                rarity: 'legendary',
                min_weight: 50.0,
                max_weight: 200.0,
                emoji: '🦕'
            },

            // SEA (6 fish)
            {
                fish_id: 'fish_sardine',
                fish_name: 'Sardine',
                sell_price: 10,
                location: 'sea',
                rarity: 'common',
                min_weight: 0.05,
                max_weight: 0.3,
                emoji: '🐟'
            },
            {
                fish_id: 'fish_tuna',
                fish_name: 'Tuna',
                sell_price: 55,
                location: 'sea',
                rarity: 'uncommon',
                min_weight: 5.0,
                max_weight: 20.0,
                emoji: '🐡'
            },
            {
                fish_id: 'fish_swordfish',
                fish_name: 'Swordfish',
                sell_price: 120,
                location: 'sea',
                rarity: 'rare',
                min_weight: 8.0,
                max_weight: 35.0,
                emoji: '🗡️'
            },
            {
                fish_id: 'fish_shark',
                fish_name: 'Shark',
                sell_price: 200,
                location: 'sea',
                rarity: 'epic',
                min_weight: 20.0,
                max_weight: 80.0,
                emoji: '🦈'
            },
            {
                fish_id: 'fish_octopus',
                fish_name: 'Giant Octopus',
                sell_price: 180,
                location: 'sea',
                rarity: 'epic',
                min_weight: 10.0,
                max_weight: 40.0,
                emoji: '🐙'
            },
            {
                fish_id: 'fish_kraken',
                fish_name: 'Kraken',
                sell_price: 999,
                location: 'sea',
                rarity: 'legendary',
                min_weight: 500.0,
                max_weight: 2000.0,
                emoji: '🦑'
            }
        ]);

        // ── MISSIONS ──────────────────────────────────────────────────────────
        await db.insert(missions).values([
            {
                mission_id: 'mission_1',
                title: 'First Cast',
                description: 'Catch 5 fish from the Pond.',
                type: 'catch_count',
                target_value: 5,
                target_species: null,
                target_rarity: null,
                reward_coins: 30,
                unlock_location: 'lake',
                target_location: 'pond',
                sort_order: 1
            },
            {
                mission_id: 'mission_2',
                title: 'Golden Dreams',
                description: 'Catch a Golden Carp.',
                type: 'catch_species',
                target_value: 1,
                target_species: 'fish_carp',
                target_rarity: null,
                reward_coins: 50,
                unlock_location: null,
                target_location: 'pond',
                sort_order: 2
            },
            {
                mission_id: 'mission_3',
                title: 'Rarity Hunter',
                description: 'Catch 3 Rare or better fish.',
                type: 'catch_rarity',
                target_value: 3,
                target_species: null,
                target_rarity: 'rare',
                reward_coins: 100,
                unlock_location: 'sea',
                sort_order: 3
            },
            {
                mission_id: 'mission_4',
                title: 'Heavy Haul',
                description: 'Catch a single fish weighing over 10kg.',
                type: 'catch_weight',
                target_value: 10,
                target_species: null,
                target_rarity: null,
                reward_coins: 80,
                unlock_location: null,
                sort_order: 4
            },
            {
                mission_id: 'mission_5',
                title: 'Lake Explorer',
                description: 'Catch 3 fish from the Lake.',
                type: 'catch_count',
                target_value: 3,
                target_species: null,
                target_rarity: null,
                reward_coins: 120,
                unlock_location: null,
                target_location: 'lake',
                sort_order: 5
            },
            {
                mission_id: 'mission_6',
                title: 'Deep Sea Diver',
                description: 'Catch 10 fish from the Sea.',
                type: 'catch_count',
                target_value: 10,
                target_species: null,
                target_rarity: null,
                reward_coins: 200,
                unlock_location: null,
                target_location: 'sea',
                sort_order: 6
            },
            {
                mission_id: 'mission_7',
                title: 'Coin Collector',
                description: 'Earn 500 coins from selling fish.',
                type: 'earn_coins',
                target_value: 500,
                target_species: null,
                target_rarity: null,
                reward_coins: 150,
                unlock_location: null,
                sort_order: 7
            },
            {
                mission_id: 'mission_8',
                title: 'Legend of the Sea',
                description: 'Catch a Legendary fish.',
                type: 'catch_rarity',
                target_value: 1,
                target_species: null,
                target_rarity: 'legendary',
                reward_coins: 500,
                unlock_location: null,
                target_location: 'sea',
                sort_order: 8
            },
            {
                mission_id: 'mission_9', title: 'Pond Sprint',
                description: 'Land 3 skilled Pond catches in 60 seconds.', type: 'challenge_score',
                target_value: 3, target_species: '70', target_rarity: null, reward_coins: 90,
                unlock_location: null, target_location: 'pond', time_limit: 60, sort_order: 9
            },
            {
                mission_id: 'mission_10', title: 'Lake Precision',
                description: 'Land 2 skilled Lake catches within 4 attempts.', type: 'challenge_score',
                target_value: 2, target_species: '75', target_rarity: null, reward_coins: 140,
                unlock_location: null, target_location: 'lake', attempt_limit: 4, sort_order: 10
            },
            {
                mission_id: 'mission_11', title: 'Weight of the World',
                description: 'Catch 100 kg of fish in total.', type: 'total_weight',
                target_value: 100, target_species: null, target_rarity: null, reward_coins: 250,
                unlock_location: null, sort_order: 11
            }
        ]);

        console.log('✅ Seed data inserted successfully.');
    } catch (error) {
        console.error('❌ Seed failed:', error.message);
    }
}

seed();
