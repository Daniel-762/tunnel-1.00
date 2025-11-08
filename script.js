// Main game variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const miniMapCanvas = document.getElementById('miniMap');
const miniMapCtx = miniMapCanvas.getContext('2d');

let maze = [];
let mazeSize = 15;
const cellSize = 35;
let player = { x: 0.5, y: 0.5, size: 14 };
let exit = { x: 0, y: 0 };
let gameStartTime;
let gameTimer;
let score = 0;
let gameOver = false;
let visitedCells = new Set();
let particles = [];
let keys = 0;
let treasures = 0;
let currentLevel = 1;
let enemies = [];
let collectibles = [];
let powerUps = [];
let activePowerUp = null;
let powerUpTimer = 0;

// Animation variables
let playerAnimation = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    moving: false,
    progress: 0
};

// Camera variables for smooth following
let camera = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0
};

// Movement state
const keysPressed = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

// Initialize the game
function init() {
    // Set canvas size
    resizeCanvas();
    
    // Generate the maze
    generateMaze(mazeSize, mazeSize);
    
    // Set player start position
    player.x = 0.5;
    player.y = 0.5;
    playerAnimation.x = player.x;
    playerAnimation.y = player.y;
    playerAnimation.targetX = player.x;
    playerAnimation.targetY = player.y;
    
    // Set exit position (center of maze)
    exit.x = Math.floor(mazeSize / 2) + 0.5;
    exit.y = Math.floor(mazeSize / 2) + 0.5;
    
    // Initialize camera
    camera.x = (player.x - 0.5) * cellSize;
    camera.y = (player.y - 0.5) * cellSize;
    camera.targetX = camera.x;
    camera.targetY = camera.y;
    
    // Initialize visited cells
    visitedCells.add(`${Math.floor(player.x)},${Math.floor(player.y)}`);
    
    // Set up controls
    setupControls();
    
    // Initialize minimap
    initMiniMap();
    
    // Generate enemies and collectibles
    generateEnemies();
    generateCollectibles();
    
    // Start game timer
    gameStartTime = Date.now();
    gameTimer = setInterval(updateTimer, 1000);
    
    // Hide instructions after a delay
    setTimeout(() => {
        document.querySelector('.instructions').style.opacity = '0';
    }, 6000);
    
    // Start animation loop
    animate();
}

// Resize canvas to fit container
function resizeCanvas() {
    const container = document.querySelector('.game-content');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    miniMapCanvas.width = 150;
    miniMapCanvas.height = 150;
}

// Generate maze using recursive backtracking algorithm
function generateMaze(width, height) {
    // Initialize maze grid with all walls
    for (let y = 0; y < height; y++) {
        maze[y] = [];
        for (let x = 0; x < width; x++) {
            maze[y][x] = {
                north: true,
                south: true,
                east: true,
                west: true,
                visited: false
            };
        }
    }
    
    // Start from a random cell
    const startX = Math.floor(Math.random() * width);
    const startY = Math.floor(Math.random() * height);
    
    // Recursive backtracking function
    function carvePassages(x, y) {
        maze[y][x].visited = true;
        
        // Define directions: north, south, east, west
        const directions = [
            { dx: 0, dy: -1, wall: 'north', opposite: 'south' },
            { dx: 1, dy: 0, wall: 'east', opposite: 'west' },
            { dx: 0, dy: 1, wall: 'south', opposite: 'north' },
            { dx: -1, dy: 0, wall: 'west', opposite: 'east' }
        ];
        
        // Shuffle directions
        for (let i = directions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [directions[i], directions[j]] = [directions[j], directions[i]];
        }
        
        // Visit each direction
        for (const dir of directions) {
            const newX = x + dir.dx;
            const newY = y + dir.dy;
            
            // Check if the new cell is within bounds and not visited
            if (newX >= 0 && newX < width && newY >= 0 && newY < height && !maze[newY][newX].visited) {
                // Remove the wall between current cell and new cell
                maze[y][x][dir.wall] = false;
                maze[newY][newX][dir.opposite] = false;
                
                // Recursively visit the new cell
                carvePassages(newX, newY);
            }
        }
    }
    
    carvePassages(startX, startY);
}

