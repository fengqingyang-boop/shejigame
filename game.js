class SniperGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.gameState = 'start';
        
        this.kills = 0;
        this.score = 0;
        this.bullets = 6;
        this.maxBullets = 6;
        this.health = 20;
        this.maxHealth = 20;
        
        this.isAiming = false;
        this.zoomLevel = 1;
        this.minZoom = 1;
        this.maxZoom = 8;
        
        this.mouseX = 0;
        this.mouseY = 0;
        
        this.building = {
            floors: 10,
            windowsPerFloor: 6,
            windowWidth: 60,
            windowHeight: 80,
            windowGap: 20,
            floorGap: 30
        };
        
        this.windows = [];
        
        this.birds = [];
        this.birdSpawnTimer = 0;
        this.birdSpawnInterval = 5000;
        
        this.isInvincible = false;
        this.invincibleTimer = 0;
        this.invincibleDuration = 15000;
        
        this.noAimTimer = 0;
        this.noAimWarningTime = 5000;
        this.noAimDamageTime = 8000;
        this.enemiesAimingAtPlayer = false;
        
        this.warningActive = false;
        this.warningTimer = 0;
        this.warningDuration = 2000;
        
        this.reloading = false;
        this.reloadTimer = 0;
        this.reloadDuration = 2000;
        
        this.lastTime = 0;
        this.deltaTime = 0;
        
        this.init();
    }
    
    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        this.setupEventListeners();
        this.setupUI();
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });
        
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.gameState === 'playing') {
                this.isAiming = !this.isAiming;
                if (this.isAiming) {
                    this.noAimTimer = 0;
                    this.enemiesAimingAtPlayer = false;
                }
            }
        });
        
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0 && this.gameState === 'playing') {
                this.shoot();
            }
        });
        
        this.canvas.addEventListener('wheel', (e) => {
            if (this.gameState === 'playing' && this.isAiming) {
                e.preventDefault();
                if (e.deltaY > 0) {
                    this.zoomLevel = Math.max(this.minZoom, this.zoomLevel - 0.5);
                } else {
                    this.zoomLevel = Math.min(this.maxZoom, this.zoomLevel + 0.5);
                }
                this.updateZoomDisplay();
            }
        }, { passive: false });
        
        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'r' && this.gameState === 'playing') {
                this.reload();
            }
        });
    }
    
    setupUI() {
        document.getElementById('start-button').addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('restart-button').addEventListener('click', () => {
            this.startGame();
        });
    }
    
    startGame() {
        this.gameState = 'playing';
        this.kills = 0;
        this.score = 0;
        this.bullets = this.maxBullets;
        this.health = this.maxHealth;
        this.isAiming = false;
        this.zoomLevel = 1;
        this.isInvincible = false;
        this.invincibleTimer = 0;
        this.noAimTimer = 0;
        this.enemiesAimingAtPlayer = false;
        this.warningActive = false;
        this.reloading = false;
        this.birds = [];
        this.birdSpawnTimer = 0;
        
        this.initializeWindows();
        
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');
        this.updateHUD();
    }
    
    initializeWindows() {
        this.windows = [];
        
        const totalWidth = this.building.windowsPerFloor * (this.building.windowWidth + this.building.windowGap) - this.building.windowGap;
        const totalHeight = this.building.floors * (this.building.windowHeight + this.building.floorGap) - this.building.floorGap;
        
        const startX = (this.canvas.width - totalWidth) / 2;
        const startY = (this.canvas.height - totalHeight) / 2;
        
        for (let floor = 0; floor < this.building.floors; floor++) {
            for (let window = 0; window < this.building.windowsPerFloor; window++) {
                const x = startX + window * (this.building.windowWidth + this.building.windowGap);
                const y = startY + floor * (this.building.windowHeight + this.building.floorGap);
                
                this.windows.push({
                    x: x,
                    y: y,
                    width: this.building.windowWidth,
                    height: this.building.windowHeight,
                    floor: floor,
                    windowNum: window,
                    occupied: false,
                    occupantType: null,
                    occupantTimer: 0,
                    occupantDuration: 0,
                    isAimingAtPlayer: false
                });
            }
        }
    }
    
    gameLoop(currentTime) {
        this.deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        if (this.gameState === 'playing') {
            this.update(this.deltaTime);
        }
        
        this.render();
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    update(deltaTime) {
        this.updateWindows(deltaTime);
        this.updateBirds(deltaTime);
        this.updateWarning(deltaTime);
        this.updateReload(deltaTime);
        this.updateInvincible(deltaTime);
        this.updateNoAimTimer(deltaTime);
        this.updateHUD();
        
        if (this.health <= 0) {
            this.gameOver();
        }
    }
    
    updateWindows(deltaTime) {
        for (let window of this.windows) {
            if (window.occupied) {
                window.occupantTimer += deltaTime;
                if (window.occupantTimer >= window.occupantDuration) {
                    window.occupied = false;
                    window.occupantType = null;
                    window.occupantTimer = 0;
                    window.isAimingAtPlayer = false;
                }
            } else {
                if (Math.random() < 0.002) {
                    window.occupied = true;
                    window.occupantType = Math.random() < 0.6 ? 'criminal' : 'civilian';
                    window.occupantTimer = 0;
                    window.occupantDuration = 2000 + Math.random() * 4000;
                    window.isAimingAtPlayer = this.enemiesAimingAtPlayer && window.occupantType === 'criminal';
                }
            }
            
            if (this.enemiesAimingAtPlayer && window.occupied && window.occupantType === 'criminal') {
                window.isAimingAtPlayer = true;
            }
        }
    }
    
    updateBirds(deltaTime) {
        this.birdSpawnTimer += deltaTime;
        if (this.birdSpawnTimer >= this.birdSpawnInterval) {
            this.birdSpawnTimer = 0;
            this.spawnBird();
        }
        
        for (let i = this.birds.length - 1; i >= 0; i--) {
            const bird = this.birds[i];
            bird.x += bird.speed * (deltaTime / 16);
            bird.y += Math.sin(bird.x * 0.02) * 0.5;
            bird.wingTimer += deltaTime;
            
            if (bird.x > this.canvas.width + 50 || bird.x < -50) {
                this.birds.splice(i, 1);
            }
        }
    }
    
    spawnBird() {
        const fromLeft = Math.random() < 0.5;
        const bird = {
            x: fromLeft ? -30 : this.canvas.width + 30,
            y: 50 + Math.random() * 150,
            width: 30,
            height: 20,
            speed: (fromLeft ? 1 : -1) * (2 + Math.random() * 2),
            baseSpeed: (fromLeft ? 1 : -1) * (2 + Math.random() * 2),
            wingTimer: 0,
            wingUp: true
        };
        this.birds.push(bird);
    }
    
    updateWarning(deltaTime) {
        if (this.warningActive) {
            this.warningTimer += deltaTime;
            if (this.warningTimer >= this.warningDuration) {
                this.warningActive = false;
                this.warningTimer = 0;
                document.getElementById('warning').classList.add('hidden');
            }
        }
    }
    
    updateReload(deltaTime) {
        if (this.reloading) {
            this.reloadTimer += deltaTime;
            if (this.reloadTimer >= this.reloadDuration) {
                this.reloading = false;
                this.bullets = this.maxBullets;
                this.reloadTimer = 0;
            }
        }
    }
    
    updateInvincible(deltaTime) {
        if (this.isInvincible) {
            this.invincibleTimer -= deltaTime;
            if (this.invincibleTimer <= 0) {
                this.isInvincible = false;
                this.invincibleTimer = 0;
                document.getElementById('invincible-timer').classList.add('hidden');
            } else {
                document.getElementById('invincible-time').textContent = Math.ceil(this.invincibleTimer / 1000);
            }
        }
    }
    
    updateNoAimTimer(deltaTime) {
        if (!this.isAiming) {
            this.noAimTimer += deltaTime;
            
            if (this.noAimTimer >= this.noAimDamageTime) {
                this.health -= 1;
                this.noAimTimer = 0;
                this.enemiesAimingAtPlayer = true;
            }
        }
    }
    
    shoot() {
        if (!this.isAiming) return;
        if (this.reloading) return;
        if (this.bullets <= 0) return;
        
        this.bullets--;
        
        for (let bird of this.birds) {
            bird.speed = bird.baseSpeed * 3;
        }
        
        const shotX = this.mouseX;
        const shotY = this.mouseY;
        
        let hit = false;
        
        for (let bird of this.birds) {
            if (this.isPointInRect(shotX, shotY, bird.x - bird.width/2, bird.y - bird.height/2, bird.width, bird.height)) {
                this.birds = this.birds.filter(b => b !== bird);
                this.isInvincible = true;
                this.invincibleTimer = this.invincibleDuration;
                document.getElementById('invincible-timer').classList.remove('hidden');
                hit = true;
                break;
            }
        }
        
        if (!hit) {
            for (let window of this.windows) {
                if (window.occupied) {
                    const personX = window.x + window.width / 2;
                    const personY = window.y + window.height / 2;
                    const personWidth = 40;
                    const personHeight = 60;
                    
                    let shouldHit = false;
                    
                    if (this.isInvincible && window.occupantType === 'criminal') {
                        shouldHit = true;
                    } else {
                        if (this.isPointInRect(shotX, shotY, personX - personWidth/2, personY - personHeight/2, personWidth, personHeight)) {
                            shouldHit = true;
                        }
                    }
                    
                    if (shouldHit) {
                        if (window.occupantType === 'criminal') {
                            this.kills++;
                            this.score += 2;
                        } else {
                            this.score = Math.max(0, this.score - 1);
                            this.showWarning();
                        }
                        
                        window.occupied = false;
                        window.occupantType = null;
                        hit = true;
                        break;
                    }
                }
            }
        }
    }
    
    isPointInRect(px, py, rx, ry, rw, rh) {
        return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
    }
    
    reload() {
        if (this.reloading) return;
        if (this.bullets === this.maxBullets) return;
        
        this.reloading = true;
        this.reloadTimer = 0;
    }
    
    showWarning() {
        this.warningActive = true;
        this.warningTimer = 0;
        document.getElementById('warning').classList.remove('hidden');
    }
    
    updateHUD() {
        document.getElementById('kills').textContent = this.kills;
        document.getElementById('score').textContent = this.score;
        document.getElementById('bullets').textContent = this.reloading ? '装弹中...' : `${this.bullets}/${this.maxBullets}`;
        
        const healthPercent = (this.health / this.maxHealth) * 100;
        document.getElementById('health-fill').style.width = `${healthPercent}%`;
    }
    
    updateZoomDisplay() {
        const zoomDisplay = document.getElementById('zoom-display');
        const zoomValue = document.getElementById('zoom');
        
        if (this.isAiming) {
            zoomDisplay.classList.add('visible');
            zoomValue.textContent = `${this.zoomLevel}x`;
        } else {
            zoomDisplay.classList.remove('visible');
        }
    }
    
    gameOver() {
        this.gameState = 'gameover';
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('final-kills').textContent = this.kills;
        document.getElementById('game-over-screen').classList.remove('hidden');
    }
    
    render() {
        const ctx = this.ctx;
        
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.gameState === 'start') {
            return;
        }
        
        if (this.isAiming) {
            this.renderAimedView();
        } else {
            this.renderNormalView();
        }
        
        this.renderBirds();
        this.renderSniperRifle();
        
        if (this.isAiming) {
            this.renderScope();
        }
    }
    
    renderNormalView() {
        const ctx = this.ctx;
        
        const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#0a0a20');
        gradient.addColorStop(0.5, '#1a1a3e');
        gradient.addColorStop(1, '#2a2a4e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.renderBuilding();
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        ctx.fillStyle = '#fff';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('按鼠标右键开启瞄准镜', this.canvas.width / 2, this.canvas.height - 50);
    }
    
    renderAimedView() {
        const ctx = this.ctx;
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        const mouseOffsetX = (this.mouseX - centerX) / this.zoomLevel;
        const mouseOffsetY = (this.mouseY - centerY) / this.zoomLevel;
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(this.zoomLevel, this.zoomLevel);
        ctx.translate(-centerX + mouseOffsetX, -centerY + mouseOffsetY);
        
        const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#1a1a3e');
        gradient.addColorStop(1, '#2a2a5e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.renderBuilding();
        
        ctx.restore();
    }
    
    renderBuilding() {
        const ctx = this.ctx;
        
        const totalWidth = this.building.windowsPerFloor * (this.building.windowWidth + this.building.windowGap) - this.building.windowGap;
        const totalHeight = this.building.floors * (this.building.windowHeight + this.building.floorGap) - this.building.floorGap;
        
        const startX = (this.canvas.width - totalWidth) / 2;
        const startY = (this.canvas.height - totalHeight) / 2;
        
        ctx.fillStyle = '#3a3a5e';
        ctx.fillRect(startX - 30, startY - 30, totalWidth + 60, totalHeight + 60);
        
        ctx.fillStyle = '#2a2a4e';
        ctx.fillRect(startX - 20, startY - 20, totalWidth + 40, totalHeight + 40);
        
        for (let window of this.windows) {
            ctx.fillStyle = '#0a0a1e';
            ctx.fillRect(window.x, window.y, window.width, window.height);
            
            ctx.strokeStyle = '#4a4a6e';
            ctx.lineWidth = 3;
            ctx.strokeRect(window.x, window.y, window.width, window.height);
            
            if (window.occupied) {
                this.renderPerson(window);
            }
        }
    }
    
    renderPerson(window) {
        const ctx = this.ctx;
        const x = window.x + window.width / 2;
        const y = window.y + window.height / 2;
        
        ctx.save();
        
        ctx.fillStyle = window.occupantType === 'criminal' ? '#2a2a3a' : '#4a6a8a';
        ctx.fillRect(x - 15, y - 10, 30, 35);
        
        ctx.fillStyle = '#e8c4a0';
        ctx.beginPath();
        ctx.arc(x, y - 20, 12, 0, Math.PI * 2);
        ctx.fill();
        
        if (window.occupantType === 'criminal') {
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(x - 10, y - 25, 20, 15);
            
            ctx.fillStyle = '#fff';
            ctx.fillRect(x - 8, y - 22, 6, 4);
            ctx.fillRect(x + 2, y - 22, 6, 4);
        } else {
            ctx.fillStyle = '#333';
            ctx.fillRect(x - 6, y - 22, 4, 4);
            ctx.fillRect(x + 2, y - 22, 4, 4);
        }
        
        if (window.isAimingAtPlayer && window.occupantType === 'criminal') {
            ctx.fillStyle = '#555';
            ctx.fillRect(x + 15, y - 5, 20, 6);
            
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + 35, y - 2);
            ctx.lineTo(x + 50, y - 2);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    renderBirds() {
        const ctx = this.ctx;
        
        for (let bird of this.birds) {
            ctx.save();
            
            if (this.isAiming) {
                const centerX = this.canvas.width / 2;
                const centerY = this.canvas.height / 2;
                const mouseOffsetX = (this.mouseX - centerX) / this.zoomLevel;
                const mouseOffsetY = (this.mouseY - centerY) / this.zoomLevel;
                
                ctx.save();
                ctx.translate(centerX, centerY);
                ctx.scale(this.zoomLevel, this.zoomLevel);
                ctx.translate(-centerX + mouseOffsetX, -centerY + mouseOffsetY);
            }
            
            ctx.fillStyle = '#1a1a1a';
            
            const wingPhase = Math.sin(bird.wingTimer * 0.01) > 0;
            
            ctx.beginPath();
            ctx.ellipse(bird.x, bird.y, 12, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            
            if (wingPhase) {
                ctx.beginPath();
                ctx.moveTo(bird.x - 5, bird.y);
                ctx.lineTo(bird.x - 15, bird.y - 8);
                ctx.lineTo(bird.x - 5, bird.y - 2);
                ctx.fill();
                
                ctx.beginPath();
                ctx.moveTo(bird.x + 5, bird.y);
                ctx.lineTo(bird.x + 15, bird.y - 8);
                ctx.lineTo(bird.x + 5, bird.y - 2);
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.moveTo(bird.x - 5, bird.y);
                ctx.lineTo(bird.x - 15, bird.y + 8);
                ctx.lineTo(bird.x - 5, bird.y + 2);
                ctx.fill();
                
                ctx.beginPath();
                ctx.moveTo(bird.x + 5, bird.y);
                ctx.lineTo(bird.x + 15, bird.y + 8);
                ctx.lineTo(bird.x + 5, bird.y + 2);
                ctx.fill();
            }
            
            ctx.fillStyle = '#ff6600';
            ctx.beginPath();
            ctx.moveTo(bird.x + 12, bird.y);
            ctx.lineTo(bird.x + 18, bird.y - 2);
            ctx.lineTo(bird.x + 18, bird.y + 2);
            ctx.fill();
            
            if (this.isAiming) {
                ctx.restore();
            }
            
            ctx.restore();
        }
    }
    
    renderSniperRifle() {
        const ctx = this.ctx;
        
        ctx.save();
        
        const gunX = this.canvas.width / 2 + 100;
        const gunY = this.canvas.height - 150;
        
        ctx.fillStyle = '#3a2a1a';
        ctx.fillRect(gunX - 150, gunY + 50, 200, 30);
        
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(gunX - 100, gunY + 20, 150, 35);
        
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(gunX - 80, gunY + 10, 100, 15);
        
        ctx.fillStyle = '#2a2a2a';
        ctx.beginPath();
        ctx.arc(gunX - 30, gunY + 37, 12, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    renderScope() {
        const ctx = this.ctx;
        
        ctx.save();
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        const scopeRadius = Math.min(this.canvas.width, this.canvas.height) * 0.4;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(centerX, centerY, scopeRadius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.globalCompositeOperation = 'source-over';
        
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(centerX, centerY, scopeRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(centerX, centerY, scopeRadius - 5, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.lineWidth = 1.5;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - scopeRadius + 20);
        ctx.lineTo(centerX, centerY - 30);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY + 30);
        ctx.lineTo(centerX, centerY + scopeRadius - 20);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(centerX - scopeRadius + 20, centerY);
        ctx.lineTo(centerX - 30, centerY);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(centerX + 30, centerY);
        ctx.lineTo(centerX + scopeRadius - 20, centerY);
        ctx.stroke();
        
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 1;
        for (let i = 1; i <= 5; i++) {
            const tickLength = 20;
            const tickSpacing = 40;
            
            ctx.beginPath();
            ctx.moveTo(centerX - i * tickSpacing, centerY);
            ctx.lineTo(centerX - i * tickSpacing, centerY + tickLength);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(centerX + i * tickSpacing, centerY);
            ctx.lineTo(centerX + i * tickSpacing, centerY + tickLength);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY - i * tickSpacing);
            ctx.lineTo(centerX + tickLength, centerY - i * tickSpacing);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY + i * tickSpacing);
            ctx.lineTo(centerX + tickLength, centerY + i * tickSpacing);
            ctx.stroke();
        }
        
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(255, 0, 0, 0.9)';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 2, 0, Math.PI * 2);
        ctx.fill();
        
        if (this.isInvincible) {
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(centerX, centerY, scopeRadius - 30, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(centerX, centerY, scopeRadius - 30, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

window.addEventListener('load', () => {
    new SniperGame();
});
