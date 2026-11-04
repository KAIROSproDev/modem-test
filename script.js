"use strict";

/* =========================================================
   NAVE ESCAPE // SYSTEM BREACH
   Motor de jogo: Canvas 2D + shader WebGL
   ========================================================= */

/* -------------------------
   ELEMENTOS
------------------------- */

const $ = (id) => document.getElementById(id);

const elements = {
    shader: $("spaceShader"),
    canvas: $("gameCanvas"),
    menu: $("menuScreen"),
    garage: $("garageScreen"),
    settings: $("settingsScreen"),
    game: $("gameScreen"),

    start: $("startButton"),
    pause: $("pauseButton"),
    resume: $("resumeButton"),
    retry: $("retryButton"),
    quit: $("quitButton"),

    pauseOverlay: $("pauseOverlay"),
    gameOverOverlay: $("gameOverOverlay"),

    score: $("scoreDisplay"),
    record: $("recordDisplay"),
    wave: $("waveDisplay"),
    health: $("healthBar"),
    healthText: $("healthText"),
    dash: $("dashBar"),
    weapon: $("weaponDisplay"),

    bossHud: $("bossHud"),
    bossName: $("bossName"),
    bossBar: $("bossHealthBar"),
    bossWarning: $("bossWarning"),

    combo: $("comboDisplay"),
    coins: $("coinDisplay"),
    power: $("powerDisplay"),

    menuRecord: $("menuHighScore"),
    menuCredits: $("menuCredits"),

    finalScore: $("finalScore"),
    finalWave: $("finalWave"),
    finalCredits: $("finalCredits"),

    planilha: $("planilhaOverlay"),
    planilhaOpen: $("planilhaOpenButton"),
    planilhaClose: $("closePlanilha"),
    planilhaReturn: $("returnToGame"),

    menuMusic: $("menuMusic"),
    gameMusic: $("gameMusic"),
    laser: $("laserSound")
};

const ctx = elements.canvas.getContext("2d", { alpha: true });

const GAME_WIDTH = 1200;
const GAME_HEIGHT = 800;

let screen = "menu";
let animationFrame = 0;
let lastFrame = 0;
let deltaTime = 0;
let elapsed = 0;
let gameTime = 0;

let gameWidth = 0;
let gameHeight = 0;
let scaleX = 1;
let scaleY = 1;

let score = 0;
let highScore = Number(localStorage.getItem("ne_highscore")) || 0;
let credits = Number(localStorage.getItem("ne_credits")) || 0;

let wave = 1;
let enemiesSpawned = 0;
let enemiesToSpawn = 0;
let spawnTimer = 0;
let waveDelay = 0;
let combo = 1;
let comboTimer = 0;
let collectedCoins = 0;

let player;
let boss = null;

let bullets = [];
let enemyBullets = [];
let enemies = [];
let particles = [];
let pickups = [];
let shockwaves = [];
let floatingTexts = [];

let keys = {};
let touchInput = {
    left: false,
    right: false,
    shoot: false
};

let pointer = {
    x: 0,
    y: 0,
    active: false
};

let screenShake = 0;
let flash = 0;
let damageFlash = 0;

let lastShot = 0;
let dashCooldown = 0;
let invulnerability = 0;

let musicEnabled = localStorage.getItem("ne_music") !== "false";
let sfxEnabled = localStorage.getItem("ne_sfx") !== "false";
let highEffects = localStorage.getItem("ne_effects") !== "false";

let upgrades = {
    armor: Number(localStorage.getItem("ne_armor")) || 1,
    engine: Number(localStorage.getItem("ne_engine")) || 1,
    weapon: Number(localStorage.getItem("ne_weapon")) || 1
};

let selectedShip = Number(localStorage.getItem("ne_ship")) || 0;

const ships = [
    {
        name: "PROTO-07",
        description: "Interceptor equilibrado. Boa velocidade e resistência.",
        color: "#42eaff",
        accent: "#3980ff",
        speed: 390,
        health: 100,
        damage: 1
    },
    {
        name: "PHANTOM-X",
        description: "Nave experimental. Velocidade superior, blindagem reduzida.",
        color: "#b78aff",
        accent: "#6e55ff",
        speed: 465,
        health: 85,
        damage: 1.1
    },
    {
        name: "TITAN-9",
        description: "Blindagem pesada e armamento reforçado.",
        color: "#ff9b61",
        accent: "#ff426b",
        speed: 335,
        health: 135,
        damage: 1.25
    }
];

const weaponTypes = [
    { name: "PULSAR MK-I", delay: 0.19, damage: 12, spread: 0 },
    { name: "TRIDENT MK-II", delay: 0.25, damage: 10, spread: 1 },
    { name: "NOVA RAIL", delay: 0.42, damage: 32, spread: 0 },
    { name: "VOID CANNON", delay: 0.12, damage: 8, spread: 2 }
];

let currentWeapon = 0;
let weaponLevel = 0;

/* -------------------------
   UTILIDADES
------------------------- */

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const random = (min, max) => Math.random() * (max - min) + min;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function saveProgress() {
    localStorage.setItem("ne_highscore", highScore);
    localStorage.setItem("ne_credits", credits);
    localStorage.setItem("ne_armor", upgrades.armor);
    localStorage.setItem("ne_engine", upgrades.engine);
    localStorage.setItem("ne_weapon", upgrades.weapon);
    localStorage.setItem("ne_ship", selectedShip);
}

function setScreen(name) {
    screen = name;

    document.querySelectorAll(".screen").forEach((item) => {
        item.classList.remove("active");
    });

    const target = {
        menu: elements.menu,
        garage: elements.garage,
        settings: elements.settings,
        game: elements.game
    }[name];

    if (target) target.classList.add("active");

    elements.planilhaOpen.style.display =
        name === "game" ? "block" : "none";

    if (name !== "game") {
        elements.planilha.classList.add("hidden");
    }

    updateMenuInfo();
}

function updateMenuInfo() {
    elements.menuRecord.textContent = highScore.toLocaleString("pt-BR");
    elements.menuCredits.textContent = credits;
}

function formatScore(value) {
    return Math.floor(value).toString().padStart(6, "0");
}

function randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function circleCollision(a, b, extra = 0) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const radius = (a.radius || 0) + (b.radius || 0) + extra;
    return dx * dx + dy * dy <= radius * radius;
}

function polygon(ctx, points, fill, stroke = null, lineWidth = 1) {
    if (!points.length) return;

    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);

    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i][0], points[i][1]);
    }

    ctx.closePath();

    if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
    }

    if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
    }
}

/* =========================================================
   SHADER WEBGL // NEBULOSA E ESPAÇO
   ========================================================= */

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Erro no shader:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

