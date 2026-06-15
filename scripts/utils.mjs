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

function createServerCard(serverData) {
    const { name, address, version, description, playerCount, icon } = serverData;
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

    return card
}

async function completeServerData(serverID) {
    // Get the base server info from your local JSON file
    const localServer = localData.servers[serverID];
    const serverAddress = localServer.ip;
    
    let onlinePlayerCount = "Offline";

    try {
        if (serverID === 0) {
            // Index 0: Hypixel
            const data = await getHypixel("gameCounts");
            onlinePlayerCount = data.player_count || 0;
        } else if (serverID === 1) {
            // Index 1: Wynncraft
            const data = await getWynncraft();
            onlinePlayerCount = data.players?.online || 0;
        } else if (serverID === 2) {
            // Index 2: Hive
            const data = await get(HIVE_API_BASE_URL + "global/statistics");
            
            onlinePlayerCount = data.main_online || 0;
        }

        console.log(`Data for index ${serverID} (${serverAddress}):`, onlinePlayerCount);

        
        return {
            name: localServer.name,
            address: serverAddress,
            version: localServer.version || "1.20+",
            description: localServer.description || "Minecraft Server",
            playerCount: onlinePlayerCount,
            icon: localServer.icon || null
        };

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