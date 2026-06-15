import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const HYPIXEL_API_KEY = "15a0ab09-5d4f-451e-8a9b-fb055d5351fc"; 
const WYNN_API_TOKEN = "Xd_ot6NQZnC-MlaoFT26cyfYMZkv7mQx0Tc0ojr9-5A";

app.get('/api/hypixel', async (req, res) => {
    try {
        const { params } = req.query;
        if (!params) return res.status(400).json({ error: "Missing parameters" });

        const response = await fetch(`https://hypixel.net{params}`, {
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
            ? `https://wynncraft.com{username}`
            : `https://api.wynncraft.com/v3/player`;
        
        const fetchOptions = { method: "GET", headers: {} };
        if (username) {
            fetchOptions.headers["Authorization"] = `Bearer ${WYNN_API_TOKEN}`;
        }

        const response = await fetch(targetUrl, fetchOptions);
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        console.error("Node Wynncraft Proxy Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Proxy server running at http://localhost:${PORT}`);
});