// Generate enemies
function generateEnemies() {
    enemies = [];
    const enemyCount = Math.floor(currentLevel / 2) + 1;
    
    for (let i = 0; i < enemyCount; i++) {
        let x, y;
        // Find a position that's not too close to the player
        do {
            x = Math.floor(Math.random() * mazeSize);
            y = Math.floor(Math.random() * mazeSize);
        } while (Math.abs(x - player.x) < 3 && Math.abs(y - player.y) < 3);
        
        enemies.push({
            x: x + 0.5,
            y: y + 0.5,
            size: 12,
            speed: 0.03,
            direction: Math.random() * Math.PI * 2,
            color: '#ff6b6b'
        });
    }
}

// Generate collectibles (keys and treasures)
function generateCollectibles() {
    collectibles = [];
    powerUps = [];
    
    // Generate keys (needed to unlock the exit)
    const keyCount = Math.min(currentLevel, 3);
    for (let i = 0; i < keyCount; i++) {
        let x, y;
        do {
            x = Math.floor(Math.random() * mazeSize);
            y = Math.floor(Math.random() * mazeSize);
        } while ((x === Math.floor(player.x) && y === Math.floor(player.y)) || 
                 (x === Math.floor(exit.x) && y === Math.floor(exit.y)));
        
        collectibles.push({
            x: x + 0.5,
            y: y + 0.5,
            type: 'key',
            collected: false
        });
    }
    
    // Generate treasures (for bonus points)
    const treasureCount = Math.min(currentLevel * 2, 10);
    for (let i = 0; i < treasureCount; i++) {
        let x, y;
        do {
            x = Math.floor(Math.random() * mazeSize);
            y = Math.floor(Math.random() * mazeSize);
        } while ((x === Math.floor(player.x) && y === Math.floor(player.y)) || 
                 (x === Math.floor(exit.x) && y === Math.floor(exit.y)));
        
        collectibles.push({
            x: x + 0.5,
            y: y + 0.5,
            type: 'treasure',
            collected: false
        });
    }
    
    // Generate power-ups
    if (currentLevel > 1) {
        const powerUpCount = Math.min(currentLevel - 1, 2);
        for (let i = 0; i < powerUpCount; i++) {
            let x, y;
            do {
                x = Math.floor(Math.random() * mazeSize);
                y = Math.floor(Math.random() * mazeSize);
            } while ((x === Math.floor(player.x) && y === Math.floor(player.y)) || 
                     (x === Math.floor(exit.x) && y === Math.floor(exit.y)));
            
            const types = ['speed', 'ghost', 'freeze'];
            powerUps.push({
                x: x + 0.5,
                y: y + 0.5,
                type: types[Math.floor(Math.random() * types.length)],
                collected: false
            });
        }
    }
}

// Initialize minimap
function initMiniMap() {
    miniMapCtx.fillStyle = 'rgba(20, 20, 50, 0.9)';
    miniMapCtx.fillRect(0, 0, miniMapCanvas.width, miniMapCanvas.height);
}

