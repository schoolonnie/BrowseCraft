import localData from "../data/json/servers.json" with { type: "json" };

import { getHypixel, getWynncraft, getMojang, getMojangProfileFromUuid, get } from "./services.mjs";

const serversContainer = document.getElementById("server-list");
const globalPlayerCache = {};

async function getPlayerUuid(username) {
    try {
        if (!username || username === '[object Object]') return;

        const data = await getMojang({ username });
        
        console.log(`Mojang lookup for ${username}:`, data);

        return data.id; 
        
    } catch (error) {
        console.error(`Error looking up UUID for ${username}:`, error);
        return undefined;
    }
}

async function getPlayerFaceUrl(uuid) {
    if (!uuid) return null;
    return `https://minotar.net/helm/${uuid}/32.png`;
}

async function mapNamesToFaces(uuidList) {
    const faceMap = {};

    const promises = uuidList.map(async (uuid) => {
        if (globalPlayerCache[uuid]) {
            faceMap[uuid] = globalPlayerCache[uuid];
            return uuid;
        }

        try {
            const data = await getMojangProfileFromUuid(uuid);
            
            if (!data || (!data.name && !data.username)) {
            throw new Error("Mojang lookup failed");
        }
            
            const profile = {
                name: data.name || data.username || "Unknown Player",
                avatarUrl: `https://minotar.net/helm/${uuid}/32.png`
            };

            globalPlayerCache[uuid] = profile;
            faceMap[uuid] = profile;
            
        } catch (error) {
            faceMap[uuid] = {
                name: "Unknown Player",
                avatarUrl: `https://minotar.net/helm/${uuid}/32.png`
            };
        }
    });

    await Promise.all(promises);
    return faceMap;
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

function getUUIDList(serverID) {
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
        return getWynncraft().then(async (data) => {
            const maxSample = 50;
            let playersArray = [];

            if (data && data.players) {
                const playerNames = Object.keys(data.players).slice(0, maxSample);
                const uuidPromises = playerNames.map(name => getPlayerUuid(name));
                const uuids = await Promise.all(uuidPromises);
                playersArray = uuids.filter(uuid => uuid); 
            }
            console.log("Wynncraft player list sample:", playersArray);
            return playersArray;
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
    
    getUUIDList(ID)
    .catch(error => {
        console.error("Error fetching player list data:", error);
        return []; 
    })
    .then(data => {
        console.log(`Fetched player list for server ID ${ID}:`, data);

        playerList = data;
        
        renderPlayersPage(data).catch(renderError => {
            console.error("Error inside renderPlayersPage execution:", renderError);
        });
    });

    async function renderPlayersPage(listInput) {
        playersList.innerHTML = '';
        pagination.innerHTML = '';

        try {
            const list = listInput instanceof Promise ? await listInput : (listInput || playerList || []);
            console.log("DEBUG - Inside renderPlayersPage:", {
                rawInput: listInput,
                resolvedList: list,
                isArray: Array.isArray(list),
                detectedLength: list?.length
            });

            const total = list.length;

            if (total === 0) {
                const noPlayers = document.createElement('li');
                noPlayers.textContent = 'No player list available for this server.';
                playersList.appendChild(noPlayers);
                renderPaginationControls(0, 0, 0); 
                return;
            }
            const start = (currentPage - 1) * perPage;
            const slicedUuids = list.slice(start, start + perPage);

            const faceMap = await mapNamesToFaces(slicedUuids);

            const pageItems = slicedUuids.map(uuid => faceMap[uuid] || uuid);

            pageItems.forEach(item => {
                const playerItem = document.createElement('li');

                playerItem.style.display = 'flex';
                playerItem.style.alignItems = 'center';
                playerItem.style.gap = '10px';
                playerItem.style.marginBottom = '8px';

                let username = "Unknown Player";
                let avatarUrl = "";

                if (item && typeof item === 'object') {
                    username = item.name;
                    avatarUrl = item.avatarUrl;
                } else if (typeof item === 'string') {
                    avatarUrl = `https://minotar.net/${item}/32.png`;
                }

                if (avatarUrl) {
                    const img = document.createElement('img');
                    img.src = avatarUrl;
                    img.alt = `${username}'s Face`;
                    img.width = 32;
                    img.height = 32;
                    img.style.borderRadius = '4px';
                    img.onerror = () => {
                        img.style.display = 'none';
                    };
                    playerItem.appendChild(img);
                }

                const nameSpan = document.createElement('span');
                nameSpan.textContent = username;
                nameSpan.style.color = '#ffffff';
                nameSpan.style.fontFamily = 'sans-serif';
                playerItem.appendChild(nameSpan);

                playersList.appendChild(playerItem);
            });

            renderPaginationControls(start, total, perPage, list);

        } catch (error) {
            console.error("Error rendering player page layout:", error);
            const errorItem = document.createElement('li');
            errorItem.textContent = 'Failed to load player avatars.';
            playersList.appendChild(errorItem);
        }
    }

function renderPaginationControls(start, total, perPage, list) {
    pagination.innerHTML = '';

    const prev = document.createElement('button');
    prev.textContent = 'Prev';
    prev.disabled = currentPage === 1 || total === 0;
    prev.addEventListener('click', () => { 
        if (currentPage > 1) { 
            currentPage--; 
            renderPlayersPage(list); 
        }
    });

    const next = document.createElement('button');
    next.textContent = 'Next';
    next.disabled = start + perPage >= total;
    next.addEventListener('click', () => { 
        if (start + perPage < total) { 
            currentPage++; 
            renderPlayersPage(list); 
        }
    });

    const info = document.createElement('span');
    if (total === 0) {
        info.textContent = ' 0-0 of 0';
    } else {
        const displayStart = start + 1;
        const displayEnd = Math.min(total, start + perPage);
        info.textContent = ` ${displayStart}-${displayEnd} of ${total}`;
    }

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
    const serverIndex = [0,1];
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