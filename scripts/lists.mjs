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
    const players = serverData.players?.list ?? 0;
    const maxPlayers = serverData.players?.max ?? 0;
    const version = serverData.version || serverData.protocol?.name || "Unknown";
    const type = serverData.software || "Unknown";
    const icon = serverData.icon || null;
    const motd = serverData.motd?.clean?.join(" ") || serverData.motd?.raw?.join(" ") || "";
    const apiLink = MCSRVSTATUS_BASE_URL + address;

    return new ListEntry(name, address, players, maxPlayers, version, type, icon, motd, apiLink);
}

let rawIPList = [];
let liveList = [];

console.log("lists.mjs loaded");

async function pingIPS() {
    console.log("Starting pingIPS...");
    rawIPList = await ipList(MCSCAN_BASE_URL);
    const ips = rawIPList.split('\n').filter(ip => ip.trim());
    console.log(`Found ${ips.length} server IPs.`);

    const maxIpsToPing = 5; // keep this small while debugging
    const ipsToPing = ips.slice(0, maxIpsToPing);
    console.log(`Pinging ${ipsToPing.length} servers for now.`, ipsToPing);

    for (const ip of ipsToPing) {
        try {
            const serverData = await get(MCSRVSTATUS_BASE_URL + ip);
            console.log(`Fetched status for ${ip}`);
            const listEntry = createListEntry(serverData);

            const hasType = listEntry.type && listEntry.type !== "Unknown";
            const hasVersion = listEntry.version && listEntry.version !== "Unknown";

            if (hasVersion) {
                liveList.push(listEntry);
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

// Testing
pingIPS().then(() => {
    console.log("pingIPS finished");
    console.log(rawIPList);
    console.log(liveList);
}).catch(error => {
    console.error('Error in pingIPS:', error);
});
// End of testing