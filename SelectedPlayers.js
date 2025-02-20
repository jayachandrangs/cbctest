// Utility function to go to another page
function goToPage(page) {
  window.location.href = page;
}

// Initialize required variables
const NUMPLAYERS = 100;
let TOTALPLAYERS = 0; // Initialize to 0
let UNSETNUMBERS = 0;
let REMOVALOT;
const UNSETNUM = Array(10).fill(0);
const playerInfo = {};
let isLoading = false;

// Load players from localStorage or prompt for upload if not available
async function loadPlayers() {
  if (isLoading) {
    console.log("Already loading, please wait.");
    return;
  }
  isLoading = true;
  console.log("Loading players...");
  const storedData = localStorage.getItem('clubmembers');
  if (storedData) {
    try {
      const players = JSON.parse(storedData);
      console.log(`Loaded ${players.length} players from localStorage`);
      displayPlayers(players);
    } catch (error) {
      console.error("Error parsing stored data:", error);
      promptForCSVUpload();
    }
  } else {
    console.log("No stored data found. Prompting for CSV upload.");
    promptForCSVUpload();
  }
  isLoading = false;
}

// Toggle player number assignment
function togglePlayerNumber(playerName, playerDiv) {
  const existingBubble = playerDiv.querySelector('.player-number');
  if (existingBubble) playerDiv.removeChild(existingBubble);
  let playersData = JSON.parse(localStorage.getItem('clubmembers')) || [];
  let playerIndex = playersData.findIndex(p => p.Player === playerName);
  let playDayConfig = JSON.parse(localStorage.getItem('PlayDayConfig')) || {};
  if (!playDayConfig.removedNumbers) playDayConfig.removedNumbers = [];
  let playingToday = JSON.parse(localStorage.getItem('PlayingToday')) || [];

  if (playerInfo[playerName].number === null) {
    let numberToAssign;
    if (playDayConfig.removedNumbers.length > 0) {
      numberToAssign = Math.min(...playDayConfig.removedNumbers);
      playDayConfig.removedNumbers = playDayConfig.removedNumbers.filter(n => n !== numberToAssign);
    } else {
      numberToAssign = (playDayConfig.numberToAssign || 0) + 1;
    }

    if (numberToAssign <= NUMPLAYERS) {
      playerInfo[playerName].number = numberToAssign;
      createNumberBubble(playerDiv, numberToAssign);
      if (playerIndex !== -1) {
        playersData[playerIndex].PlayingToday = numberToAssign;
        TOTALPLAYERS++;
        playersData[playerIndex].alloted += 1;
        playDayConfig.numberToAssign = Math.max(playDayConfig.numberToAssign || 0, numberToAssign);

        if (playingToday.length > 0) {
          let lowestPlayed = Math.min(...playingToday.map(p => p.played || 0));
          let highestRested = Math.max(...playingToday.map(p => p.rested || 0));
          playersData[playerIndex].played = lowestPlayed;
          playersData[playerIndex].rested = highestRested;
        } else {
          playersData[playerIndex].played = 0;
          playersData[playerIndex].rested = 0;
        }

        playingToday.push({
          ...playerInfo[playerName],
          name: playerName,
          number: numberToAssign,
          played: playersData[playerIndex].played,
          rested: playersData[playerIndex].rested
        });
      }
    } else {
      alert("All numbers are already allocated.");
      return;
    }
  } else {
    let removedNumber = playerInfo[playerName].number;
    playDayConfig.removedNumbers.push(removedNumber);
    playDayConfig.removedNumbers.sort((a, b) => a - b);
    playerInfo[playerName].number = null;
    if (playerIndex !== -1) {
      playersData[playerIndex].PlayingToday = 0;
      TOTALPLAYERS--;
      playersData[playerIndex].alloted -= 1;
      playingToday = playingToday.filter(player => player.name !== playerName);
    }
  }

  localStorage.setItem('clubmembers', JSON.stringify(playersData));
  localStorage.setItem('PlayDayConfig', JSON.stringify(playDayConfig));
  localStorage.setItem('PlayingToday', JSON.stringify(playingToday));
  updateTotalPlayersDisplay();
}



