import { MCSCAN_BASE_URL, get } from "./services.mjs";

function ipList(serversURL) {
    let list = "";
    let page = 1;

    return get(serversURL + `?edition=java&page=${page}`).then((data) => {
        while (page < 31) {
            data.servers.forEach((server) => {
            list += `${server.hostname}:${server.port}\n`;
        });
        page++;
        }
        return list;
    });
}

// Testing
//const ipListTest = await ipList(MCSCAN_BASE_URL);
//console.log(ipListTest);
// End of testing