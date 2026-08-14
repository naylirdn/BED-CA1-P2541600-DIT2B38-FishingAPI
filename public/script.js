/* ═══════════════════════════════════════════════════════════════
   FISHING ADVENTURE — Game Client
   ═══════════════════════════════════════════════════════════════ */

const API = '';  // same origin

/* ── Game State ──────────────────────────────────────────────── */
const State = {
    user_id: null,
    username: null,
    coins: 0,
    equipped_rod: null,   // { rod_id, rod_name, power, luck, control, rare_chance }
    missions: [],
    allFish: [],     // full fish catalogue
    discoveredIds: new Set(), // fish_ids the player has caught at least once
    lastLocation: null,   // for "cast again"
    lastCatch: null,   // full catch result object
    pondSkillStreak: 0, // successful green-zone casts; raises difficulty gradually
};

/* ── Persistence ─────────────────────────────────────────────── */
function saveSession() {
    if (!State.user_id) return;
    localStorage.setItem('fa_session', JSON.stringify({
        user_id: State.user_id,
        username: State.username,
        discoveredIds: [...State.discoveredIds]
    }));
}

function loadSession() {
    try {
        const raw = localStorage.getItem('fa_session');
        if (!raw) return false;
        const s = JSON.parse(raw);
        State.user_id = s.user_id;
        State.username = s.username;
        State.discoveredIds = new Set(s.discoveredIds || []);
        return true;
    } catch { return false; }
}

function clearSession() {
    localStorage.removeItem('fa_session');
    State.user_id = null; State.username = null; State.coins = 0;
    State.equipped_rod = null; State.missions = [];
    State.discoveredIds = new Set();
}

