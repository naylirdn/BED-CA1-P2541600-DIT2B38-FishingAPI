import { db } from '../config/db.js';
import { fish } from './schema.js';

async function seed() {
    try {
        await db.insert(fish).values([
            {
                fish_id: 'fish_sardine',
                fish_name: 'Sardine',
                sell_price: 10,
                spot: 'pond'
            },
            {
                fish_id: 'fish_tuna',
                fish_name: 'Tuna',
                sell_price: 25,
                spot: 'sea'
            },
            {
                fish_id: 'fish_salmon',
                fish_name: 'Salmon',
                sell_price: 40,
                spot: 'river'
            },
            {
                fish_id: 'fish_shark',
                fish_name: 'Shark',
                sell_price: 100,
                spot: 'deep_ocean'
            }
        ]);

        console.log('Fish seed data inserted successfully.');
    } catch (error) {
        console.error('Seed failed:', error.message);
    }
}

seed();