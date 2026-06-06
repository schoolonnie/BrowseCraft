import { get } from "./services.mjs";

export async function ipList(serversURL) {
    let list = "";
    let page = 1;

    while (page <= 10) {
        console.log(`Fetching server list page ${page}...`);
        try {
            const data = await get(serversURL + `?edition=java&page=${page}`);
            if (data.servers) {
                data.servers.forEach((server) => {
                    list += `${server.hostname}:${server.port}\n`;
                });
            }
            page++;
        } catch (error) {
            console.error(`Error fetching page ${page}:`, error);
            break;
        }
    }
    return list;
}

// Testing
//const ipListTest = await ipList(MCSCAN_BASE_URL);
//console.log(ipListTest);
// End of testing