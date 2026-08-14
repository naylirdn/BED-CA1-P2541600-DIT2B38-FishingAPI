import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const testDb = join(tmpdir(), `fishing-adventure-${process.pid}.db`);
copyFileSync(new URL('../local.db', import.meta.url), testDb);
process.env.DATABASE_URL = `file:${testDb.replaceAll('\\', '/')}`;
const { default: app } = await import('../src/app.js');
const { client } = await import('../src/config/db.js');
const server = app.listen(0);
await new Promise(resolve => server.once('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

async function request(path, options = {}) {
    const response = await fetch(`${base}${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options.headers },
        body: options.body ? JSON.stringify(options.body) : undefined
    });
    const data = response.status === 204 ? null : await response.json();
    return { response, data };
}

test('complete player journey works without duplicate purchases or rewards', async () => {
    const username = `angler_${Date.now()}`;
    const created = await request('/users', { method: 'POST', body: { username, password: 'test-pass' } });
    assert.equal(created.response.status, 201);
    const userId = created.data.user_id;

    const equipped = await request(`/rods/equipped/${userId}`);
    assert.equal(equipped.data.rod_id, 'rod_twig');

    const bought = await request('/rods/buy', { method: 'POST', body: { user_id: userId, rod_id: 'rod_bamboo' } });
    assert.equal(bought.response.status, 201);
    const duplicate = await request('/rods/buy', { method: 'POST', body: { user_id: userId, rod_id: 'rod_bamboo' } });
    assert.equal(duplicate.response.status, 409);

    const equippedBamboo = await request('/rods/equip', { method: 'POST', body: { user_id: userId, rod_id: 'rod_bamboo' } });
    assert.equal(equippedBamboo.data.equipped.rod_id, 'rod_bamboo');

    const caught = await request('/fish/catch-spot', { method: 'POST', body: { user_id: userId, spot: 'pond', rod_id: 'rod_bamboo', performance: 100 } });
    assert.equal(caught.response.status, 201);
    assert.equal(caught.data.fish.location, 'pond');
    assert.equal(caught.data.rarity, caught.data.fish.rarity);
    assert.ok(caught.data.weight > 0);

    const inventory = await request(`/fish/inventory/${userId}`);
    assert.ok(inventory.data.some(item => item.fish_id === caught.data.fish.fish_id));

    const sold = await request('/fish/sell', { method: 'POST', body: { user_id: userId, fish_id: caught.data.fish.fish_id, quantity: 1 } });
    assert.equal(sold.response.status, 200);
    assert.ok(sold.data.result.coins_earned > 0);

    const missions = await request(`/missions/${userId}`);
    assert.equal(missions.response.status, 200);
    assert.ok(missions.data.some(m => m.time_limit === 60));
    assert.ok(missions.data.some(m => m.attempt_limit === 4));

    const unlocks = await request(`/missions/unlocks/${userId}`);
    assert.deepEqual(Object.keys(unlocks.data), ['pond', 'lake', 'sea']);
});

test.after(async () => {
    await new Promise(resolve => server.close(resolve));
    await client.close();
    for (let attempt = 0; attempt < 10; attempt++) {
        try { await rm(testDb, { force: true }); break; }
        catch (error) {
            if (attempt === 9) break; // Windows may briefly retain the embedded DB handle.
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }
});
