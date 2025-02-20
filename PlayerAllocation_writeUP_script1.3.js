function PlayerAllocation() {
  const PlayDayDConfig = JSON.parse(localStorage.getItem("PlayDayDConfig"));
  const nsession = PlayDayDConfig.nsession;

  for (let SessionID = 1; SessionID <= nsession; SessionID++) {
    const sessionType = PlayDayDConfig.S[SessionID];
    switch (sessionType) {
      case "Basic1": Basic1(SessionID); break;
      case "Basic2": Basic2(SessionID); break;
      case "Basic3": Basic3(SessionID); break;
      case "Basic4": Basic4(SessionID); break;
      case "Mixed1": MixedDiv1(SessionID); break;
      case "Mixed2": MixedDiv2(SessionID); break;
      default: console.log(`Unknown session type: ${sessionType}`);
    }
  }

  alert("Have a nice day!");
}

function Basic1(SessionID) {
  allocatePlayers(SessionID, 'primary_division', 'highest');
}

function Basic2(SessionID) {
  allocatePlayers(SessionID, 'primary_division', 'lowest');
}

function Basic3(SessionID) {
  allocatePlayers(SessionID, 'secondary_division', 'highest');
}

function Basic4(SessionID) {
  allocatePlayers(SessionID, 'secondary_division', 'lowest');
}

function MixedDiv1(SessionID) {
  const PlayingToday = JSON.parse(localStorage.getItem("PlayingToday"));
  const PlayDayConfig = JSON.parse(localStorage.getItem("PlayDayDConfig"));

  initializeAllocation(PlayingToday);
  const { actualcourts, resting } = calculateCourts(PlayingToday, PlayDayConfig);

  PlayingToday.sort((a, b) => sortPlayersMixed(a, b));

  const restedPlayers = allocateRestingPlayers(PlayingToday, resting);
  localStorage.setItem(`Session_${SessionID}_RestedPlayers`, JSON.stringify(restedPlayers));

  const sessionAllocation = [];
  for (let courtId = 1; courtId <= actualcourts; courtId++) {
    const courtAllocation = [];
    for (let i = 0; i < 2; i++) {
      const player = selectPlayer(PlayingToday, 'primary_division', 'highest');
      courtAllocation.push(player.name);

      const partner = selectMixedPartner(PlayingToday, player);
      courtAllocation.push(partner.name);
    }
    sessionAllocation.push(courtAllocation);
  }

  storeAndPrintAllocation(SessionID, sessionAllocation, PlayDayConfig);
}

function MixedDiv2(SessionID) {
  allocatePlayers(SessionID, 'primary_division', 'lowest');
}

function allocatePlayers(SessionID, divisionType, selectionType) {
  const PlayingToday = JSON.parse(localStorage.getItem("PlayingToday"));
  const PlayDayConfig = JSON.parse(localStorage.getItem("PlayDayDConfig"));

  initializeAllocation(PlayingToday);
  const { actualcourts, resting } = calculateCourts(PlayingToday, PlayDayConfig);

  PlayingToday.sort((a, b) => sortPlayers(a, b));

  const restedPlayers = allocateRestingPlayers(PlayingToday, resting);
  localStorage.setItem(`Session_${SessionID}_RestedPlayers`, JSON.stringify(restedPlayers));

  const sessionAllocation = [];
  for (let courtId = 1; courtId <= actualcourts; courtId++) {
    const courtAllocation = [];
    for (let i = 0; i < 4; i++) {
      const player = selectPlayer(PlayingToday, divisionType, selectionType);
      courtAllocation.push(player.name);
    }
    sessionAllocation.push(courtAllocation);
  }

  storeAndPrintAllocation(SessionID, sessionAllocation, PlayDayConfig);
}

function initializeAllocation(PlayingToday) {
  PlayingToday.forEach(player => player.alloted = 0);
}

function calculateCourts(PlayingToday, PlayDayConfig) {
  const nplayers = PlayingToday.length;
  const courtbasedonplayer = Math.floor(nplayers / 4);
  const actualcourts = Math.min(PlayDayConfig.ncourts, courtbasedonplayer);
  const playing = actualcourts * 4;
  const resting = nplayers - playing;
  return { actualcourts, resting };
}

function sortPlayers(a, b) {
  if (a.rested !== b.rested) return a.rested - b.rested;
  if (a.played !== b.played) return b.played - a.played;
  return b.number - a.number;
}

function sortPlayersMixed(a, b) {
  if (a.rested !== b.rested) return a.rested - b.rested;
  if (b.rested !== a.rested) return b.rested - a.rested;
  return b.number - a.number;
}

function allocateRestingPlayers(PlayingToday, resting) {
  const restedPlayers = [];
  for (let i = 0; i < resting; i++) {
    const player = PlayingToday[i];
    player.alloted = 2;
    player.rested++;
    restedPlayers.push(player.name);
  }
  return restedPlayers;
}

function selectPlayer(PlayingToday, divisionType, selectionType) {
  const availablePlayers = PlayingToday.filter(p => p.alloted === 0);
  const player = selectionType === 'highest' 
    ? availablePlayers.reduce((max, p) => p[divisionType] > max[divisionType] ? p : max)
    : availablePlayers.reduce((min, p) => p[divisionType] < min[divisionType] ? p : min);
  player.alloted = 1;
  player.played++;
  return player;
}

function selectMixedPartner(PlayingToday, player) {
  const availablePlayers = PlayingToday.filter(p => p.alloted === 0);
  const partner = availablePlayers.find(p => 
    p.primary_division === player.primary_division - 1.5 ||
    p.primary_division === player.primary_division - 1 ||
    p.primary_division === player.primary_division - 0.5
  ) || selectPlayer(PlayingToday, 'primary_division', 'highest');
  partner.alloted = 1;
  partner.played++;
  return partner;
}

function storeAndPrintAllocation(SessionID, sessionAllocation, PlayDayConfig) {
  localStorage.setItem(`Session_${SessionID}`, JSON.stringify(sessionAllocation));
  console.log(`Session: ${SessionID}`);
  sessionAllocation.forEach((court, index) => {
    console.log(`Court ${PlayDayConfig.courts[index]}: ${court.join(', ')}`);
  });
}
