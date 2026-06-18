import { getUUIDList, getNameList, mapNamesToFaces, copyToClipboard, globalPlayerCache } from "./utils.mjs";
import { renderPlayerCard } from "./renderPlayerCard.mjs";

export function createServerCard(serverData) {
    //First we construct an object for the server data we passed through and define variables for the html elements
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

    //Next, we define variables for the HTML elements that make up the players list that shows when the players toggle button is clicked

    // players list area (hidden by default)
    const playersArea = document.createElement('div');
    playersArea.classList.add('players-area');
    playersArea.style.display = 'none';

    const playersList = document.createElement('ul');
    playersList.classList.add('players-list');
    playersList.id = "players-list";

    const pagination = document.createElement('div');
    pagination.classList.add('players-pagination');

    //Some pagination related variables are defined and local storage is checked for saved favorites to add to the top of the players list

    let currentPage = 1;
    const perPage = 10;

    let playerList = [];

    Object.keys(localStorage).forEach(key => {
        if (key !== 'fav_uuid_undefined' && localStorage.getItem(key) === 'true') {
            //Keys in localStorage are searched and if they aren't found in the globalPlayerCache, they are added
            if (!globalPlayerCache[key]) {
                globalPlayerCache[key] = {
                    name: key,
                    avatarUrl: `https://minotar.net/helm/${key}/32.png`,
                    UUID: key
                };
            }
        }
    });
    
    //this function is found in utils.mjs -- if the function fails to send an array, we return an empty one as a fallback
    getNameList()
    .catch(error => {
        console.error("Error fetching player list data:", error);
        return []; 
    })
    //THEN(hehe) the data is logged to the console for debugging-
    .then(data => {
        console.log(`Fetched player list for server ID ${ID}:`, data);
        
        // -we define a variable for our favoites list
        const savedFavorites = Object.keys(localStorage).filter(key => 
            key !== 'fav_uuid_undefined' && localStorage.getItem(key) === 'true'
        );
        // -pass it to a list that gathers the players that aren't returned by the API (offline players(or just caught outside the sample))
        const offlineFavorites = savedFavorites.filter(favName => {
            return !data.some(onlineUuid => {
                const cachedProfile = globalPlayerCache[onlineUuid];
                return cachedProfile && cachedProfile.name === favName;
            });
        });

        // -and finally map both the online API response and offlineFavorites to the list of players to display
        playerList = [...offlineFavorites, ...data];

        window.renderPlayersPage = () => renderPlayersPage(playerList);
        window.playerList = playerList;
        window.globalPlayerCache = globalPlayerCache;

        window.currentPage = currentPage;
        
        renderPlayersPage(playerList).catch(renderError => {
            console.error("Error inside renderPlayersPage execution:", renderError);
        });
    });
    //this function renders the main players list and is quite extensive
    async function renderPlayersPage(listInput) {
        //clear the pages for the passed data to be rendered
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

            //Check if no players were returned
            if (total === 0) {
                const noPlayers = document.createElement('li');
                noPlayers.textContent = 'No player list available for this server.';
                playersList.appendChild(noPlayers);
                renderPaginationControls(0, 0, 0); 
                return;
            }
            //sort to have favorites in front of everything else
            list.sort((a, b) => {
                const idA = (a && typeof a === 'object') ? (a.uuid || a.id || a.UUID) : a;
                const idB = (b && typeof b === 'object') ? (b.uuid || b.id || b.UUID) : b;

                const cachedA = globalPlayerCache[idA] || globalPlayerCache[a];
                const cachedB = globalPlayerCache[idB] || globalPlayerCache[b];

                const nameA = cachedA ? cachedA.name : String(a);
                const nameB = cachedB ? cachedB.name : String(b);

                const isFavA = localStorage.getItem(nameA) !== null;
                const isFavB = localStorage.getItem(nameB) !== null;

                if (isFavA && !isFavB) return -1;
                if (!isFavA && isFavB) return 1;
                return 0;
            });

            //Here we define the starting points for pages in the list of players (split up the list into pages of 10)
            const start = (currentPage - 1) * perPage;
            const slicedUuids = list.slice(start, start + perPage);

            //Then send the data through this mapNamesToFaces function (found in utils) the variables are calling the items UUIDS, but usernames are actually being passed, this is residual of the legacy version of BrowseCraft
            const faceMap = await mapNamesToFaces(slicedUuids);
            const pageItems = slicedUuids.map(uuid => faceMap[uuid] || uuid);

            //Another call to sort favorites to ensure the go to the top after favoriting a searched player or after changing pages
            pageItems.sort((a, b) => {
                const nameA = (a && typeof a === 'object') ? a.name : String(a);
                const nameB = (b && typeof b === 'object') ? b.name : String(b);

                const isFavA = localStorage.getItem(nameA) !== null;
                const isFavB = localStorage.getItem(nameB) !== null;

                if (isFavA && !isFavB) return -1;
                if (!isFavA && isFavB) return 1;
                return 0;
            });

            //Here we make a listing for each player in the current page
            pageItems.forEach(item => {
                const playerItem = document.createElement('li');
                const headerRow = document.createElement('div');
                headerRow.classList.add('player-header-row');

                playerItem.style.display = 'flex';
                playerItem.style.alignItems = 'center';
                playerItem.style.gap = '10px';
                playerItem.style.marginBottom = '8px';
                

                let username = "Unknown Player";
                let avatarUrl = "";

                //ensure an avatar is found
                if (item && typeof item === 'object') {
                    username = item.name;
                    avatarUrl = item.avatarUrl;
                } else if (typeof item === 'string') {
                    avatarUrl = `https://minotar.net/${item}/32.png`;
                    currentUuid = item;
                }

                //if found, create an element for the face
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
                    headerRow.appendChild(img);
                }

                playerItem.id = `${username}-card`;

                //create and set username element
                const nameP = document.createElement('span');
                nameP.textContent = username;
                headerRow.appendChild(nameP);

                //define favorite button
                const favButton = document.createElement('button');
                favButton.classList.add('fav-button');

                const favImg = document.createElement('img');
                favImg.width = 32;
                favImg.height = 32;
                if (localStorage.getItem(username) !== null) {
                    favImg.src = "./data/images/favorited.png";
                    favImg.alt = "favorited icon";
                } else {
                    favImg.src = "./data/images/favorite.png";
                    favImg.alt = "favorite icon";
                }

                favButton.appendChild(favImg);

                const playerUuid = (item && typeof item === 'object') ? (item.uuid || item.id) : slicedUuids[pageItems.indexOf(item)];

                //when the favorite button is clicked
                favButton.addEventListener('click', (e) => {
                    //keep the player card from toggling when clicking the button
                    e.stopPropagation();

                    //if the user is found in local storage, remove is and change the icon back to the empty heart
                    if (localStorage.getItem(username) !== null) {
                        localStorage.removeItem(username);
                        console.log(`removed ${username} from favorites`);
                        favImg.src = "./data/images/favorite.png";
                        favImg.alt = "favorite icon"; 
                        //else if not a favorite, add to local storage and change heart to full
                    } else {
                        localStorage.setItem(username, "true");
                        console.log(`added ${username} to favorites`);
                        favImg.src = "./data/images/favorited.png";
                        favImg.alt = "favorited icon";
                    }
                    //re-render page with the favorites on top
                    renderPlayersPage(list);
                });

                headerRow.appendChild(favButton);
                playerItem.appendChild(headerRow);
                playersList.appendChild(playerItem);

                playerItem.classList.add('not-showing');

                const noCardListing = playerItem.innerHTML;

                //the header row is defined to differentiate the player listings that arent showing statistics, it also acts as a big button to toggle the stats
                headerRow.addEventListener('click', (e) => {
                    //make sure the favorite button isn't the one being clicked
                    if (favButton.contains(e.target)) {
                        return;
                    }

                    //try to detect if the stats are open
                    let statsContent = playerItem.querySelector('.stats-content');
                    
                    //if they arent, create the stats card for the player
                    if (!statsContent) {
                        statsContent = document.createElement('div');
                        statsContent.classList.add('stats-content', 'not-showing');
                        playerItem.appendChild(statsContent);

                        //stats are gathered using this extensive function found in its own file (renderPlayerCard.mjs)
                        renderPlayerCard(username, 0, statsContent);

                        setTimeout(() => {
                            statsContent.classList.remove('not-showing');
                            statsContent.classList.add('showing');
                        }, 10);

                        //otherwise remove the stats box
                    } else if (statsContent.classList.contains('showing')) {
                        statsContent.classList.remove('showing');
                        statsContent.classList.add('not-showing');

                        setTimeout(() => {
                            statsContent.remove();
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

    //this is how the page controls are rendered
    function renderPaginationControls(start, total, perPage, list) {
        //clear the controls to show the correct page numbers on render
        pagination.innerHTML = '';

        //create left button with arrow img and currentPage subtraction
        const prev = document.createElement('button');
        prev.innerHTML = '<img src="../data/images/left.webp" alt="Previous">';;
        prev.disabled = currentPage === 1 || total === 0;
        prev.addEventListener('click', () => { 
            if (currentPage > 1) { 
                currentPage--; 
                renderPlayersPage(list); 
            }
        });

        //create right button with arrow img and currentPage addition
        const next = document.createElement('button');
        next.innerHTML = '<img src="../data/images/right.webp" alt="Next">';
        next.disabled = start + perPage >= total;
        next.addEventListener('click', () => { 
            if (start + perPage < total) { 
                currentPage++; 
                renderPlayersPage(list); 
            }
        });

        //display numbers based on the amount of players in the list
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
    
    //toggle logic for the button that shows the list of players
    playersToggle.addEventListener('click', () => {
        if (!playersPanel.classList.contains('panel-open')) {
            currentPage = 1;
            renderPlayersPage();

            playersPanel.classList.add('panel-open');
        } else {
            playersPanel.classList.remove('panel-open');
        }
    });

    //if the search button is clicked, take input and pass it to renderPlayerCard
    searchButton.addEventListener('click', () => {
        const searchInput = playerSearch.value;
        console.log(searchInput);
        renderPlayerCard(searchInput, 1);
    });

    info.appendChild(playersToggle);
    info.appendChild(playersPanel); 
    
    return card;
}