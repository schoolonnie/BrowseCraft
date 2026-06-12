import { get } from "./services.mjs";

export async function ipList(serversURL) {
    const servers = [];
    let page = 1;

    while (page <= 10) {
        console.log(`Fetching server list page ${page}...`);
        try {
            const data = await get(`${serversURL}?sort=player&live=true&edition=Java&geo=true&page=${page}`);
            if (data.servers) {
                data.servers.forEach((server) => {
                    const onlinePlayers = server.playerStats?.onlinePlayers ?? 0;
                    const chinese = server.tags?.includes("China") || server.software?.toLowerCase().includes("china");
                    const country = server.geolocation?.country;
                    const isChina = country === "CN" || server.tags?.includes("China");
                    if (onlinePlayers > 0 && !chinese && !isChina) {
                        servers.push(server);
                    }
                });
            }
            page++;
        } catch (error) {
            console.error(`Error fetching page ${page}:`, error);
            break;
        }
    }
    return servers;
}

// Testing
//const ipListTest = await ipList(MCSCAN_BASE_URL);
//console.log(ipListTest);
// End of testing