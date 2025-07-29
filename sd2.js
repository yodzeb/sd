
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
    for (let i = 0; i < 120; i++) {
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
    
    gameState.totalRounds = difficulty === 'easy' ? 30 : difficulty === 'normal' ? 10 : 8;
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
    const ticketsPerRound = Math.min(1 + Math.floor(gameState.round / 3), 6);
    
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
    //player.selectedExpertise = null;
    
    const index = player.selectedTickets.indexOf(ticketId);
    if (index > -1) {
        player.selectedTickets.splice(index, 1);
    } else {
        player.selectedTickets.push(ticketId);
    }
    
    updateActionButtons();
    updateSelectedCost();
    renderPlayers();
}

function selectExpertise(playerIndex, service) {
    if (playerIndex !== gameState.currentPlayer) return;
    
    const player = gameState.players[playerIndex];
    if (player.actionTaken) return;
    
    // Clear ticket selections if selecting expertise
    //player.selectedTickets = [];
    
    player.selectedExpertise = player.selectedExpertise === service ? null : service;
    
    updateActionButtons();
    updateSelectedCost();
    renderPlayers();
}

function updateSelectedCost() {
    const player = gameState.players[gameState.currentPlayer];
    if (!player) return;
    
    let totalCost = 0;
    
    if (player.selectedTickets.length > 0) {
        player.selectedTickets.forEach(ticketId => {
            const ticket = player.tickets.find(t => t.id === ticketId);
            if (ticket) {
                totalCost += getEffectiveTime(player, ticket);
            }
        });
    } else if (player.selectedExpertise) {
        totalCost = 2;
    }
    
    const costElement = document.getElementById('selectedCost');
    if (costElement) {
        costElement.textContent = `${totalCost} AP`;
        costElement.style.color = totalCost > getMaxActionPoints(player) ? '#e74c3c' : '#4ecdc4';
    }
}

function autoSelectEfficient() {
    const player = gameState.players[gameState.currentPlayer];
    if (player.actionTaken) return;
    
    // Clear current selections
    player.selectedTickets = [];
    player.selectedExpertise = null;
    
    // Sort tickets by efficiency (points per action point)
    const ticketEfficiency = player.tickets.map(ticket => {
        const effectiveTime = getEffectiveTime(player, ticket);
        let points = ticket.type === 'incident' ? 3 : ticket.type === 'request' ? 2 : 4;
        
        // Bonus/penalty for escalation
        if (ticket.turnsActive > 0) {
            points = Math.max(1, points - ticket.turnsActive);
        } else {
            points += 1; // Fresh ticket bonus
        }
        
        return {
            ticket,
            effectiveTime,
            efficiency: points / effectiveTime,
            urgency: ticket.type === 'incident' ? 10 : ticket.turnsActive * 2
        };
    }).sort((a, b) => {
        // Prioritize by urgency first, then efficiency
        if (a.urgency !== b.urgency) return b.urgency - a.urgency;
        return b.efficiency - a.efficiency;
    });
    
    // Select tickets that fit within action points
    const maxActions = getMaxActionPoints(player);
    let usedActions = 0;
    
    for (const {ticket, effectiveTime} of ticketEfficiency) {
        if (usedActions + effectiveTime <= maxActions) {
            player.selectedTickets.push(ticket.id);
            usedActions += effectiveTime;
        }
    }
    
    updateActionButtons();
    updateSelectedCost();
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
    if (!player) return;
    
    let hasValidSelection = false;
    let totalCost = 0;
    
    if (player.selectedTickets.length > 0) {
        player.selectedTickets.forEach(ticketId => {
            const ticket = player.tickets.find(t => t.id === ticketId);
            if (ticket) {
                totalCost += getEffectiveTime(player, ticket);
            }
        });
        hasValidSelection = totalCost <= getMaxActionPoints(player);
    } /*else*/
    if (player.selectedExpertise) {
        totalCost += 2;
        hasValidSelection = totalCost <= getMaxActionPoints(player);
    }
    
    const endTurnBtn = document.getElementById('endTurnBtn');
    if (endTurnBtn) {
        endTurnBtn.disabled = !hasValidSelection || player.actionTaken;
        endTurnBtn.textContent = player.actionTaken ? 'Turn Complete' : 
            hasValidSelection ? `End Turn (${totalCost} AP)` : 'End Turn';
    }
    document.getElementById('max-ap').innerHTML = `${ getMaxActionPoints(player) } max`;
    updateSelectedCost();
}

function getEffectiveTime(player, ticket) {
    const expertiseLevel = player.expertise[ticket.service] || 0;
    return Math.max(1, ticket.timeRequired - expertiseLevel);
}

