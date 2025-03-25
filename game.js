// Configuración del juego
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

// Estado del juego
const game = {
    player: {
        x: 400,
        y: 300,
        size: 30,
        speed: 5,
        energy: 100,
        inventory: {
            gold: 0,
            stone: 0,
            wood: 0
        },
        autoMiners: {
            gold: 0,
            stone: 0,
            wood: 0
        },
        minerEfficiency: 1,
        lastUpdate: Date.now()
    },
    resources: [],
    keys: {
        ArrowUp: false,
        ArrowDown: false,
        ArrowLeft: false,
        ArrowRight: false,
        Space: false
    },
    tileSize: 40,
    worldSize: 50,
    camera: {
        x: 0,
        y: 0
    },
    upgrades: {
        miner: 10,           // Precio del minero único
        miningSpeed: 20,     // Velocidad de perforación
        carryCapacity: 25,   // Capacidad de carga
        moveSpeed: 15,       // Velocidad de movimiento
        loadSpeed: 30        // Velocidad de carga
    },
    upgradePercentages: {
        miningSpeed: 0.1,    // 10% de velocidad de perforación
        carryCapacity: 2,    // 2 unidades de capacidad
        moveSpeed: 0.1,      // 10% de velocidad de movimiento
        loadSpeed: 0.1       // 10% de velocidad de carga
    },
    miners: [],
    mineralPrices: {
        gold: 2,
        stone: 2,
        wood: 2,
        ruby: 4,
        emerald: 6,
        sapphire: 8,
        diamond: 10,
        platinum: 12,
        uranium: 14,
        obsidian: 16
    },
    money: 0
};

// Añadir variables para controlar la pausa y la velocidad
const gameState = {
    paused: false,
    speed: 1, // 1 = normal, 2 = x2, 3 = x3
    lastFrameTime: 0
};

// Generar mundo
function generateWorld() {
    // Limpiar recursos existentes
    game.resources = [];
    
    // Lista de todos los tipos de minerales ordenados por valor
    const mineralTypes = Object.keys(game.mineralPrices).sort((a, b) => 
        game.mineralPrices[a] - game.mineralPrices[b]
    );
    
    // Coordenadas de la base (centro del mundo)
    const baseX = game.worldSize / 2;
    const baseY = game.worldSize / 2;
    
    // Generar minerales distribuidos por el mundo
    for (let y = 0; y < game.worldSize; y++) {
        for (let x = 0; x < game.worldSize; x++) {
            if (Math.random() < 0.3) { // 30% de probabilidad de generar un mineral
                // Calcular distancia a la base
                const distanceToBase = Math.sqrt(
                    Math.pow(x - baseX, 2) + 
                    Math.pow(y - baseY, 2)
                );
                
                // Normalizar la distancia (0 a 1)
                const maxDistance = Math.sqrt(Math.pow(game.worldSize, 2) * 2) / 2;
                const normalizedDistance = Math.min(distanceToBase / maxDistance, 1);
                
                let mineralType;
                
                // 1% de probabilidad de que aparezca un mineral valioso cerca de la base
                if (Math.random() < 0.01) {
                    // Seleccionar un mineral aleatorio de la mitad superior de la lista
                    const startIndex = Math.floor(mineralTypes.length / 2);
                    mineralType = mineralTypes[startIndex + Math.floor(Math.random() * (mineralTypes.length - startIndex))];
                } else {
                    // Seleccionar mineral según la distancia
                    // Cuanto más lejos, más probabilidad de minerales valiosos
                    const index = Math.min(
                        Math.floor(normalizedDistance * mineralTypes.length + Math.random() * 2 - 1),
                        mineralTypes.length - 1
                    );
                    mineralType = mineralTypes[Math.max(0, index)];
                }
                
                game.resources.push({
                    x: x * game.tileSize,
                    y: y * game.tileSize,
                    type: mineralType,
                    size: game.tileSize,
                    health: 2 + Math.floor(game.mineralPrices[mineralType] / 4), // Más valiosos = más duros
                    value: game.mineralPrices[mineralType]
                });
            }
        }
    }
}