function initSpaceShader() {
    const canvas = elements.shader;
    const gl = canvas.getContext("webgl", {
        alpha: true,
        antialias: false
    });

    if (!gl) {
        canvas.style.display = "none";
        return;
    }

    const vertexSource = `
        attribute vec2 position;
        void main() {
            gl_Position = vec4(position, 0.0, 1.0);
        }
    `;

    const fragmentSource = `
        precision highp float;

        uniform vec2 resolution;
        uniform float time;

        float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);

            float a = hash(i);
            float b = hash(i + vec2(1.0, 0.0));
            float c = hash(i + vec2(0.0, 1.0));
            float d = hash(i + vec2(1.0, 1.0));

            return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        float fbm(vec2 p) {
            float value = 0.0;
            float amplitude = 0.5;

            for (int i = 0; i < 5; i++) {
                value += noise(p) * amplitude;
                p *= 2.03;
                amplitude *= 0.5;
            }

            return value;
        }

        void main() {
            vec2 uv = gl_FragCoord.xy / resolution.xy;
            vec2 p = uv - 0.5;
            p.x *= resolution.x / resolution.y;

            float t = time * 0.025;

            vec2 drift = vec2(
                sin(t * 1.4) * 0.12,
                cos(t) * 0.1
            );

            float cloudA = fbm(p * 3.0 + drift + t);
            float cloudB = fbm(p * 5.0 - drift * 1.5 - t * 0.5);

            float nebula = smoothstep(0.35, 0.85, cloudA * 0.7 + cloudB * 0.5);

            vec3 base = vec3(0.008, 0.012, 0.035);
            vec3 blue = vec3(0.025, 0.16, 0.34);
            vec3 purple = vec3(0.15, 0.045, 0.29);
            vec3 cyan = vec3(0.015, 0.28, 0.36);

            vec3 color = base;
            color += blue * nebula * 0.75;
            color += purple * smoothstep(0.5, 0.95, cloudB) * 0.45;
            color += cyan * smoothstep(0.65, 0.95, cloudA) * 0.2;

            vec2 starGrid = gl_FragCoord.xy / 2.0;
            vec2 cell = floor(starGrid);
            vec2 local = fract(starGrid) - 0.5;

            float starRandom = hash(cell);
            float star = smoothstep(0.035, 0.0, length(local));

            float visible = step(0.9965, starRandom);
            float twinkle = 0.5 + 0.5 * sin(time * 2.0 + starRandom * 100.0);

            color += vec3(0.55, 0.78, 1.0) * star * visible * twinkle;

            float vignette = 1.0 - smoothstep(0.3, 0.95, length(p));
            color *= vignette * 0.9 + 0.1;

            gl_FragColor = vec4(color, 1.0);
        }
    `;

    const vertex = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragment = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

    if (!vertex || !fragment) return;

    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Erro ao conectar shader:", gl.getProgramInfoLog(program));
        return;
    }

    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([
            -1, -1,
             1, -1,
            -1,  1,
             1,  1
        ]),
        gl.STATIC_DRAW
    );

    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const resolutionLocation = gl.getUniformLocation(program, "resolution");
    const timeLocation = gl.getUniformLocation(program, "time");

    function resizeShader() {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        canvas.width = Math.floor(window.innerWidth * dpr);
        canvas.height = Math.floor(window.innerHeight * dpr);
        gl.viewport(0, 0, canvas.width, canvas.height);
    }

    window.addEventListener("resize", resizeShader);
    resizeShader();

    function renderShader() {
        if (screen !== "game" || !elements.planilha.classList.contains("hidden")) {
            gl.uniform1f(timeLocation, performance.now() / 1000);
            gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }

        requestAnimationFrame(renderShader);
    }

    renderShader();
}

/* =========================================================
   ÁUDIO
   ========================================================= */

function stopMusic() {
    [elements.menuMusic, elements.gameMusic].forEach((audio) => {
        audio.pause();
    });
}

function playMusic(type) {
    if (!musicEnabled) return;

    stopMusic();

    const audio = type === "game" ? elements.gameMusic : elements.menuMusic;

    audio.volume = type === "game" ? 0.35 : 0.25;
    audio.play().catch(() => {});
}

function soundEffect(type = "laser") {
    if (!sfxEnabled) return;

    if (type === "laser") {
        const clone = elements.laser.cloneNode();
        clone.volume = 0.22;
        clone.play().catch(() => {});
        return;
    }

    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;

        const audioContext = soundEffect.context ||
            (soundEffect.context = new AudioContextClass());

        if (audioContext.state === "suspended") {
            audioContext.resume();
        }

        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        const now = audioContext.currentTime;

        const presets = {
            hit: [150, 55, 0.16, "sawtooth"],
            explosion: [100, 25, 0.35, "triangle"],
            pickup: [450, 950, 0.2, "sine"],
            dash: [180, 650, 0.18, "sawtooth"],
            boss: [90, 35, 0.65, "sawtooth"],
            upgrade: [300, 800, 0.35, "sine"]
        };

        const preset = presets[type] || presets.hit;

        oscillator.type = preset[3];
        oscillator.frequency.setValueAtTime(preset[0], now);
        oscillator.frequency.exponentialRampToValueAtTime(
            Math.max(1, preset[1]),
            now + preset[2]
        );

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + preset[2]);

        oscillator.start(now);
        oscillator.stop(now + preset[2]);
    } catch (error) {
        // O jogo continua mesmo se o navegador bloquear o áudio.
    }
}

/* =========================================================
   REDIMENSIONAMENTO
   ========================================================= */

function resizeGame() {
    const rect = elements.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    elements.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    elements.canvas.height = Math.max(1, Math.floor(rect.height * dpr));

    gameWidth = rect.width;
    gameHeight = rect.height;

    scaleX = gameWidth / GAME_WIDTH;
    scaleY = gameHeight / GAME_HEIGHT;

    ctx.setTransform(dpr * scaleX, 0, 0, dpr * scaleY, 0, 0);
}

window.addEventListener("resize", resizeGame);

/* =========================================================
   JOGADOR
   ========================================================= */

function createPlayer() {
    const ship = ships[selectedShip];

    const maxHealth = ship.health + (upgrades.armor - 1) * 15;

    return {
        x: GAME_WIDTH / 2,
        y: GAME_HEIGHT - 130,
        vx: 0,
        vy: 0,

        radius: 19,
        speed: ship.speed + (upgrades.engine - 1) * 22,

        health: maxHealth,
        maxHealth,

        damage: ship.damage + (upgrades.weapon - 1) * 0.2,

        color: ship.color,
        accent: ship.accent,

        dash: 100,
        dashActive: 0,
        shield: 0,

        weapon: 0,
        power: 1,

        tilt: 0,
        hitFlash: 0
    };
}

