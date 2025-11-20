// Tabs
const tabs = document.querySelectorAll(".tab-btn");
const sections = document.querySelectorAll(".tab");

tabs.forEach(tab => {
    tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");

        sections.forEach(sec => sec.classList.remove("active"));
        document.getElementById(tab.dataset.tab).classList.add("active");
    });
});


// Add Player
const playerForm = document.getElementById("playerForm");
const teamList = document.getElementById("teamList");

playerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("playerName").value;
    const position = document.getElementById("playerPosition").value;
    const image = document.getElementById("playerImage").files[0];

    let imgBase64 = "";
    if (image) {
        imgBase64 = await toBase64(image);
    }

    let players = JSON.parse(localStorage.getItem("players") || "[]");

    players.push({
        id: Date.now(),
        name,
        position,
        image: imgBase64,
        attendance: 0
    });

    localStorage.setItem("players", JSON.stringify(players));
    playerForm.reset();
    renderPlayers();
    updateStats();
});

function toBase64(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
    });
}


// Render Players
function renderPlayers() {
    let players = JSON.parse(localStorage.getItem("players") || "[]");

    teamList.innerHTML = players.map(p => `
        <div class="player-card">
            <img src="${p.image || 'https://via.placeholder.com/200'}">
            <h3>${p.name}</h3>
            <p>${p.position}</p>
            <p>الحضور: ${p.attendance}</p>
        </div>
    `).join("");
}

renderPlayers();


// Training Attendance
document.getElementById("markTraining").addEventListener("click", () => {
    let players = JSON.parse(localStorage.getItem("players") || "[]");

    players = players.map(p => {
        p.attendance += 1;
        return p;
    });

    localStorage.setItem("players", JSON.stringify(players));
    renderPlayers();
    updateStats();
});


// Stats
function updateStats() {
    let players = JSON.parse(localStorage.getItem("players") || "[]");

    document.getElementById("totalPlayers").textContent = players.length;

    const totalAttendance = players.reduce((sum, p) => sum + p.attendance, 0);
    document.getElementById("totalAttendance").textContent = totalAttendance;

    if (players.length > 0) {
        const best = players.reduce((max, p) => p.attendance > max.attendance ? p : max, players[0]);
        document.getElementById("bestPlayer").textContent = best.name;
    }
}

updateStats();
