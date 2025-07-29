const TICKET_TYPES = ['incident', 'request', 'change'];
const SERVICES = ['Hardware', 'Software', 'Network', 'Access', 'Email', 'Database'];

let gameState = {
    players: [],
    currentPlayer: 0,
    round: 1,
    totalRounds: 10,
    deck: [],
    resolvedCount: 0,
    escalationRate: 2
};

const TICKET_TEMPLATES = [
    {type: 'incident', titles: ['Server Down', 'Network Outage', 'Application Crash', 'Database Error', 'Service Unavailable']},
    {type: 'request', titles: ['Password Reset', 'Software Install', 'Access Request', 'Account Setup', 'Email Configuration']},
    {type: 'change', titles: ['System Upgrade', 'Policy Update', 'Infrastructure Change', 'Security Patch', 'Configuration Modify']}
];

function createDeck() {
    const deck = [];
    for (let i = 0; i < 60; i++) {
        const type = TICKET_TYPES[Math.floor(Math.random() * TICKET_TYPES.length)];
        const service = SERVICES[Math.floor(Math.random() * SERVICES.length)];
        const template = TICKET_TEMPLATES.find(t => t.type === type);
        const title = template.titles[Math.floor(Math.random() * template.titles.length)];
        
        let baseTime = type === 'incident' ? 1 : type === 'request' ? 2 : 3;
        baseTime += Math.floor(Math.random() * 2);
        
        deck.push({
            id: `ticket_${i}`,
            type: type,
            service: service,
            title: title,
            timeRequired: baseTime,
            turnsActive: 0
        });
    }
    return shuffleDeck(deck);
}

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function startGame() {
    const playerCount = parseInt(document.getElementById('playerCount').value);
    const difficulty = document.getElementById('difficulty').value;
    const escalation = document.getElementById('escalation').value;
    
    gameState.totalRounds = difficulty === 'easy' ? 12 : difficulty === 'normal' ? 10 : 8;
    gameState.escalationRate = escalation === 'low' ? 1 : escalation === 'medium' ? 2 : 3;
    gameState.deck = createDeck();
    gameState.players = [];

    for (let i = 0; i < playerCount; i++) {
        gameState.players.push({
            id: i,
            name: `Player ${i + 1}`,
            tickets: [],
            stress: 0,
            score: 0,
            expertise: {
                Hardware: 0, Software: 0, Network: 0,
                Access: 0, Email: 0, Database: 0
            },
            selectedTickets: [],
            selectedExpertise: null,
            actionTaken: false
        });
    }

    document.getElementById('setup').style.display = 'none';
    document.getElementById('gameArea').style.display = 'grid';
    
    drawInitialTickets();
    updateDisplay();
}

function drawInitialTickets() {
    gameState.players.forEach(player => {
        for (let i = 0; i < 3; i++) {
            if (gameState.deck.length > 0) {
                player.tickets.push(gameState.deck.pop());
            }
        }
    });
}

function drawNewTickets() {
    const ticketsPerRound = Math.min(2 + Math.floor(gameState.round / 3), 4);
    
    gameState.players.forEach(player => {
        for (let i = 0; i < ticketsPerRound; i++) {
            if (gameState.deck.length > 0) {
                player.tickets.push(gameState.deck.pop());
            }
        }
    });
}

function updateDisplay() {
    document.getElementById('currentRound').textContent = gameState.round;
    document.getElementById('totalRounds').textContent = gameState.totalRounds;
    document.getElementById('deckCount').textContent = gameState.deck.length;
    document.getElementById('resolvedTickets').textContent = gameState.resolvedCount;
    
    let totalActiveTickets = 0;
    gameState.players.forEach(player => {
        totalActiveTickets += player.tickets.length;
    });
    document.getElementById('activeTickets').textContent = totalActiveTickets;
    
    document.getElementById('currentPlayerName').textContent = gameState.players[gameState.currentPlayer].name;
    
    renderPlayers();
}

function renderPlayers() {
    const container = document.getElementById('playersContainer');
    container.innerHTML = '';

    gameState.players.forEach((player, index) => {
        const playerDiv = document.createElement('div');
        playerDiv.className = `player-area ${index === gameState.currentPlayer ? 'active' : ''}`;
        
        const stressPercent = Math.min((player.stress / 100) * 100, 100);
        
        playerDiv.innerHTML = `
                    <div class="player-header">
                        <div class="player-name">${player.name}</div>
                        <div class="stress-meter">
                            <span>Stress: ${player.stress}/100</span>
                            <div class="stress-bar">
                                <div class="stress-fill" style="width: ${stressPercent}%"></div>
                            </div>
                        </div>
                        <div>Score: ${player.score}</div>
                    </div>

                    <div class="tickets-container">
                        ${player.tickets.map(ticket => `
            <div class="ticket ${ticket.type} ${player.selectedTickets.includes(ticket.id) ? 'selected' : ''}" 
        onclick="toggleTicketSelection(${index}, '${ticket.id}')">
            <div class="ticket-type">${ticket.type}</div>
            <div class="ticket-title">${ticket.title}</div>
            <div class="ticket-service">${ticket.service}</div>
            <div class="ticket-time">${getEffectiveTime(player, ticket)} turns</div>
            ${ticket.turnsActive > 0 ? `<div style="color: #f7b801; font-size: 0.8em;">Escalating: ${ticket.turnsActive} turns</div>` : ''}
        </div>
            `).join('')}
                    </div>

                    ${index === gameState.currentPlayer ? `
            <div class="expertise-area">
            <h4>Expertise Training</h4>
            <div class="expertise-grid">
            ${Object.entries(player.expertise).map(([service, level]) => `
                                    <div class="expertise-item ${player.selectedExpertise === service ? 'selected' : ''}" 
                                         onclick="selectExpertise(${index}, '${service}')">
                                        <div>${service}</div>
                                        <div class="expertise-level">Level ${level}</div>
                                    </div>
                                `).join('')}
        </div>
            </div>

            <div class="actions-area">
            <div class="action-buttons">
            <button class="action-btn" onclick="clearSelections()" 
        ${!player.actionTaken ? '' : 'disabled'}>Clear</button>
            </div>
            </div>
            ` : ''}
                `;
        
        container.appendChild(playerDiv);
    });
}

