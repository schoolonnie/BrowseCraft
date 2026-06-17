import { getPlayerBust, getPlayerBody, checkWynncraftV3 } from './utils.mjs';

export function renderPlayerCard(player, search) {
    let thisCard = "";

    if (search === 0) {
        thisCard = document.getElementById(`${player}-card`);
    } else if (search === 1) {
        thisCard = document.createElement('li')
        thisCard.classList.add(`${player}-card`)
    } else {
        console.warn(`Player card for ${player} not found in the DOM.`);
        return;
    }

    const data = checkWynncraftV3(player);

    data.then(stats => {
        if (stats.error) {
            console.warn(`Wynncraft data not found for ${player}:`, stats.error);
            thisCard.innerHTML = `
                <img src="${getPlayerBust(player)}" alt="${player}'s Bust" width="100" height="100" style="border-radius: 4px;">
                <p class="username">Username: ${player}</p>
                <p class="wynncraft-status">Wynncraft data not available</p>
            `;
            return;
        }

        //append wynncraft stats to card
        thisCard.innerHTML = `
            <img src="${getPlayerBust(player)}" alt="${player}'s Bust" width="100" height="100" style="border-radius: 4px;">
            <p class="username">Username: ${player}</p>
            <p class="rank">Wynncraft Rank: ${stats.rank || 'N/A'}</p>
            <p class="first-join">First Joined: ${stats.firstJoin ? new Date(stats.firstJoin).toLocaleDateString() : 'N/A'}</p>
            <p class="playtime">Total Playtime: ${stats.playtime !== undefined ? stats.playtime + ' hours' : 'N/A'}</p>
            <p class="chests-opened">Chests Opened: ${stats.globalData.chestsFound || 'N/A'}</p>
            <p class="dungeons">Dungeons Completed: ${stats.globalData.dungeons.total || 'N/A'}</p>
            <p class="raids">Raids Completed: ${stats.globalData.raids.total || 'N/A'}</p>
            <p class="quests-completed">Quests Completed: ${stats.globalData.completedQuests || 'N/A'}</p>
            <p class="pvp-kills">PvP Kills: ${stats.globalData.pvp.kills || 'N/A'}</p>
            <p class="mob-kills">Mob Kills: ${stats.globalData.mobsKilled || 'N/A'}</p>
        `;
        thisCard.classList.add("player-card");

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
        }

    }).catch(error => {
        const searchBar = document.getElementById('search-bar');
    
        if (searchBar) {
            const errorSpan = document.createElement('span');
            errorSpan.id = 'error-span';
            if (searchBar.textContent === "") {
                errorSpan.textContent = 'Please enter a username';
            } else {
                errorSpan.textContent = ` ${player} could not be found in Wynncraft's player data!`;
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