// Dibujar base
function drawBase() {
    // La base siempre está en el centro del mundo
    const baseX = game.worldSize * game.tileSize / 2 - game.camera.x;
    const baseY = game.worldSize * game.tileSize / 2 - game.camera.y;
    const baseSize = 50;
    
    // Solo dibujar si está en pantalla
    if (
        baseX + baseSize > 0 &&
        baseX - baseSize < canvas.width &&
        baseY + baseSize > 0 &&
        baseY - baseSize < canvas.height
    ) {
        // Dibujar edificio principal
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(baseX - baseSize/2, baseY - baseSize/2, baseSize, baseSize);
        
        // Dibujar techo
        ctx.fillStyle = '#A52A2A';
        ctx.beginPath();
        ctx.moveTo(baseX - baseSize/2 - 10, baseY - baseSize/2);
        ctx.lineTo(baseX + baseSize/2 + 10, baseY - baseSize/2);
        ctx.lineTo(baseX, baseY - baseSize - 10);
        ctx.closePath();
        ctx.fill();
        
        // Dibujar puerta
        ctx.fillStyle = '#4d2600';
        ctx.fillRect(baseX - 10, baseY + 5, 20, baseSize/2 - 5);
        
        // Dibujar ventanas
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(baseX - baseSize/2 + 10, baseY - 15, 10, 10);
        ctx.fillRect(baseX + baseSize/2 - 20, baseY - 15, 10, 10);
    }
}

// Dibujar recursos
function drawResources() {
    game.resources.forEach(resource => {
        const screenX = resource.x - game.camera.x;
        const screenY = resource.y - game.camera.y;
        
        // Solo dibujar si está en pantalla
        if (
            screenX + resource.size > 0 &&
            screenX < canvas.width &&
            screenY + resource.size > 0 &&
            screenY < canvas.height
        ) {
            // Colores para diferentes minerales
            let color;
            switch (resource.type) {
                case 'gold': color = '#FFD700'; break;
                case 'stone': color = '#808080'; break;
                case 'wood': color = '#8B4513'; break;
                case 'ruby': color = '#E0115F'; break;
                case 'emerald': color = '#50C878'; break;
                case 'sapphire': color = '#0F52BA'; break;
                case 'diamond': color = '#B9F2FF'; break;
                case 'platinum': color = '#E5E4E2'; break;
                case 'uranium': color = '#4DE600'; break;
                case 'obsidian': color = '#3D3D3D'; break;
                default: color = '#FFFFFF';
            }
            
            // Dibujar mineral
            ctx.fillStyle = color;
            ctx.fillRect(screenX, screenY, resource.size, resource.size);
            
            // Mostrar valor
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '10px Arial';
            ctx.fillText(resource.value, screenX + resource.size/2 - 5, screenY + resource.size/2 + 5);
        }
    });
}

