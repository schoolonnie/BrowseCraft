import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url'; 

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const HYPIXEL_API_KEY = process.env.HYPIXEL_API_KEY; 
const WYNN_API_TOKEN = process.env.WYNN_API_TOKEN;
const MOJANG_API_TOKEN = process.env.MOJANG_API_KEY;

app.get('/api/hypixel', async (req, res) => {
    try {
        const { params } = req.query;
        if (!params) return res.status(400).json({ error: "Missing parameters" });

        const response = await fetch(`https://api.hypixel.net/v2/${params}`, {
            method: "GET",
            headers: { "API-Key": HYPIXEL_API_KEY }
        });
        
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        console.error("Node Hypixel Proxy Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/wynncraft', async (req, res) => {
    try {
        const { username } = req.query;
        
        const targetUrl = username 
            ? `https://api.wynncraft.com/v3/player/${encodeURIComponent(username)}`
            : `https://api.wynncraft.com/v3/player`; 
        
        const fetchOptions = { method: "GET", headers: {} };
        /*if (username) {
            fetchOptions.headers["Authorization"] = `Bearer ${WYNN_API_TOKEN}`;
        }*/

        const response = await fetch(targetUrl, fetchOptions);
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        console.error("Node Wynncraft Proxy Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/mojang', async (req, res) => {
    try {
        const { username, uuid } = req.query;

        // Case A: A UUID was passed -> Do a Reverse Lookup to get the Username/Profile
        if (uuid) {
            const cleanUuid = uuid.replace(/-/g, '');

            const response = await fetch(`https://api.minecraftservices.com/minecraft/profile/lookup/${encodeURIComponent(cleanUuid)}`);
            
            if (response.status === 204 || !response.ok) {
                return res.status(404).json({ error: "Profile not found for this UUID" });
            }

            const data = await response.json();
            return res.json(data); 
        }

        // Case B: A Username was passed -> Do a Forward Lookup to get the UUID
        if (username) {
            if (username === '[object Object]') {
                return res.status(400).json({ error: "Invalid username parameter" });
            }

            const response = await fetch(`https://api.minecraftservices.com/minecraft/profile/lookup/name/${encodeURIComponent(username)}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" }
            });

            if (response.status === 204 || !response.ok) {
                return res.status(404).json({ error: "Player not found" });
            }

            const data = await response.json();
            return data.id ? res.json(data) : res.status(404).json({ error: "Player not found" });
        }

        return res.status(400).json({ error: "Missing both username and uuid parameters" });

    } catch (error) {
        console.error("Node Mojang Proxy Error:", error);
        return res.status(500).json({ error: error.message });
    }
});

app.use(express.static(__dirname));


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Proxy server running on port ${PORT}`);
});