function endTurn() {
    const player = gameState.players[gameState.currentPlayer];
    
    if (player.selectedTickets.length > 0) {
        // Calculate total action points needed
        let totalActionPoints = 0;
        const ticketsToResolve = [];
        
        player.selectedTickets.forEach(ticketId => {
            const ticket = player.tickets.find(t => t.id === ticketId);
            if (ticket) {
                const effectiveTime = getEffectiveTime(player, ticket);
                totalActionPoints += effectiveTime;
                ticketsToResolve.push({ticket, effectiveTime});
            }
        });
        
        // Check if player has enough action points (base 4 + expertise bonuses)
        const maxActions = getMaxActionPoints(player);
        
        if (totalActionPoints <= maxActions) {
            // Resolve all selected tickets
            ticketsToResolve.forEach(({ticket, effectiveTime}) => {
                const ticketIndex = player.tickets.findIndex(t => t.id === ticket.id);
                if (ticketIndex > -1) {
                    let points = ticket.type === 'incident' ? 3 : ticket.type === 'request' ? 2 : 4;
                    
                    // Bonus for expertise
                    const expertiseLevel = player.expertise[ticket.service] || 0;
                    points += expertiseLevel;
                    
                    // Penalty for escalated tickets, bonus for quick resolution
                    if (ticket.turnsActive > 0) {
                        points = Math.max(1, points - ticket.turnsActive);
                    } else {
                        points += 1; // Quick resolution bonus
                    }
                    
                    player.score += points;
                    player.tickets.splice(ticketIndex, 1);
                    gameState.resolvedCount++;
                    
                    // Gain micro-experience for resolving tickets
                    if (!player.microExperience) player.microExperience = {};
                    player.microExperience[ticket.service] = (player.microExperience[ticket.service] || 0) + 1;
                }
            });
            
            // Show successful resolution message
            showActionResult(`Resolved ${ticketsToResolve.length} tickets using ${totalActionPoints}/${maxActions} action points!`);
        } else {
            // Not enough action points - show error
            showActionResult(`Not enough action points! Need ${totalActionPoints}, have ${maxActions}. Select fewer tickets or train more.`, true);
            return; // Don't end turn
        }
        
    }
    if (player.selectedExpertise) {
        // Training costs 2 action points but gives expertise
        const trainingCost = 2;
        const maxActions = getMaxActionPoints(player);
        
        if (trainingCost <= maxActions) {
            player.expertise[player.selectedExpertise]++;
            player.score += 2; // Training bonus
            
            // Check for expertise milestones
            const newLevel = player.expertise[player.selectedExpertise];
            if (newLevel === 3) {
                player.score += 5; // Mastery bonus
                showActionResult(`${player.selectedExpertise} expertise mastered! +5 bonus points!`);
            } else {
                showActionResult(`Gained ${player.selectedExpertise} expertise (Level ${newLevel}). Future tickets 1 turn faster!`);
            }
        } else {
            showActionResult(`Training requires 2 action points, but you only have ${maxActions}!`, true);
            return;
        }
    }
    
    // Age remaining tickets and calculate stress
    let stressIncrease = 0;
    player.tickets.forEach(ticket => {
        ticket.turnsActive++;
        
        // Escalation stress based on ticket type and age
        if (ticket.turnsActive >= 1) {
            let ticketStress = 0;
            if (ticket.type === 'incident') {
                ticketStress = ticket.turnsActive * 4; // Incidents escalate fast
            } else if (ticket.type === 'change') {
                ticketStress = Math.floor(ticket.turnsActive / 2) * 2; // Changes escalate slowly
            } else {
                ticketStress = ticket.turnsActive; // Requests escalate normally
            }
            stressIncrease += ticketStress / 2.5;
        }
    });
    
    // Apply stress with escalation rate multiplier
    player.stress += Math.floor(stressIncrease * gameState.escalationRate);
    
    // Stress relief for good performance
    if (player.selectedTickets.length > 2) {
        player.stress = Math.max(0, player.stress - 2); // Efficiency bonus
    }
    
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
    updateActionButtons();
}

function getMaxActionPoints(player) {
    // Base 4 action points + expertise bonuses
    let actionPoints = 4;
    
    // Add bonus action points for high expertise levels
    Object.values(player.expertise).forEach(level => {
        if (level >= 3) actionPoints += 1; // Master level gives extra action
    });
    
    // Micro-experience gives small bonuses
    if (player.microExperience) {
        const totalMicroExp = Object.values(player.microExperience).reduce((a, b) => a + b, 0);
        actionPoints += Math.floor(totalMicroExp / 10); // Every 10 tickets resolved = +1 action
    }
    
    return actionPoints;
}

function showActionResult(message, isError = false) {
    // Create temporary message display
    const existingMsg = document.querySelector('.action-result');
    if (existingMsg) existingMsg.remove();
    
    const msgDiv = document.createElement('div');
    msgDiv.className = 'action-result';
    msgDiv.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: ${isError ? 'linear-gradient(45deg, #e74c3c, #c0392b)' : 'linear-gradient(45deg, #27ae60, #229954)'};
                color: white;
                padding: 20px 30px;
                border-radius: 10px;
                font-weight: bold;
                z-index: 999;
                box-shadow: 0 8px 25px rgba(0,0,0,0.3);
                animation: fadeInOut 2s ease-in-out;
            `;
    msgDiv.textContent = message;
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                    20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                }
            `;
    document.head.appendChild(style);
    document.body.appendChild(msgDiv);
    
    setTimeout(() => {
        msgDiv.remove();
        style.remove();
    }, 2000);
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
