import localData from "../data/json/servers.json" with { type: "json" };
import { createServerCard } from "./renderApp.mjs";
import { getHypixel, getWynncraft, getMojang, getMojangProfileFromUuid, get } from "./services.mjs";

const serversContainer = document.getElementById("server-list");
const globalPlayerCache = {};

export async function copyToClipboard(text, button) {
    try {
        await navigator.clipboard.writeText(text);
        console.log('Text successfully copied!');

        const copySpan = document.createElement('span');
        copySpan.id = 'copy-span';
        copySpan.textContent = 'IP Copied!';
        copySpan.style.color = 'green';
        copySpan.classList.add('error-msg');
            
        if (!document.getElementById('copy-span')) {
            button.insertAdjacentElement('afterend', copySpan);
        }
            
        setTimeout(() => {
            copySpan.classList.add('fade-out');
        }, 4000);
                
        setTimeout(() => {
            copySpan.remove();
        }, 5000);
                
    } catch (err) {
        console.error('Failed to copy text: ', err);
    }
}

export async function getPlayerUuid(username) {
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

export async function getPlayerFaceUrl(uuid) {
    if (!uuid) return null;
    return `https://minotar.net/helm/${uuid}/32.png`;
}

export async function mapNamesToFaces(uuidList) {
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

export function getPlayerBust(username) {
        if (!username || username === '[object Object]') return null;
        return `https://minotar.net/armor/bust/${username}/100.png`;
}

export function getPlayerBody(username) {
        if (!username || username === '[object Object]') return null;
        return `https://minotar.net/armor/body/${username}/100.png`;
}

export async function checkHypixel(uuid) {
    try {
        const response = await getHypixel({ uuid });
        return response;
    } catch (error) {
        console.error("Hypixel API error:", error);
        return { online: false };
    }
}

export async function checkWynncraftV3(username) {
  try {
    const response = await getWynncraft({ username });
    return response;
  } catch (error) {
    console.error("Wynncraft API error:", error);
    return { online: false };
  }
}

export async function trackPlayer(username, serverIp) {
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

export function getUUIDList(serverID) {
    if (serverID === 0) {
        let playerList = [];
        console.log("Hypixel is currently disabled");
        /*return getHypixel("housing/active").then(data => {
            const maxSample = 50;
            for (const house of data.slice(0, maxSample)) {
                if (house.owner) {
                    playerList.push(house.owner);
                }
            }
            console.log("Hypixel player list sample:", playerList);
            return playerList;
        });*/
    } else if (serverID === 1) {
        return getWynncraft().then(async (data) => {
            const maxSample = 100;
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

export async function completeServerData(serverID) {
    const localServer = localData.servers[serverID];
    const serverAddress = localServer.ip;
    
    let onlinePlayerCount = "Offline";

    try {
        if (serverID === 0) {
            // Index 0: Hypixel
            /*
            const data = await getHypixel("counts");
            onlinePlayerCount = data.playerCount || 0;
            */
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
    const serverIndex = [1];
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