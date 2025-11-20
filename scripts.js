const form = document.getElementById("playerForm");
const teamList = document.getElementById("teamList");

form.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = document.getElementById("playerName").value.trim();
    if (!name) return;

    // اجلب اللاعبين المخزنين
    let players = JSON.parse(localStorage.getItem("players") || "[]");

    // أضف لاعب جديد
    players.push({ name });

    // خزّن القائمة
    localStorage.setItem("players", JSON.stringify(players));

    form.reset();
    renderPlayers();
});

// عرض الفريق
function renderPlayers() {
    let players = JSON.parse(localStorage.getItem("players") || "[]");

    teamList.innerHTML = players
        .map((p, index) => `<li>${index + 1}- ${p.name}</li>`)
        .join("");
}

renderPlayers();
