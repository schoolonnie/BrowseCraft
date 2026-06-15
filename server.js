import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const HYPIXEL_API_KEY = process.env.HYPIXEL_API_KEY; 
const WYNN_API_TOKEN = process.env.WYNN_API_TOKEN;

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

app.use(express.static(__dirname));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Proxy server running on port ${PORT}`);
});