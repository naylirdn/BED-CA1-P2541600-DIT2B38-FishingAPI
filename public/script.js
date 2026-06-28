const API_URL = "http://localhost:3000";

function showResult(data) {
    document.getElementById("result").textContent = JSON.stringify(data, null, 2);
}

async function createUser() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const res = await fetch(`${API_URL}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    showResult(data);

    if (data.user_id) {
        document.getElementById("userId").value = data.user_id;
    }
}

async function getFish() {
    const res = await fetch(`${API_URL}/fish`);
    const data = await res.json();

    document.getElementById("fishList").textContent = JSON.stringify(data, null, 2);
    showResult(data);
}

async function catchFish() {
    const user_id = document.getElementById("userId").value;
    const spot = document.getElementById("spot").value;

    const res = await fetch(`${API_URL}/fish/catch-spot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, spot })
    });

    const data = await res.json();
    showResult(data);
}

async function getInventory() {
    const user_id = document.getElementById("userId").value;

    const res = await fetch(`${API_URL}/fish/inventory/${user_id}`);
    const data = await res.json();

    document.getElementById("inventory").textContent = JSON.stringify(data, null, 2);
    showResult(data);
}

async function sellFish() {
    const user_id = document.getElementById("userId").value;
    const fish_id = document.getElementById("fishId").value;
    const quantity = Number(document.getElementById("quantity").value);

    const res = await fetch(`${API_URL}/fish/sell`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, fish_id, quantity })
    });

    const data = await res.json();
    showResult(data);
}