/* ── API helper ──────────────────────────────────────────────── */
async function apiFetch(path, options = {}) {
    const res = await fetch(`${API}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
        body: options.body ? JSON.stringify(options.body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.message || 'Request failed'), { status: res.status, data });
    return data;
}

/* ── UI helpers ──────────────────────────────────────────────── */
const $app = () => document.getElementById('app');
const $nav = () => document.getElementById('navbar');
const $loading = () => document.getElementById('loading-overlay');
const $toast = () => document.getElementById('toast');

function showLoading() { $loading().classList.remove('hidden'); }
function hideLoading() { $loading().classList.add('hidden'); }

let toastTimer = null;
function showToast(msg, type = '', duration = 3000) {
    const el = $toast();
    el.textContent = msg;
    el.className = `toast toast-${type}`;
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), duration);
}

function cloneTemplate(id) {
    return document.getElementById(id).content.cloneNode(true);
}

function renderScreen(templateId, setup) {
    const app = $app();
    app.innerHTML = '';
    const frag = cloneTemplate(templateId);
    app.appendChild(frag);
    // Run setup after insertion so getElementById/querySelector work on live DOM
    if (setup) setup(app);
}

/* ── Navbar ──────────────────────────────────────────────────── */
function updateNavbar() {
    const nav = $nav();
    if (!State.user_id) { nav.classList.add('hidden'); return; }
    nav.classList.remove('hidden');

    document.getElementById('nav-coins').textContent = `🪙 ${State.coins.toLocaleString()}`;
    document.getElementById('nav-rod').textContent = State.equipped_rod
        ? `🎣 ${State.equipped_rod.rod_name}`
        : '🎣 No Rod';

    // Show first active mission
    const active = State.missions.find(m => !m.completed);
    document.getElementById('nav-mission-text').textContent = active
        ? `📋 ${active.title}: ${active.progress}/${active.target_value}`
        : '✅ All missions done!';
}

function animateCoinChange() {
    const el = document.getElementById('nav-coins');
    if (!el) return;
    el.classList.remove('bump');
    void el.offsetWidth; // reflow
    el.classList.add('bump');
}

/* ── Navigation ──────────────────────────────────────────────── */
async function navigate(screen, opts = {}) {
    switch (screen) {
        case 'login': renderLogin(); break;
        case 'hub': await renderHub(); break;
        case 'locations': await renderLocations(); break;
        case 'shop': await renderShop(); break;
        case 'inventory': await renderInventory(); break;
        case 'missions': await renderMissions(); break;
        case 'encyclopedia': await renderEncyclopedia(); break;
        case 'pond': renderPondGame(); break;
        case 'lake': renderLakeGame(); break;
        case 'sea': renderSeaGame(); break;
        case 'result': renderResult(opts.catchData); break;
        case 'logout':
            clearSession(); updateNavbar(); navigate('login'); break;
        default: renderLogin();
    }
}

/* ── Refresh player data ─────────────────────────────────────── */
async function refreshPlayerData() {
    const [user, rod, missions] = await Promise.all([
        apiFetch(`/users/${State.user_id}`),
        apiFetch(`/rods/equipped/${State.user_id}`),
        apiFetch(`/missions/${State.user_id}`)
    ]);
    State.coins = user.coins;
    State.equipped_rod = rod?.rod_id ? rod : null;
    State.missions = missions;
    updateNavbar();
}

async function loadAllFish() {
    if (State.allFish.length === 0) {
        State.allFish = await apiFetch('/fish');
    }
}

async function refreshDiscovered() {
    const inv = await apiFetch(`/fish/inventory/${State.user_id}`);
    inv.forEach(item => State.discoveredIds.add(item.fish_id));
    saveSession();
}

/* ═══════════════════════════════════════════════════════════════
   LOGIN SCREEN
   ═══════════════════════════════════════════════════════════════ */
function renderLogin() {
    $nav().classList.add('hidden');
    renderScreen('tpl-login');

    // Tab switching
    document.querySelectorAll('.tab-row .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-row .tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.dataset.tab;
            document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
            document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
        });
    });

    document.getElementById('btn-login').addEventListener('click', handleLogin);
    document.getElementById('btn-register').addEventListener('click', handleRegister);
    ['login-username', 'login-password', 'reg-username', 'reg-password'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                id.startsWith('reg') ? handleRegister() : handleLogin();
            }
        });
    });
}

async function handleLogin() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errEl = document.getElementById('login-error');
    errEl.classList.add('hidden');

    if (!username || !password) {
        errEl.textContent = 'Please enter username and password.';
        errEl.classList.remove('hidden'); return;
    }
    showLoading();
    try {
        // Find user by username
        const users = await apiFetch(`/users?username=${encodeURIComponent(username)}`);
        const user = users.find(u => u.username === username);
        if (!user || user.password !== password) {
            errEl.textContent = 'Incorrect username or password.';
            errEl.classList.remove('hidden'); return;
        }
        State.user_id = user.user_id;
        State.username = user.username;
        await refreshPlayerData();
        await loadAllFish();
        await refreshDiscovered();
        saveSession();
        navigate('hub');
    } catch (err) {
        errEl.textContent = err.message || 'Login failed.';
        errEl.classList.remove('hidden');
    } finally { hideLoading(); }
}

async function handleRegister() {
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;
    const errEl = document.getElementById('reg-error');
    errEl.classList.add('hidden');

    if (!username || !password) {
        errEl.textContent = 'Please fill in both fields.';
        errEl.classList.remove('hidden'); return;
    }
    showLoading();
    try {
        const user = await apiFetch('/users', { method: 'POST', body: { username, password } });
        State.user_id = user.user_id;
        State.username = user.username;
        await refreshPlayerData();
        await loadAllFish();
        saveSession();
        showToast('Welcome to Fishing Adventure! 🎉', 'success');
        navigate('hub');
    } catch (err) {
        errEl.textContent = err.message || 'Registration failed.';
        errEl.classList.remove('hidden');
    } finally { hideLoading(); }
}

/* ═══════════════════════════════════════════════════════════════
   HUB SCREEN
   ═══════════════════════════════════════════════════════════════ */
async function renderHub() {
    showLoading();
    try {
        await refreshPlayerData();
        renderScreen('tpl-hub', app => {
            app.querySelector('#hub-welcome').textContent =
                `Welcome back, ${State.username}! 🎣`;
        });
        document.querySelectorAll('.hub-card').forEach(card => {
            card.addEventListener('click', () => navigate(card.dataset.nav));
        });
    } catch (err) {
        showToast('Failed to load hub. ' + err.message, 'error');
    } finally { hideLoading(); }
}

/* ═══════════════════════════════════════════════════════════════
   LOCATION SELECT
   ═══════════════════════════════════════════════════════════════ */
async function renderLocations() {
    showLoading();
    try {
        const unlocks = await apiFetch(`/missions/unlocks/${State.user_id}`);
        renderScreen('tpl-locations');

        applyLocationUnlock('lake', unlocks.lake);
        applyLocationUnlock('sea', unlocks.sea);

        document.querySelectorAll('.location-card').forEach(card => {
            const loc = card.dataset.location;
            const locked = (loc === 'lake' && !unlocks.lake) || (loc === 'sea' && !unlocks.sea);
            if (locked) return;
            card.addEventListener('click', () => {
                State.lastLocation = loc;
                navigate(loc);
            });
        });
    } catch (err) {
        showToast('Failed to load locations. ' + err.message, 'error');
    } finally { hideLoading(); }
}

function applyLocationUnlock(loc, isUnlocked) {
    const overlay = document.querySelector(`.loc-${loc} .loc-lock-overlay`);
    const badge = document.querySelector(`.loc-${loc}-badge`);
    if (!overlay || !badge) return;
    if (isUnlocked) {
        overlay.classList.add('unlocked');
        badge.textContent = loc === 'lake' ? '🏔️ Open' : '🌊 Open';
        badge.style.background = 'var(--mint)';
    }
}

/* ═══════════════════════════════════════════════════════════════
   POND MINI-GAME — Timing Bar
   ═══════════════════════════════════════════════════════════════ */
function renderPondGame() {
    renderScreen('tpl-game-pond');

    const marker = document.getElementById('timing-marker');
    const feedback = document.getElementById('timing-feedback');
    const btn = document.getElementById('btn-cast-pond');
    const track = document.querySelector('.timing-track');
    const panel = document.getElementById('pond-game-panel');
    const speedLevel = document.getElementById('pond-speed-level');
    const ac = new AbortController(); // cleans up keydown when screen changes
    let animId = null;
    let pos = 0;
    let dir = 1;
    const baseSpeed = 82; // percentage points/second; ~1.7x the previous 60fps speed
    const speed = Math.min(135, baseSpeed * Math.pow(1.1, State.pondSkillStreak));
    let running = false;
    let castDone = false;
    let lastFrame = null;

    function getTrackWidth() { return track.getBoundingClientRect().width; }
    speedLevel.textContent = State.pondSkillStreak
        ? `Current: ${State.pondSkillStreak + 1}× streak · ${Math.round(speed)} speed`
        : `Current: Fresh Cast · ${Math.round(speed)} speed`;

    function startMarker() {
        running = true;
        castDone = false;
        lastFrame = null;
        panel.classList.remove('result-perfect', 'result-great', 'result-good', 'result-miss');
        feedback.classList.add('hidden');
        btn.textContent = '🛑 Stop!';
        function tick(timestamp) {
            if (lastFrame === null) lastFrame = timestamp;
            const elapsed = Math.min(34, timestamp - lastFrame) / 1000;
            lastFrame = timestamp;
            pos += dir * speed * elapsed;
            if (pos >= 100) { pos = 100 - (pos - 100); dir = -1; }
            if (pos <= 0) { pos = Math.abs(pos); dir = 1; }
            marker.style.left = `${(pos / 100) * (getTrackWidth() - marker.offsetWidth)}px`;
            animId = requestAnimationFrame(tick);
        }
        animId = requestAnimationFrame(tick);
    }

    function stopMarker() {
        if (!running || castDone) return;
        castDone = true;
        cancelAnimationFrame(animId);
        running = false;
        btn.textContent = '🎣 Cast!';

        let score, label, resultClass;
        const centerDistance = Math.abs(pos - 50);
        if (centerDistance <= 5) {
            score = 96 + Math.round((1 - centerDistance / 5) * 4);
            label = '🎯 PERFECT!'; resultClass = 'result-perfect';
            State.pondSkillStreak = Math.min(8, State.pondSkillStreak + 1);
        } else if (pos >= 38 && pos <= 62) {
            score = 85 + Math.round((1 - Math.min(1, (centerDistance - 5) / 7)) * 10);
            label = '✨ GREAT!'; resultClass = 'result-great';
            State.pondSkillStreak = Math.min(8, State.pondSkillStreak + 1);
        } else if ((pos >= 20 && pos < 38) || (pos > 62 && pos <= 80)) {
            const yellowEdgeDistance = pos < 38 ? Math.abs(pos - 38) : Math.abs(pos - 62);
            score = 55 + Math.round((1 - Math.min(1, yellowEdgeDistance / 18)) * 24);
            label = '👍 GOOD'; resultClass = 'result-good';
        } else {
            score = 10 + Math.round((1 - Math.min(1, Math.abs(pos - 50) / 50)) * 25);
            label = '💦 MISS!'; resultClass = 'result-miss';
            State.pondSkillStreak = 0;
        }

        feedback.textContent = `${label} (score: ${score})`;
        feedback.classList.remove('hidden');
        panel.classList.add(resultClass);
        const splash = document.createElement('span');
        splash.className = 'pond-result-splash';
        splash.textContent = resultClass === 'result-miss' ? '💦' : resultClass === 'result-perfect' ? '✨🐟✨' : '🫧';
        panel.appendChild(splash);
        setTimeout(() => splash.remove(), 700);
        ac.abort(); // remove keydown listener immediately
        setTimeout(() => doLocationCatch('pond', score), 950);
    }

    btn.addEventListener('click', () => { if (!running) startMarker(); else stopMarker(); });

    document.addEventListener('keydown', e => {
        if (e.code !== 'Space' || e.repeat) return;
        e.preventDefault();
        if (!running) startMarker(); else stopMarker();
    }, { signal: ac.signal });
}

/* ═══════════════════════════════════════════════════════════════
   LAKE MINI-GAME — Moving Fish Tracker
   ═══════════════════════════════════════════════════════════════ */
function renderLakeGame() {
    renderScreen('tpl-game-lake');

    const arena = document.getElementById('lake-arena');
    const fishEl = document.getElementById('lake-fish');
    const attDisp = document.getElementById('lake-attempts-display');
    const scoreDisp = document.getElementById('lake-score-display');
    const feedback = document.getElementById('lake-feedback');

    const ATTEMPTS = 3;
    let attempts = ATTEMPTS;
    let hits = 0;
    let animId = null;
    let gameDone = false;
    let t = 0;

    const arenaW = () => arena.clientWidth - 60;
    const arenaH = () => arena.clientHeight - 60;
    function getSpeed() { return 1.2 + (ATTEMPTS - attempts) * 0.6; }

    function moveFish() {
        if (gameDone) return;
        t += getSpeed() * 0.025;
        fishEl.style.left = `${(Math.sin(t) + 1) / 2 * arenaW()}px`;
        fishEl.style.top = `${(Math.sin(t * 1.7 + 1) + 1) / 2 * arenaH()}px`;
        animId = requestAnimationFrame(moveFish);
    }

    function updateDisplay() {
        attDisp.textContent = `Attempts: ${'●'.repeat(attempts)}${'○'.repeat(ATTEMPTS - attempts)}`;
        scoreDisp.textContent = `Hits: ${hits} / ${ATTEMPTS}`;
    }

    function showLakeFeedback(message, type) {
        feedback.textContent = message;
        feedback.className = `lake-feedback ${type}`;
        void feedback.offsetWidth;
        feedback.classList.add('show');
    }

    function handleHit() {
        if (gameDone) return;
        hits++;
        fishEl.classList.remove('hit-anim');
        void fishEl.offsetWidth;
        fishEl.classList.add('hit-anim');
        showLakeFeedback(hits === ATTEMPTS ? '🏆 Perfect tracking!' : '✨ Nice catch!', 'hit');
        attempts--;
        updateDisplay();
        if (attempts <= 0) endGame();
    }

    function handleMiss(e) {
        if (gameDone) return;
        const ripple = document.createElement('span');
        ripple.className = 'lake-miss-ripple';
        ripple.style.left = `${e?.offsetX ?? arena.clientWidth / 2}px`;
        ripple.style.top = `${e?.offsetY ?? arena.clientHeight / 2}px`;
        arena.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
        showLakeFeedback('💦 So close — try again!', 'miss');
        attempts--;
        updateDisplay();
        if (attempts <= 0) endGame();
    }

    function endGame() {
        gameDone = true;
        cancelAnimationFrame(animId);
        const score = Math.round((hits / ATTEMPTS) * 100);
        fishEl.style.display = 'none';
        showLakeFeedback(hits === ATTEMPTS ? '🎣 Flawless catch!' : `🎣 ${hits}/${ATTEMPTS} tracked — reeling in…`, hits ? 'hit' : 'miss');
        setTimeout(() => doLocationCatch('lake', score), 600);
    }

    fishEl.addEventListener('click', handleHit);
    fishEl.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') handleHit(); });
    arena.addEventListener('click', e => { if (e.target !== fishEl) handleMiss(); });

    updateDisplay();
    moveFish();
}

/* ═══════════════════════════════════════════════════════════════
   SEA MINI-GAME — Line Tension
   ═══════════════════════════════════════════════════════════════ */
function renderSeaGame() {
    renderScreen('tpl-game-sea');
    document.querySelector('.screen-sea-game')?.classList.add('stormy');

    const needle = document.getElementById('tension-needle');
    const safeZone = document.getElementById('tension-safe-zone');
    const phaseLabel = document.getElementById('sea-phase-label');
    const phaseBar = document.getElementById('sea-phase-bar');
    const gauge = document.querySelector('.tension-gauge');
    const ac = new AbortController();

    const PHASES = 3;
    const PHASE_MS = 8000;
    let phase = 1;
    let tension = 50;
    let holding = false;
    let gameDone = false;
    let timeInZone = 0;
    let totalTime = 0;
    let lastTs = null;
    let animId = null;
    let phaseStart = null;
    let pullTimer = null;

    function getSafeZone() {
        const hw = 20 - (phase - 1) * 5;
        return { lo: 50 - hw, hi: 50 + hw };
    }
    function updateSafeZoneEl() {
        const sz = getSafeZone();
        safeZone.style.left = `${sz.lo}%`;
        safeZone.style.width = `${sz.hi - sz.lo}%`;
    }
    function isInZone() {
        const sz = getSafeZone();
        return tension >= sz.lo && tension <= sz.hi;
    }
    function schedulePull() {
        pullTimer = setTimeout(() => {
            if (gameDone) return;
            tension = Math.min(100, tension + 15 + Math.random() * 10);
            schedulePull();
        }, 1500 + Math.random() * 2000);
    }

    function tick(ts) {
        if (gameDone) return;
        const dt = lastTs ? (ts - lastTs) / 1000 : 0;
        lastTs = ts;
        totalTime += dt;

        if (!phaseStart) phaseStart = ts;
        const elapsed = ts - phaseStart;
        phaseBar.style.width = `${(1 - Math.min(elapsed / PHASE_MS, 1)) * 100}%`;

        if (elapsed >= PHASE_MS) {
            phase++;
            if (phase > PHASES) { endGame(); return; }
            phaseStart = ts;
            phaseLabel.textContent = `Phase ${phase} / ${PHASES}`;
            updateSafeZoneEl();
        }

        tension += (holding ? (40 + (phase - 1) * 5) : -(25 + (phase - 1) * 3)) * dt;
        tension = Math.max(0, Math.min(100, tension));
        if (isInZone()) timeInZone += dt;
        if (tension >= 100) { endGame(true); return; }

        needle.style.left = `${tension}%`;
        needle.setAttribute('aria-valuenow', Math.round(tension));
        animId = requestAnimationFrame(tick);
    }

    function endGame(snapped = false) {
        gameDone = true;
        ac.abort();
        cancelAnimationFrame(animId);
        clearTimeout(pullTimer);
        const score = snapped
            ? 10 + Math.round(Math.random() * 20)
            : Math.min(100, Math.round((timeInZone / Math.max(totalTime, 0.1)) * 100));
        setTimeout(() => doLocationCatch('sea', score), 600);
    }

    // Space key — scoped to this screen via AbortController
    document.addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); holding = true; } }, { signal: ac.signal });
    document.addEventListener('keyup', e => { if (e.code === 'Space') { holding = false; } }, { signal: ac.signal });
    // Touch/pointer — only on the gauge so header is safe
    gauge.addEventListener('pointerdown', () => { holding = true; }, { signal: ac.signal });
    gauge.addEventListener('pointerup', () => { holding = false; }, { signal: ac.signal });

    updateSafeZoneEl();
    schedulePull();
    animId = requestAnimationFrame(tick);
}

/* ═══════════════════════════════════════════════════════════════
   CATCH API CALL (shared by all three mini-games)
   ═══════════════════════════════════════════════════════════════ */
async function doLocationCatch(location, performance) {
    showLoading();
    try {
        const body = {
            user_id: State.user_id,
            spot: location,
            rod_id: State.equipped_rod?.rod_id || null,
            performance: Math.round(performance)
        };
        const result = await apiFetch('/fish/catch-spot', { method: 'POST', body });

        // Update state
        State.coins = result.new_coins;
        State.discoveredIds.add(result.fish.fish_id);
        saveSession();

        // Refresh missions in background
        apiFetch(`/missions/${State.user_id}`)
            .then(m => { State.missions = m; updateNavbar(); })
            .catch(() => { });

        // Show any completed missions as toasts
        if (result.completed_missions?.length) {
            result.completed_missions.forEach((m, i) => {
                setTimeout(() => {
                    let msg = `🏆 Mission complete: "${m.title}"! +${m.reward_coins} coins`;
                    if (m.unlock_location) msg += ` — ${m.unlock_location} unlocked! 🎉`;
                    showToast(msg, 'gold', 4000);
                }, i * 1200);
            });
        }

        updateNavbar();
        animateCoinChange();

        State.lastCatch = result;
        State.lastLocation = location;
        navigate('result', { catchData: result });
    } catch (err) {
        showToast(err.message || 'Something went wrong catching fish.', 'error');
        navigate('locations');
    } finally {
        hideLoading();
    }
}

/* ═══════════════════════════════════════════════════════════════
   CATCH RESULT SCREEN
   ═══════════════════════════════════════════════════════════════ */
const RARITY_LABELS = {
    common: 'Common', uncommon: 'Uncommon',
    rare: 'Rare', epic: 'Epic', legendary: 'Legendary'
};
const LOCATION_LABELS = { pond: '🪷 Pond', lake: '🏔️ Lake', sea: '🌊 Sea' };

function renderResult(catchData) {
    if (!catchData) { navigate('hub'); return; }

    const { fish, rarity, weight, is_special, special_data } = catchData;

    renderScreen('tpl-catch-result', app => {
        app.querySelector('#result-fish-emoji').textContent = fish.emoji || '🐟';
        app.querySelector('#result-fish-name').textContent = fish.fish_name;
        app.querySelector('#result-weight').textContent = `${weight} kg`;
        app.querySelector('#result-sell-value').textContent = `🪙 ${fish.sell_price}`;

        const rarBadge = app.querySelector('#result-rarity-badge');
        rarBadge.textContent = RARITY_LABELS[rarity] || rarity;
        rarBadge.className = `rarity-badge rarity-${rarity}`;

        app.querySelector('#result-location-badge').textContent =
            LOCATION_LABELS[State.lastLocation] || State.lastLocation;

        if (rarity === 'legendary')
            app.querySelector('#result-fish-display').classList.add('legendary');

        if (is_special && special_data) {
            const banner = app.querySelector('#result-special-banner');
            banner.textContent = special_data.label;
            banner.classList.remove('hidden');
        }
    });

    let acted = false;

    document.getElementById('btn-keep').addEventListener('click', () => {
        if (acted) return;
        acted = true;
        document.getElementById('btn-keep').disabled = true;
        document.getElementById('btn-sell').disabled = true;
        showToast(`${fish.fish_name} added to inventory! 🎒`, 'success');
        State.coins = catchData.new_coins;
        updateNavbar();
        navigate('hub');
    });

    document.getElementById('btn-sell').addEventListener('click', async () => {
        if (acted) return;
        acted = true;
        document.getElementById('btn-keep').disabled = true;
        document.getElementById('btn-sell').disabled = true;
        showLoading();
        try {
            const res = await apiFetch('/fish/sell', {
                method: 'POST',
                body: { user_id: State.user_id, fish_id: fish.fish_id, quantity: 1 }
            });
            State.coins = res.new_coins;
            animateCoinChange();
            updateNavbar();
            if (res.completed_missions?.length) {
                res.completed_missions.forEach((m, i) => {
                    setTimeout(() => showToast(
                        `🏆 Mission complete: "${m.title}"! +${m.reward_coins} coins`, 'gold', 4000
                    ), i * 1200);
                });
            }
            showToast(`Sold ${fish.fish_name} for 🪙 ${res.result.coins_earned}!`, 'success');
            navigate('hub');
        } catch (err) {
            showToast(err.message || 'Sell failed.', 'error');
            acted = false;
            document.getElementById('btn-keep').disabled = false;
            document.getElementById('btn-sell').disabled = false;
        } finally { hideLoading(); }
    });

    document.getElementById('btn-fish-again').addEventListener('click', () => {
        navigate(State.lastLocation || 'locations');
    });
}

/* ═══════════════════════════════════════════════════════════════
   INVENTORY SCREEN
   ═══════════════════════════════════════════════════════════════ */
async function renderInventory() {
    showLoading();
    try {
        const [inventory, user] = await Promise.all([
            apiFetch(`/fish/inventory/${State.user_id}`),
            apiFetch(`/users/${State.user_id}`)
        ]);
        State.coins = user.coins;

        renderScreen('tpl-inventory');
        const grid = document.getElementById('inventory-grid');
        const totalVal = inventory.reduce((s, i) => s + i.sell_price * i.quantity, 0);
        document.getElementById('inv-total-value').textContent =
            `Total value: 🪙 ${totalVal.toLocaleString()}`;

        if (inventory.length === 0) {
            grid.innerHTML = '<p class="inv-empty">Your inventory is empty. Go fish! 🎣</p>';
        } else {
            inventory.forEach(item => grid.appendChild(buildInvCard(item, grid)));
        }

        document.getElementById('btn-sell-all').addEventListener('click', async () => {
            if (inventory.length === 0) return;
            if (!confirm('Sell ALL fish in your inventory?')) return;
            showLoading();
            try {
                for (const item of inventory) {
                    await apiFetch('/fish/sell', {
                        method: 'POST',
                        body: { user_id: State.user_id, fish_id: item.fish_id, quantity: item.quantity }
                    });
                }
                const updated = await apiFetch(`/users/${State.user_id}`);
                State.coins = updated.coins;
                animateCoinChange();
                updateNavbar();
                showToast('All fish sold! 🪙', 'success');
                await renderInventory();
            } catch (err) {
                showToast(err.message || 'Sell all failed.', 'error');
            } finally { hideLoading(); }
        });

        updateNavbar();
    } catch (err) {
        showToast('Failed to load inventory. ' + err.message, 'error');
    } finally { hideLoading(); }
}

function buildInvCard(item, grid) {
    const card = document.createElement('div');
    card.className = 'inv-card';

    const bar = document.createElement('div');
    bar.className = 'inv-card-rarity-bar';
    bar.style.background = getRarityColor(item.rarity);

    card.innerHTML = `
        <div class="inv-card-emoji">${item.emoji || '🐟'}</div>
        <div class="inv-card-name">${item.fish_name}</div>
        <span class="inv-qty">x${item.quantity}</span>
        <span class="inv-price">🪙 ${item.sell_price} each</span>
        <button class="inv-sell-btn" aria-label="Sell one ${item.fish_name}">Sell 1</button>
    `;
    card.insertBefore(bar, card.firstChild);

    card.querySelector('.inv-sell-btn').addEventListener('click', async () => {
        showLoading();
        try {
            const res = await apiFetch('/fish/sell', {
                method: 'POST',
                body: { user_id: State.user_id, fish_id: item.fish_id, quantity: 1 }
            });
            State.coins = res.new_coins;
            animateCoinChange();
            updateNavbar();
            showToast(`Sold 1 ${item.fish_name} for 🪙 ${res.result.coins_earned}`, 'success');

            if (res.result.remaining_quantity === 0) {
                card.remove();
            } else {
                item.quantity--;
                card.querySelector('.inv-qty').textContent = `x${item.quantity}`;
            }
            // Update total
            const remaining = [...grid.querySelectorAll('.inv-qty')]
                .reduce((s, el) => {
                    const parentCard = el.closest('.inv-card');
                    const price = parseInt(parentCard.querySelector('.inv-price').textContent.replace(/[^0-9]/g, '')) || 0;
                    const qty = parseInt(el.textContent.replace('x', '')) || 0;
                    return s + price * qty;
                }, 0);
            document.getElementById('inv-total-value').textContent =
                `Total value: 🪙 ${remaining.toLocaleString()}`;
        } catch (err) {
            showToast(err.message || 'Sell failed.', 'error');
        } finally { hideLoading(); }
    });

    return card;
}

/* ═══════════════════════════════════════════════════════════════
   ROD SHOP SCREEN
   ═══════════════════════════════════════════════════════════════ */
async function renderShop() {
    showLoading();
    try {
        const [rods, user] = await Promise.all([
            apiFetch(`/rods?user_id=${State.user_id}`),
            apiFetch(`/users/${State.user_id}`)
        ]);
        State.coins = user.coins;

        renderScreen('tpl-shop');
        document.getElementById('shop-coins-display').textContent =
            `Your coins: 🪙 ${State.coins.toLocaleString()}`;

        const grid = document.getElementById('shop-grid');
        rods.forEach(rod => grid.appendChild(buildRodCard(rod)));
        updateNavbar();
    } catch (err) {
        showToast('Failed to load shop. ' + err.message, 'error');
    } finally { hideLoading(); }
}

function buildRodCard(rod) {
    const card = document.createElement('div');
    card.className = `rod-card${rod.equipped ? ' equipped-card' : ''}`;
    card.id = `rod-card-${rod.rod_id}`;

    let statusBadge, actionBtn;
    if (rod.equipped) {
        statusBadge = `<span class="rod-status-badge badge-equipped">✅ Equipped</span>`;
        actionBtn = `<button class="rod-action-btn btn-equipped-inactive" disabled>Equipped</button>`;
    } else if (rod.owned) {
        statusBadge = `<span class="rod-status-badge badge-owned">Owned</span>`;
        actionBtn = `<button class="rod-action-btn btn-equip" data-action="equip" data-rod="${rod.rod_id}">Equip</button>`;
    } else if (State.coins >= rod.cost) {
        statusBadge = `<span class="rod-status-badge badge-buy">🪙 ${rod.cost}</span>`;
        actionBtn = `<button class="rod-action-btn btn-buy" data-action="buy" data-rod="${rod.rod_id}">Buy</button>`;
    } else {
        statusBadge = `<span class="rod-status-badge badge-locked">Need ${rod.cost - State.coins} more 🪙</span>`;
        actionBtn = `<button class="rod-action-btn btn-buy" data-action="buy" data-rod="${rod.rod_id}" disabled>Buy</button>`;
    }

    const priceTxt = rod.cost === 0
        ? `<span class="rod-price free">Free</span>`
        : `<span class="rod-price">🪙 ${rod.cost.toLocaleString()}</span>`;

    card.innerHTML = `
        <div class="rod-card-header">
            <span class="rod-name">🎣 ${rod.rod_name}</span>
            ${statusBadge}
        </div>
        <p class="rod-desc">${rod.description}</p>
        <div class="rod-stats">
            ${buildStatBar('Power', rod.power, 5, 'power')}
            ${buildStatBar('Luck', rod.luck, 5, 'luck')}
            ${buildStatBar('Control', rod.control, 5, 'control')}
            ${buildStatBar('Rarity', rod.rare_chance, 0.35, 'rare', true)}
        </div>
        <div class="rod-card-footer">
            ${priceTxt}
            ${actionBtn}
        </div>
    `;

    card.querySelector('[data-action]')?.addEventListener('click', async (e) => {
        const action = e.target.dataset.action;
        const rodId = e.target.dataset.rod;
        e.target.disabled = true;
        showLoading();
        try {
            if (action === 'buy') {
                const res = await apiFetch('/rods/buy', { method: 'POST', body: { user_id: State.user_id, rod_id: rodId } });
                State.coins = res.new_coins;
                showToast(`${res.rod.rod_name} purchased! 🎣`, 'success');

                // Check if this unlocks a location
                const unlocks = await apiFetch(`/missions/unlocks/${State.user_id}`);
                if (unlocks.lake || unlocks.sea) {
                    const loc = unlocks.sea ? 'Sea' : 'Lake';
                    showToast(`🎉 ${loc} is now unlocked!`, 'gold', 4000);
                }
            } else {
                const res = await apiFetch('/rods/equip', { method: 'POST', body: { user_id: State.user_id, rod_id: rodId } });
                State.equipped_rod = res.equipped;
                showToast(`${res.equipped.rod_name} equipped! ✅`, 'success');
            }
            await renderShop(); // Refresh entire shop
        } catch (err) {
            showToast(err.message || 'Action failed.', 'error');
            e.target.disabled = false;
        } finally { hideLoading(); }
    });

    return card;
}

function buildStatBar(label, value, max, cls, isFloat = false) {
    const pct = Math.round((value / max) * 100);
    const displayVal = isFloat ? `${Math.round(value * 100)}%` : `${value}/${max}`;
    return `
        <div class="rod-stat-row">
            <span class="rod-stat-label">${label}</span>
            <div class="rod-stat-bar-wrap">
                <div class="rod-stat-bar ${cls}" style="width:${pct}%"></div>
            </div>
            <span style="font-size:0.75rem;font-weight:700;color:var(--text-light);width:34px;text-align:right">${displayVal}</span>
        </div>`;
}

/* ═══════════════════════════════════════════════════════════════
   MISSIONS SCREEN
   ═══════════════════════════════════════════════════════════════ */
async function renderMissions() {
    showLoading();
    try {
        const missions = await apiFetch(`/missions/${State.user_id}`);
        State.missions = missions;

        renderScreen('tpl-missions');
        const board = document.getElementById('missions-board');
        missions.forEach(m => board.appendChild(buildMissionCard(m)));
        updateNavbar();
    } catch (err) {
        showToast('Failed to load missions. ' + err.message, 'error');
    } finally { hideLoading(); }
}

function buildMissionCard(m) {
    const card = document.createElement('div');
    card.className = `mission-card${m.completed ? ' completed-card' : ''}${m.failed ? ' failed-card' : ''}`;

    const pct = Math.min(100, Math.round((m.progress / m.target_value) * 100));
    const unlockBadge = m.unlock_location
        ? `<span class="mission-unlock-badge">🔓 Unlocks ${capitalise(m.unlock_location)}</span>`
        : '';
    const ruleBadges = [
        m.target_location ? `📍 ${capitalise(m.target_location)}` : '',
        m.time_limit ? `⏱️ ${m.time_limit}s` : '',
        m.attempt_limit ? `🎯 ${m.attempts_used}/${m.attempt_limit} attempts` : '',
        m.failed ? '↻ Challenge ended' : ''
    ].filter(Boolean).map(label => `<span class="mission-rule-badge">${label}</span>`).join('');

    card.innerHTML = `
        <div class="mission-title">${m.title}</div>
        <div class="mission-desc">${m.description}</div>
        <div class="mission-progress-row">
            <div class="mission-bar-wrap">
                <div class="mission-bar" style="width:${pct}%"></div>
            </div>
            <span class="mission-progress-text">${m.progress} / ${m.target_value}</span>
        </div>
        <div class="mission-footer">
            <span class="mission-reward">🪙 +${m.reward_coins} reward</span>
            <span class="mission-rules">${ruleBadges}</span>
            ${unlockBadge}
        </div>
    `;
    if (m.failed) {
        const retry = document.createElement('button');
        retry.className = 'btn-secondary mission-retry';
        retry.textContent = 'Retry challenge';
        retry.addEventListener('click', async () => {
            retry.disabled = true;
            try {
                await apiFetch(`/missions/${m.mission_id}/reset`, { method: 'POST', body: { user_id: State.user_id } });
                showToast('Challenge reset — good luck! 🎯', 'success');
                await renderMissions();
            } catch (err) { showToast(err.message || 'Could not reset challenge.', 'error'); retry.disabled = false; }
        });
        card.appendChild(retry);
    }
    return card;
}

/* ═══════════════════════════════════════════════════════════════
   ENCYCLOPEDIA SCREEN
   ═══════════════════════════════════════════════════════════════ */
async function renderEncyclopedia() {
    showLoading();
    try {
        await loadAllFish();
        await refreshDiscovered();

        renderScreen('tpl-encyclopedia');

        const discovered = State.discoveredIds.size;
        const discoveryPercent = State.allFish.length
            ? Math.round((discovered / State.allFish.length) * 100)
            : 0;
        document.getElementById('enc-progress').textContent =
            `Discovered: ${discovered} / ${State.allFish.length}`;
        document.getElementById('enc-progress-percent').textContent = `${discoveryPercent}%`;
        document.getElementById('enc-progress-fill').style.width = `${discoveryPercent}%`;

        let currentLoc = 'all';
        const grid = document.getElementById('enc-grid');

        function renderGrid(loc) {
            grid.innerHTML = '';
            const filtered = loc === 'all' ? State.allFish : State.allFish.filter(f => f.location === loc);
            filtered.forEach(f => grid.appendChild(buildEncCard(f)));
        }
        renderGrid(currentLoc);

        document.querySelectorAll('.enc-tab-row .tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.enc-tab-row .tab-btn').forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-selected', 'false');
                });
                btn.classList.add('active');
                btn.setAttribute('aria-selected', 'true');
                currentLoc = btn.dataset.loc;
                renderGrid(currentLoc);
            });
        });
    } catch (err) {
        showToast('Failed to load encyclopedia. ' + err.message, 'error');
    } finally { hideLoading(); }
}

function buildEncCard(fish) {
    const isDiscovered = State.discoveredIds.has(fish.fish_id);
    const card = document.createElement('div');
    card.className = `enc-card${isDiscovered ? '' : ' undiscovered'}`;

    const dotColor = getRarityColor(fish.rarity);
    const habitat = capitalise(fish.location);
    const rarity = capitalise(fish.rarity);

    if (isDiscovered) {
        card.innerHTML = `
            <div class="enc-card-topline">
                <span class="enc-rarity-badge"><i style="background:${dotColor}"></i>${rarity}</span>
                <span class="enc-status" title="Discovered">✓</span>
            </div>
            <div class="enc-fish-stage"><span class="enc-emoji">${fish.emoji || '🐟'}</span></div>
            <h3 class="enc-name">${fish.fish_name}</h3>
            <div class="enc-card-stats">
                <div><span class="enc-stat-label">Habitat</span><strong>📍 ${habitat}</strong></div>
                <div><span class="enc-stat-label">Value</span><strong>🪙 ${fish.sell_price}</strong></div>
                <div class="enc-stat-wide"><span class="enc-stat-label">Weight range</span><strong>⚖️ ${fish.min_weight}–${fish.max_weight} kg</strong></div>
            </div>
        `;
    } else {
        card.innerHTML = `
            <div class="enc-card-topline">
                <span class="enc-rarity-badge mystery"><i></i>Mystery</span>
                <span class="enc-status locked" title="Undiscovered">🔒</span>
            </div>
            <div class="enc-fish-stage"><span class="enc-emoji" aria-hidden="true">${fish.emoji || '🐟'}</span><span class="enc-mystery-mark">?</span></div>
            <h3 class="enc-name">???</h3>
            <div class="enc-card-stats">
                <div><span class="enc-stat-label">Habitat</span><strong>📍 ${habitat}</strong></div>
                <div><span class="enc-stat-label">Value</span><strong>🪙 ?</strong></div>
                <div class="enc-stat-wide"><span class="enc-stat-label">Weight range</span><strong>⚖️ ? kg</strong></div>
            </div>
        `;
    }
    return card;
}

/* ═══════════════════════════════════════════════════════════════
   UTILITY HELPERS
   ═══════════════════════════════════════════════════════════════ */
function getRarityColor(rarity) {
    const map = {
        common: 'var(--rarity-common)',
        uncommon: 'var(--rarity-uncommon)',
        rare: 'var(--rarity-rare)',
        epic: 'var(--rarity-epic)',
        legendary: 'var(--rarity-legendary)'
    };
    return map[rarity] || map.common;
}

function capitalise(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ═══════════════════════════════════════════════════════════════
   BOOTSTRAP — runs on page load
   ═══════════════════════════════════════════════════════════════ */
(async function init() {
    // Wire delegation for back buttons (any [data-nav] inside #app)
    document.getElementById('app').addEventListener('click', e => {
        const target = e.target.closest('[data-nav]');
        if (!target) return;
        const dest = target.dataset.nav;
        // Hub cards handled by their own listeners; this catches btn-back etc.
        if (['hub', 'locations', 'shop', 'inventory', 'missions', 'encyclopedia', 'logout'].includes(dest)) {
            navigate(dest);
        }
    });

    // Restore session from localStorage
    if (loadSession()) {
        showLoading();
        try {
            await refreshPlayerData();
            await loadAllFish();
            await refreshDiscovered();
            navigate('hub');
        } catch {
            clearSession();
            navigate('login');
        } finally {
            hideLoading();
        }
    } else {
        navigate('login');
    }
})();