function drawPlayer() {
    if (!player) return;

    ctx.save();
    ctx.translate(player.x, player.y);

    const ship = ships[selectedShip];
    const color = player.color;

    if (invulnerability > 0 && Math.floor(gameTime * 16) % 2 === 0) {
        ctx.globalAlpha = 0.35;
    }

    if (player.shield > 0) {
        ctx.beginPath();
        ctx.arc(0, 0, 34 + Math.sin(gameTime * 9) * 2, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(110, 170, 255, .8)";
        ctx.lineWidth = 2;
        ctx.shadowBlur = 18;
        ctx.shadowColor = "#6e9fff";
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // Propulsor
    const flameLength = random(20, 31);

    const flame = ctx.createLinearGradient(0, 12, 0, flameLength + 16);
    flame.addColorStop(0, color);
    flame.addColorStop(.45, "#3e83ff");
    flame.addColorStop(1, "rgba(70, 100, 255, 0)");

    polygon(ctx, [
        [-7, 12],
        [0, flameLength + 17],
        [7, 12]
    ], flame);

    // Asas traseiras
    polygon(ctx, [
        [-9, -5],
        [-27, 14],
        [-21, 19],
        [-5, 11]
    ], "#152d4d", color, 1.5);

    polygon(ctx, [
        [9, -5],
        [27, 14],
        [21, 19],
        [5, 11]
    ], "#152d4d", color, 1.5);

    // Corpo principal
    const bodyGradient = ctx.createLinearGradient(-18, -25, 18, 24);
    bodyGradient.addColorStop(0, "#e4fbff");
    bodyGradient.addColorStop(.25, color);
    bodyGradient.addColorStop(.65, "#1d4774");
    bodyGradient.addColorStop(1, "#071326");

    polygon(ctx, [
        [0, -30],
        [12, -8],
        [10, 15],
        [0, 24],
        [-10, 15],
        [-12, -8]
    ], bodyGradient, "#c5faff", 1.2);

    // Cockpit
    polygon(ctx, [
        [0, -21],
        [5, -7],
        [0, 4],
        [-5, -7]
    ], "#06172c", "#9ef5ff", 1);

    ctx.beginPath();
    ctx.moveTo(0, -19);
    ctx.lineTo(0, 1);
    ctx.strokeStyle = "rgba(255,255,255,.7)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Núcleos das asas
    ctx.fillStyle = color;
    ctx.shadowBlur = 14;
    ctx.shadowColor = color;
    ctx.fillRect(-20, 11, 5, 3);
    ctx.fillRect(15, 11, 5, 3);

    ctx.restore();
}

function movePlayer(dt) {
    const direction =
        (keys.ArrowRight || keys.KeyD || touchInput.right ? 1 : 0) -
        (keys.ArrowLeft || keys.KeyA || touchInput.left ? 1 : 0);

    const acceleration = player.speed * 5;
    const targetVelocity = direction * player.speed;

    player.vx += (targetVelocity - player.vx) * Math.min(1, dt * 9);
    player.x += player.vx * dt;

    player.x = clamp(player.x, 35, GAME_WIDTH - 35);

    player.tilt = player.vx / player.speed;

    player.dash = Math.min(100, player.dash + dt * 22);
    dashCooldown = Math.max(0, dashCooldown - dt);

    if (player.dashActive > 0) {
        player.dashActive -= dt;
        player.x += player.vx * dt * 2.2;
        player.x = clamp(player.x, 35, GAME_WIDTH - 35);
    }

    player.shield = Math.max(0, player.shield - dt);
    player.hitFlash = Math.max(0, player.hitFlash - dt);

    invulnerability = Math.max(0, invulnerability - dt);

    if (direction !== 0 && highEffects && Math.random() < 0.5) {
        addParticle(
            player.x + random(-5, 5),
            player.y + 18,
            random(-20, 20),
            random(40, 120),
            random(1, 3),
            player.color,
            0.3
        );
    }

    if (keys.Space || touchInput.shoot || keys.KeyJ) {
        shoot();
    }
}

function dash() {
    if (!player || player.dash < 35 || dashCooldown > 0 || screen !== "game") return;

    player.dash -= 35;
    player.dashActive = 0.24;
    player.shield = Math.max(player.shield, 0.25);

    invulnerability = Math.max(invulnerability, 0.3);
    dashCooldown = 0.5;

    screenShake = Math.max(screenShake, 4);
    soundEffect("dash");

    for (let i = 0; i < 24; i++) {
        addParticle(
            player.x,
            player.y,
            random(-160, 160),
            random(80, 280),
            random(2, 5),
            player.color,
            random(0.3, 0.65)
        );
    }
}

/* =========================================================
   ARMAS
   ========================================================= */

function shoot() {
    if (!player || screen !== "game") return;

    const weapon = weaponTypes[currentWeapon];
    const now = gameTime;

    if (now - lastShot < weapon.delay) return;

    lastShot = now;

    const damage = weapon.damage * player.damage * (1 + weaponLevel * 0.08);

    if (weapon.spread === 0) {
        createBullet(player.x, player.y - 28, 0, -720, damage, "player");
    }

    if (weapon.spread === 1) {
        createBullet(player.x - 8, player.y - 20, -80, -650, damage, "player");
        createBullet(player.x, player.y - 28, 0, -720, damage, "player");
        createBullet(player.x + 8, player.y - 20, 80, -650, damage, "player");
    }

    if (weapon.spread === 2) {
        createBullet(player.x - 15, player.y - 15, -210, -580, damage, "player");
        createBullet(player.x - 7, player.y - 25, -90, -680, damage, "player");
        createBullet(player.x, player.y - 29, 0, -740, damage, "player");
        createBullet(player.x + 7, player.y - 25, 90, -680, damage, "player");
        createBullet(player.x + 15, player.y - 15, 210, -580, damage, "player");
    }

    soundEffect("laser");

    for (let i = 0; i < 4; i++) {
        addParticle(
            player.x + random(-5, 5),
            player.y - 28,
            random(-30, 30),
            random(-120, -30),
            random(1, 2.5),
            player.color,
            0.15
        );
    }
}

function createBullet(x, y, vx, vy, damage, owner) {
    bullets.push({
        x, y, vx, vy,
        damage,
        owner,
        radius: owner === "player" ? 5 : 7,
        life: 3,
        color: owner === "player" ? player.color : "#ff547e"
    });
}

function cycleWeapon() {
    currentWeapon = (currentWeapon + 1) % weaponTypes.length;
    updateHUD();
    floatingText(
        player.x,
        player.y - 55,
        weaponTypes[currentWeapon].name,
        "#42eaff"
    );
    soundEffect("upgrade");
}

/* =========================================================
   INIMIGOS
   ========================================================= */

function spawnEnemy() {
    if (enemies.length > 14) return;

    const typeRoll = Math.random();
    let type = "drone";

    if (wave >= 2 && typeRoll > 0.55) type = "hunter";
    if (wave >= 3 && typeRoll > 0.83) type = "tank";

    const configs = {
        drone: {
            radius: 17,
            health: 24 + wave * 3,
            speed: random(105, 150) + wave * 3,
            color: "#ff557d",
            score: 20,
            fireRate: 0
        },
        hunter: {
            radius: 20,
            health: 38 + wave * 4,
            speed: random(125, 175) + wave * 3,
            color: "#b77aff",
            score: 35,
            fireRate: 2.4
        },
        tank: {
            radius: 28,
            health: 95 + wave * 8,
            speed: random(55, 85) + wave,
            color: "#ffad5b",
            score: 60,
            fireRate: 1.8
        }
    };

    const config = configs[type];

    enemies.push({
        type,
        x: random(60, GAME_WIDTH - 60),
        y: -50,
        baseX: random(60, GAME_WIDTH - 60),
        phase: random(0, Math.PI * 2),
        radius: config.radius,
        health: config.health,
        maxHealth: config.health,
        speed: config.speed,
        color: config.color,
        score: config.score,
        fireRate: config.fireRate,
        fireTimer: random(1, 2.5),
        age: 0,
        rotation: random(0, Math.PI * 2)
    });
}

function updateEnemies(dt) {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];

        enemy.age += dt;
        enemy.rotation += dt * 1.5;
        enemy.y += enemy.speed * dt;

        if (enemy.type === "hunter") {
            enemy.x += Math.sin(enemy.age * 2.8 + enemy.phase) * 90 * dt;
            enemy.x += clamp(player.x - enemy.x, -40, 40) * dt * 0.25;
        }

        if (enemy.type === "drone") {
            enemy.x += Math.sin(enemy.age * 2 + enemy.phase) * 45 * dt;
        }

        if (enemy.type === "tank") {
            enemy.x += Math.sin(enemy.age * 1.3) * 25 * dt;
        }

        enemy.x = clamp(enemy.x, 35, GAME_WIDTH - 35);

        if (enemy.fireRate > 0) {
            enemy.fireTimer -= dt;

            if (enemy.fireTimer <= 0 && enemy.y > 20 && enemy.y < GAME_HEIGHT * 0.7) {
                enemy.fireTimer = enemy.fireRate * random(0.8, 1.2);
                enemyShoot(enemy);
            }
        }

        if (enemy.y > GAME_HEIGHT + 60) {
            enemies.splice(i, 1);
            continue;
        }

        if (circleCollision(player, enemy) && invulnerability <= 0) {
            damagePlayer(18);
            destroyEnemy(i, false);
        }
    }
}

