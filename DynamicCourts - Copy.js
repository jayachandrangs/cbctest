        let currentSession;
        let timerInterval;
        let totalSeconds;
        let sessionDuration;
        let isPaused = false;

        function initialize() {
          createCurrentSession();
            // Keep screen on
            if ('wakeLock' in navigator) {
                navigator.wakeLock.request('screen')
                    .then(lock => {
                        console.log('Screen wake lock acquired:', lock);
                    })
                    .catch(err => console.error('Failed to acquire wake lock:', err));
            } else {
                console.warn('Wake Lock API not supported.');
            }
        
            // Fullscreen
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen();
            } else if (document.documentElement.mozRequestFullScreen) { /* Firefox */
                document.documentElement.mozRequestFullScreen();
            } else if (document.documentElement.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
                document.documentElement.webkitRequestFullscreen();
            } else if (document.documentElement.msRequestFullscreen) { /* IE/Edge */
                document.documentElement.msRequestFullscreen();
            }
        
            // Hide address bar
            window.scrollTo(0, 1);
            screen.orientation.lock("landscape");
            initializeLocalStorage();
            
            // Call PlayerAllocation here, passing currentSession as SessionID
            PlayerAllocation(currentSession);
        
            loadSession(currentSession);
            startCountdown();
            setInterval(fiveMinuteBeep, 300000);
        
            const durationInput = document.getElementById('duration-input');
            const config = JSON.parse(localStorage.getItem('PlayDayConfig'));
            durationInput.value = config.sduration;
        
            durationInput.addEventListener('change', function () {
                const newDuration = parseInt(this.value);
                if (!isNaN(newDuration) && newDuration > 0) {
                    updateSessionDuration(newDuration);
                } else {
                    alert('Please enter a valid duration in minutes.');
                    this.value = config.sduration;
                }
            });
        
            // Event listeners for main buttons
            document.getElementById('next-btn').addEventListener('click', goToNextSession);
            document.getElementById('prev-btn').addEventListener('click', goToPreviousSession);
            document.getElementById('reset-btn').addEventListener('click', resetSession);
        
            // Event listener for pause button
            const pauseBtn = document.getElementById('pause-btn');
            pauseBtn.addEventListener('click', togglePause);
        
            // Event listener for setting icon
            const settingIcon = document.getElementById('setting-icon');
            settingIcon.addEventListener('click', toggleSettingButtons);
        
            // Double click event to toggle fullscreen
            document.documentElement.addEventListener('dblclick', toggleFullScreen);
        }

        function initializeLocalStorage() {
            if (!localStorage.getItem('PlayDayConfig')) {
                const defaultConfig = {
                    nsession: 3,
                    sduration: 45,
                    courts: ["Court1", "Court2", "Court3", "Court4", "Court5", "Court6"]
                };
                localStorage.setItem('PlayDayConfig', JSON.stringify(defaultConfig));
            }

            if (!localStorage.getItem('Session_1')) {
                const defaultPlayers = [
                    ["Player11", "Player12", "Player13", "Player14"],
                    ["Player21", "Player22", "Player23", "Player24"],
                    ["Player31", "Player32", "Player33", "Player34"],
                    ["Player41", "Player42", "Player42", "Player43"],
                    ["Player1", "Player2", "Player3", "Player4"],
                    ["Player5", "Player6", "Player7", "Player8"]
                ];
                localStorage.setItem('Session_1', JSON.stringify(defaultPlayers));
                localStorage.setItem('Session_1_RestedPlayers', JSON.stringify(["Reserve1", "Reserve2"]));
            }
        }

        function loadSession(sessionNumber) {
            const config = JSON.parse(localStorage.getItem('PlayDayConfig'));
            const sessionData = JSON.parse(localStorage.getItem(`Session_${sessionNumber}`) || '[]');
            const restedPlayers = JSON.parse(localStorage.getItem(`Session_${sessionNumber}_RestedPlayers`) || '[]');

            const courts = config.courts.map((courtName, index) => ({
                courtname: courtName,
                players: sessionData[index] || []
            }));

            renderCourts(courts);
            renderRestedPlayers(restedPlayers);

            sessionDuration = config.sduration * 60;
            totalSeconds = sessionDuration;
            updateTimerDisplay();

            document.getElementById('session-number').textContent = `Session ${sessionNumber}`;
        }

        function renderCourts(courts) {
            const content = document.getElementById('content');
            content.innerHTML = '';

            courts.forEach(court => {
                const courtBox = document.createElement('div');
                courtBox.className = 'court-box';
                courtBox.innerHTML = `<h3>${court.courtname}</h3>`;

                // Alphabetically sort players within the court
                court.players.sort();

                court.players.forEach(player => {
                    const playerElement = document.createElement('div');
                    playerElement.className = 'player-name';

                    // Determine color based on first letter
                    const firstLetter = player.charAt(0).toUpperCase();
                    let colorClass = '';

                    if (firstLetter >= 'A' && firstLetter <= 'F') {
                        colorClass = 'color-dark-blue';
                    } else if (firstLetter >= 'G' && firstLetter <= 'L') {
                        colorClass = 'color-black';
                    } else if (firstLetter >= 'M' && firstLetter <= 'S') {
                        colorClass = 'color-dark-red';
                    } else if (firstLetter >= 'T' && firstLetter <= 'Z') {
                        colorClass = 'color-dark-orange';
                    }

                    playerElement.classList.add(colorClass);
                    playerElement.textContent = player;
                    courtBox.appendChild(playerElement);
                });

                content.appendChild(courtBox);
            });
        }

         function renderRestedPlayers(players) {
            const container = document.querySelector('.players-container');
            container.innerHTML = '';

            // Alphabetically sort rested players
            players.sort();

            players.forEach((player, index) => {
                const element = document.createElement('div');
                element.className = 'rested-player';

                // Determine color based on first letter
                const firstLetter = player.charAt(0).toUpperCase();
                let colorClass = '';

                if (firstLetter >= 'A' && firstLetter <= 'F') {
                    colorClass = 'color-dark-blue';
                } else if (firstLetter >= 'G' && firstLetter <= 'L') {
                    colorClass = 'color-black';
                } else if (firstLetter >= 'M' && firstLetter <= 'S') {
                    colorClass = 'color-dark-red';
                } else if (firstLetter >= 'T' && firstLetter <= 'Z') {
                    colorClass = 'color-dark-orange';
                }

                element.classList.add(colorClass);
                element.textContent = player;
                container.appendChild(element);

                // Add separator if not the last player
                if (index < players.length - 1) {
                    const separator = document.createElement('span');
                    separator.className = 'player-separator';
                    separator.textContent = ' - ';
                    container.appendChild(separator);
                }

            });
        }


        function startCountdown() {
            clearInterval(timerInterval);
            timerInterval = setInterval(() => {
                if (!isPaused) {
                    totalSeconds--;
                    updateTimerDisplay();

                    if (totalSeconds <= 0) {
                        handleSessionEnd();
                    }
                }
            }, 1000);
        }

        function updateTimerDisplay() {
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            document.getElementById('timer').textContent =
                `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }

        function handleSessionEnd() {
            console.log("Session end reached!");
            playBeeps(1000);
            currentSession++;
            updateCurrentSession(currentSession);
            PlayerAllocation(currentSession);
            const config = JSON.parse(localStorage.getItem('PlayDayConfig'));
            if (currentSession > config.nsession) {
                // Redirect to celebrations.html instead of showing an alert
                playBeeps(1000);
                currentSession = 0;
                updateCurrentSession(currentSession);
                // setTimeout(actionB, 10000);
                 window.location.href = 'celebrations.html';
                 clearInterval(timerInterval);
                return;
            }

            loadSession(currentSession);
            startCountdown();
        }

        function playBeeps(duration) {
            for (let i = 0; i < 10; i++) {
                setTimeout(() => {
                    playBeep(200);
                }, i * 300);
            }
        }

        function playBeep(duration) {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.type = 'sine';
            oscillator.frequency.value = 800;
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(1, audioContext.currentTime + 0.1);
            gainNode.gain.setValueAtTime(1, audioContext.currentTime + duration / 1000 - 0.1);
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration / 1000);
            oscillator.start(audioContext.currentTime);
            const stopTime = audioContext.currentTime + duration / 1000;
            oscillator.stop(stopTime);
        }

        function fiveMinuteBeep() {
            playBeep(200);
        }

        function updateSessionDuration(newDuration) {
            const config = JSON.parse(localStorage.getItem('PlayDayConfig'));
            config.sduration = newDuration;
            localStorage.setItem('PlayDayConfig', JSON.stringify(config));

            loadSession(currentSession);
            startCountdown();
        }

        function goToNextSession() {
            const config = JSON.parse(localStorage.getItem('PlayDayConfig'));
            if (currentSession < config.nsession) {
                currentSession++;
                updateCurrentSession(currentSession);
                PlayerAllocation(currentSession);
                loadSession(currentSession);
                startCountdown();
            }
        }

        function goToPreviousSession() {
            if (currentSession > 1) {
                currentSession--;
                loadSession(currentSession);
                startCountdown();
            }
        }

        function resetSession() {
            loadSession(currentSession);
            startCountdown();
        }

        // Function to toggle pause/resume
        function togglePause() {
            isPaused = !isPaused;
            const pauseBtn = document.getElementById('pause-btn');
            pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
        }

        // Function to toggle visibility of setting buttons
        function toggleSettingButtons() {
            const settingButtons = document.getElementById('setting-buttons');
            settingButtons.classList.toggle('show');
        }

        // Function to toggle fullscreen
        function toggleFullScreen() {
            if (!document.fullscreenElement &&    // alternative standard method
                !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {  // current working methods
                if (document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen();
                } else if (document.documentElement.msRequestFullscreen) {
                    document.documentElement.msRequestFullscreen();
                } else if (document.documentElement.mozRequestFullScreen) {
                    document.documentElement.mozRequestFullScreen();
                } else if (document.documentElement.webkitRequestFullscreen) {
                    document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                } else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                }
            }
        }

        window.onload = initialize;

        function PlayerAllocation(SessionID) {
            const PlayDayConfig = JSON.parse(localStorage.getItem("PlayDayConfig"));
            // convert to integer
            const nsession = parseInt(PlayDayConfig.nsession);
            let sessionNum = `S${SessionID}`;
            const sessionType = PlayDayConfig[sessionNum];
            switch (sessionType) {
                case "Basic1": Simple1(SessionID); break;
                case "Basic2": Simple2(SessionID); break;
                case "Basic3": Simple3(SessionID); break;
                case "Basic4": Simple4(SessionID); break;
                case "MixedDiv1": MixedDiv1(SessionID); break;
                case "MixedDiv2": MixedDiv2(SessionID); break;
                case "MixedDiv3": MixedDiv3(SessionID); break;
                case "MixedDiv4": MixedDiv4(SessionID); break;
                default: console.log(`Unknown session type: ${sessionType}`);
            }
        }

        
        function Simple1(SessionID) {
            allocatePlayers(SessionID, 'Primary_Division', 'highest');
        }
        
        function Simple2(SessionID) {
            allocatePlayersReverse(SessionID, 'Primary_Division', 'lowest');
        }
        
        function Simple3(SessionID) {
            allocatePlayers(SessionID, 'Secondary_Division', 'highest');
        }
        
        function Simple4(SessionID) {
            allocatePlayersReverse(SessionID, 'Secondary_Division', 'lowest');
        }
        
        function MixedDiv1(SessionID) {
            let PlayingToday = JSON.parse(localStorage.getItem("PlayingToday"));
            const PlayDayConfig = JSON.parse(localStorage.getItem("PlayDayConfig"));
        
            initializeAllocation(PlayingToday);
            const { actualcourts, resting } = calculateCourts(PlayingToday, PlayDayConfig);
        
            PlayingToday.sort((a, b) => sortPlayersMixed(a, b));
        
            const restedPlayers = allocateRestingPlayers(PlayingToday, resting);
            localStorage.setItem(`Session_${SessionID}_RestedPlayers`, JSON.stringify(restedPlayers));
        
            const sessionAllocation = [];
            for (let courtId = 1; courtId <= actualcourts; courtId++) {
                const courtPrefix = `Court${courtId}`;
                const courtAllocation = {};
                let availablePlayers = PlayingToday.filter(p => p.alloted === 0);
        
                // Allocate Player 1 and 2 (highest division)
                for (let i = 1; i <= 2; i++) {
                    if (availablePlayers.length > 0) {
                        let maxDivision = Math.max(...availablePlayers.map(p => parseFloat(p.Primary_Division)));
                        let eligiblePlayers = availablePlayers.filter(p => parseFloat(p.Primary_Division) === maxDivision);
                        let selectedPlayer = eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];
                        courtAllocation[`${courtPrefix}P${i}`] = selectedPlayer.name;
                        selectedPlayer.alloted = 1;
                        selectedPlayer.played = (selectedPlayer.played || 0) + 1;
                        availablePlayers = availablePlayers.filter(p => p !== selectedPlayer);
                    } else {
                        courtAllocation[`${courtPrefix}P${i}`] = "No player available";
                    }
                }
        
                // Allocate Player 3 and 4 (lower division)
                let targetDivision = courtAllocation[`${courtPrefix}P1`] !== "No player available" 
                    ? parseFloat(PlayingToday.find(p => p.name === courtAllocation[`${courtPrefix}P1`]).Primary_Division)
                    : Math.max(...availablePlayers.map(p => parseFloat(p.Primary_Division)));
        
                for (let i = 3; i <= 4; i++) {
                    if (availablePlayers.length > 0) {
                        let eligiblePlayers = [];
                        for (let diff of [1.5, 1, 0.5, 0]) {
                            eligiblePlayers = availablePlayers.filter(p => parseFloat(p.Primary_Division) === targetDivision - diff);
                            if (eligiblePlayers.length > 0) break;
                        }
                        if (eligiblePlayers.length === 0) {
                            const maxDivision = Math.max(...availablePlayers.map(p => 
                              parseFloat(p.Primary_Division)
                            ));
                            eligiblePlayers = availablePlayers.filter(p => 
                              parseFloat(p.Primary_Division) === maxDivision
                            );
                        }
                        let selectedPlayer = eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];
                        courtAllocation[`${courtPrefix}P${i}`] = selectedPlayer.name;
                        selectedPlayer.alloted = 1;
                        selectedPlayer.played = (selectedPlayer.played || 0) + 1;
                        availablePlayers = availablePlayers.filter(p => p !== selectedPlayer);
                    } else {
                        courtAllocation[`${courtPrefix}P${i}`] = "No player available";
                    }
                }
        
                sessionAllocation.push(Object.values(courtAllocation));
            }
        
            // Update localStorage with the modified PlayingToday array
            localStorage.setItem("PlayingToday", JSON.stringify(PlayingToday));
        
            storeAndPrintAllocation(SessionID, sessionAllocation, PlayDayConfig);
        }
        
        
        function MixedDiv2(SessionID) {
            let PlayingToday = JSON.parse(localStorage.getItem("PlayingToday"));
            const PlayDayConfig = JSON.parse(localStorage.getItem("PlayDayConfig"));
        
            initializeAllocation(PlayingToday);
            const { actualcourts, resting } = calculateCourts(PlayingToday, PlayDayConfig);
        
            PlayingToday.sort((a, b) => sortPlayersMixed(a, b));
        
            const restedPlayers = allocateRestingPlayers(PlayingToday, resting);
            localStorage.setItem(`Session_${SessionID}_RestedPlayers`, JSON.stringify(restedPlayers));
        
            const sessionAllocation = [];
            for (let courtId = 1; courtId <= actualcourts; courtId++) {
                const courtPrefix = `Court${courtId}`;
                const courtAllocation = {};
                let availablePlayers = PlayingToday.filter(p => p.alloted === 0);
        
                // Allocate Player 1 and 2 (lowest division)
                for (let i = 1; i <= 2; i++) {
                    if (availablePlayers.length > 0) {
                        let minDivision = Math.min(...availablePlayers.map(p => parseFloat(p.Primary_Division)));
                        let eligiblePlayers = availablePlayers.filter(p => parseFloat(p.Primary_Division) === minDivision);
                        let selectedPlayer = eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];
                        courtAllocation[`${courtPrefix}P${i}`] = selectedPlayer.name;
                        selectedPlayer.alloted = 1;
                        selectedPlayer.played = (selectedPlayer.played || 0) + 1;
                        availablePlayers = availablePlayers.filter(p => p !== selectedPlayer);
                    } else {
                        courtAllocation[`${courtPrefix}P${i}`] = "No player available";
                    }
                }
        
                // Allocate Player 3 and 4 (higher division)
                let targetDivision = courtAllocation[`${courtPrefix}P1`] !== "No player available" 
                    ? parseFloat(PlayingToday.find(p => p.name === courtAllocation[`${courtPrefix}P1`]).Primary_Division)
                    : Math.min(...availablePlayers.map(p => parseFloat(p.Primary_Division)));
        
                for (let i = 3; i <= 4; i++) {
                    if (availablePlayers.length > 0) {
                        let eligiblePlayers = [];
                        for (let diff of [1.5, 1, 0.5, 0]) {
                            eligiblePlayers = availablePlayers.filter(p => parseFloat(p.Primary_Division) === targetDivision + diff);
                            if (eligiblePlayers.length > 0) break;
                        }
                        if (eligiblePlayers.length === 0) {
                            const minDivision = Math.min(...availablePlayers.map(p => 
                              parseFloat(p.Primary_Division)
                            ));
                            eligiblePlayers = availablePlayers.filter(p => 
                              parseFloat(p.Primary_Division) === minDivision
                            );
                        }
                        let selectedPlayer = eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];
                        courtAllocation[`${courtPrefix}P${i}`] = selectedPlayer.name;
                        selectedPlayer.alloted = 1;
                        selectedPlayer.played = (selectedPlayer.played || 0) + 1;
                        availablePlayers = availablePlayers.filter(p => p !== selectedPlayer);
                    } else {
                        courtAllocation[`${courtPrefix}P${i}`] = "No player available";
                    }
                }
        
                sessionAllocation.push(Object.values(courtAllocation));
            }
        
            localStorage.setItem("PlayingToday", JSON.stringify(PlayingToday));
            storeAndPrintAllocation(SessionID, sessionAllocation, PlayDayConfig);
        }
        
        function MixedDiv3(SessionID) {
            let PlayingToday = JSON.parse(localStorage.getItem("PlayingToday"));
            const PlayDayConfig = JSON.parse(localStorage.getItem("PlayDayConfig"));
        
            initializeAllocation(PlayingToday);
            const { actualcourts, resting } = calculateCourts(PlayingToday, PlayDayConfig);
        
            PlayingToday.sort((a, b) => sortPlayersMixed(a, b));
        
            const restedPlayers = allocateRestingPlayers(PlayingToday, resting);
            localStorage.setItem(`Session_${SessionID}_RestedPlayers`, JSON.stringify(restedPlayers));
        
            const sessionAllocation = [];
            for (let courtId = 1; courtId <= actualcourts; courtId++) {
                const courtPrefix = `Court${courtId}`;
                const courtAllocation = {};
                let availablePlayers = PlayingToday.filter(p => p.alloted === 0);
        
                // Allocate Player 1 and 2 (highest division)
                for (let i = 1; i <= 2; i++) {
                    if (availablePlayers.length > 0) {
                        let maxDivision = Math.max(...availablePlayers.map(p => parseFloat(p.Primary_Division)));
                        let eligiblePlayers = availablePlayers.filter(p => parseFloat(p.Primary_Division) === maxDivision);
                        let selectedPlayer = eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];
                        courtAllocation[`${courtPrefix}P${i}`] = selectedPlayer.name;
                        selectedPlayer.alloted = 1;
                        selectedPlayer.played = (selectedPlayer.played || 0) + 1;
                        availablePlayers = availablePlayers.filter(p => p !== selectedPlayer);
                    } else {
                        courtAllocation[`${courtPrefix}P${i}`] = "No player available";
                    }
                }
        
                // Allocate Player 3 and 4 (lower division)
                let targetDivision = courtAllocation[`${courtPrefix}P1`] !== "No player available" 
                    ? parseFloat(PlayingToday.find(p => p.name === courtAllocation[`${courtPrefix}P1`]).Primary_Division)
                    : Math.max(...availablePlayers.map(p => parseFloat(p.Secondary_Division)));
        
                for (let i = 3; i <= 4; i++) {
                    if (availablePlayers.length > 0) {
                        let eligiblePlayers = [];
                        for (let diff of [1.5, 1, 0.5, 0]) {
                            eligiblePlayers = availablePlayers.filter(p => parseFloat(p.Secondary_Division) === targetDivision - diff);
                            if (eligiblePlayers.length > 0) break;
                        }
                        if (eligiblePlayers.length === 0) {
                            const maxDivision = Math.max(...availablePlayers.map(p => 
                              parseFloat(p.Secondary_Division)
                            ));
                            eligiblePlayers = availablePlayers.filter(p => 
                              parseFloat(p.Secondary_Division) === maxDivision
                            );
                        }
                        let selectedPlayer = eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];
                        courtAllocation[`${courtPrefix}P${i}`] = selectedPlayer.name;
                        selectedPlayer.alloted = 1;
                        selectedPlayer.played = (selectedPlayer.played || 0) + 1;
                        availablePlayers = availablePlayers.filter(p => p !== selectedPlayer);
                    } else {
                        courtAllocation[`${courtPrefix}P${i}`] = "No player available";
                    }
                }
        
                sessionAllocation.push(Object.values(courtAllocation));
            }
        
            localStorage.setItem("PlayingToday", JSON.stringify(PlayingToday));
            storeAndPrintAllocation(SessionID, sessionAllocation, PlayDayConfig);
        }
        
        function MixedDiv4(SessionID) {
            let PlayingToday = JSON.parse(localStorage.getItem("PlayingToday"));
            const PlayDayConfig = JSON.parse(localStorage.getItem("PlayDayConfig"));
        
            initializeAllocation(PlayingToday);
            const { actualcourts, resting } = calculateCourts(PlayingToday, PlayDayConfig);
        
            PlayingToday.sort((a, b) => sortPlayersMixed(a, b));
        
            const restedPlayers = allocateRestingPlayers(PlayingToday, resting);
            localStorage.setItem(`Session_${SessionID}_RestedPlayers`, JSON.stringify(restedPlayers));
        
            const sessionAllocation = [];
            for (let courtId = 1; courtId <= actualcourts; courtId++) {
                const courtPrefix = `Court${courtId}`;
                const courtAllocation = {};
                let availablePlayers = PlayingToday.filter(p => p.alloted === 0);
        
                // Allocate Player 1 and 2 (lowest division)
                for (let i = 1; i <= 2; i++) {
                    if (availablePlayers.length > 0) {
                        let minDivision = Math.min(...availablePlayers.map(p => parseFloat(p.Secondary_Division)));
                        let eligiblePlayers = availablePlayers.filter(p => parseFloat(p.Secondary_Division) === minDivision);
                        let selectedPlayer = eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];
                        courtAllocation[`${courtPrefix}P${i}`] = selectedPlayer.name;
                        selectedPlayer.alloted = 1;
                        selectedPlayer.played = (selectedPlayer.played || 0) + 1;
                        availablePlayers = availablePlayers.filter(p => p !== selectedPlayer);
                    } else {
                        courtAllocation[`${courtPrefix}P${i}`] = "No player available";
                    }
                }
        
                // Allocate Player 3 and 4 (higher division)
                let targetDivision = courtAllocation[`${courtPrefix}P1`] !== "No player available" 
                    ? parseFloat(PlayingToday.find(p => p.name === courtAllocation[`${courtPrefix}P1`]).Secondary_Division)
                    : Math.min(...availablePlayers.map(p => parseFloat(p.Secondary_Division)));
        
                for (let i = 3; i <= 4; i++) {
                    if (availablePlayers.length > 0) {
                        let eligiblePlayers = [];
                        for (let diff of [1.5, 1, 0.5, 0]) {
                            eligiblePlayers = availablePlayers.filter(p => parseFloat(p.Secondary_Division) === targetDivision + diff);
                            if (eligiblePlayers.length > 0) break;
                        }
                        if (eligiblePlayers.length === 0) {
                            const minDivision = Math.min(...availablePlayers.map(p => 
                              parseFloat(p.Secondary_Division)
                            ));
                            eligiblePlayers = availablePlayers.filter(p => 
                              parseFloat(p.Secondary_Division) === minDivision
                            );
                        }
                        let selectedPlayer = eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];
                        courtAllocation[`${courtPrefix}P${i}`] = selectedPlayer.name;
                        selectedPlayer.alloted = 1;
                        selectedPlayer.played = (selectedPlayer.played || 0) + 1;
                        availablePlayers = availablePlayers.filter(p => p !== selectedPlayer);
                    } else {
                        courtAllocation[`${courtPrefix}P${i}`] = "No player available";
                    }
                }
        
                sessionAllocation.push(Object.values(courtAllocation));
            }
        
            localStorage.setItem("PlayingToday", JSON.stringify(PlayingToday));
            storeAndPrintAllocation(SessionID, sessionAllocation, PlayDayConfig);
        }
        
        function allocatePlayers(SessionID, divisionType, selectionType) {
            const PlayingToday = JSON.parse(localStorage.getItem("PlayingToday"));
            const PlayDayConfig = JSON.parse(localStorage.getItem("PlayDayConfig"));
        
            initializeAllocation(PlayingToday);
            const { actualcourts, resting } = calculateCourts(PlayingToday, PlayDayConfig);
        
            PlayingToday.sort((a, b) => sortPlayers(a, b));
        
            const restedPlayers = allocateRestingPlayers(PlayingToday, resting);
            localStorage.setItem(`Session_${SessionID}_RestedPlayers`, JSON.stringify(restedPlayers));
        
            const sessionAllocation = [];
            for (let courtId = 1; courtId <= actualcourts; courtId++) {
                const courtAllocation = [];
                for (let i = 0; i < 4; i++) {
                 const playerName = selectPlayer(PlayingToday, divisionType, selectionType);
                 if (playerName) {
                     courtAllocation.push(playerName);
                 } else {
                     console.log("No player selected");
                 }
                }
                sessionAllocation.push(courtAllocation);
            }
        
            storeAndPrintAllocation(SessionID, sessionAllocation, PlayDayConfig);
        }
        
        function allocatePlayersReverse(SessionID, divisionType, selectionType) {
            const PlayingToday = JSON.parse(localStorage.getItem("PlayingToday"));
            const PlayDayConfig = JSON.parse(localStorage.getItem("PlayDayConfig"));
        
            initializeAllocation(PlayingToday);
            const { actualcourts, resting } = calculateCourts(PlayingToday, PlayDayConfig);
        
            PlayingToday.sort((a, b) => sortPlayers(a, b));
        
            const restedPlayers = allocateRestingPlayers(PlayingToday, resting);
            localStorage.setItem(`Session_${SessionID}_RestedPlayers`, JSON.stringify(restedPlayers));
        
            const sessionAllocation = [];
            for (let courtId = 1; courtId <= actualcourts; courtId++) {
                const courtAllocation = [];
                for (let i = 0; i < 4; i++) {
                 const playerName = selectPlayerReverse(PlayingToday, divisionType, selectionType);
                 if (playerName) {
                     courtAllocation.push(playerName);
                 } else {
                     console.log("No player selected");
                 }
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
                updatePlayerInLocalStorage(player);
            }
            return restedPlayers;
        }
        
        function selectPlayer(PlayingToday, divisionType, selectionType) {
            console.log("Function called with divisionType:", divisionType);
            console.log("PlayingToday length:", PlayingToday.length);
            
            const availablePlayers = PlayingToday.filter(p => p.alloted === 0);
            console.log("Available players:", availablePlayers.length);
        
            if (availablePlayers.length === 0) {
                console.log("No available players");
                return null;
            }
        
            const validPlayers = availablePlayers.filter(p => {
                const divisionProperty = Object.keys(p).find(key => key.toLowerCase() === divisionType.toLowerCase());
                if (!divisionProperty) {
                    console.log(`Division property not found for player ${p.Player}`);
                    return false;
                }
                const divValue = parseFloat(p[divisionProperty]);
                console.log(`Player ${p.Player}, ${divisionProperty}: ${p[divisionProperty]}, parsed: ${divValue}`);
                return !isNaN(divValue);
            });
            console.log("Valid players (with numeric division):", validPlayers.length);
        
            if (validPlayers.length === 0) {
                console.log(`No players with valid numeric ${divisionType}`);
                return null;
            }
        
            let maxDivision = Math.max(...validPlayers.map(p => parseFloat(p[divisionType])));
            console.log("Max division:", maxDivision);
        
            let eligiblePlayers = validPlayers.filter(p => parseFloat(p[divisionType]) === maxDivision);
            console.log("Eligible players:", eligiblePlayers.length);
        
            if (eligiblePlayers.length === 0) {
                console.log("No eligible players found");
                return null;
            }
        
            let player = eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];
            
            if (player) {
                console.log("Selected player:", player.Player);
                player.alloted = 1;
                player.played++;
                updatePlayerInLocalStorage(player);
                console.log("Returning player:", player.Player);
                return player.Player;
            } else {
                console.log("Failed to select a player");
                return null;
            }
        }
        
        function selectPlayerReverse(PlayingToday, divisionType, selectionType) {
            console.log("Function called with divisionType:", divisionType);
            console.log("PlayingToday length:", PlayingToday.length);
            
            const availablePlayers = PlayingToday.filter(p => p.alloted === 0);
            console.log("Available players:", availablePlayers.length);
        
            if (availablePlayers.length === 0) {
                console.log("No available players");
                return null;
            }
        
            const validPlayers = availablePlayers.filter(p => {
                const divisionProperty = Object.keys(p).find(key => key.toLowerCase() === divisionType.toLowerCase());
                if (!divisionProperty) {
                    console.log(`Division property not found for player ${p.Player}`);
                    return false;
                }
                const divValue = parseFloat(p[divisionProperty]);
                console.log(`Player ${p.Player}, ${divisionProperty}: ${p[divisionProperty]}, parsed: ${divValue}`);
                return !isNaN(divValue);
            });
            console.log("Valid players (with numeric division):", validPlayers.length);
        
            if (validPlayers.length === 0) {
                console.log(`No players with valid numeric ${divisionType}`);
                return null;
            }
        
            let minDivision = Math.min(...validPlayers.map(p => parseFloat(p[divisionType])));
            console.log("Min division:", minDivision);
        
            let eligiblePlayers = validPlayers.filter(p => parseFloat(p[divisionType]) === minDivision);
            console.log("Eligible players:", eligiblePlayers.length);
        
            if (eligiblePlayers.length === 0) {
                console.log("No eligible players found");
                return null;
            }
        
            let player = eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];
            
            if (player) {
                console.log("Selected player:", player.Player);
                player.alloted = 1;
                player.played++;
                updatePlayerInLocalStorage(player);
                console.log("Returning player:", player.Player);
                return player.Player;
            } else {
                console.log("Failed to select a player");
                return null;
            }
        }
        
        function updatePlayerInLocalStorage(player) {
            const PlayingToday = JSON.parse(localStorage.getItem("PlayingToday"));
            const index = PlayingToday.findIndex(p => p.name === player.name);
            if (index !== -1) {
                PlayingToday[index] = player;
                localStorage.setItem("PlayingToday", JSON.stringify(PlayingToday));
            }
        }
        
        function storeAndPrintAllocation(SessionID, sessionAllocation, PlayDayConfig) {
            localStorage.setItem(`Session_${SessionID}`, JSON.stringify(sessionAllocation));
            console.log(`Session: ${SessionID}`);
            
            // Print court allocations
            sessionAllocation.forEach((court, index) => {
                console.log(`Court ${PlayDayConfig.courts[index]}: ${court.join(', ')}`);
            });
            
            // Print rested players
            const restedPlayers = JSON.parse(localStorage.getItem(`Session_${SessionID}_RestedPlayers`));
            console.log(`Rested Players: ${restedPlayers.join(', ')}`);
        
            // Update HTML output if needed
            const outputElement = document.getElementById('output');
            if (outputElement) {
                outputElement.innerHTML += `<h3>Session: ${SessionID}</h3>`;
                sessionAllocation.forEach((court, index) => {
                    outputElement.innerHTML += `<p>Court ${PlayDayConfig.courts[index]}: ${court.join(', ')}</p>`;
                });
                outputElement.innerHTML += `<p>Rested Players: ${restedPlayers.join(', ')}</p>`;
            }
        }
      
         function createCurrentSession() {
             if (localStorage.getItem('PlayDayConfig')) {
                 const config = JSON.parse(localStorage.getItem('PlayDayConfig'));
                 if ('currentSession' in config) {
                     currentSession = config.currentSession;
                     if (currentSession === 0) {
                         currentSession = 1;
                         config.currentSession = currentSession;
                         localStorage.setItem('PlayDayConfig', JSON.stringify(config));
                     }
                 } else {
                     currentSession = 1;
                     config.currentSession = currentSession;
                     localStorage.setItem('PlayDayConfig', JSON.stringify(config));
                 }
             } else {
                 currentSession = 1;
                 const defaultConfig = {
                     currentSession: currentSession,
                     nsession: 3,
                     sduration: 45,
                     courts: ["Court1", "Court2", "Court3", "Court4", "Court5", "Court6"]
                 };
                 localStorage.setItem('PlayDayConfig', JSON.stringify(defaultConfig));
             }
             console.log('Current Session:', currentSession);
         }
         
         function updateCurrentSession(newSessionValue) {
             currentSession = newSessionValue;
             storeCurrentSession();
         }
         
         function storeCurrentSession() {
             const config = JSON.parse(localStorage.getItem('PlayDayConfig'));
             config.currentSession = currentSession;
             localStorage.setItem('PlayDayConfig', JSON.stringify(config));
         }