// Dibujar fondo
function drawBackground() {
    ctx.fillStyle = '#4a752c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Dibujar cuadrícula
    ctx.strokeStyle = '#5a8534';
    ctx.lineWidth = 1;
    
    const startX = game.camera.x % game.tileSize;
    const startY = game.camera.y % game.tileSize;
    
    for (let x = -startX; x < canvas.width; x += game.tileSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    for (let y = -startY; y < canvas.height; y += game.tileSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

// Actualizar UI
function updateUI() {
    // Actualizar solo los elementos que existen en el HTML actual
    document.getElementById('money').textContent = Math.floor(game.money);
    
    // Actualizar contador de mineros
    document.getElementById('totalMiners').textContent = game.miners.length;
    
    // Actualizar precio de mineros
    document.getElementById('minerPrice').textContent = Math.floor(game.upgrades.miner);
    
    // Actualizar porcentajes y precios de mejoras
    document.getElementById('miningSpeedPercent').textContent = Math.floor(game.upgradePercentages.miningSpeed * 100);
    document.getElementById('carryCapacityUnits').textContent = game.upgradePercentages.carryCapacity;
    document.getElementById('moveSpeedPercent').textContent = Math.floor(game.upgradePercentages.moveSpeed * 100);
    document.getElementById('loadSpeedPercent').textContent = Math.floor(game.upgradePercentages.loadSpeed * 100);
    
    document.getElementById('miningSpeedPrice').textContent = Math.floor(game.upgrades.miningSpeed);
    document.getElementById('carryCapacityPrice').textContent = Math.floor(game.upgrades.carryCapacity);
    document.getElementById('moveSpeedPrice').textContent = Math.floor(game.upgrades.moveSpeed);
    document.getElementById('loadSpeedPrice').textContent = Math.floor(game.upgrades.loadSpeed);
    
    // Actualizar precios de minerales
    Object.keys(game.mineralPrices).forEach(mineral => {
        const element = document.getElementById(`${mineral}Price`);
        if (element) {
            element.textContent = game.mineralPrices[mineral];
        }
    });
}

// Manejar entrada del usuario
function handleInput() {
    const cameraSpeed = 5;
    
    if (game.keys.ArrowUp || game.keys.w) {
        game.camera.y -= cameraSpeed;
    }
    if (game.keys.ArrowDown || game.keys.s) {
        game.camera.y += cameraSpeed;
    }
    if (game.keys.ArrowLeft || game.keys.a) {
        game.camera.x -= cameraSpeed;
    }
    if (game.keys.ArrowRight || game.keys.d) {
        game.camera.x += cameraSpeed;
    }
    
    // Regenerar energía lentamente (por si acaso)
    if (game.player.energy < 100) {
        game.player.energy += 0.05;
    }
}

// Minar recursos
function mineResources() {
    const playerCenterX = game.player.x;
    const playerCenterY = game.player.y;
    const miningRange = game.player.size * 1.5;
    
    for (let i = game.resources.length - 1; i >= 0; i--) {
        const resource = game.resources[i];
        const resourceCenterX = resource.x + resource.size / 2;
        const resourceCenterY = resource.y + resource.size / 2;
        
        const distance = Math.sqrt(
            Math.pow(playerCenterX - resourceCenterX, 2) +
            Math.pow(playerCenterY - resourceCenterY, 2)
        );
        
        if (distance < miningRange) {
            resource.health--;
            
            if (resource.health <= 0) {
                // Recolectar recurso
                switch (resource.type) {
                    case 'gold':
                        game.player.inventory.gold++;
                        break;
                    case 'stone':
                        game.player.inventory.stone++;
                        break;
                    case 'tree':
                        game.player.inventory.wood++;
                        break;
                }
                
                // Eliminar recurso
                game.resources.splice(i, 1);
            }
        }
    }
}

// Nueva función para actualizar los mineros automáticos
function updateAutoMiners() {
    const now = Date.now();
    const deltaTime = (now - game.player.lastUpdate) / 1000; // Tiempo en segundos
    game.player.lastUpdate = now;
    
    // Ya no añadimos recursos directamente, los mineros lo harán
    // Solo actualizamos la UI
    updateUI();
}

// Añadir estas funciones para la IA de los mineros

// Configuración de los mineros con IA
function createMiner() {
    // La base siempre está en el centro del mundo
    const baseX = game.worldSize * game.tileSize / 2;
    const baseY = game.worldSize * game.tileSize / 2;
    
    // Posición aleatoria en un radio de 100 píxeles alrededor de la base
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 100 + 50;
    const randomX = baseX + Math.cos(angle) * distance;
    const randomY = baseY + Math.sin(angle) * distance;
    
    // Asignar un color aleatorio al minero para distinguirlos
    const colors = ['#FFD700', '#A0A0A0', '#8B4513', '#E0115F', '#50C878', '#0F52BA'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    // Velocidades base ajustadas para el 10% inicial
    const baseSpeed = 5.0;        // Velocidad base de movimiento
    const baseMiningSpeed = 0.1;  // Velocidad base de perforación
    const baseLoadSpeed = 0.2;    // Velocidad base de carga
    
    return {
        x: randomX,
        y: randomY,
        size: 20,
        targetResource: null,
        state: 'searching',
        speed: baseSpeed * game.upgradePercentages.moveSpeed,
        miningProgress: 0,
        miningSpeed: baseMiningSpeed * game.upgradePercentages.miningSpeed,
        loadSpeed: baseLoadSpeed * game.upgradePercentages.loadSpeed,
        inventory: 0,
        maxInventory: game.upgradePercentages.carryCapacity,
        color: randomColor,
        currentMineralType: null
    };
}

// Actualizar la IA de los mineros
function updateMiners() {
    // Actualizar mineros existentes
    game.miners.forEach(miner => {
        switch(miner.state) {
            case 'searching':
                findNearestResource(miner);
                break;
            case 'moving':
                moveToTarget(miner);
                break;
            case 'mining':
                mineTarget(miner);
                break;
            case 'returning':
                returnToBase(miner);
                break;
        }
    });
    
    // Comprobar si necesitamos crear nuevos mineros
    const totalGoldMiners = game.miners.filter(m => m.type === 'gold').length;
    const totalStoneMiners = game.miners.filter(m => m.type === 'stone').length;
    const totalWoodMiners = game.miners.filter(m => m.type === 'wood').length;
    
    // Crear mineros si hay menos que los comprados
    if (totalGoldMiners < game.player.autoMiners.gold) {
        for (let i = 0; i < game.player.autoMiners.gold - totalGoldMiners; i++) {
            game.miners.push(createMiner('gold'));
        }
    }
    
    if (totalStoneMiners < game.player.autoMiners.stone) {
        for (let i = 0; i < game.player.autoMiners.stone - totalStoneMiners; i++) {
            game.miners.push(createMiner('stone'));
        }
    }
    
    if (totalWoodMiners < game.player.autoMiners.wood) {
        for (let i = 0; i < game.player.autoMiners.wood - totalWoodMiners; i++) {
            game.miners.push(createMiner('wood'));
        }
    }
}

// Encontrar el recurso más cercano del tipo adecuado
function findNearestResource(miner) {
    let nearestResource = null;
    let nearestDistance = Infinity;
    
    // Si el minero no tiene un tipo de mineral asignado, buscar cualquier mineral
    if (!miner.currentMineralType) {
        game.resources.forEach(resource => {
            const distance = Math.sqrt(
                Math.pow(miner.x - resource.x, 2) + 
                Math.pow(miner.y - resource.y, 2)
            );
            
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestResource = resource;
            }
        });
        
        if (nearestResource) {
            miner.currentMineralType = nearestResource.type;
            miner.targetResource = nearestResource;
            miner.state = 'moving';
        } else {
            // Si no hay recursos, moverse aleatoriamente
            const randomAngle = Math.random() * Math.PI * 2;
            miner.x += Math.cos(randomAngle) * miner.speed * 5;
            miner.y += Math.sin(randomAngle) * miner.speed * 5;
            
            // Asegurarse de que no se salgan del mundo
            miner.x = Math.max(0, Math.min(miner.x, game.worldSize * game.tileSize));
            miner.y = Math.max(0, Math.min(miner.y, game.worldSize * game.tileSize));
        }
    } else {
        // Buscar solo el tipo de mineral actual
        game.resources.forEach(resource => {
            if (resource.type === miner.currentMineralType) {
                const distance = Math.sqrt(
                    Math.pow(miner.x - resource.x, 2) + 
                    Math.pow(miner.y - resource.y, 2)
                );
                
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestResource = resource;
                }
            }
        });
        
        if (nearestResource) {
            miner.targetResource = nearestResource;
            miner.state = 'moving';
        } else {
            // Si no hay más recursos de ese tipo, volver a la base para depositar
            if (miner.inventory > 0) {
                miner.state = 'returning';
            } else {
                // Si no tiene inventario, buscar otro tipo de mineral
                miner.currentMineralType = null;
                findNearestResource(miner);
            }
        }
    }
}

// Mover hacia el recurso objetivo
function moveToTarget(miner) {
    if (!miner.targetResource) {
        miner.state = 'searching';
        return;
    }
    
    // Comprobar si el recurso todavía existe
    const resourceExists = game.resources.some(r => 
        r.x === miner.targetResource.x && 
        r.y === miner.targetResource.y && 
        r.type === miner.targetResource.type
    );
    
    if (!resourceExists) {
        miner.targetResource = null;
        miner.state = 'searching';
        return;
    }
    
    // Calcular dirección hacia el objetivo
    const dx = miner.targetResource.x - miner.x;
    const dy = miner.targetResource.y - miner.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Si está lo suficientemente cerca, empezar a minar
    if (distance < miner.size + miner.targetResource.size / 2) {
        miner.state = 'mining';
        miner.miningProgress = 0;
    } else {
        // Moverse hacia el objetivo usando la velocidad de movimiento mejorada
        miner.x += (dx / distance) * miner.speed;
        miner.y += (dy / distance) * miner.speed;
    }
}

// Minar el recurso objetivo
function mineTarget(miner) {
    if (!miner.targetResource) {
        miner.state = 'searching';
        return;
    }
    
    // Buscar el recurso en el array de recursos
    const resourceIndex = game.resources.findIndex(r => 
        r.x === miner.targetResource.x && 
        r.y === miner.targetResource.y && 
        r.type === miner.targetResource.type
    );
    
    if (resourceIndex === -1) {
        miner.targetResource = null;
        miner.state = 'searching';
        return;
    }
    
    // Incrementar progreso de minería usando la velocidad de perforación mejorada
    miner.miningProgress += miner.miningSpeed;
    
    // Si ha completado la minería
    if (miner.miningProgress >= game.resources[resourceIndex].health) {
        // Añadir valor al inventario del minero
        miner.inventory += game.resources[resourceIndex].value;
        
        // Eliminar recurso
        game.resources.splice(resourceIndex, 1);
        miner.targetResource = null;
        
        // Solo volver a la base si el inventario está lleno
        if (miner.inventory >= miner.maxInventory) {
            miner.state = 'returning';
        } else {
            // Si no está lleno, seguir buscando más recursos
            miner.state = 'searching';
        }
    }
}

// Volver a la base para depositar recursos
function returnToBase(miner) {
    // La base siempre está en el centro del mundo
    const baseX = game.worldSize * game.tileSize / 2;
    const baseY = game.worldSize * game.tileSize / 2;
    
    const dx = baseX - miner.x;
    const dy = baseY - miner.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Si está lo suficientemente cerca, depositar recursos
    if (distance < 50) {
        // Añadir valor al dinero del jugador
        game.money += miner.inventory;
        
        // Resetear inventario y tipo de mineral
        miner.inventory = 0;
        miner.currentMineralType = null;
        miner.state = 'searching';
    } else {
        // Moverse hacia la base
        miner.x += (dx / distance) * miner.speed;
        miner.y += (dy / distance) * miner.speed;
    }
}

// Dibujar mineros
function drawMiners() {
    game.miners.forEach((miner, index) => {
        const screenX = miner.x - game.camera.x;
        const screenY = miner.y - game.camera.y;
        
        // Solo dibujar si está en pantalla
        if (
            screenX + miner.size > 0 &&
            screenX < canvas.width &&
            screenY + miner.size > 0 &&
            screenY < canvas.height
        ) {
            // Dibujar minero
            ctx.fillStyle = miner.color;
            ctx.fillRect(screenX - miner.size/2, screenY - miner.size/2, miner.size, miner.size);
            
            // Dibujar indicador de estado
            let statusColor;
            switch(miner.state) {
                case 'searching': statusColor = '#FFFFFF'; break; // Blanco
                case 'moving': statusColor = '#00FF00'; break;    // Verde
                case 'mining': statusColor = '#FF0000'; break;    // Rojo
                case 'returning': statusColor = '#0000FF'; break; // Azul
            }
            
            ctx.fillStyle = statusColor;
            ctx.beginPath();
            ctx.arc(screenX, screenY - miner.size/2 - 5, 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Dibujar barra de inventario
            const inventoryPercentage = miner.inventory / miner.maxInventory;
            const barWidth = miner.size;
            const barHeight = 4;
            
            // Fondo de la barra
            ctx.fillStyle = '#333333';
            ctx.fillRect(screenX - barWidth/2, screenY + miner.size/2 + 2, barWidth, barHeight);
            
            // Barra de progreso
            ctx.fillStyle = '#FFCC00';
            ctx.fillRect(screenX - barWidth/2, screenY + miner.size/2 + 2, barWidth * inventoryPercentage, barHeight);
            
            // Mostrar número del minero
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '8px Arial';
            ctx.textAlign = 'center';
            ctx.fillText((index + 1).toString(), screenX, screenY + 3);
            
            // Mostrar tipo de mineral que está recogiendo
            if (miner.currentMineralType) {
                ctx.fillStyle = '#FFFFFF';
                ctx.font = '8px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(miner.currentMineralType.charAt(0).toUpperCase(), screenX, screenY - miner.size/2 - 10);
            }
        }
    });
}

// Función para comprar minero de oro
function buyMiner() {
    if (game.money >= game.upgrades.miner) {
        game.money -= game.upgrades.miner;
        game.player.autoMiners.total = (game.player.autoMiners.total || 0) + 1;
        game.upgrades.miner *= 1.5;
        
        // Crear un nuevo minero
        game.miners.push(createMiner());
        
        updateUI();
    }
}

// Añadir funciones para mejorar los diferentes atributos
function upgradeMiningSpeed() {
    if (game.money >= game.upgrades.miningSpeed) {
        game.money -= game.upgrades.miningSpeed;
        game.upgradePercentages.miningSpeed += 0.01; // Aumentar en 1%
        game.upgrades.miningSpeed *= 2;
        
        // Actualizar todos los mineros existentes
        game.miners.forEach(miner => {
            const baseMiningSpeed = 0.1;
            miner.miningSpeed = baseMiningSpeed * game.upgradePercentages.miningSpeed;
        });
        
        updateUI();
    }
}

function upgradeCarryCapacity() {
    if (game.money >= game.upgrades.carryCapacity) {
        game.money -= game.upgrades.carryCapacity;
        game.upgradePercentages.carryCapacity += 1; // Aumentar en 1 unidad
        game.upgrades.carryCapacity *= 2;
        
        // Actualizar todos los mineros existentes
        game.miners.forEach(miner => {
            miner.maxInventory = game.upgradePercentages.carryCapacity;
        });
        
        updateUI();
    }
}

function upgradeMoveSpeed() {
    if (game.money >= game.upgrades.moveSpeed) {
        game.money -= game.upgrades.moveSpeed;
        game.upgradePercentages.moveSpeed += 0.01; // Aumentar en 1%
        game.upgrades.moveSpeed *= 2;
        
        // Actualizar todos los mineros existentes
        game.miners.forEach(miner => {
            const baseSpeed = 0.5;
            miner.speed = baseSpeed * game.upgradePercentages.moveSpeed;
        });
        
        updateUI();
    }
}

function upgradeLoadSpeed() {
    if (game.money >= game.upgrades.loadSpeed) {
        game.money -= game.upgrades.loadSpeed;
        game.upgradePercentages.loadSpeed += 0.01; // Aumentar en 1%
        game.upgrades.loadSpeed *= 2;
        
        // Actualizar todos los mineros existentes
        game.miners.forEach(miner => {
            const baseLoadSpeed = 0.2;
            miner.loadSpeed = baseLoadSpeed * game.upgradePercentages.loadSpeed;
        });
        
        updateUI();
    }
}

// Función para actualizar la cámara
function updateCamera() {
    // No hacemos nada aquí, la cámara se controlará manualmente
}

// Añadir una función para generar recursos periódicamente
function generateNewResources() {
    // Generar nuevos recursos si hay pocos
    if (game.resources.length < 100) {
        // Lista de todos los tipos de minerales ordenados por valor
        const mineralTypes = Object.keys(game.mineralPrices).sort((a, b) => 
            game.mineralPrices[a] - game.mineralPrices[b]
        );
        
        // Coordenadas de la base (centro del mundo)
        const baseX = game.worldSize / 2 * game.tileSize;
        const baseY = game.worldSize / 2 * game.tileSize;
        
        for (let i = 0; i < 5; i++) {
            // Generar posición aleatoria
            const x = Math.floor(Math.random() * game.worldSize) * game.tileSize;
            const y = Math.floor(Math.random() * game.worldSize) * game.tileSize;
            
            // Calcular distancia a la base
            const distanceToBase = Math.sqrt(
                Math.pow(x - baseX, 2) + 
                Math.pow(y - baseY, 2)
            );
            
            // Normalizar la distancia (0 a 1)
            const maxDistance = Math.sqrt(Math.pow(game.worldSize * game.tileSize, 2) * 2) / 2;
            const normalizedDistance = Math.min(distanceToBase / maxDistance, 1);
            
            let mineralType;
            
            // 1% de probabilidad de que aparezca un mineral valioso cerca de la base
            if (Math.random() < 0.01) {
                // Seleccionar un mineral aleatorio de la mitad superior de la lista
                const startIndex = Math.floor(mineralTypes.length / 2);
                mineralType = mineralTypes[startIndex + Math.floor(Math.random() * (mineralTypes.length - startIndex))];
            } else {
                // Seleccionar mineral según la distancia
                // Cuanto más lejos, más probabilidad de minerales valiosos
                const index = Math.min(
                    Math.floor(normalizedDistance * mineralTypes.length + Math.random() * 2 - 1),
                    mineralTypes.length - 1
                );
                mineralType = mineralTypes[Math.max(0, index)];
            }
            
            game.resources.push({
                x: x,
                y: y,
                type: mineralType,
                size: game.tileSize,
                health: 2 + Math.floor(game.mineralPrices[mineralType] / 4),
                value: game.mineralPrices[mineralType]
            });
        }
    }
}

// Función para aumentar los precios de los minerales
function increaseMineralPrices() {
    Object.keys(game.mineralPrices).forEach(mineral => {
        game.mineralPrices[mineral] += 2;
    });
    updateUI();
}

// Modificar el bucle principal para incluir pausa y velocidad
function gameLoop(timestamp) {
    // Calcular delta time para velocidad variable
    if (!gameState.lastFrameTime) {
        gameState.lastFrameTime = timestamp;
    }
    
    const deltaTime = (timestamp - gameState.lastFrameTime) / 1000; // en segundos
    gameState.lastFrameTime = timestamp;
    
    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Dibujar el juego siempre, incluso en pausa
    drawBackground();
    drawResources();
    drawBase();
    drawMiners();
    
    // Si el juego está pausado, mostrar mensaje pero sin oscurecer
    if (gameState.paused) {
        // Dibujar un panel semitransparente para el mensaje
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(canvas.width/2 - 150, canvas.height/2 - 30, 300, 60);
        
        // Dibujar borde
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(canvas.width/2 - 150, canvas.height/2 - 30, 300, 60);
        
        // Dibujar mensaje de pausa
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('JUEGO PAUSADO', canvas.width / 2, canvas.height / 2 + 8);
        
        // Continuar bucle
        requestAnimationFrame(gameLoop);
        return;
    }
    
    // Actualizar lógica múltiples veces según la velocidad
    for (let i = 0; i < gameState.speed; i++) {
        handleInput();
        updateAutoMiners();
        updateMiners();
        
        // Generar nuevos recursos periódicamente
        if (Math.random() < 0.01 * deltaTime * 60) { // Ajustar por deltaTime
            generateNewResources();
        }
    }
    
    // Continuar bucle
    requestAnimationFrame(gameLoop);
}

// Añadir funciones para controlar la pausa y la velocidad
function togglePause() {
    gameState.paused = !gameState.paused;
    
    // Actualizar apariencia del botón
    const pauseButton = document.getElementById('pauseButton');
    if (gameState.paused) {
        pauseButton.textContent = '▶️ Reanudar';
    } else {
        pauseButton.textContent = '⏸️ Pausa';
    }
}

function setSpeed(speed) {
    gameState.speed = speed;
    
    // Actualizar apariencia de los botones
    document.getElementById('speed1').classList.remove('active');
    document.getElementById('speed2').classList.remove('active');
    document.getElementById('speed3').classList.remove('active');
    
    document.getElementById('speed' + speed).classList.add('active');
}

// Modificar la función setupEventListeners para incluir los nuevos botones
function setupEventListeners() {
    // Botones existentes
    document.getElementById('buyMiner').addEventListener('click', buyMiner);
    document.getElementById('upgradeMiningSpeed').addEventListener('click', upgradeMiningSpeed);
    document.getElementById('upgradeCarryCapacity').addEventListener('click', upgradeCarryCapacity);
    document.getElementById('upgradeMoveSpeed').addEventListener('click', upgradeMoveSpeed);
    document.getElementById('upgradeLoadSpeed').addEventListener('click', upgradeLoadSpeed);
    
    // Nuevos botones de control
    document.getElementById('pauseButton').addEventListener('click', togglePause);
    document.getElementById('speed1').addEventListener('click', () => setSpeed(1));
    document.getElementById('speed2').addEventListener('click', () => setSpeed(2));
    document.getElementById('speed3').addEventListener('click', () => setSpeed(3));
    
    // Ocultar controles hasta que el juego comience
    document.querySelector('.game-controls').style.display = 'none';
}

// Modificar la función startGame para mostrar los controles
function startGame() {
    console.log("Iniciando juego...");
    
    try {
        // Inicializar valores iniciales
        game.upgradePercentages.carryCapacity = 2;
        game.upgradePercentages.miningSpeed = 0.1;  // 10%
        game.upgradePercentages.moveSpeed = 0.1;    // 10%
        game.upgradePercentages.loadSpeed = 0.1;    // 10%
        
        // Generar mundo inicial
        generateWorld();
        
        // Centrar la cámara en la base
        game.camera.x = game.worldSize * game.tileSize / 2 - canvas.width / 2;
        game.camera.y = game.worldSize * game.tileSize / 2 - canvas.height / 2;
        
        // Inicializar dinero
        game.money = 30;
        
        // Configurar event listeners para los botones de compra
        setupEventListeners();
        
        // Comprar un minero para comenzar
        buyMiner();
        
        // Iniciar bucle del juego
        gameLoop();
        
        // Mostrar controles del juego
        document.querySelector('.game-controls').style.display = 'flex';
        
        // Ocultar botón de inicio
        document.getElementById('startButton').style.display = 'none';
        
        // Aumentar precios periódicamente
        setInterval(increaseMineralPrices, 60000); // Cada minuto
        
        console.log("Juego iniciado correctamente");
    } catch (error) {
        console.error("Error al iniciar el juego:", error);
    }
}

// Asegurarse de que el event listener se añada cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM cargado, configurando botón de inicio...");
    
    const startButton = document.getElementById('startButton');
    if (startButton) {
        startButton.addEventListener('click', function() {
            console.log("Botón de inicio presionado");
            startGame();
        });
        console.log("Botón de inicio configurado correctamente");
    } else {
        console.error("No se encontró el botón de inicio");
    }
});

// Descomenta los event listeners para las teclas
window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'w') game.keys.ArrowUp = true;
    if (e.key === 'ArrowDown' || e.key === 's') game.keys.ArrowDown = true;
    if (e.key === 'ArrowLeft' || e.key === 'a') game.keys.ArrowLeft = true;
    if (e.key === 'ArrowRight' || e.key === 'd') game.keys.ArrowRight = true;
    if (e.key === ' ') game.keys.Space = true;
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'w') game.keys.ArrowUp = false;
    if (e.key === 'ArrowDown' || e.key === 's') game.keys.ArrowDown = false;
    if (e.key === 'ArrowLeft' || e.key === 'a') game.keys.ArrowLeft = false;
    if (e.key === 'ArrowRight' || e.key === 'd') game.keys.ArrowRight = false;
    if (e.key === ' ') game.keys.Space = false;
}); 