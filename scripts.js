// === تحميل اللاعبين من LocalStorage ===
let players = JSON.parse(localStorage.getItem("players") || "[]");

// === حفظ البيانات ===
function savePlayers() {
    localStorage.setItem("players", JSON.stringify(players));
}

// === عرض اللاعبين ===
function renderPlayers() {
    const list = document.getElementById("playersList");
    list.innerHTML = "";

    if (players.length === 0) {
        list.innerHTML = "<p>لا يوجد لاعبين بعد.</p>";
        return;
    }

    players.forEach(player => {
        const div = document.createElement("div");
        div.className = "player";

        div.innerHTML = `
            <div class="info">
                <strong>${player.name}</strong>
                <br>
                رقم: ${player.number || "-"}
                <br>
                المركز: ${player.position || "-"}
            </div>
            <button class="delete-btn" onclick="deletePlayer('${player.id}')">حذف</button>
        `;

        list.appendChild(div);
    });
}

// === حذف لاعب ===
function deletePlayer(id) {
    players = players.filter(p => p.id !== id);
    savePlayers();
    renderPlayers();
}

// === إضافة لاعب ===
document.getElementById("playerForm").addEventListener("submit", function(e) {
    e.preventDefault();

    const name = document.getElementById("playerName").value.trim();
    if (!name) return alert("الرجاء إدخال الاسم");

    const number = document.getElementById("playerNumber").value;
    const position = document.getElementById("playerPosition").value;

    players.push({
        id: Date.now().toString(),
        name,
        number,
        position
    });

    savePlayers();
    renderPlayers();

    this.reset();
});

// تشغيل عند بداية الصفحة
renderPlayers();