function enemyShoot(enemy) {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const length = Math.hypot(dx, dy) || 1;
    const speed = enemy.type === "tank" ? 230 : 190;

    enemyBullets.push({
        x: enemy.x,
        y: enemy.y + enemy.radius,
        vx: dx / length * speed,
        vy: dy / length * speed,
        radius: enemy.type === "tank" ? 8 : 6,
        damage: enemy.type === "tank" ? 17 : 10,
        color: enemy.color,
        life: 5
    });
}

function drawEnemy(enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(enemy.rotation);

    ctx.shadowBlur = 16;
    ctx.shadowColor = enemy.color;

    if (enemy.type === "drone") {
        polygon(ctx, [
            [0, -19],
            [18, 0],
            [0, 19],
            [-18, 0]
        ], "#28152c", enemy.color, 2);

        polygon(ctx, [
            [0, -9],
            [8, 0],
            [0, 9],
            [-8, 0]
        ], enemy.color);

    } else if (enemy.type === "hunter") {
        polygon(ctx, [
            [0, 22],
            [23, -15],
            [0, -7],
            [-23, -15]
        ], "#201537", enemy.color, 2);

        polygon(ctx, [
            [0, 11],
            [7, -8],
            [0, -14],
            [-7, -8]
        ], enemy.color);

    } else {
        polygon(ctx, [
            [-23, -15],
            [0, -29],
            [23, -15],
            [28, 12],
            [0, 27],
            [-28, 12]
        ], "#302118", enemy.color, 2);

        ctx.fillStyle = enemy.color;
        ctx.fillRect(-7, -7, 14, 14);
    }

    ctx.shadowBlur = 0;

    if (enemy.health < enemy.maxHealth) {
        ctx.fillStyle = "rgba(0,0,0,.5)";
        ctx.fillRect(-enemy.radius, enemy.radius + 8, enemy.radius * 2, 3);

        ctx.fillStyle = enemy.color;
        ctx.fillRect(
            -enemy.radius,
            enemy.radius + 8,
            enemy.radius * 2 * (enemy.health / enemy.maxHealth),
            3
        );
    }

    ctx.restore();
}

/* =========================================================
   CHEFES
   ========================================================= */

const bossTypes = [
    { name: "VOID TITAN", color: "#ff426b", health: 900, radius: 68 },
    { name: "NEBULA CORE", color: "#b36cff", health: 1250, radius: 60 },
    { name: "OMEGA SENTINEL", color: "#42eaff", health: 1700, radius: 76 }
];

function spawnBoss() {
    const config = bossTypes[(Math.floor(wave / 5) - 1) % bossTypes.length];

    boss = {
        name: config.name,
        x: GAME_WIDTH / 2,
        y: -100,
        targetY: 145,
        radius: config.radius,
        health: config.health + wave * 80,
        maxHealth: config.health + wave * 80,
        color: config.color,
        age: 0,
        fireTimer: 1,
        attackMode: 0,
        attackTimer: 3,
        rotation: 0,
        phase: 0
    };

    elements.bossHud.classList.remove("hidden");
    elements.bossName.textContent = boss.name;
    elements.bossWarning.classList.remove("hidden");

    setTimeout(() => {
        elements.bossWarning.classList.add("hidden");
    }, 2500);

    screenShake = 12;
    soundEffect("boss");
}

function updateBoss(dt) {
    if (!boss) return;

    boss.age += dt;
    boss.rotation += dt * 0.5;

    if (boss.y < boss.targetY) {
        boss.y += 100 * dt;
    }

    boss.x = GAME_WIDTH / 2 + Math.sin(boss.age * 0.65) * 300;

    boss.fireTimer -= dt;
    boss.attackTimer -= dt;

    if (boss.fireTimer <= 0) {
        boss.fireTimer = Math.max(0.35, 1.15 - wave * 0.025);
        bossAttack();
    }

    if (boss.attackTimer <= 0) {
        boss.attackTimer = 4.5;
        boss.attackMode = (boss.attackMode + 1) % 3;
    }

    if (circleCollision(player, {
        x: boss.x,
        y: boss.y,
        radius: boss.radius * 0.75
    }) && invulnerability <= 0) {
        damagePlayer(28);
    }

    if (boss.health <= 0) {
        defeatBoss();
    }

    elements.bossBar.style.width =
        `${clamp(boss.health / boss.maxHealth * 100, 0, 100)}%`;
}

function bossAttack() {
    if (!boss) return;

    if (boss.attackMode === 0) {
        // Leque de projéteis
        for (let i = -3; i <= 3; i++) {
            enemyBullets.push({
                x: boss.x,
                y: boss.y + 30,
                vx: i * 75,
                vy: 220,
                radius: 8,
                damage: 13,
                color: boss.color,
                life: 5
            });
        }
    }

    if (boss.attackMode === 1) {
        // Disparos direcionados
        for (let i = 0; i < 3; i++) {
            const angle = Math.atan2(
                player.y - boss.y,
                player.x - boss.x
            );

            const spread = (i - 1) * 0.17;
            const finalAngle = angle + spread;

            enemyBullets.push({
                x: boss.x,
                y: boss.y + 30,
                vx: Math.cos(finalAngle) * 280,
                vy: Math.sin(finalAngle) * 280,
                radius: 9,
                damage: 16,
                color: boss.color,
                life: 5
            });
        }
    }

    if (boss.attackMode === 2) {
        // Anel circular
        for (let i = 0; i < 16; i++) {
            const angle = (Math.PI * 2 / 16) * i + boss.age;

            enemyBullets.push({
                x: boss.x,
                y: boss.y,
                vx: Math.cos(angle) * 190,
                vy: Math.sin(angle) * 190,
                radius: 7,
                damage: 12,
                color: boss.color,
                life: 5
            });
        }
    }
}

