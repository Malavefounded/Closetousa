// Game State
let gameState = {
    player: {
        hunger: 100,
        thirst: 100,
        energy: 100,
        infection: 0,
        status: "Normal",
        milesTraveled: 0,
        travelMethod: "Legs",
        gas: 0,
        time: "08:00", // Start at 8 AM
        hand: [],
        backpack: [],
        wagon: null
    },
    world: {
        scene: "A crumbling highway stretches ahead, flanked by overgrown fields. A rusty knife lies nearby.",
        itemsNearby: ["rusty knife"],
        enemiesNearby: [],
        hiddenLocation: "Kansas", // Hidden from player, for internal tracking
        currentDockTarget: null // Will be one of the ports
    }
};

// Dice Roll Outcomes
const diceOutcomes = {
    10: "Survivor’s Triumph",
    7: "Steady Step",
    4: "Stumble",
    1: "Dead End"
};

// DOM Elements
const gameDisplay = document.getElementById("game-display");
const playerInput = document.getElementById("player-input");
const hud = document.getElementById("hud");

function rollDice() {
    return Math.floor(Math.random() * 10) + 1; // 1-10 scale
}

function updateTime() {
    let [hours, minutes] = gameState.player.time.split(":").map(Number);
    minutes += 120; // 2 hours per turn
    hours += Math.floor(minutes / 60);
    minutes %= 60;
    hours %= 24;
    gameState.player.time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function isNight() {
    let [hours] = gameState.player.time.split(":").map(Number);
    return hours >= 18 || hours < 6;
}

function updateStats() {
    gameState.player.hunger -= 5;
    gameState.player.thirst -= 7;
    gameState.player.energy -= isNight() ? 10 : 5; // Faster energy drain at night
    if (gameState.player.status === "Infected" && gameState.player.infection < 100) {
        gameState.player.infection += 5; // Infection rises untreated
    }
    if (gameState.player.infection >= 100) gameOver("Infection overwhelmed you.");
    if (gameState.player.hunger <= 0 || gameState.player.thirst <= 0 || gameState.player.energy <= 0) {
        gameOver("You succumbed to exhaustion or starvation.");
    }
}

function travel(direction) {
    let distance = 0;
    switch (gameState.player.travelMethod) {
        case "Legs": distance = 5; gameState.player.energy -= 5; break;
        case "Bicycle": distance = 15; gameState.player.energy -= 10; break;
        case "Car": 
            distance = 50; 
            if (gameState.player.gas >= 2) gameState.player.gas -= 2;
            else gameState.player.travelMethod = "Legs"; // Run out of gas
            break;
    }
    gameState.player.milesTraveled += distance;
    updateTime();
    // Simulate location update (hidden)
    // Add random events or clues here
}

function handleAction(action) {
    const roll = rollDice();
    let outcome = diceOutcomes[roll] || "Steady Step";
    let response = "";

    if (action.toLowerCase().includes("pick up")) {
        let item = action.split(" ").pop().toLowerCase();
        if (gameState.world.itemsNearby.includes(item)) {
            if (gameState.player.hand.length < 5) {
                gameState.player.hand.push(item);
                gameState.world.itemsNearby = gameState.world.itemsNearby.filter(i => i !== item);
                response = `You grab the ${item} [Hand: ${item} added]. `;
            } else if (gameState.player.backpack.length < 10) {
                gameState.player.backpack.push(item);
                gameState.world.itemsNearby = gameState.world.itemsNearby.filter(i => i !== item);
                response = `You store the ${item} in your backpack [Backpack: ${item} added]. `;
            } else {
                response = "Your inventory is full! Drop something first. ";
                outcome = "Stumble";
            }
        } else {
            response = "That item isn’t here. ";
            outcome = "Stumble";
        }
    } else if (action.toLowerCase().includes("head")) {
        let direction = action.toLowerCase().match(/north|south|east|west/)?.[0];
        if (direction) {
            travel(direction);
            response = `You head ${direction} for ${gameState.player.milesTraveled} miles. `;
            if (isNight()) response += "The darkness makes it harder—zombie animals lurk nearby. ";
            let randomEvent = Math.random();
            if (randomEvent < 0.3 && isNight()) { // 30% chance of zombie animal
                response += "A zom-bird swoops, pecking at you! ";
                if (outcome === "Dead End") {
                    gameState.player.status = "Infected";
                    gameState.player.infection = 20;
                    response += "Its beak pierces your skin—Status: Infected! [Infection: 20]. Use rubbing alcohol to treat it.";
                } else if (outcome === "Stumble") {
                    gameState.player.energy -= 10;
                    response += "You dodge, but lose energy.";
                }
            }
        } else {
            response = "Specify a direction (North, South, East, West). ";
            outcome = "Stumble";
        }
    } else if (action.toLowerCase().includes("use rubbing alcohol")) {
        if (gameState.player.backpack.includes("rubbing alcohol") || gameState.player.hand.includes("rubbing alcohol")) {
            if (gameState.player.infection > 0) {
                gameState.player.infection = Math.max(0, gameState.player.infection - 30);
                let inventory = gameState.player.hand.includes("rubbing alcohol") ? gameState.player.hand : gameState.player.backpack;
                inventory.splice(inventory.indexOf("rubbing alcohol"), 1);
                response = "You apply rubbing alcohol, reducing Infection by 30. ";
            } else {
                response = "You’re not infected—save the alcohol. ";
                outcome = "Stumble";
            }
        } else {
            response = "You have no rubbing alcohol! Find some at stores or pharmacies. ";
            outcome = "Stumble";
        }
    }

    if (gameState.player.status === "Infected" && gameState.player.infection > 0) {
        response += "Warning: You’re Infected—use rubbing alcohol to prevent death!";
    }

    updateStats();
    updateScene();
    displayResponse(outcome, response);
}

function updateScene() {
    gameState.world.scene = "A new scene description here (e.g., abandoned gas station).";
    gameState.world.itemsNearby = ["water bottle", "gas can"]; // Randomize or expand
}

function displayResponse(outcome, response) {
    const message = `<span class="red">Action Status: ${outcome}</span><br><span class="white">${response}</span><br>`;
    gameDisplay.innerHTML += message;
    gameDisplay.scrollTop = gameDisplay.scrollHeight;
    updateHUD();
}

function updateHUD() {
    const hudText = `
        HUD:
        Hunger: ${gameState.player.hunger}/100
        Thirst: ${gameState.player.thirst}/100
        Energy: ${gameState.player.energy}/100
        Infection: ${gameState.player.infection}/100
        Status: ${gameState.player.status}
        Miles Traveled: ${gameState.player.milesTraveled}
        Travel: ${gameState.player.travelMethod}
        Gas: ${gameState.player.gas || "N/A"}
        Time: ${gameState.player.time}
        Hand: ${gameState.player.hand.join(", ") || "Empty"} (${gameState.player.hand.length}/5)
        Backpack: ${gameState.player.backpack.join(", ") || "Empty"} (${gameState.player.backpack.length}/10)
        Wagon: ${gameState.player.wagon ? gameState.player.wagon.join(", ") || "Empty" : "None"} (${gameState.player.wagon ? gameState.player.wagon.length : 0}/20)
    `;
    hud.innerHTML = `<span class="yellow">${hudText}</span>`;
}

function gameOver(message) {
    gameDisplay.innerHTML += `<span class="red">GAME OVER: ${message}</span><br>`;
    playerInput.disabled = true;
}

function submitAction() {
    const action = playerInput.value.trim();
    if (action) {
        gameDisplay.innerHTML += `<span class="green">[Player] ${action}</span><br>`;
        handleAction(action);
        playerInput.value = "";
    }
}

// Start the game
updateScene();
displayResponse("Steady Step", gameState.world.scene);
updateHUD();
