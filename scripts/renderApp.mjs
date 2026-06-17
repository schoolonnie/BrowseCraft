import { getUUIDList, mapNamesToFaces, copyToClipboard } from "./utils.mjs";
import { renderPlayerCard } from "./renderPlayerCard.mjs";

export function createServerCard(serverData) {
    const { ID, name, address, version, description, playerCount, icon } = serverData;
    const card = document.createElement("div");
    card.className = "server-card";

    const iconImg = document.createElement("img");
    iconImg.src = icon || "https://schoolonnie.github.io/BrowseCraft/data/images/logo.png";
    iconImg.alt = `${name} icon`;
    iconImg.width = 64;
    iconImg.height = 64;
    iconImg.className = "server-icon";
    card.appendChild(iconImg);

    const info = document.createElement('div');
    info.className = "server-info";

    const title = document.createElement('h2');
    title.textContent = name;
    info.appendChild(title);

    const copyDiv = document.createElement('div');
    copyDiv.classList.add('copy-div');

    const ipButton = document.createElement('button');
    ipButton.classList.add('copy-btn');
    ipButton.addEventListener('click', () => {
        copyToClipboard('play.wynncraft.com', ipButton);
    });
    ipButton.innerHTML = `
        <img 
             alt="copy IP"
             width="16"
             height="16"
             src="../data/images/connect.png">
    `;

    const copyMsg = document.createElement('p');
    copyMsg.textContent = '<= Click to Copy IP';
    copyMsg.classList.add('copy-msg');

    copyDiv.appendChild(ipButton);
    copyDiv.appendChild(copyMsg);
    info.appendChild(copyDiv);

    const desc = document.createElement("p");
    desc.textContent = description;
    info.appendChild(desc);

    const players = document.createElement("p");
    players.textContent = `Players: ${playerCount}`;
    info.appendChild(players);

    const ver = document.createElement("p");
    ver.textContent = `Version: ${version}`;
    info.appendChild(ver);
    card.appendChild(info);

    // players list area (hidden by default)
    const playersArea = document.createElement('div');
    playersArea.classList.add('players-area');
    playersArea.style.display = 'none';

    const playersList = document.createElement('ul');
    playersList.classList.add('players-list');
    playersList.id = "players-list";

    const pagination = document.createElement('div');
    pagination.classList.add('players-pagination');

    let currentPage = 1;
    const perPage = 10;

    let playerList = [];
    
    getUUIDList(ID)
    .catch(error => {
        console.error("Error fetching player list data:", error);
        return []; 
    })
    .then(data => {
        console.log(`Fetched player list for server ID ${ID}:`, data);

        playerList = data;
        
        renderPlayersPage(data).catch(renderError => {
            console.error("Error inside renderPlayersPage execution:", renderError);
        });
    });

    async function renderPlayersPage(listInput) {
        playersList.innerHTML = '';
        pagination.innerHTML = '';

        try {
            const list = listInput instanceof Promise ? await listInput : (listInput || playerList || []);
            /*console.log("DEBUG - Inside renderPlayersPage:", {
                rawInput: listInput,
                resolvedList: list,
                isArray: Array.isArray(list),
                detectedLength: list?.length
            });*/

            const total = list.length;

            if (total === 0) {
                const noPlayers = document.createElement('li');
                noPlayers.textContent = 'No player list available for this server.';
                playersList.appendChild(noPlayers);
                renderPaginationControls(0, 0, 0); 
                return;
            }
            const start = (currentPage - 1) * perPage;
            const slicedUuids = list.slice(start, start + perPage);

            const faceMap = await mapNamesToFaces(slicedUuids);

            const pageItems = slicedUuids.map(uuid => faceMap[uuid] || uuid);

            pageItems.forEach(item => {
                const playerItem = document.createElement('li');

                playerItem.style.display = 'flex';
                playerItem.style.alignItems = 'center';
                playerItem.style.gap = '10px';
                playerItem.style.marginBottom = '8px';
                

                let username = "Unknown Player";
                let avatarUrl = "";

                if (item && typeof item === 'object') {
                    username = item.name;
                    avatarUrl = item.avatarUrl;
                } else if (typeof item === 'string') {
                    avatarUrl = `https://minotar.net/${item}/32.png`;
                }

                if (avatarUrl) {
                    const img = document.createElement('img');
                    img.src = avatarUrl;
                    img.alt = `${username}'s Face`;
                    img.width = 32;
                    img.height = 32;
                    img.style.borderRadius = '4px';
                    img.onerror = () => {
                        img.style.display = 'none';
                    };
                    playerItem.appendChild(img);
                }

                playerItem.id = `${username}-card`;

                const nameP = document.createElement('p');
                nameP.textContent = username;
                playerItem.appendChild(nameP);

                playersList.appendChild(playerItem);

                playerItem.classList.add('not-showing');

                const noCardListing = playerItem.innerHTML; // Store the original content to revert back to if needed

                playerItem.addEventListener('click', (e) => {
                    if (e.target !== playerItem && !playerItem.querySelector('.stats-content')?.contains(e.target)) {
                        return;
                    }

                    let statsContent = playerItem.querySelector('.stats-content');
                    
                    if (!statsContent) {
                        statsContent = document.createElement('div');
                        statsContent.classList.add('stats-content', 'not-showing');
                        playerItem.appendChild(statsContent);

                        playerItem.classList.remove('not-showing');
                        playerItem.classList.add('showing');
                        
                        renderPlayerCard(username, 0, statsContent);
                        
                        setTimeout(() => {
                            statsContent.classList.remove('not-showing');
                            statsContent.classList.add('showing');
                        }, 10);

                    } else if (statsContent.classList.contains('showing')) {
                        statsContent.classList.remove('showing');
                        statsContent.classList.add('not-showing');
                        playerItem.classList.remove('showing');
                        
                        setTimeout(() => {
                            statsContent.remove();
                            playerItem.classList.add('not-showing');
                        }, 400); 
                    }
                });
            });

            renderPaginationControls(start, total, perPage, list);

        } catch (error) {
            console.error("Error rendering player page layout:", error);
            const errorItem = document.createElement('li');
            errorItem.textContent = 'Failed to load player avatars.';
            playersList.appendChild(errorItem);
        }
    }

    function renderPaginationControls(start, total, perPage, list) {
        pagination.innerHTML = '';

        const prev = document.createElement('button');
        prev.innerHTML = '<img src="../data/images/left.webp" alt="Previous">';;
        prev.disabled = currentPage === 1 || total === 0;
        prev.addEventListener('click', () => { 
            if (currentPage > 1) { 
                currentPage--; 
                renderPlayersPage(list); 
            }
        });

        const next = document.createElement('button');
        next.innerHTML = '<img src="../data/images/right.webp" alt="Next">';
        next.disabled = start + perPage >= total;
        next.addEventListener('click', () => { 
            if (start + perPage < total) { 
                currentPage++; 
                renderPlayersPage(list); 
            }
        });

        const info = document.createElement('span');
        if (total === 0) {
            info.textContent = ' 0-0 of 0';
        } else {
            const displayStart = start + 1;
            const displayEnd = Math.min(total, start + perPage);
            info.textContent = ` ${displayStart}-${displayEnd} of ${total}`;
        }

        pagination.appendChild(prev);
        pagination.appendChild(info);
        pagination.appendChild(next);
    }

    playersArea.appendChild(playersList);
    playersArea.appendChild(pagination);

    const playersToggle = document.createElement('button');
    const playerSearch = document.createElement('input');
    const searchButton = document.createElement('button');
    playerSearch.placeholder = 'Enter Username';
    playerSearch.id = 'search-bar';
    searchButton.textContent = 'Search!';
    searchButton.id = 'search-btn'

    playersArea.style.display = ''; 

    const playersPanel = document.createElement('div');
    playersPanel.classList.add('players-panel-wrapper');

    playersPanel.appendChild(playerSearch);
    playersPanel.appendChild(searchButton);
    playersPanel.appendChild(playersArea);

    playersToggle.innerHTML = '<img src="../data/images/player.webp" alt="Players">';
    playersToggle.classList.add('players-toggle');
    
    playersToggle.addEventListener('click', () => {
        if (!playersPanel.classList.contains('panel-open')) {
            currentPage = 1;
            renderPlayersPage();

            playersPanel.classList.add('panel-open');
        } else {
            playersPanel.classList.remove('panel-open');
        }
    });

    searchButton.addEventListener('click', () => {
        const searchInput = playerSearch.value;
        console.log(searchInput);
        renderPlayerCard(searchInput, 1);
    });

    info.appendChild(playersToggle);
    info.appendChild(playersPanel); 
    
    return card;
}