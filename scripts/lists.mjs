import { MCSCAN_BASE_URL } from "./services.mjs";
import { ipList } from "./utils.mjs";
import { setupFilters } from "./actions.mjs";

class ListEntry {
    constructor(name, address, players, maxPlayers, version, type, icon, motd, apiLink) {
        this.name = name;
        this.address = address;
        this.players = players;
        this.maxPlayers = maxPlayers;
        this.version = version;
        this.type = type;
        this.icon = icon;
        this.motd = motd;
        this.apiLink = apiLink;
    }
}

function resolveServerIcon(serverData) {
    const rawIcon = serverData.favicon?.icon || serverData.icon;
    if (typeof rawIcon !== "string" || !rawIcon.trim()) return null;
    if (rawIcon.startsWith("data:")) return rawIcon;
    const base64 = rawIcon.trim();
    if (/^[A-Za-z0-9+/=]+$/.test(base64)) {
        return `data:image/png;base64,${base64}`;
    }
    return null;
}

function createListEntry(serverData) {
    const address = serverData.hostname
        ? `${serverData.hostname}:${serverData.port}`
        : serverData.ip
            ? `${serverData.ip}:${serverData.port}`
            : "Unknown";

    const name = serverData.hostname || address || "Unknown";
    const players = typeof serverData.players?.online === "number"
        ? serverData.players.online
        : typeof serverData.playerStats?.onlinePlayers === "number"
            ? serverData.playerStats.onlinePlayers
            : Array.isArray(serverData.players?.list)
                ? serverData.players.list.length
                : 0;
    const maxPlayers = serverData.players?.max ?? serverData.playerStats?.maxPlayers ?? 0;
    const version = serverData.version || serverData.protocol?.name || "Unknown";
    const type = serverData.software || serverData.serverType || "Unknown";
    const icon = resolveServerIcon(serverData);
    const motd = typeof serverData.motd === "string"
        ? serverData.motd
        : serverData.motd?.clean?.join(" ") || serverData.motd?.raw?.join(" ") || "";
    const apiLink = MCSCAN_BASE_URL;

    return new ListEntry(name, address, players, maxPlayers, version, type, icon, motd, apiLink);
}

let rawIPList = [];
let defaultList = [];
let liveList = [];

console.log("lists.mjs loaded");
let populateVersionFilter = null;
let populateSoftwareFilter = null;

async function pingIPS() {
    console.log("Starting pingIPS...");
    const servers = await ipList(MCSCAN_BASE_URL);
    console.log(`Found ${servers.length} server entries.`);

    const maxIpsToPing = 200; // limit for performance or testing
    const serversToShow = servers.slice(0, maxIpsToPing);
    console.log(`Rendering ${serversToShow.length} servers.`);

    rawIPList = serversToShow.map(server => `${server.hostname}:${server.port}`);

    const seenMotds = new Set();

    serversToShow.forEach(serverData => {
        try {
            const listEntry = createListEntry(serverData);

            const hasVersion = listEntry.version && listEntry.version !== "Unknown";

            const motdIsBlankOrDefault = !listEntry.motd || listEntry.motd.trim() === "" || listEntry.motd.toLowerCase() === "a minecraft server";

            const motdAlreadySeen = seenMotds.has(listEntry.motd);

            if (hasVersion) {
                if (!motdIsBlankOrDefault && motdAlreadySeen) {
                    console.log(`Skipping ${listEntry.address}: duplicate MOTD`, {
                        motd: listEntry.motd,
                        address: listEntry.address
                    });
                } else {
                    defaultList.push(listEntry);
                    renderEntry(listEntry);
                    if (!motdIsBlankOrDefault) {
                        seenMotds.add(listEntry.motd);
                    }
                    if (typeof populateVersionFilter === 'function') {
                        populateVersionFilter();
                    }
                    if (typeof populateSoftwareFilter === 'function') {
                        populateSoftwareFilter();
                    }
                }
            } else {
                console.log(`Skipping ${listEntry.address}: missing version`, {
                    version: listEntry.version
                });
            }
        } catch (error) {
            console.error(`Error processing server ${serverData.hostname}:${serverData.port}:`, error);
        }
    });
}

function renderList(list) {
    const container = document.getElementById("server-list");
    container.innerHTML = "";
    list.forEach(server => {
        const entry = createServerElement(server);
        container.appendChild(entry);
    });
}

function renderEntry(server) {
    const container = document.getElementById("server-list");
    if (!container) return;
    const entry = createServerElement(server);
    container.appendChild(entry);
}

function createServerElement(server) {
    const serverElement = document.createElement("div");
    serverElement.classList.add("server-entry");

    //const iconElement = document.createElement("img");
    //iconElement.src = server.icon || "../data/images/logo.png";
    //iconElement.alt = `${server.name} icon`;
    //iconElement.classList.add("server-icon");
    //iconElement.width = 64;
    //iconElement.height = 64;
    //iconElement.onerror = () => {
    //    iconElement.src = "../data/images/logo.png";
    //};

    const infoElement = document.createElement("div");
    infoElement.classList.add("server-info");

    const nameElement = document.createElement("h3");
    nameElement.textContent = server.name;

    const playersElement = document.createElement("p");
    playersElement.textContent = `Players: ${server.players}/${server.maxPlayers}`;

    const versionElement = document.createElement("p");
    versionElement.textContent = `Version: ${server.version}`;

    let typeElement = null;
    if (server.type !== "Unknown") {
        typeElement = document.createElement("p");
        typeElement.textContent = `Type: ${server.type}`;
    }

    const motdElement = document.createElement("p");
    if (server.motd.length > 100) {
        motdElement.textContent = `MOTD: ${server.motd.substring(0, 100)}...`;
    } else {
        motdElement.textContent = `MOTD: ${server.motd}`;
    }

    infoElement.appendChild(nameElement);
    infoElement.appendChild(playersElement);
    infoElement.appendChild(versionElement);
    if (typeElement) {
        infoElement.appendChild(typeElement);
    }
    infoElement.appendChild(motdElement);

    //serverElement.appendChild(iconElement);
    serverElement.appendChild(infoElement);

    return serverElement;
}

const filters = setupFilters({ defaultList, renderList });
if (filters) {
    if (typeof filters.populateVersionFilter === 'function') populateVersionFilter = filters.populateVersionFilter;
    if (typeof filters.populateSoftwareFilter === 'function') populateSoftwareFilter = filters.populateSoftwareFilter;
}

// Start pinging
pingIPS().then(() => {
    console.log("pingIPS finished");
    liveList = defaultList;
    // ensure final render and filter population
    renderList(defaultList);
    if (typeof populateVersionFilter === 'function') populateVersionFilter();
    if (typeof populateSoftwareFilter === 'function') populateSoftwareFilter();
    console.log(rawIPList);
    console.log(liveList);
}).catch(error => {
    console.error('Error in pingIPS:', error);
});