function drawBoss() {
    if (!boss) return;

    ctx.save();
    ctx.translate(boss.x, boss.y);
    ctx.rotate(Math.sin(boss.age) * 0.05);

    ctx.shadowBlur = 35;
    ctx.shadowColor = boss.color;

    // Anéis externos
    for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.rotate(boss.rotation * (i % 2 ? -1 : 1) + i * 1.1);
        ctx.strokeStyle = i === 0 ? boss.color : "rgba(160,190,255,.4)";
        ctx.lineWidth = 3 - i * 0.6;
        ctx.beginPath();
        ctx.ellipse(0, 0, boss.radius + 14 + i * 12, boss.radius * .55 + i * 8, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    const gradient = ctx.createRadialGradient(-15, -20, 5, 0, 0, boss.radius);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(.12, boss.color);
    gradient.addColorStop(.55, "#22264b");
    gradient.addColorStop(1, "#080b1b");

    ctx.beginPath();
    ctx.arc(0, 0, boss.radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = boss.color;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Núcleo
    ctx.beginPath();
    ctx.arc(0, 0, boss.radius * .34, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.shadowBlur = 30;
    ctx.shadowColor = boss.color;
    ctx.fill();

    // Estruturas laterais
    polygon(ctx, [
        [-boss.radius * .7, -10],
        [-boss.radius * 1.25, -35],
        [-boss.radius * 1.1, 15],
        [-boss.radius * .55, 25]
    ], "#182445", boss.color, 2);

    polygon(ctx, [
        [boss.radius * .7, -10],
        [boss.radius * 1.25, -35],
        [boss.radius * 1.1, 15],
        [boss.radius * .55, 25]
    ], "#182445", boss.color, 2);

    ctx.restore();
}

/* =========================================================
   PROJÉTEIS
   ========================================================= */

function updateBullets(dt) {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];

        bullet.x += bullet.vx * dt;
        bullet.y += bullet.vy * dt;
        bullet.life -= dt;

        if (bullet.life <= 0 || bullet.y < -50 || bullet.y > GAME_HEIGHT + 50) {
            bullets.splice(i, 1);
            continue;
        }

        if (boss && bullet.owner === "player" && circleCollision(bullet, boss)) {
            boss.health -= bullet.damage;
            bullets.splice(i, 1);

            addParticle(
                bullet.x,
                bullet.y,
                random(-50, 50),
                random(-50, 50),
                random(2, 5),
                boss.color,
                0.3
            );

            continue;
        }

        if (bullet.owner === "player") {
            let hit = false;

            for (let j = enemies.length - 1; j >= 0; j--) {
                const enemy = enemies[j];

                if (circleCollision(bullet, enemy)) {
                    enemy.health -= bullet.damage;
                    bullets.splice(i, 1);
                    hit = true;

                    addParticle(
                        bullet.x,
                        bullet.y,
                        random(-80, 80),
                        random(-80, 80),
                        random(2, 4),
                        enemy.color,
                        0.25
                    );

                    if (enemy.health <= 0) {
                        destroyEnemy(j, true);
                    }

                    break;
                }
            }

            if (hit) continue;
        }
    }

    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];

        bullet.x += bullet.vx * dt;
        bullet.y += bullet.vy * dt;
        bullet.life -= dt;

        if (
            bullet.life <= 0 ||
            bullet.x < -80 ||
            bullet.x > GAME_WIDTH + 80 ||
            bullet.y > GAME_HEIGHT + 80
        ) {
            enemyBullets.splice(i, 1);
            continue;
        }

        if (circleCollision(player, bullet) && invulnerability <= 0) {
            damagePlayer(bullet.damage);
            enemyBullets.splice(i, 1);
        }
    }
}

