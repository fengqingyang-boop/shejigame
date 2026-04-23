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
        this.zoomLevel = 2;
        this.minZoom = 1;
        this.maxZoom = 6;
        
        this.mouseX = 0;
        this.mouseY = 0;
        
        this.cameraX = 0;
        this.cameraY = 0;
        
        this.building = {
            x: 0,
            y: 0,
            width: 800,
            height: 1000,
            floors: 10,
            windowsPerFloor: 6
        };
        
        this.windows = [];
        
        this.birds = [];
        this.birdSpawnTimer = 0;
        this.birdSpawnInterval = 3000;
        
        this.isInvincible = false;
        this.invincibleTimer = 0;
        this.invincibleDuration = 15000;
        
        this.noAimTimer = 0;
        this.noAimDamageTime = 8000;
        this.enemiesAimingAtPlayer = false;
        
        this.warningActive = false;
        this.warningTimer = 0;
        this.warningDuration = 2000;
        
        this.reloading = false;
        this.reloadTimer = 0;
        this.reloadDuration = 1500;
        
        this.lastTime = 0;
        
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
        
        this.building.x = (this.canvas.width - this.building.width) / 2;
        this.building.y = (this.canvas.height - this.building.height) / 2;
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
            
            if (this.isAiming) {
                const centerX = this.canvas.width / 2;
                const centerY = this.canvas.height / 2;
                
                this.cameraX = (this.mouseX - centerX) / this.zoomLevel;
                this.cameraY = (this.mouseY - centerY) / this.zoomLevel;
            }
        });
        
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.gameState === 'playing') {
                this.isAiming = !this.isAiming;
                if (this.isAiming) {
                    this.noAimTimer = 0;
                    this.enemiesAimingAtPlayer = false;
                }
                this.updateZoomDisplay();
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
        this.zoomLevel = 2;
        this.isInvincible = false;
        this.invincibleTimer = 0;
        this.noAimTimer = 0;
        this.enemiesAimingAtPlayer = false;
        this.warningActive = false;
        this.reloading = false;
        this.birds = [];
        this.birdSpawnTimer = 0;
        this.cameraX = 0;
        this.cameraY = 0;
        
        this.initializeWindows();
        
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');
        this.updateHUD();
    }
    
    initializeWindows() {
        this.windows = [];
        
        const windowWidth = 100;
        const windowHeight = 80;
        const windowGapX = 30;
        const windowGapY = 20;
        
        const totalWidth = this.building.windowsPerFloor * (windowWidth + windowGapX) - windowGapX;
        const totalHeight = this.building.floors * (windowHeight + windowGapY) - windowGapY;
        
        const startX = this.building.x + (this.building.width - totalWidth) / 2;
        const startY = this.building.y + (this.building.height - totalHeight) / 2;
        
        for (let floor = 0; floor < this.building.floors; floor++) {
            for (let w = 0; w < this.building.windowsPerFloor; w++) {
                const x = startX + w * (windowWidth + windowGapX);
                const y = startY + floor * (windowHeight + windowGapY);
                
                this.windows.push({
                    x: x,
                    y: y,
                    width: windowWidth,
                    height: windowHeight,
                    floor: floor,
                    windowNum: w,
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
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        if (this.gameState === 'playing') {
            this.update(deltaTime);
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
                if (Math.random() < 0.003) {
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
            y: 80 + Math.random() * 150,
            width: 35,
            height: 25,
            speed: (fromLeft ? 1 : -1) * (2 + Math.random() * 2),
            baseSpeed: (fromLeft ? 1 : -1) * (2 + Math.random() * 2),
            wingTimer: 0
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
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        const worldShotX = this.cameraX + this.building.x + this.building.width / 2;
        const worldShotY = this.cameraY + this.building.y + this.building.height / 2;
        
        let hit = false;
        
        for (let bird of this.birds) {
            const birdScreenX = centerX + (bird.x - (this.building.x + this.building.width / 2) - this.cameraX) * this.zoomLevel;
            const birdScreenY = centerY + (bird.y - (this.building.y + this.building.height / 2) - this.cameraY) * this.zoomLevel;
            
            const dist = Math.sqrt(
                Math.pow(this.mouseX - birdScreenX, 2) + 
                Math.pow(this.mouseY - birdScreenY, 2)
            );
            
            if (dist < 30) {
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
                    const personWorldX = window.x + window.width / 2;
                    const personWorldY = window.y + window.height / 2;
                    
                    const personScreenX = centerX + (personWorldX - (this.building.x + this.building.width / 2) - this.cameraX) * this.zoomLevel;
                    const personScreenY = centerY + (personWorldY - (this.building.y + this.building.height / 2) - this.cameraY) * this.zoomLevel;
                    
                    const hitRadius = 25 * this.zoomLevel;
                    
                    let shouldHit = false;
                    
                    if (this.isInvincible && window.occupantType === 'criminal') {
                        shouldHit = true;
                    } else {
                        const dist = Math.sqrt(
                            Math.pow(this.mouseX - personScreenX, 2) + 
                            Math.pow(this.mouseY - personScreenY, 2)
                        );
                        
                        if (dist < hitRadius) {
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
    }
    
    renderNormalView() {
        const ctx = this.ctx;
        
        const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#1a3a5c');
        gradient.addColorStop(0.3, '#2a4a6c');
        gradient.addColorStop(1, '#1a2a3c');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.renderBirdsNormal();
        
        this.renderBuilding();
        
        this.renderSniperRifle();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('按鼠标右键开启瞄准镜', this.canvas.width / 2, this.canvas.height - 80);
        ctx.fillText('左键射击 | 滚轮调倍镜 | R键装弹', this.canvas.width / 2, this.canvas.height - 50);
    }
    
    renderAimedView() {
        const ctx = this.ctx;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        ctx.save();
        ctx.beginPath();
        const scopeRadius = Math.min(this.canvas.width, this.canvas.height) * 0.42;
        ctx.arc(centerX, centerY, scopeRadius, 0, Math.PI * 2);
        ctx.clip();
        
        const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#2a4a6c');
        gradient.addColorStop(0.3, '#3a5a7c');
        gradient.addColorStop(1, '#2a3a4c');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(this.zoomLevel, this.zoomLevel);
        ctx.translate(-centerX, -centerY);
        ctx.translate(-this.cameraX, -this.cameraY);
        
        this.renderBirdsZoomed();
        
        this.renderBuilding();
        
        ctx.restore();
        ctx.restore();
        
        this.renderScopeOverlay();
    }
    
    renderBuilding() {
        const ctx = this.ctx;
        const b = this.building;
        
        ctx.fillStyle = '#3a3a5e';
        ctx.fillRect(b.x, b.y, b.width, b.height);
        
        ctx.fillStyle = '#2a2a4e';
        ctx.fillRect(b.x + 10, b.y + 10, b.width - 20, b.height - 20);
        
        for (let window of this.windows) {
            ctx.fillStyle = '#0a0a1e';
            ctx.fillRect(window.x, window.y, window.width, window.height);
            
            ctx.strokeStyle = '#5a5a7e';
            ctx.lineWidth = 3;
            ctx.strokeRect(window.x, window.y, window.width, window.height);
            
            ctx.strokeStyle = '#4a4a6e';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(window.x + window.width / 2, window.y);
            ctx.lineTo(window.x + window.width / 2, window.y + window.height);
            ctx.moveTo(window.x, window.y + window.height / 2);
            ctx.lineTo(window.x + window.width, window.y + window.height / 2);
            ctx.stroke();
            
            if (window.occupied) {
                this.renderPerson(window);
            }
        }
    }
    
    renderPerson(window) {
        const ctx = this.ctx;
        const x = window.x + window.width / 2;
        const y = window.y + window.height / 2;
        
        ctx.fillStyle = window.occupantType === 'criminal' ? '#2a2a3a' : '#4a6a8a';
        ctx.fillRect(x - 18, y - 5, 36, 40);
        
        ctx.fillStyle = '#e8c4a0';
        ctx.beginPath();
        ctx.arc(x, y - 25, 15, 0, Math.PI * 2);
        ctx.fill();
        
        if (window.occupantType === 'criminal') {
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(x - 12, y - 30, 24, 18);
            
            ctx.fillStyle = '#fff';
            ctx.fillRect(x - 10, y - 27, 8, 5);
            ctx.fillRect(x + 2, y - 27, 8, 5);
            
            ctx.fillStyle = '#000';
            ctx.fillRect(x - 8, y - 26, 4, 3);
            ctx.fillRect(x + 4, y - 26, 4, 3);
        } else {
            ctx.fillStyle = '#333';
            ctx.fillRect(x - 8, y - 27, 5, 5);
            ctx.fillRect(x + 3, y - 27, 5, 5);
            
            ctx.fillStyle = '#5a3a2a';
            ctx.fillRect(x - 12, y - 38, 24, 8);
        }
        
        if (window.isAimingAtPlayer && window.occupantType === 'criminal') {
            ctx.fillStyle = '#444';
            ctx.fillRect(x + 20, y, 25, 8);
            
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + 45, y + 4);
            ctx.lineTo(x + 60, y + 4);
            ctx.stroke();
        }
    }
    
    renderBirdsNormal() {
        const ctx = this.ctx;
        
        for (let bird of this.birds) {
            this.renderBird(ctx, bird.x, bird.y, bird.wingTimer);
        }
    }
    
    renderBirdsZoomed() {
        const ctx = this.ctx;
        
        for (let bird of this.birds) {
            this.renderBird(ctx, bird.x, bird.y, bird.wingTimer);
        }
    }
    
    renderBird(ctx, x, y, wingTimer) {
        ctx.fillStyle = '#1a1a1a';
        
        const wingUp = Math.sin(wingTimer * 0.015) > 0;
        
        ctx.beginPath();
        ctx.ellipse(x, y, 14, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        
        if (wingUp) {
            ctx.beginPath();
            ctx.moveTo(x - 6, y);
            ctx.lineTo(x - 20, y - 12);
            ctx.lineTo(x - 6, y - 3);
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(x + 6, y);
            ctx.lineTo(x + 20, y - 12);
            ctx.lineTo(x + 6, y - 3);
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.moveTo(x - 6, y);
            ctx.lineTo(x - 20, y + 12);
            ctx.lineTo(x - 6, y + 3);
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(x + 6, y);
            ctx.lineTo(x + 20, y + 12);
            ctx.lineTo(x + 6, y + 3);
            ctx.fill();
        }
        
        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.moveTo(x + 14, y);
        ctx.lineTo(x + 22, y - 3);
        ctx.lineTo(x + 22, y + 3);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(x + 10, y - 2, 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(x + 12, y - 3, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderSniperRifle() {
        const ctx = this.ctx;
        
        const gunX = this.canvas.width / 2 + 150;
        const gunY = this.canvas.height - 100;
        
        ctx.save();
        ctx.translate(gunX, gunY);
        ctx.rotate(-0.1);
        
        ctx.fillStyle = '#5a4a3a';
        ctx.fillRect(-180, 20, 220, 35);
        
        ctx.fillStyle = '#4a3a2a';
        ctx.fillRect(-160, 55, 50, 60);
        
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(-120, 10, 180, 40);
        
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, -5, 100, 12);
        
        ctx.fillStyle = '#3a3a3a';
        ctx.beginPath();
        ctx.arc(-60, 30, 15, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#2a2a2a';
        ctx.beginPath();
        ctx.arc(-60, 30, 10, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#3a5a3a';
        ctx.fillRect(-100, -15, 60, 25);
        
        ctx.fillStyle = '#2a4a2a';
        ctx.beginPath();
        ctx.ellipse(-70, -15, 20, 8, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    renderScopeOverlay() {
        const ctx = this.ctx;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const scopeRadius = Math.min(this.canvas.width, this.canvas.height) * 0.42;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.98)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(centerX, centerY, scopeRadius - 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 15;
        ctx.beginPath();
        ctx.arc(centerX, centerY, scopeRadius - 5, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(centerX, centerY, scopeRadius - 12, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, scopeRadius - 18, 0, Math.PI * 2);
        ctx.stroke();
        
        this.renderCrosshair(centerX, centerY, scopeRadius);
        
        if (this.isInvincible) {
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(centerX, centerY, scopeRadius - 40, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';
            ctx.beginPath();
            ctx.arc(centerX, centerY, scopeRadius - 40, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    renderCrosshair(centerX, centerY, scopeRadius) {
        const ctx = this.ctx;
        
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.9)';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - scopeRadius + 50);
        ctx.lineTo(centerX, centerY - 25);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY + 25);
        ctx.lineTo(centerX, centerY + scopeRadius - 50);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(centerX - scopeRadius + 50, centerY);
        ctx.lineTo(centerX - 25, centerY);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(centerX + 25, centerY);
        ctx.lineTo(centerX + scopeRadius - 50, centerY);
        ctx.stroke();
        
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
        ctx.lineWidth = 1;
        
        const tickSpacing = 50;
        const tickLength = 15;
        
        for (let i = 1; i <= 6; i++) {
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
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(255, 0, 0, 0.9)';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 0.5;
        
        const smallTickSpacing = 10;
        for (let i = 1; i <= 4; i++) {
            ctx.beginPath();
            ctx.moveTo(centerX - 20 - i * smallTickSpacing, centerY);
            ctx.lineTo(centerX - 20 - i * smallTickSpacing, centerY + 5);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(centerX + 20 + i * smallTickSpacing, centerY);
            ctx.lineTo(centerX + 20 + i * smallTickSpacing, centerY + 5);
            ctx.stroke();
        }
    }
}

window.addEventListener('load', () => {
    new SniperGame();
});
