import { MCSTATUS_BASE_URL } from "./services.mjs";
import { ipList, startBackgroundPing } from "./utils.mjs";
import { setupFilters } from "./actions.mjs";

class ListEntry {
    constructor(name, address, players, maxPlayers, version, type, icon, motd, apiLink, playerList = []) {
        this.name = name;
        this.address = address;
        this.players = players;
        this.maxPlayers = maxPlayers;
        this.version = version;
        this.type = type;
        this.icon = icon;
        this.motd = motd;
        this.apiLink = apiLink;
        this.playerList = playerList;
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
    const online = serverData.online !== false;
    const players = typeof serverData.players?.online === "number"
        ? serverData.players.online
        : typeof serverData.playerStats?.onlinePlayers === "number"
            ? serverData.playerStats.onlinePlayers
            : Array.isArray(serverData.players?.list)
                ? serverData.players.list.length
                : 0;
    const maxPlayers = serverData.players?.max ?? serverData.playerStats?.maxPlayers ?? 0;
    const version = serverData.online === false
        ? "Offline"
        : serverData.version || serverData.protocol?.name || "Unknown";
    const type = serverData.online === false
        ? "Offline"
        : serverData.software || serverData.serverType || "Unknown";
    const icon = resolveServerIcon(serverData);

    function cleanMotd(input) {
        if (!input) return "";
        const text = typeof input === 'string' ? input : Array.isArray(input) ? input.join(' ') : String(input);
        let cleaned = text.replace(/§.\s*/g, '');
        cleaned = cleaned.replace(/\$.\s*/g, '');
        cleaned = cleaned.replace(/<[^>]+>/g, '');
        cleaned = cleaned.replace(/\s{2,}/g, ' ');
        return cleaned.trim();
    }

    const motd = cleanMotd(typeof serverData.motd === "string"
        ? serverData.motd
        : serverData.motd?.clean?.join(" ") || serverData.motd?.raw?.join(" ") || "");
    const apiLink = `${MCSTATUS_BASE_URL}/${encodeURIComponent(serverData.hostname || serverData.ip || address)}`;
    const playerList = Array.isArray(serverData.players?.list) ? serverData.players.list.map(p => (typeof p === 'string' ? p : (p.name || p.username || p.id || 'Unknown'))) : [];

    return new ListEntry(name, address, players, maxPlayers, version, type, icon, motd, apiLink, playerList);
}

let rawIPList = [];
let defaultList = [];
let liveList = [];

console.log("lists.mjs loaded");
let populateVersionFilter = null;
let populateSoftwareFilter = null;

async function pingIPS() {
    console.log("Starting pingIPS...");
    const servers = await ipList(MCSTATUS_BASE_URL);
    console.log(`Found ${servers.length} server entries.`);

    const maxIpsToPing = 200; // limit for performance or testing
    const serversToShow = servers.slice(0, maxIpsToPing);
    console.log(`Rendering ${serversToShow.length} servers.`);

    rawIPList = serversToShow.map(server => `${server.hostname}:${server.port}`);

    const seenMotds = new Set();

    // render skeleton entries immediately
    serversToShow.forEach(serverData => {
        try {
            const listEntry = createListEntry(serverData);
            defaultList.push(listEntry);
            renderEntry(listEntry);
        } catch (error) {
            console.error(`Error rendering skeleton for ${serverData.hostname}:`, error);
        }
    });

    // start background pinging for all addresses
    const addresses = servers.map(s => s.hostname);
    startBackgroundPing(addresses, MCSTATUS_BASE_URL, (serverData) => {
        try {
            const addr = serverData.hostname;
            // find existing entry by hostname
            const idx = defaultList.findIndex(entry => entry.address && entry.address.startsWith(`${addr}:`));
            const listEntry = createListEntry(serverData);

            if (idx >= 0) {
                const old = defaultList[idx];
                defaultList[idx] = listEntry;
                // update DOM element
                const container = document.getElementById('server-list');
                if (container) {
                    const oldEl = container.querySelector(`[data-addr="${addr}"]`);
                    if (oldEl) {
                        const newEl = createServerElement(listEntry);
                        container.replaceChild(newEl, oldEl);
                    }
                }
            } else {
                defaultList.push(listEntry);
                renderEntry(listEntry);
            }
            if (typeof populateVersionFilter === 'function') populateVersionFilter();
            if (typeof populateSoftwareFilter === 'function') populateSoftwareFilter();
        } catch (err) {
            console.error('Error updating server from background ping:', err);
        }
    }, () => {
        console.log('Background pings complete');
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
    serverElement.dataset.addr = server.address ? server.address.split(':')[0] : server.name;

    const infoElement = document.createElement("div");
    infoElement.classList.add("server-info");

    // icon
    const iconElement = document.createElement('img');
    iconElement.classList.add('server-icon');
    iconElement.width = 64;
    iconElement.height = 64;
    iconElement.alt = `${server.name} icon`;
    iconElement.src = server.icon || server.favicon?.icon || 'data/images/logo.png';
    iconElement.onerror = () => { iconElement.src = 'data/images/logo.png'; };

    const nameElement = document.createElement("h3");
    nameElement.textContent = server.name;

    const playersElement = document.createElement("p");
    const playerCount = (typeof server.players === 'number') ? server.players : (server.players?.online ?? 0);
    const maxCount = server.maxPlayers ?? server.playerStats?.maxPlayers ?? 0;
    playersElement.textContent = `Players: ${playerCount}/${maxCount}`;

    const versionElement = document.createElement("p");
    versionElement.textContent = `Version: ${server.version}`;

    let typeElement = null;
    if (server.type !== "Unknown") {
        typeElement = document.createElement("p");
        typeElement.textContent = `Type: ${server.type}`;
    }

    const motdElement = document.createElement("p");
    if (server.online === false) {
        motdElement.textContent = 'Server is offline or unreachable.';
    } else if ((server.motd || '').length > 100) {
        motdElement.textContent = `MOTD: ${String(server.motd).substring(0, 100)}...`;
    } else {
        motdElement.textContent = `MOTD: ${server.motd || ''}`;
    }

    infoElement.appendChild(iconElement);
    infoElement.appendChild(nameElement);
    infoElement.appendChild(playersElement);
    infoElement.appendChild(versionElement);
    if (typeElement) {
        infoElement.appendChild(typeElement);
    }
    infoElement.appendChild(motdElement);

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

    function renderPlayersPage() {
        playersList.innerHTML = '';
        const list = Array.isArray(server.playerList) ? server.playerList : [];
        const total = list.length;
        const start = (currentPage - 1) * perPage;
        const pageItems = list.slice(start, start + perPage);
        if (pageItems.length === 0) {
            const noPlayers = document.createElement('li');
            noPlayers.textContent = server.online === false ? 'Server offline, no player list available.' : 'No player list available for this server.';
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

    infoElement.appendChild(playersToggle);
    infoElement.appendChild(playersArea);

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
