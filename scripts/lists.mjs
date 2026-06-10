import { MCSCAN_BASE_URL, MCSRVSTATUS_BASE_URL, get } from "./services.mjs";
import { ipList } from "./utils.mjs";

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

function createListEntry(serverData) {
    const address = serverData.hostname
        ? `${serverData.hostname}:${serverData.port}`
        : serverData.ip
            ? `${serverData.ip}:${serverData.port}`
            : "Unknown";

    const name = serverData.hostname || address || "Unknown";
    const players = typeof serverData.players?.online === "number"
        ? serverData.players.online
        : Array.isArray(serverData.players?.list)
            ? serverData.players.list.length
            : 0;
    const maxPlayers = serverData.players?.max ?? 0;
    const version = serverData.version || serverData.protocol?.name || "Unknown";
    const type = serverData.software || "Unknown";
    const icon = serverData.icon || null;
    const motd = serverData.motd?.clean?.join(" ") || serverData.motd?.raw?.join(" ") || "";
    const apiLink = MCSRVSTATUS_BASE_URL + address;

    return new ListEntry(name, address, players, maxPlayers, version, type, icon, motd, apiLink);
}

let rawIPList = [];
let defaultList = [];
let liveList = [];

console.log("lists.mjs loaded");

async function pingIPS() {
    console.log("Starting pingIPS...");
    const res = await ipList(MCSCAN_BASE_URL);
    const ips = res.split('\n').filter(ip => ip.trim());
    console.log(`Found ${ips.length} server IPs.`);

    const maxIpsToPing = 10; // keep this small while debugging
    const ipsToPing = ips.slice(0, maxIpsToPing);
    console.log(`Pinging ${ipsToPing.length} servers for now.`, ipsToPing);

    for (const ip of ipsToPing) {
        try {
            const serverData = await get(MCSRVSTATUS_BASE_URL + ip);
            console.log(`Fetched status for ${ip}`);
            const listEntry = createListEntry(serverData);

            const hasVersion = listEntry.version && listEntry.version !== "Unknown";

            if (hasVersion) {
                defaultList.push(listEntry);
            } else {
                console.log(`Skipping ${ip}: missing version`, {
                    version: listEntry.version
                });
            }

        } catch (error) {
            console.error(`Error fetching data for ${ip}:`, error);
        }
    }
}

function renderList(list) {
    const container = document.getElementById("server-list");
    container.innerHTML = "";

    list.forEach(server => {
        const serverElement = document.createElement("div");
        serverElement.classList.add("server-entry");

        const iconElement = document.createElement("img");
        iconElement.src = server.icon || "default-icon.png";
        iconElement.alt = `${server.name} icon`;
        iconElement.classList.add("server-icon");

        const infoElement = document.createElement("div");
        infoElement.classList.add("server-info");

        const nameElement = document.createElement("h3");
        nameElement.textContent = server.name;

        const playersElement = document.createElement("p");
        playersElement.textContent = `Players: ${server.players}/${server.maxPlayers}`;

        const versionElement = document.createElement("p");
        versionElement.textContent = `Version: ${server.version}`;

        const typeElement = document.createElement("p");
        typeElement.textContent = `Type: ${server.type}`;

        const motdElement = document.createElement("p");
        motdElement.textContent = `MOTD: ${server.motd}`;

        infoElement.appendChild(nameElement);
        infoElement.appendChild(playersElement);
        infoElement.appendChild(versionElement);
        infoElement.appendChild(typeElement);
        infoElement.appendChild(motdElement);

        serverElement.appendChild(iconElement);
        serverElement.appendChild(infoElement);

        container.appendChild(serverElement);
    });
}

// Fetch server data, then render the list once entries are available.
pingIPS().then(() => {
    console.log("pingIPS finished");
    liveList = defaultList;
    renderList(defaultList);
    console.log(rawIPList);
    console.log(liveList);
}).catch(error => {
    console.error('Error in pingIPS:', error);
});