// Function to update the display of TOTALPLAYERS (if needed)
function updateTotalPlayersDisplay() {
  const totalPlayersElement = document.getElementById('totalPlayersDisplay');
  if (totalPlayersElement) {
    totalPlayersElement.textContent = `Total Players: ${TOTALPLAYERS}`;
  }
}

// Update playday configuration in local storage
function updatePlaydayConfig(totalPlayers) {
  let config = JSON.parse(localStorage.getItem('playdayconfig')) || {};
  config.TOTALPLAYERS = totalPlayers;
  localStorage.setItem('playdayconfig', JSON.stringify(config));
}

// Create number bubble for assigned players
function createNumberBubble(playerDiv, number) {
  const numberBubble = document.createElement('div');
  numberBubble.classList.add('player-number');
  numberBubble.innerText = number;
  playerDiv.appendChild(numberBubble);
}

// Reset players
function resetPlayers() {
  const playerButtonsDiv = document.getElementById('playerButtons');
  playerButtonsDiv.innerHTML = '';
  Object.keys(playerInfo).forEach(playerName => {
    playerInfo[playerName].number = null;
    const playerDiv = document.createElement('div');
    playerDiv.classList.add('player-div');
    playerDiv.onclick = () => togglePlayerNumber(playerName, playerDiv);
    playerDiv.innerText = `${playerName} - ${playerInfo[playerName].Primary_Division}`;
    playerDiv.id = `player-${playerName.replace(/\s+/g, '-')}`;
    playerButtonsDiv.appendChild(playerDiv);
  });
  UNSETNUMBERS = 0;
  UNSETNUM.fill(0);
  // Update localStorage
  let playersData = JSON.parse(localStorage.getItem('clubmembers')) || [];
  playersData.forEach(player => {
    player.PlayingToday = 0; // Reset playingToday for all players
    player.alloted = 0; // Reset alloted count for all players
  });
  localStorage.setItem('clubmembers', JSON.stringify(playersData));
}

// Confirm allocation and store in LocalStorage
function confirmAllocation() {
    window.location.href = 'ListPlayers.html';
}

// Display loaded players on the UI
function displayPlayers(players) {
  const playerButtonsDiv = document.getElementById('playerButtons');
  playerButtonsDiv.innerHTML = '';
  console.log(`Displaying ${players.length} players`);
  players.forEach(player => {
    const playerDiv = document.createElement('div');
    playerDiv.classList.add('player-div');
    playerDiv.onclick = () => togglePlayerNumber(player.Player, playerDiv);
    // Display player's name in the UI
    playerDiv.innerText = `${player.Player}`;
    // Set a unique ID for each player's div element.
    playerDiv.id = `player-${player.Player.replace(/\s+/g, '-')}`;
    // Append the created div to the parent container.
    playerButtonsDiv.appendChild(playerDiv);
    // Check if the current player's PlayingToday value is greater than zero and create a bubble accordingly.
    if (player.PlayingToday > 0) {
      createNumberBubble(playerDiv, player.PlayingToday);
      // Update the player's info in the global object with their assigned number.
      playerInfo[player.Player] = { ...player, number: player.PlayingToday };
    } else {
      // If not playing today, set their number to null.
      playerInfo[player.Player] = { ...player, number: null };
    }
  });
  // Update TOTALPLAYERS count based on how many are playing today.
  TOTALPLAYERS = players.filter(player => player.PlayingToday > 0).length;
  updateTotalPlayersDisplay(); // Update the displayed total.
}

// Execute loadPlayers when the page loads
document.addEventListener('DOMContentLoaded', loadPlayers);