// Draw the minimap
function drawMiniMap() {
    const mapSize = Math.min(mazeSize, 15);
    const cellSizeMap = miniMapCanvas.width / (mapSize + 2);
    
    // Clear minimap
    miniMapCtx.fillStyle = 'rgba(20, 20, 50, 0.9)';
    miniMapCtx.fillRect(0, 0, miniMapCanvas.width, miniMapCanvas.height);
    
    // Calculate visible area
    const startX = Math.max(0, Math.floor(player.x) - Math.floor(mapSize/2));
    const startY = Math.max(0, Math.floor(player.y) - Math.floor(mapSize/2));
    const endX = Math.min(mazeSize, startX + mapSize);
    const endY = Math.min(mazeSize, startY + mapSize);
    
    // Draw maze on minimap
    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            const cell = maze[y][x];
            const cellX = (x - startX + 1) * cellSizeMap;
            const cellY = (y - startY + 1) * cellSizeMap;
            
            // Draw floor
            miniMapCtx.fillStyle = visitedCells.has(`${x},${y}`) ? '#2a2a6a' : '#1a1a4a';
            miniMapCtx.fillRect(cellX, cellY, cellSizeMap, cellSizeMap);
            
            // Draw walls
            miniMapCtx.strokeStyle = '#4a4a8a';
            miniMapCtx.lineWidth = 1;
            
            if (cell.north) {
                miniMapCtx.beginPath();
                miniMapCtx.moveTo(cellX, cellY);
                miniMapCtx.lineTo(cellX + cellSizeMap, cellY);
                miniMapCtx.stroke();
            }
            
            if (cell.south) {
                miniMapCtx.beginPath();
                miniMapCtx.moveTo(cellX, cellY + cellSizeMap);
                miniMapCtx.lineTo(cellX + cellSizeMap, cellY + cellSizeMap);
                miniMapCtx.stroke();
            }
            
            if (cell.east) {
                miniMapCtx.beginPath();
                miniMapCtx.moveTo(cellX + cellSizeMap, cellY);
                miniMapCtx.lineTo(cellX + cellSizeMap, cellY + cellSizeMap);
                miniMapCtx.stroke();
            }
            
            if (cell.west) {
                miniMapCtx.beginPath();
                miniMapCtx.moveTo(cellX, cellY);
                miniMapCtx.lineTo(cellX, cellY + cellSizeMap);
                miniMapCtx.stroke();
            }
        }
    }
    
    // Draw exit on minimap
    if (exit.x >= startX && exit.x < endX && exit.y >= startY && exit.y < endY) {
        const exitX = (exit.x - startX + 1) * cellSizeMap;
        const exitY = (exit.y - startY + 1) * cellSizeMap;
        
        miniMapCtx.fillStyle = keys === Math.min(currentLevel, 3) ? '#ffcc00' : '#666666';
        miniMapCtx.beginPath();
        miniMapCtx.arc(exitX + cellSizeMap/2, exitY + cellSizeMap/2, cellSizeMap/3, 0, Math.PI * 2);
        miniMapCtx.fill();
    }
    
    // Draw player on minimap
    const playerX = (player.x - startX + 1) * cellSizeMap;
    const playerY = (player.y - startY + 1) * cellSizeMap;
    
    miniMapCtx.fillStyle = '#6bb5ff';
    miniMapCtx.beginPath();
    miniMapCtx.arc(playerX, playerY, cellSizeMap/4, 0, Math.PI * 2);
    miniMapCtx.fill();
    
    // Draw enemies on minimap
    for (const enemy of enemies) {
        if (enemy.x >= startX && enemy.x < endX && enemy.y >= startY && enemy.y < endY) {
            const enemyX = (enemy.x - startX + 1) * cellSizeMap;
            const enemyY = (enemy.y - startY + 1) * cellSizeMap;
            
            miniMapCtx.fillStyle = enemy.color;
            miniMapCtx.beginPath();
            miniMapCtx.arc(enemyX, enemyY, cellSizeMap/5, 0, Math.PI * 2);
            miniMapCtx.fill();
        }
    }
}

