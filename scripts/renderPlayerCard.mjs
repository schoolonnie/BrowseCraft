import { getPlayerBust, getPlayerBody, checkWynncraftV3 } from './utils.mjs';

//this function is very extensive, it takes a player, a 0 or 1 for if it was searched, and the target container for where the card is to be built
export function renderPlayerCard(player, search, targetContainer) {
    let thisCard = "";

    //select the appropriate card or create one
    if (search === 0) {
        thisCard = targetContainer;
    } else if (search === 1) {
        thisCard = document.createElement('li')
        thisCard.classList.add(`${player}-card`)
    } else {
        console.warn(`Player card for ${player} not found in the DOM.`);
        return;
    }

    //this function is found in services.mjs, but just makes a simple API call with the username passed
    const data = checkWynncraftV3(player);

    data.then(stats => {
        //if there is a problem with the data, it displays not available
        if (stats.error) {
            console.warn(`Wynncraft data not found for ${player}:`, stats.error);
            thisCard.innerHTML = `
                <img src="${getPlayerBust(player)}" alt="${player}'s Bust" width="100" height="100" style="border-radius: 4px;">
                <p class="username">Username: ${player}</p>
                <p class="wynncraft-status">Wynncraft data not available</p>
            `;
            return;
        }

        thisCard.classList.add("player-card-container");
        thisCard.classList.remove("not-showing");

        //append wynncraft stats to card if the response is good
        let cardHtmlString = `
            <div class="card-layout-wrapper">
                <img src="${getPlayerBust(player)}" alt="${player}'s Bust" class="bust-image">
                <div class="stats-text-block">
                    <p class="username">Username: ${player}</p>
                    <p class="online">Is Online: ${stats.online || 'false'}</p>
                    <p class="first-join">First Joined: ${stats.firstJoin ? new Date(stats.firstJoin).toLocaleDateString() : 'N/A'}</p>
                    <p class="playtime">Total Playtime: ${stats.playtime !== undefined ? stats.playtime + ' hours' : 'N/A'}</p>
                    <p class="chests-opened">Chests Opened: ${stats.globalData.chestsFound || 'N/A'}</p>
                    <p class="dungeons">Dungeons Completed: ${stats.globalData.dungeons.total || 'N/A'}</p>
                    <p class="raids">Raids Completed: ${stats.globalData.raids.total || 'N/A'}</p>
                    <p class="quests-completed">Quests Completed: ${stats.globalData.completedQuests || 'N/A'}</p>
                    <p class="pvp-kills">PvP Kills: ${stats.globalData.pvp.kills || 'N/A'}</p>
                    <p class="mob-kills">Mob Kills: ${stats.globalData.mobsKilled || 'N/A'}</p>
                </div>
            </div>
        `;
        //if the username was searched, add this information to the top of the card to differentiate it
        if (search === 1) {
            thisCard.innerHTML = `
                <div class="search-header-row" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <p style="margin: 0;">Search Result:</p>
                    <!-- Explicit identifier class added for targeted DOM manipulation -->
                    <button class="fav-button search-fav-btn" style="background: transparent; border: none; cursor: pointer; padding: 0;"></button>
                </div>
                ${cardHtmlString}
            `;
        } else if (search == 0) {
            thisCard.innerHTML = cardHtmlString;
        }
        
        thisCard.classList.add("player-card");

        //this is all logic for adding the favorite button to the searched player
        if (search === 1) {
            thisCard.id = "searched-card";
            const playersList = document.getElementById('players-list');
            let searchedCard = document.getElementById('searched-card');

            if (playersList && !searchedCard) {
                playersList.appendChild(thisCard);
            } else if (playersList && searchedCard){
                searchedCard.innerHTML = thisCard.innerHTML;
            } else {
                console.error("Could not find #players-list");
            }

            const searchFavBtn = thisCard.querySelector('.search-fav-btn');
            if (searchFavBtn) {
                const favImg = document.createElement('img');
                favImg.width = 32;
                favImg.height = 32;

                if (localStorage.getItem(player) !== null) {
                    favImg.src = "./data/images/favorited.png";
                    favImg.alt = "favorited icon";
                } else {
                    favImg.src = "./data/images/favorite.png";
                    favImg.alt = "favorite icon";
                }
                searchFavBtn.appendChild(favImg);

                searchFavBtn.addEventListener('click', (e) => {
                    e.stopPropagation();

                    if (localStorage.getItem(player) !== null) {
                        localStorage.removeItem(player);
                        console.log(`removed ${player} from favorites`);
                        favImg.src = "./data/images/favorite.png";
                        favImg.alt = "favorite icon"; 
                    } else {
                        localStorage.setItem(player, "true");
                        console.log(`added ${player} to favorites`);
                        favImg.src = "./data/images/favorited.png";
                        favImg.alt = "favorited icon";

                        if (typeof window.globalPlayerCache === 'object' && !window.globalPlayerCache[player]) {
                            window.globalPlayerCache[player] = {
                                name: player,
                                avatarUrl: `https://minotar.net/helm/${player}/32.png`,
                                UUID: player
                            };
                        }

                        if (Array.isArray(window.playerList)) {
                            window.playerList.unshift(player); 

                            window.playerList = [...new Set(window.playerList)];
                        }
                    }

                    if (window.currentPage !== undefined) {
                        window.currentPage = 1;
                    }

                    if (typeof window.renderPlayersPage === 'function') {
                        window.renderPlayersPage();
                    }
                });
            }
        }

        //Here we catch errors that have to do with searching such as players that haven't joined the server or empty search bar entries
    }).catch(error => {
        const searchBar = document.getElementById('search-bar');
    
        if (searchBar) {
            const errorSpan = document.createElement('span');
            errorSpan.id = 'error-span';
            if (player === "Unknown Player" || localStorage.getItem(player) !== null) {
                errorSpan.textContent = "Player is currently offline or data could not be loaded from Wynncraft.";
            } else if (searchBar.value === "") {
                errorSpan.textContent = "Please enter a username";
            } else {
                errorSpan.textContent = `${player} could not be found in Wynncraft's player data!`;
            }
            
            errorSpan.style.color = 'red';
            errorSpan.classList.add('error-msg');

            if (!document.getElementById('error-span')) {
                searchBar.insertAdjacentElement('afterend', errorSpan);
            }
            
            setTimeout(() => {
                errorSpan.classList.add('fade-out');
            }, 4000);
            
            setTimeout(() => {
                errorSpan.remove();
            }, 5000);
            
        } else {
            console.error("searchBar element not found in the DOM.");
        }
        
        console.error(`Error fetching Wynncraft data for ${player}:`, error);
    });

}