function drawBullets() {
    for (const bullet of bullets) {
        ctx.save();
        ctx.shadowBlur = 18;
        ctx.shadowColor = bullet.color;
        ctx.fillStyle = bullet.color;

        if (bullet.owner === "player") {
            ctx.fillRect(bullet.x - 2, bullet.y - 12, 4, 20);
        } else {
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    for (const bullet of enemyBullets) {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = bullet.color;
        ctx.fillStyle = bullet.color;

        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

/* =========================================================
   DESTRUIÇÃO E DANO
   ========================================================= */

function destroyEnemy(index, reward = true) {
    const enemy = enemies[index];
    if (!enemy) return;

    enemies.splice(index, 1);

    const amount = enemy.type === "tank" ? 22 : 13;

    explode(enemy.x, enemy.y, enemy.color, amount);
    soundEffect("explosion");

    if (reward) {
        score += enemy.score * combo;
        combo = Math.min(12, combo + 1);
        comboTimer = 3.5;

        if (Math.random() < 0.19) {
            spawnPickup(enemy.x, enemy.y);
        }

        if (Math.random() < 0.12) {
            spawnPickup(enemy.x + random(-20, 20), enemy.y, "coin");
        }
    }

    updateHUD();
}

function explode(x, y, color, amount = 20) {
    const total = highEffects ? amount : Math.ceil(amount * 0.35);

    for (let i = 0; i < total; i++) {
        const angle = random(0, Math.PI * 2);
        const speed = random(40, 260);

        addParticle(
            x,
            y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            random(1.5, 5),
            color,
            random(0.25, 0.85)
        );
    }

    shockwaves.push({
        x,
        y,
        radius: 5,
        maxRadius: random(45, 100),
        life: 0.45,
        maxLife: 0.45,
        color
    });

    screenShake = Math.max(screenShake, 4);
}

function damagePlayer(amount) {
    if (!player || invulnerability > 0 || player.shield > 0) return;

    player.health -= amount;
    player.hitFlash = 0.2;

    invulnerability = 0.65;
    damageFlash = 0.35;
    screenShake = Math.max(screenShake, 8);

    soundEffect("hit");

    explode(player.x, player.y, "#ff426b", 12);

    if (player.health <= 0) {
        player.health = 0;
        endGame();
    }

    updateHUD();
}

/* =========================================================
   PARTÍCULAS E EFEITOS
   ========================================================= */

function addParticle(x, y, vx, vy, size, color, life) {
    if (!highEffects && particles.length > 250) return;
    if (particles.length > 900) return;

    particles.push({
        x, y, vx, vy,
        size,
        color,
        life,
        maxLife: life,
        drag: random(0.92, 0.99)
    });
}

function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        p.vx *= Math.pow(p.drag, dt * 60);
        p.vy *= Math.pow(p.drag, dt * 60);

        p.life -= dt;

        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }

    for (let i = shockwaves.length - 1; i >= 0; i--) {
        const s = shockwaves[i];

        s.radius += (s.maxRadius / s.maxLife) * dt;
        s.life -= dt;

        if (s.life <= 0) {
            shockwaves.splice(i, 1);
        }
    }

    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const t = floatingTexts[i];

        t.y += t.vy * dt;
        t.life -= dt;

        if (t.life <= 0) {
            floatingTexts.splice(i, 1);
        }
    }
}

function drawParticles() {
    for (const p of particles) {
        ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    for (const s of shockwaves) {
        ctx.globalAlpha = clamp(s.life / s.maxLife, 0, 1) * 0.7;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.globalAlpha = 1;

    for (const t of floatingTexts) {
        ctx.globalAlpha = clamp(t.life / t.maxLife, 0, 1);
        ctx.fillStyle = t.color;
        ctx.font = "bold 17px Orbitron";
        ctx.textAlign = "center";
        ctx.fillText(t.text, t.x, t.y);
    }

    ctx.globalAlpha = 1;
}

function floatingText(x, y, text, color = "#42eaff") {
    floatingTexts.push({
        x, y, text, color,
        vy: -35,
        life: 1.1,
        maxLife: 1.1
    });
}

/* =========================================================
   ITENS E POWER-UPS
   ========================================================= */

function spawnPickup(x, y, type = null) {
    const selectedType = type || randomChoice(["heal", "shield", "weapon", "energy"]);

    const configs = {
        heal: { color: "#4dffbf", symbol: "+" },
        shield: { color: "#66aaff", symbol: "◇" },
        weapon: { color: "#bd83ff", symbol: "W" },
        energy: { color: "#ffe17b", symbol: "⚡" },
        coin: { color: "#ffe17b", symbol: "◈" }
    };

    pickups.push({
        x, y,
        type: selectedType,
        color: configs[selectedType].color,
        symbol: configs[selectedType].symbol,
        radius: 13,
        age: random(0, 5),
        vy: 90
    });
}

function updatePickups(dt) {
    for (let i = pickups.length - 1; i >= 0; i--) {
        const item = pickups[i];

        item.age += dt;
        item.y += item.vy * dt;
        item.x += Math.sin(item.age * 2) * 20 * dt;

        if (item.y > GAME_HEIGHT + 40) {
            pickups.splice(i, 1);
            continue;
        }

        if (circleCollision(player, item)) {
            collectPickup(item);
            pickups.splice(i, 1);
        }
    }
}

function collectPickup(item) {
    soundEffect("pickup");

    switch (item.type) {
        case "heal":
            player.health = Math.min(player.maxHealth, player.health + 25);
            floatingText(player.x, player.y - 45, "+25 INTEGRIDADE", "#4dffbf");
            break;

        case "shield":
            player.shield = 6;
            floatingText(player.x, player.y - 45, "ESCUDO ATIVADO", "#66aaff");
            break;

        case "weapon":
            currentWeapon = (currentWeapon + 1) % weaponTypes.length;
            floatingText(player.x, player.y - 45, "ARMA ALTERADA", "#bd83ff");
            break;

        case "energy":
            player.dash = 100;
            floatingText(player.x, player.y - 45, "ENERGIA RESTAURADA", "#ffe17b");
            break;

        case "coin":
            credits += 10;
            collectedCoins += 10;
            floatingText(player.x, player.y - 45, "+10 CRÉDITOS", "#ffe17b");
            saveProgress();
            break;
    }

    updateHUD();
}

function drawPickups() {
    for (const item of pickups) {
        const pulse = 1 + Math.sin(item.age * 5) * 0.12;

        ctx.save();
        ctx.translate(item.x, item.y);
        ctx.scale(pulse, pulse);

        ctx.shadowBlur = 20;
        ctx.shadowColor = item.color;
        ctx.strokeStyle = item.color;
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(0, 0, item.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = "rgba(10,20,40,.85)";
        ctx.fill();

        ctx.fillStyle = item.color;
        ctx.font = "bold 15px Orbitron";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(item.symbol, 0, 1);

        ctx.restore();
    }
}

/* =========================================================
   PROGRESSÃO E SETORES
   ========================================================= */

function startWave() {
    wave++;
    enemiesSpawned = 0;
    enemiesToSpawn = Math.min(7 + wave * 2, 35);
    spawnTimer = 1;
    waveDelay = 0;

    floatingText(
        GAME_WIDTH / 2,
        GAME_HEIGHT * 0.35,
        `SETOR ${String(wave).padStart(2, "0")}`,
        "#42eaff"
    );

    if (wave % 5 === 0) {
        spawnBoss();
    }

    updateHUD();
}

function updateWave(dt) {
    if (boss) return;

    if (enemiesSpawned < enemiesToSpawn) {
        spawnTimer -= dt;

        if (spawnTimer <= 0) {
            spawnEnemy();
            enemiesSpawned++;
            spawnTimer = Math.max(0.35, 1.15 - wave * 0.035);
        }
    }

    if (enemiesSpawned >= enemiesToSpawn && enemies.length === 0) {
        waveDelay += dt;

        if (waveDelay > 3) {
            startWave();
        }
    }
}

function defeatBoss() {
    if (!boss) return;

    explode(boss.x, boss.y, boss.color, 100);
    soundEffect("explosion");

    score += 1000 + wave * 100;
    credits += 100;
    collectedCoins += 100;

    floatingText(
        boss.x,
        boss.y - 80,
        "ALVO ELIMINADO +100 CR",
        "#ffe17b"
    );

    boss = null;

    elements.bossHud.classList.add("hidden");
    elements.bossWarning.classList.add("hidden");

    enemyBullets = [];

    player.health = Math.min(player.maxHealth, player.health + 25);
    player.shield = 3;

    saveProgress();
    updateHUD();
}

/* =========================================================
   HUD
   ========================================================= */

function updateHUD() {
    elements.score.textContent = formatScore(score);
    elements.record.textContent = formatScore(highScore);
    elements.wave.textContent = String(wave).padStart(2, "0");

    const healthPercent = clamp(player.health / player.maxHealth * 100, 0, 100);

    elements.health.style.width = `${healthPercent}%`;
    elements.healthText.textContent = `${Math.ceil(healthPercent)}%`;

    elements.dash.style.width = `${player.dash}%`;
    elements.weapon.textContent = weaponTypes[currentWeapon].name;

    elements.combo.textContent = `COMBO x${combo}`;
    elements.coins.textContent = `◈ ${collectedCoins}`;
    elements.power.textContent = `ESCUDO ${Math.ceil(player.shield)}s`;
}

/* =========================================================
   INÍCIO, PAUSA E FIM
   ========================================================= */

function resetGame() {
    score = 0;
    wave = 1;
    combo = 1;
    comboTimer = 0;
    collectedCoins = 0;

    enemiesSpawned = 0;
    enemiesToSpawn = 8;
    spawnTimer = 1;
    waveDelay = 0;

    gameTime = 0;
    elapsed = 0;
    lastShot = 0;
    dashCooldown = 0;
    invulnerability = 1.5;

    player = createPlayer();

    bullets = [];
    enemyBullets = [];
    enemies = [];
    particles = [];
    pickups = [];
    shockwaves = [];
    floatingTexts = [];

    boss = null;

    screenShake = 0;
    flash = 0;
    damageFlash = 0;

    currentWeapon = 0;

    elements.bossHud.classList.add("hidden");
    elements.bossWarning.classList.add("hidden");
    elements.pauseOverlay.classList.add("hidden");
    elements.gameOverOverlay.classList.add("hidden");

    updateHUD();
}

function startGame() {
    stopMusic();
    resetGame();

    setScreen("game");
    resizeGame();

    lastFrame = performance.now();
    playMusic("game");

    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(gameLoop);
}

function pauseGame() {
    if (screen !== "game" || !elements.planilha.classList.contains("hidden")) return;

    elements.pauseOverlay.classList.remove("hidden");
    stopMusic();

    screen = "paused";
}

function resumeGame() {
    if (screen !== "paused") return;

    elements.pauseOverlay.classList.add("hidden");
    screen = "game";

    lastFrame = performance.now();
    playMusic("game");

    animationFrame = requestAnimationFrame(gameLoop);
}

function endGame() {
    if (screen !== "game") return;

    screen = "gameover";

    if (score > highScore) {
        highScore = score;
    }

    const earned = Math.floor(score / 100) + collectedCoins;
    credits += earned;

    saveProgress();

    elements.finalScore.textContent = score.toLocaleString("pt-BR");
    elements.finalWave.textContent = wave;
    elements.finalCredits.textContent = earned;

    elements.gameOverOverlay.classList.remove("hidden");

    elements.bossHud.classList.add("hidden");
    stopMusic();

    updateMenuInfo();
}

/* =========================================================
   RENDERIZAÇÃO DO ESPAÇO
   ========================================================= */

let stars = [];

function createStars() {
    stars = [];

    for (let i = 0; i < 150; i++) {
        stars.push({
            x: random(0, GAME_WIDTH),
            y: random(0, GAME_HEIGHT),
            size: random(0.5, 2),
            speed: random(20, 100),
            alpha: random(0.2, 0.9),
            phase: random(0, Math.PI * 2)
        });
    }
}

function drawStars(dt) {
    for (const star of stars) {
        star.y += star.speed * dt;

        if (star.y > GAME_HEIGHT) {
            star.y = -5;
            star.x = random(0, GAME_WIDTH);
        }

        const alpha = star.alpha * (0.65 + Math.sin(gameTime * 2 + star.phase) * 0.25);

        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#bceeff";

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.globalAlpha = 1;
}

function drawGrid() {
    ctx.save();
    ctx.strokeStyle = "rgba(66, 234, 255, .035)";
    ctx.lineWidth = 1;

    const offset = (gameTime * 25) % 60;

    for (let y = -60 + offset; y < GAME_HEIGHT; y += 60) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(GAME_WIDTH, y);
        ctx.stroke();
    }

    ctx.restore();
}

function render(dt) {
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.save();

    if (screenShake > 0) {
        ctx.translate(
            random(-screenShake, screenShake),
            random(-screenShake, screenShake)
        );

        screenShake = Math.max(0, screenShake - dt * 25);
    }

    drawStars(dt);
    drawGrid();

    drawPickups();
    drawBullets();

    for (const enemy of enemies) {
        drawEnemy(enemy);
    }

    if (boss) drawBoss();

    drawPlayer();
    drawParticles();

    ctx.restore();

    if (damageFlash > 0) {
        ctx.fillStyle = `rgba(255, 25, 65, ${damageFlash * 0.25})`;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        damageFlash = Math.max(0, damageFlash - dt);
    }
}

/* =========================================================
   ATUALIZAÇÃO PRINCIPAL
   ========================================================= */

function update(dt) {
    if (!player) return;

    gameTime += dt;
    elapsed += dt;

    if (comboTimer > 0) {
        comboTimer -= dt;
    } else {
        combo = 1;
    }

    movePlayer(dt);
    updateWave(dt);
    updateEnemies(dt);
    updateBoss(dt);
    updateBullets(dt);
    updatePickups(dt);
    updateParticles(dt);

    if (score > highScore) {
        highScore = score;
    }

    if (screen === "game") {
        updateHUD();
    }
}

function gameLoop(timestamp) {
    if (screen !== "game") return;

    deltaTime = Math.min((timestamp - lastFrame) / 1000, 0.035);
    lastFrame = timestamp;

    update(deltaTime);
    render(deltaTime);

    if (screen === "game") {
        animationFrame = requestAnimationFrame(gameLoop);
    }
}

/* =========================================================
   HANGAR E MELHORIAS
   ========================================================= */

function updateGarage() {
    $("garageCredits").textContent = credits;

    $("garageShip").style.color = ships[selectedShip].color;
    $("garageShip").textContent = "✦";

    $("garageShipName").textContent = ships[selectedShip].name;
    $("garageShipDescription").textContent = ships[selectedShip].description;

    $("shipCounter").textContent =
        `${String(selectedShip + 1).padStart(2, "0")} / 03`;

    $("shipButton").textContent = `NAVE: ${ships[selectedShip].name}`;

    $("armorLevel").textContent = `NÍVEL ${upgrades.armor}`;
    $("engineLevel").textContent = `NÍVEL ${upgrades.engine}`;
    $("weaponLevel").textContent = `NÍVEL ${upgrades.weapon}`;

    $("buyArmor").textContent = `MELHORAR · ${upgrades.armor * 100}`;
    $("buyEngine").textContent = `MELHORAR · ${upgrades.engine * 100}`;
    $("buyWeapon").textContent = `MELHORAR · ${upgrades.weapon * 100}`;

    $("buyArmor").disabled = upgrades.armor >= 10;
    $("buyEngine").disabled = upgrades.engine >= 10;
    $("buyWeapon").disabled = upgrades.weapon >= 10;
}

function purchaseUpgrade(type) {
    const level = upgrades[type];
    const price = level * 100;

    if (level >= 10) {
        floatingText(GAME_WIDTH / 2, 400, "NÍVEL MÁXIMO", "#ff426b");
        return;
    }

    if (credits < price) {
        alert("Créditos insuficientes!");
        return;
    }

    credits -= price;
    upgrades[type]++;

    saveProgress();
    updateGarage();
    updateMenuInfo();

    soundEffect("upgrade");
}

function changeShip(direction) {
    selectedShip = (selectedShip + direction + ships.length) % ships.length;

    saveProgress();
    updateGarage();
}

/* =========================================================
   CONFIGURAÇÕES
   ========================================================= */

function updateSettings() {
    $("musicToggle").textContent = musicEnabled ? "LIGADA" : "DESLIGADA";
    $("sfxToggle").textContent = sfxEnabled ? "LIGADOS" : "DESLIGADOS";
    $("effectsToggle").textContent = highEffects ? "ALTAS" : "REDUZIDAS";

    localStorage.setItem("ne_music", musicEnabled);
    localStorage.setItem("ne_sfx", sfxEnabled);
    localStorage.setItem("ne_effects", highEffects);
}

/* =========================================================
   CONTROLES
   ========================================================= */

window.addEventListener("keydown", (event) => {
    keys[event.code] = true;

    if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"]
            .includes(event.code)
    ) {
        event.preventDefault();
    }

    if (event.code === "Escape") {
        if (screen === "game") pauseGame();
        else if (screen === "paused") resumeGame();
    }

    if (event.code === "ShiftLeft" || event.code === "ShiftRight") {
        dash();
    }

    if (event.code === "KeyQ" && screen === "game") {
        cycleWeapon();
    }
});

window.addEventListener("keyup", (event) => {
    keys[event.code] = false;
});

function bindHoldButton(id, property) {
    const button = $(id);
    if (!button) return;

    const start = (event) => {
        event.preventDefault();
        touchInput[property] = true;
    };

    const end = (event) => {
        event.preventDefault();
        touchInput[property] = false;
    };

    button.addEventListener("pointerdown", start);
    button.addEventListener("pointerup", end);
    button.addEventListener("pointercancel", end);
    button.addEventListener("pointerleave", end);
}

bindHoldButton("moveLeft", "left");
bindHoldButton("moveRight", "right");
bindHoldButton("shootMobile", "shoot");

$("dashMobile").addEventListener("pointerdown", (event) => {
    event.preventDefault();
    dash();
});

elements.canvas.addEventListener("pointermove", (event) => {
    const rect = elements.canvas.getBoundingClientRect();

    pointer.x = (event.clientX - rect.left) / rect.width * GAME_WIDTH;
    pointer.y = (event.clientY - rect.top) / rect.height * GAME_HEIGHT;
    pointer.active = true;
});

elements.canvas.addEventListener("pointerdown", () => {
    if (screen === "game") {
        touchInput.shoot = true;
    }
});

window.addEventListener("pointerup", () => {
    touchInput.shoot = false;
});

/* =========================================================
   INTERFACE E BOTÕES
   ========================================================= */

elements.start.addEventListener("click", startGame);

elements.pause.addEventListener("click", pauseGame);
elements.resume.addEventListener("click", resumeGame);

elements.retry.addEventListener("click", startGame);

elements.quit.addEventListener("click", () => {
    elements.pauseOverlay.classList.add("hidden");
    stopMusic();
    setScreen("menu");
    playMusic("menu");
});

$("gameOverMenuButton").addEventListener("click", () => {
    elements.gameOverOverlay.classList.add("hidden");
    setScreen("menu");
    playMusic("menu");
});

$("garageButton").addEventListener("click", () => {
    updateGarage();
    setScreen("garage");
});

$("shipButton").addEventListener("click", () => {
    updateGarage();
    setScreen("garage");
});

$("settingsButton").addEventListener("click", () => {
    updateSettings();
    setScreen("settings");
});

document.querySelectorAll("[data-back]").forEach((button) => {
    button.addEventListener("click", () => {
        setScreen("menu");
    });
});

$("previousShip").addEventListener("click", () => changeShip(-1));
$("nextShip").addEventListener("click", () => changeShip(1));

$("buyArmor").addEventListener("click", () => purchaseUpgrade("armor"));
$("buyEngine").addEventListener("click", () => purchaseUpgrade("engine"));
$("buyWeapon").addEventListener("click", () => purchaseUpgrade("weapon"));

$("musicToggle").addEventListener("click", () => {
    musicEnabled = !musicEnabled;

    if (!musicEnabled) {
        stopMusic();
    } else if (screen === "menu") {
        playMusic("menu");
    } else if (screen === "game") {
        playMusic("game");
    }

    updateSettings();
});

$("sfxToggle").addEventListener("click", () => {
    sfxEnabled = !sfxEnabled;
    updateSettings();
});

$("effectsToggle").addEventListener("click", () => {
    highEffects = !highEffects;
    updateSettings();
});

/* =========================================================
   PLANILHA HOJE
   ========================================================= */

let previousGameState = "menu";

function openPlanilha() {
    if (screen === "game") {
        previousGameState = "game";
        screen = "planilha";
        stopMusic();
    } else if (screen === "paused") {
        previousGameState = "paused";
        screen = "planilha";
    } else {
        previousGameState = screen;
    }

    elements.planilha.classList.remove("hidden");
}

function closePlanilha() {
    elements.planilha.classList.add("hidden");

    if (previousGameState === "game") {
        screen = "game";
        lastFrame = performance.now();
        playMusic("game");
        animationFrame = requestAnimationFrame(gameLoop);
    } else if (previousGameState === "paused") {
        screen = "paused";
    } else {
        screen = previousGameState;
    }
}

elements.planilhaOpen.addEventListener("click", openPlanilha);
elements.planilhaClose.addEventListener("click", closePlanilha);
elements.planilhaReturn.addEventListener("click", closePlanilha);

/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

function init() {
    createStars();
    initSpaceShader();
    resizeGame();

    updateMenuInfo();
    updateGarage();
    updateSettings();

    setScreen("menu");
    playMusic("menu");

    // O navegador pode bloquear a música até a primeira interação.
    document.addEventListener("click", () => {
        if (screen === "menu" && musicEnabled && elements.menuMusic.paused) {
            playMusic("menu");
        }
    }, { once: true });
}

init();

/* =========================================================
   COMANDOS DE TESTE
   ========================================================= */

window.nv = {
    true() {
        if (!player) return;

        player.health = player.maxHealth;
        player.shield = 999;
        invulnerability = 999;

        console.log("[NAVE ESCAPE] Proteção ativada.");
        updateHUD();
    },

    false() {
        if (!player) return;

        player.shield = 0;
        invulnerability = 0;

        console.log("[NAVE ESCAPE] Proteção desativada.");
        updateHUD();
    },

    boss() {
        if (screen !== "game") return;
        if (boss) return;

        spawnBoss();
        console.log("[NAVE ESCAPE] Chefe invocado.");
    },

    credits(amount = 1000) {
        credits += Math.max(0, Number(amount) || 0);
        saveProgress();
        updateMenuInfo();
        updateGarage();

        console.log("[NAVE ESCAPE] Créditos adicionados.");
    },

    weapon() {
        cycleWeapon();
    },

    wave(number = 5) {
        wave = Math.max(1, Number(number) || 1);
        enemies = [];
        enemiesSpawned = 0;
        enemiesToSpawn = 0;
        spawnTimer = 0;

        if (wave % 5 === 0) spawnBoss();

        updateHUD();
        console.log("[NAVE ESCAPE] Setor alterado:", wave);
    }
};

console.log("%cNAVE ESCAPE // SYSTEM BREACH", "color:#42eaff;font-size:18px;font-weight:bold");
console.log("Sistema carregado. Comandos de teste disponíveis em window.nv.");