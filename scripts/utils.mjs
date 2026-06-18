import localData from "../data/json/servers.json" with { type: "json" };
import { createServerCard } from "./renderApp.mjs";
import { getHypixel, getWynncraft, getMojang, getMojangProfileFromUuid, get } from "./services.mjs";

const serversContainer = document.getElementById("server-list");
export const globalPlayerCache = {};

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

//This function takes a list of uuids or usernames as input and returns a name, UUID, and avatarUrl (note: it should just be identifier and avatarUrl but did not have time to change it in all parts of the code, it functions just the same)
export async function mapNamesToFaces(inputList) {
    const faceMap = {};

    const promises = inputList.map(async (item) => {
        if (!item) return;

        const identifier = typeof item === 'object' ? (item.UUID || item.uuid || item.id || item.name) : item;

        if (globalPlayerCache[identifier]) {
            faceMap[identifier] = globalPlayerCache[identifier];
            return;
        }
        //This is for testing whether or not a UUID was passed, everything passed through will be usernames, this was more for legacy version
        const isUuid = /[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}/i.test(identifier) || identifier.length > 16;

        if (!isUuid) {
            //since they are all usernames, they are passed to this if statement where the avatar is set from the minotar API which fetches skin data
            const profile = {
                name: identifier,
                avatarUrl: `https://minotar.net/helm/${identifier}/32.png`,
                UUID: identifier 
            }
            globalPlayerCache[identifier] = profile;
            faceMap[identifier] = profile;
        } else {
            try {
                const data = await getMojangProfileFromUuid(identifier);
                
                if (!data || (!data.name && !data.username)) {
                    throw new Error("Mojang lookup failed");
                }
                
                const profile = {
                    name: data.name || data.username || "Unknown Player",
                    avatarUrl: `https://minotar.net/helm/${identifier}/32.png`,
                    UUID: identifier
                };

                globalPlayerCache[identifier] = profile;
                faceMap[identifier] = profile;
                
            } catch (error) {
                faceMap[identifier] = {
                    name: "Unknown Player",
                    avatarUrl: `https://minotar.net/helm/${identifier}/32.png`,
                    UUID: identifier
                };
            }
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
//legacy
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
//legacy
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

//This function calls the Wynncraft API (see in services.mjs) for a sample of players with a defined maximum size
export function getNameList() {
    return getWynncraft().then(async (data) => {
            const maxSample = 500;
            let playersArray = [];

            //Then the data is sliced to the maxSample size and returned as an array for later use
            if (data && data.players) {
                const playerNames = Object.keys(data.players).slice(0, maxSample);
                playersArray = playerNames;
            }
            console.log("Wynncraft player list sample:", playersArray);
            return playersArray
    });
}

//legacy
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
            const maxSample = 500;
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