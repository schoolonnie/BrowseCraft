import { get } from "./services.mjs";

export async function ipList(serversURL) {
    // Return a quick skeleton list from addresses.json without pinging each server.
    try {
        const resp = await fetch('/data/json/addresses.json');
        const json = await resp.json();
        const addresses = Array.isArray(json.addresses) ? json.addresses : [];
        return addresses.map(addr => ({
            hostname: addr,
            ip: null,
            port: 25565,
            players: { online: 0, max: 0, list: [] },
            playerStats: { onlinePlayers: 0, maxPlayers: 0 },
            version: 'Unknown',
            software: 'Unknown',
            favicon: { icon: null },
            motd: ''
        }));
    } catch (err) {
        console.error('Error reading addresses.json:', err);
        return [];
    }
}

export function startBackgroundPing(addresses, baseUrl, onServer, onDone) {
    if (!window.Worker) {
        console.warn('Web Workers not supported; falling back to main thread pinging');
        // Fallback: sequentially fetch
        (async () => {
            for (const addr of addresses) {
                try {
                    const encoded = encodeURIComponent(addr);
                    const data = await get(`${baseUrl}/${encoded}`);
                    const server = normalizeMcstatus(addr, data);
                    onServer && onServer(server);
                } catch (err) {
                    console.debug(`Background ping error ${addr}:`, err);
                }
            }
            onDone && onDone();
        })();
        return null;
    }

    const worker = new Worker('/scripts/pingWorker.js', { type: 'module' });
    worker.postMessage({ addresses, baseUrl });
    worker.onmessage = (e) => {
        const msg = e.data;
        if (msg && msg.type === 'server') {
            onServer && onServer(msg.server);
        } else if (msg && msg.type === 'done') {
            onDone && onDone();
        }
    };
    return worker;
}

function normalizeMcstatus(addr, data) {
    return {
        hostname: addr || data.host || data.hostname,
        ip: data.ip_address || data.ip || undefined,
        port: data.port ?? 25565,
        players: {
            online: data.players?.online ?? (Array.isArray(data.players?.list) ? data.players.list.length : 0),
            max: data.players?.max ?? 0,
            list: data.players?.list ?? []
        },
        playerStats: {
            onlinePlayers: data.players?.online ?? 0,
            maxPlayers: data.players?.max ?? 0
        },
        version: data.version?.name_clean || data.version?.name_raw || data.version?.protocol || 'Unknown',
        software: data.software?.name || data.software || data.server?.software || 'Unknown',
        favicon: { icon: data.icon ?? data.favicon ?? null },
        motd: (typeof data.motd === 'string') ? data.motd : (data.motd?.clean ?? data.motd?.raw ?? ''),
        tags: data.tags || [],
        geolocation: data.geo || {},
        online: !!data.online
    };
}

// Testing
//const ipListTest = await ipList(MCSCAN_BASE_URL);
//console.log(ipListTest);
// End of testing