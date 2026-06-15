import localData from "../data/json/servers.json" with { type: "json" };

import { getHypixel, getWynncraft, get, MOJANG_API_BASE_URL, HIVE_API_BASE_URL } from "./services.mjs";

const serversContainer = document.getElementById("server-list");

async function getPlayerUuid(username) {
    try {
        const response = await fetch(`${MOJANG_API_BASE_URL}users/profiles/minecraft/${username}`);
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
        const response = await getHypixel({ uuid });
        return response;
    } catch (error) {
        console.error("Hypixel API error:", error);
        return { online: false };
    }
}

async function checkWynncraftV3(username) {
  try {
    const response = await getWynncraft({ username });
    return response;
  } catch (error) {
    console.error("Wynncraft API error:", error);
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
        return await checkWynncraftV3(username);
    }

    return { error: "Standard MCStatus fallback needed for this server IP." };
}

function getPlayerList(serverID) {
    if (serverID === 0) {
        let playerList = [];
        return getHypixel("housing/active").then(data => {
            const maxSample = 50;
            for (const house of data.slice(0, maxSample)) {
                if (house.owner) {
                    playerList.push(house.owner);
                }
            }
            console.log("Hypixel player list sample:", playerList);
            return playerList;
        });
    } else if (serverID === 1) {
        let playerList = [];
        return getWynncraft().then(data => {
            const maxSample = 50;
            const playersArray = Object.keys(data.players || {}).slice(0, maxSample);
        
            for (const playerName of playersArray) {
                playerList.push(playerName);
            }
            console.log("Wynncraft player list sample:", playerList);
            return playerList;
        });
    } else if (serverID === 2) {
        let playerList = [];
        return get(HIVE_API_BASE_URL + "game/monthly/ctf").then(data => {
            const maxSample = 50;
            for (const player of data.slice(0, maxSample)) {
                if (player.UUID) {
                    playerList.push(player.UUID);
                }
            }
            console.log("Hive player list sample:", playerList);
            return playerList;
        });
    }
}

function createServerCard(serverData) {
    const { ID, name, address, version, description, playerCount, icon } = serverData;
    const card = document.createElement("div");
    card.className = "server-card";

    const iconImg = document.createElement("img");
    iconImg.src = icon || "https://schoolonnie.github.io/BrowseCraft/data/images/logo.png";
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

    // players list area (hidden by default)
    const playersArea = document.createElement('div');
    playersArea.classList.add('players-area');
    playersArea.style.display = 'none';

    const playersList = document.createElement('ul');
    playersList.classList.add('players-list');

    const pagination = document.createElement('div');
    pagination.classList.add('players-pagination');

    let currentPage = 1;
    const perPage = 10;

    let playerList = [];
    
    getPlayerList(ID)
    .then(data => {
        playerList = data;
        renderPlayersPage(); 
    })
    .catch(error => {
        console.error("Error fetching player list:", error);
        renderPlayersPage();
    });

    function renderPlayersPage() {
        playersList.innerHTML = '';
        const list = playerList instanceof Promise ? [] : playerList; // Show empty list until promise resolves
        const total = list.length;
        const start = (currentPage - 1) * perPage;
        const pageItems = list.slice(start, start + perPage);
        if (pageItems.length === 0) {
            const noPlayers = document.createElement('li');
            noPlayers.textContent = 'No player list available for this server.';
            playersList.appendChild(noPlayers);
        } else {
            pageItems.forEach(p => {
                const li = document.createElement('li');
                li.textContent = typeof p === 'string' ? p : (p.name || p.username || String(p));
                playersList.appendChild(li);
            });
        }
        // pagination controls
        pagination.innerHTML = '';
        const prev = document.createElement('button');
        prev.textContent = 'Prev';
        prev.disabled = currentPage === 1 || total === 0;
        prev.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderPlayersPage(); }});
        const next = document.createElement('button');
        next.textContent = 'Next';
        next.disabled = start + perPage >= total;
        next.addEventListener('click', () => { if (start + perPage < total) { currentPage++; renderPlayersPage(); }});
        const info = document.createElement('span');
        info.textContent = total === 0 ? ' 0-0 of 0' : ` ${Math.min(total, start+1)}-${Math.min(total, start+perPage)} of ${total}`;
        pagination.appendChild(prev);
        pagination.appendChild(info);
        pagination.appendChild(next);
    }

    playersArea.appendChild(playersList);
    playersArea.appendChild(pagination);

    const playersToggle = document.createElement('button');
    playersToggle.textContent = 'View Players';
    playersToggle.classList.add('players-toggle');
    playersToggle.addEventListener('click', () => {
        if (playersArea.style.display === 'none') {
            playersArea.style.display = 'block';
            currentPage = 1;
            renderPlayersPage();
        } else {
            playersArea.style.display = 'none';
        }
    });

    info.appendChild(playersToggle);
    info.appendChild(playersArea);
    return card
}

async function completeServerData(serverID) {
    const localServer = localData.servers[serverID];
    const serverAddress = localServer.ip;
    
    let onlinePlayerCount = "Offline";

    try {
        if (serverID === 0) {
            // Index 0: Hypixel
            const data = await getHypixel("counts");
            onlinePlayerCount = data.playerCount || 0;
        } else if (serverID === 1) {
            // Index 1: Wynncraft
            const data = await getWynncraft();
            onlinePlayerCount = data.total || 0;
        } else if (serverID === 2) {
            // Index 2: Hive
            const data = await get(HIVE_API_BASE_URL + "global/statistics");
            
            onlinePlayerCount = data.unique_players.global || 0;
        }

        let completedData = {
            ID: serverID,
            name: localServer.name,
            address: serverAddress,
            version: localServer.version || "1.20+",
            description: localServer.description || "Minecraft Server",
            playerCount: onlinePlayerCount,
            icon: localServer.icon || null
        };
        console.log(`Completed data for index ${serverID}:`, completedData);
        return completedData;

    } catch (error) {
        console.error(`Failed to fetch online stats for ${serverAddress}:`, error);
        
        return null;
    }
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