// Draw the main game maze
function drawMaze() {
    // Clear canvas with gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#0a0a25');
    gradient.addColorStop(1, '#151538');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Calculate offset to center the maze on player with camera smoothing
    const offsetX = canvas.width/2 - camera.x;
    const offsetY = canvas.height/2 - camera.y;
    
    // Draw floor for visible area only (performance optimization)
    const visibleStartX = Math.max(0, Math.floor((camera.x - canvas.width/2) / cellSize));
    const visibleStartY = Math.max(0, Math.floor((camera.y - canvas.height/2) / cellSize));
    const visibleEndX = Math.min(mazeSize, Math.ceil((camera.x + canvas.width/2) / cellSize));
    const visibleEndY = Math.min(mazeSize, Math.ceil((camera.y + canvas.height/2) / cellSize));
    
    for (let y = visibleStartY; y < visibleEndY; y++) {
        for (let x = visibleStartX; x < visibleEndX; x++) {
            const cellX = offsetX + x * cellSize;
            const cellY = offsetY + y * cellSize;
            
            // Draw floor with different color for visited cells
            if (visitedCells.has(`${x},${y}`)) {
                ctx.fillStyle = '#1a1a4a';
            } else {
                ctx.fillStyle = '#151535';
            }
            ctx.fillRect(cellX, cellY, cellSize, cellSize);
            
            // Draw subtle grid
            ctx.strokeStyle = 'rgba(80, 80, 150, 0.2)';
            ctx.lineWidth = 1;
            ctx.strokeRect(cellX, cellY, cellSize, cellSize);
        }
    }
    
    // Draw walls
    ctx.strokeStyle = '#4a4a8a';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    for (let y = visibleStartY; y < visibleEndY; y++) {
        for (let x = visibleStartX; x < visibleEndX; x++) {
            const cell = maze[y][x];
            const cellX = offsetX + x * cellSize;
            const cellY = offsetY + y * cellSize;
            
            // North wall
            if (cell.north) {
                ctx.beginPath();
                ctx.moveTo(cellX, cellY);
                ctx.lineTo(cellX + cellSize, cellY);
                ctx.stroke();
            }
            
            // South wall
            if (cell.south) {
                ctx.beginPath();
                ctx.moveTo(cellX, cellY + cellSize);
                ctx.lineTo(cellX + cellSize, cellY + cellSize);
                ctx.stroke();
            }
            
            // East wall
            if (cell.east) {
                ctx.beginPath();
                ctx.moveTo(cellX + cellSize, cellY);
                ctx.lineTo(cellX + cellSize, cellY + cellSize);
                ctx.stroke();
            }
            
            // West wall
            if (cell.west) {
                ctx.beginPath();
                ctx.moveTo(cellX, cellY);
                ctx.lineTo(cellX, cellY + cellSize);
                ctx.stroke();
            }
        }
    }
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Draw collectibles
    for (const item of collectibles) {
        if (!item.collected) {
            const itemX = offsetX + (item.x - 0.5) * cellSize;
            const itemY = offsetY + (item.y - 0.5) * cellSize;
            
            if (item.type === 'key') {
                // Draw key
                ctx.fillStyle = '#ffcc00';
                ctx.beginPath();
                ctx.arc(itemX + cellSize/2, itemY + cellSize/2, cellSize/5, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = '#000';
                ctx.font = 'bold 12px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('K', itemX + cellSize/2, itemY + cellSize/2);
            } else if (item.type === 'treasure') {
                // Draw treasure
                ctx.fillStyle = '#ff6b6b';
                ctx.beginPath();
                ctx.arc(itemX + cellSize/2, itemY + cellSize/2, cellSize/5, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 12px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('T', itemX + cellSize/2, itemY + cellSize/2);
            }
        }
    }
    
    // Draw power-ups
    for (const powerUp of powerUps) {
        if (!powerUp.collected) {
            const powerUpX = offsetX + (powerUp.x - 0.5) * cellSize;
            const powerUpY = offsetY + (powerUp.y - 0.5) * cellSize;
            
            ctx.fillStyle = '#6bff6b';
            ctx.beginPath();
            ctx.arc(powerUpX + cellSize/2, powerUpY + cellSize/2, cellSize/5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#000';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            if (powerUp.type === 'speed') {
                ctx.fillText('S', powerUpX + cellSize/2, powerUpY + cellSize/2);
            } else if (powerUp.type === 'ghost') {
                ctx.fillText('G', powerUpX + cellSize/2, powerUpY + cellSize/2);
            } else if (powerUp.type === 'freeze') {
                ctx.fillText('F', powerUpX + cellSize/2, powerUpY + cellSize/2);
            }
        }
    }
    
    // Draw exit (artifact)
    const exitX = offsetX + (exit.x - 0.5) * cellSize;
    const exitY = offsetY + (exit.y - 0.5) * cellSize;
    
    // Pulsing glow effect
    const pulse = (Math.sin(Date.now() / 300) + 1) / 2;
    const glowSize = cellSize * (0.7 + pulse * 0.3);
    
    // Outer glow
    const gradientGlow = ctx.createRadialGradient(
        exitX + cellSize/2, exitY + cellSize/2, cellSize/4,
        exitX + cellSize/2, exitY + cellSize/2, glowSize/2
    );
    
    if (keys === Math.min(currentLevel, 3)) {
        gradientGlow.addColorStop(0, `rgba(255, 204, 0, ${0.7 + pulse * 0.3})`);
        gradientGlow.addColorStop(1, 'rgba(255, 204, 0, 0)');
    } else {
        gradientGlow.addColorStop(0, `rgba(100, 100, 100, ${0.7 + pulse * 0.3})`);
        gradientGlow.addColorStop(1, 'rgba(100, 100, 100, 0)');
    }
    
    ctx.fillStyle = gradientGlow;
    ctx.fillRect(exitX + (cellSize - glowSize)/2, exitY + (cellSize - glowSize)/2, glowSize, glowSize);
    
    // Artifact core
    ctx.fillStyle = keys === Math.min(currentLevel, 3) ? '#ffcc00' : '#666666';
    ctx.beginPath();
    ctx.arc(exitX + cellSize/2, exitY + cellSize/2, cellSize/4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = keys === Math.min(currentLevel, 3) ? '#ffaa00' : '#444444';
    ctx.beginPath();
    ctx.arc(exitX + cellSize/2, exitY + cellSize/2, cellSize/6, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw enemies
    for (const enemy of enemies) {
        const enemyX = offsetX + (enemy.x - 0.5) * cellSize;
        const enemyY = offsetY + (enemy.y - 0.5) * cellSize;
        
        // Enemy shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.arc(enemyX + cellSize/2 + 2, enemyY + cellSize/2 + 2, enemy.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Enemy body
        ctx.fillStyle = enemy.color;
        ctx.beginPath();
        ctx.arc(enemyX + cellSize/2, enemyY + cellSize/2, enemy.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Enemy eyes
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(enemyX + cellSize/2 - enemy.size/3, enemyY + cellSize/2 - enemy.size/4, enemy.size/4, 0, Math.PI * 2);
        ctx.arc(enemyX + cellSize/2 + enemy.size/3, enemyY + cellSize/2 - enemy.size/4, enemy.size/4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(enemyX + cellSize/2 - enemy.size/3, enemyY + cellSize/2 - enemy.size/4, enemy.size/6, 0, Math.PI * 2);
        ctx.arc(enemyX + cellSize/2 + enemy.size/3, enemyY + cellSize/2 - enemy.size/4, enemy.size/6, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Draw player with smooth animation
    const playerX = offsetX + (playerAnimation.x - 0.5) * cellSize;
    const playerY = offsetY + (playerAnimation.y - 0.5) * cellSize;
    
    // Player shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.arc(playerX + cellSize/2 + 3, playerY + cellSize/2 + 3, player.size, 0, Math.PI * 2);
    ctx.fill();
    
    // Player body with gradient
    const playerGradient = ctx.createRadialGradient(
        playerX + cellSize/2, playerY + cellSize/2, 0,
        playerX + cellSize/2, playerY + cellSize/2, player.size
    );
    playerGradient.addColorStop(0, '#6bb5ff');
    playerGradient.addColorStop(1, '#4a8fd6');
    
    ctx.fillStyle = playerGradient;
    ctx.beginPath();
    ctx.arc(playerX + cellSize/2, playerY + cellSize/2, player.size, 0, Math.PI * 2);
    ctx.fill();
    
    // Player highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(playerX + cellSize/2 - player.size/3, playerY + cellSize/2 - player.size/3, player.size/3, 0, Math.PI * 2);
    ctx.fill();
    
    // Player eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(playerX + cellSize/2 - player.size/4, playerY + cellSize/2 - player.size/4, player.size/5, 0, Math.PI * 2);
    ctx.arc(playerX + cellSize/2 + player.size/4, playerY + cellSize/2 - player.size/4, player.size/5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(playerX + cellSize/2 - player.size/4, playerY + cellSize/2 - player.size/4, player.size/8, 0, Math.PI * 2);
    ctx.arc(playerX + cellSize/2 + player.size/4, playerY + cellSize/2 - player.size/4, player.size/8, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw particles
    drawParticles(offsetX, offsetY);
}

// Draw particles
function drawParticles(offsetX, offsetY) {
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const x = offsetX + (p.x - 0.5) * cellSize;
        const y = offsetY + (p.y - 0.5) * cellSize;
        
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(x + cellSize/2, y + cellSize/2, p.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

// Create particles
function createParticles(x, y, count, color) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            size: Math.random() * 4 + 1,
            speedX: (Math.random() - 0.5) * 0.15,
            speedY: (Math.random() - 0.5) * 0.15,
            life: 1,
            decay: Math.random() * 0.02 + 0.01,
            color: color
        });
    }
}

// Update particles
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.speedX;
        p.y += p.speedY;
        p.life -= p.decay;
        
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

// Set up controls
function setupControls() {
    // Keyboard controls
    document.addEventListener('keydown', (event) => {
        if (keysPressed.hasOwnProperty(event.key) && !playerAnimation.moving) {
            keysPressed[event.key] = true;
            event.preventDefault();
            
            // Try to move player
            tryMovePlayer();
        }
    });
    
    document.addEventListener('keyup', (event) => {
        if (keysPressed.hasOwnProperty(event.key)) {
            keysPressed[event.key] = false;
            event.preventDefault();
        }
    });
    
    // Handle window resize
    window.addEventListener('resize', resizeCanvas);
}

// Try to move player based on key presses
function tryMovePlayer() {
    if (playerAnimation.moving || gameOver) return;
    
    let newX = player.x;
    let newY = player.y;
    
    if (keysPressed.ArrowUp) newY -= 1;
    if (keysPressed.ArrowDown) newY += 1;
    if (keysPressed.ArrowLeft) newX -= 1;
    if (keysPressed.ArrowRight) newX += 1;
    
    // Check if movement is valid (within bounds and no wall)
    if (isValidMove(player.x, player.y, newX, newY)) {
        // Create movement particles
        createParticles(player.x, player.y, 8, '#6bb5ff');
        
        // Update player position
        player.x = newX;
        player.y = newY;
        
        // Mark cell as visited
        visitedCells.add(`${Math.floor(player.x)},${Math.floor(player.y)}`);
        
        // Update progress bar
        updateProgressBar();
        
        // Start animation
        playerAnimation.targetX = player.x;
        playerAnimation.targetY = player.y;
        playerAnimation.moving = true;
        playerAnimation.progress = 0;
        
        // Check for collectibles
        checkCollectibles();
        
        // Check for power-ups
        checkPowerUps();
    }
}

// Check for collectible items
function checkCollectibles() {
    for (const item of collectibles) {
        if (!item.collected && 
            Math.floor(item.x) === Math.floor(player.x) && 
            Math.floor(item.y) === Math.floor(player.y)) {
            
            item.collected = true;
            
            if (item.type === 'key') {
                keys++;
                document.getElementById('keyCount').textContent = keys;
                score += 50;
                document.getElementById('score').textContent = score;
                createParticles(item.x, item.y, 15, '#ffcc00');
            } else if (item.type === 'treasure') {
                treasures++;
                document.getElementById('treasureCount').textContent = treasures;
                score += 25;
                document.getElementById('score').textContent = score;
                createParticles(item.x, item.y, 15, '#ff6b6b');
            }
        }
    }
}

// Check for power-ups
function checkPowerUps() {
    for (const powerUp of powerUps) {
        if (!powerUp.collected && 
            Math.floor(powerUp.x) === Math.floor(player.x) && 
            Math.floor(powerUp.y) === Math.floor(player.y)) {
            
            powerUp.collected = true;
            activePowerUp = powerUp.type;
            powerUpTimer = 10; // 10 seconds
            
            // Update UI
            document.getElementById('powerupDisplay').style.display = 'block';
            document.getElementById('powerupType').textContent = 
                powerUp.type === 'speed' ? 'Speed Boost' : 
                powerUp.type === 'ghost' ? 'Ghost Mode' : 'Freeze Enemies';
            
            createParticles(powerUp.x, powerUp.y, 20, '#6bff6b');
        }
    }
}

// Update progress bar based on visited cells
function updateProgressBar() {
    const progress = visitedCells.size / (mazeSize * mazeSize) * 100;
    document.getElementById('progressFill').style.width = `${Math.min(progress, 100)}%`;
}

// Check if move is valid
function isValidMove(fromX, fromY, toX, toY) {
    // Check bounds
    if (toX < 0.5 || toX >= mazeSize + 0.5 || toY < 0.5 || toY >= mazeSize + 0.5) {
        return false;
    }
    
    // Check walls
    const fromCellX = Math.floor(fromX);
    const fromCellY = Math.floor(fromY);
    const toCellX = Math.floor(toX);
    const toCellY = Math.floor(toY);
    
    // Moving horizontally
    if (fromCellY === toCellY) {
        if (toCellX > fromCellX) {
            // Moving right - check east wall of current cell
            return !maze[fromCellY][fromCellX].east;
        } else if (toCellX < fromCellX) {
            // Moving left - check west wall of current cell
            return !maze[fromCellY][fromCellX].west;
        }
    }
    // Moving vertically
    else if (fromCellX === toCellX) {
        if (toCellY > fromCellY) {
            // Moving down - check south wall of current cell
            return !maze[fromCellY][fromCellX].south;
        } else if (toCellY < fromCellY) {
            // Moving up - check north wall of current cell
            return !maze[fromCellY][fromCellX].north;
        }
    }
    
    return false;
}

// Update player animation
function updatePlayerAnimation() {
    if (playerAnimation.moving) {
        playerAnimation.progress += activePowerUp === 'speed' ? 0.16 : 0.08;
        
        if (playerAnimation.progress >= 1) {
            playerAnimation.progress = 1;
            playerAnimation.moving = false;
            
            // Create arrival particles
            createParticles(player.x, player.y, 12, '#6bb5ff');
        }
        
        // Smooth interpolation with easing
        const easeProgress = easeOutCubic(playerAnimation.progress);
        playerAnimation.x = playerAnimation.x + (playerAnimation.targetX - playerAnimation.x) * easeProgress;
        playerAnimation.y = playerAnimation.y + (playerAnimation.targetY - playerAnimation.y) * easeProgress;
        
        // Update camera to follow player smoothly
        camera.targetX = (playerAnimation.x - 0.5) * cellSize;
        camera.targetY = (playerAnimation.y - 0.5) * cellSize;
    }
    
    // Smooth camera movement
    camera.x += (camera.targetX - camera.x) * 0.1;
    camera.y += (camera.targetY - camera.y) * 0.1;
}

// Update enemies
function updateEnemies() {
    if (activePowerUp === 'freeze') return;
    
    for (const enemy of enemies) {
        // Simple AI: move in current direction, change randomly sometimes
        if (Math.random() < 0.02) {
            enemy.direction = Math.random() * Math.PI * 2;
        }
        
        const newX = enemy.x + Math.cos(enemy.direction) * enemy.speed;
        const newY = enemy.y + Math.sin(enemy.direction) * enemy.speed;
        
        // Check if the new position is valid (no walls)
        if (isValidEnemyMove(enemy.x, enemy.y, newX, newY)) {
            enemy.x = newX;
            enemy.y = newY;
        } else {
            // Hit a wall, change direction
            enemy.direction = Math.random() * Math.PI * 2;
        }
        
        // Check for collision with player
        const distance = Math.sqrt(
            Math.pow(player.x - enemy.x, 2) + 
            Math.pow(player.y - enemy.y, 2)
        );
        
        if (distance < (player.size + enemy.size) / cellSize && !gameOver) {
            // Player caught by enemy
            document.querySelector('.game-content').classList.add('screen-shake');
            setTimeout(() => {
                document.querySelector('.game-content').classList.remove('screen-shake');
            }, 500);
            
            // Reset to start position
            player.x = 0.5;
            player.y = 0.5;
            playerAnimation.x = player.x;
            playerAnimation.y = player.y;
            playerAnimation.targetX = player.x;
            playerAnimation.targetY = player.y;
            camera.targetX = (player.x - 0.5) * cellSize;
            camera.targetY = (player.y - 0.5) * cellSize;
            
            // Lose some score
            score = Math.max(0, score - 10);
            document.getElementById('score').textContent = score;
            
            createParticles(player.x, player.y, 20, '#ff6b6b');
        }
    }
}

// Check if enemy move is valid
function isValidEnemyMove(fromX, fromY, toX, toY) {
    // Check bounds
    if (toX < 0.5 || toX >= mazeSize + 0.5 || toY < 0.5 || toY >= mazeSize + 0.5) {
        return false;
    }
    
    // For enemies, we'll use a simpler check - they can move through open passages
    const fromCellX = Math.floor(fromX);
    const fromCellY = Math.floor(fromY);
    const toCellX = Math.floor(toX);
    const toCellY = Math.floor(toY);
    
    // If moving to a different cell, check if there's a wall
    if (fromCellX !== toCellX || fromCellY !== toCellY) {
        // Moving horizontally
        if (fromCellY === toCellY) {
            if (toCellX > fromCellX) {
                return !maze[fromCellY][fromCellX].east;
            } else if (toCellX < fromCellX) {
                return !maze[fromCellY][fromCellX].west;
            }
        }
        // Moving vertically
        else if (fromCellX === toCellX) {
            if (toCellY > fromCellY) {
                return !maze[fromCellY][fromCellX].south;
            } else if (toCellY < fromCellY) {
                return !maze[fromCellY][fromCellX].north;
            }
        }
    }
    
    return true;
}

// Update power-up timer
function updatePowerUp() {
    if (activePowerUp && powerUpTimer > 0) {
        powerUpTimer -= 1/60; // Assuming 60 FPS
        
        if (powerUpTimer <= 0) {
            activePowerUp = null;
            document.getElementById('powerupDisplay').style.display = 'none';
        }
    }
}

// Easing function for smooth animation
function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

// Check if player reached the exit
function checkExit() {
    const distance = Math.sqrt(
        Math.pow(player.x - exit.x, 2) + 
        Math.pow(player.y - exit.y, 2)
    );
    
    // Check if player has all keys
    const hasAllKeys = keys === Math.min(currentLevel, 3);
    
    return distance < 0.5 && hasAllKeys;
}

// Update the game timer
function updateTimer() {
    if (gameOver) return;
    
    const elapsedSeconds = Math.floor((Date.now() - gameStartTime) / 1000);
    document.getElementById('timer').textContent = `${elapsedSeconds}s`;
}

// Update player position display
function updatePositionDisplay() {
    const x = Math.floor(player.x);
    const y = Math.floor(player.y);
    document.getElementById('position').textContent = `(${x}, ${y})`;
}

// Go to next level
function nextLevel() {
    currentLevel++;
    document.getElementById('level').textContent = currentLevel;
    
    // Increase maze size
    mazeSize = Math.min(15 + currentLevel, 25);
    
    // Reset game state
    player.x = 0.5;
    player.y = 0.5;
    playerAnimation.x = player.x;
    playerAnimation.y = player.y;
    playerAnimation.targetX = player.x;
    playerAnimation.targetY = player.y;
    camera.x = (player.x - 0.5) * cellSize;
    camera.y = (player.y - 0.5) * cellSize;
    camera.targetX = camera.x;
    camera.targetY = camera.y;
    visitedCells.clear();
    visitedCells.add(`${Math.floor(player.x)},${Math.floor(player.y)}`);
    keys = 0;
    treasures = 0;
    document.getElementById('keyCount').textContent = keys;
    document.getElementById('treasureCount').textContent = treasures;
    activePowerUp = null;
    document.getElementById('powerupDisplay').style.display = 'none';
    
    // Generate new maze and items
    generateMaze(mazeSize, mazeSize);
    exit.x = Math.floor(mazeSize / 2) + 0.5;
    exit.y = Math.floor(mazeSize / 2) + 0.5;
    generateEnemies();
    generateCollectibles();
    
    // Update progress bar
    updateProgressBar();
    
    // Hide win message
    document.querySelector('.win-message').style.display = 'none';
    gameOver = false;
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Update player animation and camera
    updatePlayerAnimation();
    
    // Update enemies
    updateEnemies();
    
    // Update particles
    updateParticles();
    
    // Update power-up
    updatePowerUp();
    
    // Draw everything
    drawMaze();
    drawMiniMap();
    
    // Update position display
    updatePositionDisplay();
    
    // Check if player reached the exit
    if (checkExit() && !gameOver) {
        gameOver = true;
        document.querySelector('.win-message').style.display = 'block';
        clearInterval(gameTimer);
        
        // Update score when artifact is found
        score += 100;
        document.getElementById('score').textContent = score;
        
        // Create victory particles
        for (let i = 0; i < 80; i++) {
            createParticles(exit.x, exit.y, 1, '#ffcc00');
        }
        
        // Go to next level after a delay
        setTimeout(nextLevel, 3000);
    }
}

// Start the game
init();