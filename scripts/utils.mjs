import localData from "../data/json/servers.json" with { type: "json" };

const HYPIXEL_API_KEY = "YOUR_HYPIXEL_API_KEY_HERE"; 
const WYNN_API_TOKEN = "YOUR_WYNNCRAFT_API_TOKEN";
const serversContainer = document.getElementById("server-list");

async function getPlayerUuid(username) {
    try {
        const response = await fetch(`https://api.mojang.com/users/profiles/minecraft/${username}`);
    if (!response.ok) return null;
    
    const data = await response.json();
        return data.id; // Returns the UUID without dashes
    } catch (error) {
        console.error("Mojang API error:", error);
        return null;
    }
}

async function checkHypixel(uuid) {
    try {
        const response = await fetch(`https://api.hypixel.net/status?uuid=${uuid}`, {
        headers: { "API-Key": HYPIXEL_API_KEY }
        });
        const data = await response.json();

        if (data.success && data.session) {
        return {
            online: data.session.online,
            game: data.session.gameType || null,
            map: data.session.map || null
        };
        }
        return { online: false };
    } catch (error) {
        console.error("Hypixel API error:", error);
        return { online: false };
    }
}

async function checkWynncraftV3(username) {
  try {
    const response = await fetch("https://api.wynncraft.com/v3/player", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${WYNN_API_TOKEN}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      console.error(`API Error: ${response.status}`);
      return { online: false };
    }

    const data = await response.json();
    
    const isOnline = Object.keys(data.players || {}).some(
      player => player.toLowerCase() === username.toLowerCase()
    );

    return {
      online: isOnline,
      totalPlayers: data.total || 0
    };

  } catch (error) {
    console.error("Wynncraft API Request Failed:", error);
    return { online: false };
  }
}

async function trackPlayer(username, serverIp) {
    console.log(`Searching for ${username} on ${serverIp}...`);
    
    const uuid = await getPlayerUuid(username);
    if (!uuid) return { error: "Player not found by Mojang." };

    if (serverIp.includes("hypixel.net")) {
        return await checkHypixel(uuid);
    } 
    
    if (serverIp.includes("wynncraft.com")) {
        return await checkWynncraft(username);
    }

    return { error: "Standard MCStatus fallback needed for this server IP." };
}

function createServerCard(serverData) {
    const { name, address, version, description, playerCount, icon } = serverData;
    const card = document.createElement("div");
    card.className = "server-card";

    const iconImg = document.createElement("img");
    iconImg.src = icon || "../data/images/logo.png";
    iconImg.alt = `${name} icon`;
    iconImg.width = 64;
    iconImg.height = 64;
    iconImg.className = "server-icon";
    card.appendChild(iconImg);

    const info = document.createElement("div");
    info.className = "server-info";

    const title = document.createElement("h3");
    title.textContent = name;
    info.appendChild(title);

    const desc = document.createElement("p");
    desc.textContent = description;
    info.appendChild(desc);

    const players = document.createElement("p");
    players.textContent = `Players: ${playerCount}`;
    info.appendChild(players);

    const ver = document.createElement("p");
    ver.textContent = `Version: ${version}`;
    info.appendChild(ver);
    card.appendChild(info);

    return card
}

async function completeServerData(serverID) {
    const serverAddress = localData.servers[serverID].ip;
    const onlineData = await fetch(`https://api.mcstatus.io/v2/status/java/${serverAddress}`)
        .then(res => res.json())
        .catch(err => {
            console.error(`Error fetching status for ${serverAddress}:`, err);
            return null;
        });

    if (!onlineData) return null;

    return {
    name: localData.servers[serverID].name,
    address: serverAddress,
    version: localData.servers[serverID].version,
    description: localData.servers[serverID].description,
    playerCount: onlineData.players?.online || 0,
    icon: localData.servers[serverID].icon || null
};
}

export async function loadServerList() {
    const serverIndex = [0,1,2];
    for (const index of serverIndex) {
        try {
            const serverData = await completeServerData(index);
            if (!serverData) {
                console.warn(`Server index ${index} is offline. Skipping card creation.`);
                continue;
            }
            serversContainer.appendChild(createServerCard(serverData));
        } catch (error) {
            console.error(`Error processing server ${index}:`, error);
        }
    }
}
loadServerList();