function toggleTicketSelection(playerIndex, ticketId) {
    if (playerIndex !== gameState.currentPlayer) return;
    
    const player = gameState.players[playerIndex];
    if (player.actionTaken) return;
    
    // Clear expertise selection if selecting tickets
    player.selectedExpertise = null;
    
    const index = player.selectedTickets.indexOf(ticketId);
    if (index > -1) {
        player.selectedTickets.splice(index, 1);
    } else {
        player.selectedTickets.push(ticketId);
    }
    
    updateActionButtons();
    renderPlayers();
}

function selectExpertise(playerIndex, service) {
    if (playerIndex !== gameState.currentPlayer) return;
    
    const player = gameState.players[playerIndex];
    if (player.actionTaken) return;
    
    // Clear ticket selections if selecting expertise
    player.selectedTickets = [];
    
    player.selectedExpertise = player.selectedExpertise === service ? null : service;
    
    updateActionButtons();
    renderPlayers();
}

function clearSelections() {
    const player = gameState.players[gameState.currentPlayer];
    if (player.actionTaken) return;
    
    player.selectedTickets = [];
    player.selectedExpertise = null;
    updateActionButtons();
    renderPlayers();
}

function updateActionButtons() {
    const player = gameState.players[gameState.currentPlayer];
    const hasSelection = player.selectedTickets.length > 0 || player.selectedExpertise;
    
    document.getElementById('endTurnBtn').disabled = !hasSelection || player.actionTaken;
}

function getEffectiveTime(player, ticket) {
    const expertiseLevel = player.expertise[ticket.service] || 0;
    return Math.max(1, ticket.timeRequired - expertiseLevel);
}

function endTurn() {
    const player = gameState.players[gameState.currentPlayer];
    
    if (player.selectedTickets.length > 0) {
        // Resolve selected tickets
        player.selectedTickets.forEach(ticketId => {
            const ticketIndex = player.tickets.findIndex(t => t.id === ticketId);
            if (ticketIndex > -1) {
                const ticket = player.tickets[ticketIndex];
                const points = ticket.type === 'incident' ? 3 : ticket.type === 'request' ? 2 : 4;
                player.score += points + (ticket.turnsActive > 0 ? Math.floor(ticket.turnsActive / 2) : 0);
                player.tickets.splice(ticketIndex, 1);
                gameState.resolvedCount++;
            }
        });
    } else if (player.selectedExpertise) {
        // Train expertise
        player.expertise[player.selectedExpertise]++;
        player.score += 1; // Small bonus for training
    }
    
    // Age remaining tickets and increase stress
    player.tickets.forEach(ticket => {
        ticket.turnsActive++;
        if (ticket.turnsActive > 1) {
            const stressIncrease = ticket.type === 'incident' ? 3 : ticket.type === 'change' ? 2 : 1;
            player.stress += stressIncrease * gameState.escalationRate;
        }
    });
    
    // Clear selections
    player.selectedTickets = [];
    player.selectedExpertise = null;
    player.actionTaken = true;
    
    // Check if all players have taken their turn
    const allPlayersDone = gameState.players.every(p => p.actionTaken);
    
    if (allPlayersDone) {
        nextRound();
    } else {
        // Move to next player
        do {
            gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.players.length;
        } while (gameState.players[gameState.currentPlayer].actionTaken);
    }
    
    updateDisplay();
}

function nextRound() {
    // Check for game over conditions
    const gameOver = gameState.players.some(p => p.stress >= 100);
    
    if (gameOver || gameState.round >= gameState.totalRounds) {
        endGame();
        return;
    }
    
    gameState.round++;
    gameState.currentPlayer = 0;
    
    // Reset player turn status
    gameState.players.forEach(p => {
        p.actionTaken = false;
    });
    
    // Draw new tickets for all players
    drawNewTickets();
    
    updateDisplay();
}

function endGame() {
    const modal = document.getElementById('gameOverModal');
    const title = document.getElementById('gameOverTitle');
    const message = document.getElementById('gameOverMessage');
    const scores = document.getElementById('finalScores');
    
    const gameOverByStress = gameState.players.some(p => p.stress >= 100);
    const survived = gameState.round >= gameState.totalRounds;
    
    if (gameOverByStress) {
        title.textContent = 'Service Desk Overloaded!';
        message.textContent = 'The team became overwhelmed by escalating tickets. Better ITIL practices needed!';
    } else if (survived) {
        title.textContent = 'ITIL Mastery Achieved!';
        message.textContent = 'Congratulations! You successfully managed the service desk through all rounds!';
    }
    
    // Sort players by score
    const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);
    
    scores.innerHTML = '<h3>Final Scores:</h3>' + 
        sortedPlayers.map((p, i) => 
            `<div>${i + 1}. ${p.name}: ${p.score} points (Stress: ${p.stress})</div>`
        ).join('');
    
    modal.style.display = 'flex';
}

// Initialize the game when page loads
updateActionButtons();
