self.onmessage = async function(e) {
  const { addresses = [], baseUrl } = e.data || {};
  if (!baseUrl || !Array.isArray(addresses)) {
    self.postMessage({ type: 'done' });
    return;
  }

  async function fetchOne(addr) {
    try {
      const encoded = encodeURIComponent(addr);
      const res = await fetch(`${baseUrl}/${encoded}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const server = normalize(addr, data);
      self.postMessage({ type: 'server', server });
    } catch (err) {
      // send minimal server info with online=false
      self.postMessage({ type: 'server', server: { hostname: addr, ip: null, port: 25565, players: { online: 0, max: 0, list: [] }, playerStats: { onlinePlayers: 0, maxPlayers: 0 }, version: 'Unknown', software: 'Unknown', favicon: { icon: null }, motd: '', online: false } });
    }
  }

  function normalize(addr, data) {
    return {
      hostname: addr || data.host || data.hostname,
      ip: data.ip_address || data.ip || null,
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

  // simple concurrency control
  const concurrency = 6;
  let idx = 0;
  const runners = new Array(concurrency).fill(null).map(async () => {
    while (idx < addresses.length) {
      const i = idx++;
      const addr = addresses[i];
      await fetchOne(addr);
    }
  });

  await Promise.all(runners);
  self.postMessage({ type: 'done' });
};
