(() => {
  "use strict";

  // =========================================
  // NAVE ESCAPE — SYSTEM BREACH
  // =========================================

  const $ = id => document.getElementById(id);

  const canvas = $("gameCanvas");
  const ctx = canvas.getContext("2d");
  const bgCanvas = $("spaceShader");
  const bg = bgCanvas.getContext("2d");

  const ui = {
    menu: $("menuScreen"),
    garage: $("garageScreen"),
    settings: $("settingsScreen"),
    game: $("gameScreen"),
    pause: $("pauseOverlay"),
    gameOver: $("gameOverOverlay"),
    planilha: $("planilhaOverlay"),

    score: $("scoreDisplay"),
    wave: $("waveDisplay"),
    health: $("healthBar"),
    healthText: $("healthText"),
    dash: $("dashBar"),
    coins: $("coinDisplay"),
    weapon: $("weaponDisplay"),
    power: $("powerDisplay"),
    combo: $("comboDisplay"),

    boss: $("bossHud"),
    bossName: $("bossName"),
    bossHealth: $("bossHealthBar"),
    bossWarning: $("bossWarning"),

    highScore: $("menuHighScore"),
    menuCoins: $("menuCredits"),
    finalScore: $("finalScore"),
    finalWave: $("finalWave"),
    finalCoins: $("finalCredits")
  };

  const storage = {
    get(key, fallback) {
      try {
        const value = localStorage.getItem("naveEscape_" + key);
        return value === null ? fallback : JSON.parse(value);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem("naveEscape_" + key, JSON.stringify(value));
      } catch {}
    }
  };

  const ships = [
    {
      name: "PHANTOM X-01",
      description: "Caça de combate padrão. Equilibrado e confiável.",
      price: 0,
      speed: 6,
      armor: 100,
      power: 1,
      color: "#48eaff"
    },
    {
      name: "VIPER-09",
      description: "Caça experimental. Extremamente veloz.",
      price: 500,
      speed: 8,
      armor: 75,
      power: 1.25,
      color: "#ffbd57"
    },
    {
      name: "NOVA-7",
      description: "Nave pesada com tecnologia de plasma avançada.",
      price: 1200,
      speed: 5,
      armor: 145,
      power: 1.65,
      color: "#b38aff"
    }
  ];

  let credits = storage.get("credits", 0);
  let highScore = storage.get("highScore", 0);
  let unlockedShips = storage.get("unlockedShips", [0]);
  let selectedShip = storage.get("selectedShip", 0);

  let difficulty = 1;
  let audioEnabled = true;
  let effectsEnabled = true;
  let soundContext = null;

  let W = 0;
  let H = 0;
  let dpr = 1;

  let running = false;
  let paused = false;
  let gameEnded = false;

  let score = 0;
  let wave = 1;
  let elapsed = 0;
  let lastTime = 0;
  let spawnTimer = 0;
  let bossTimer = 0;
  let shake = 0;
  let flash = 0;
  let combo = 0;
  let comboTimer = 0;
  let earnedCredits = 0;

  let player;
  let enemies = [];
  let bullets = [];
  let enemyBullets = [];
  let particles = [];
  let pickups = [];
  let stars = [];
  let floatingTexts = [];

  let boss = null;

  const keys = {};
  const touch = {
    left: false,
    right: false,
    shoot: false,
    dash: false
  };

  const weapons = [
    { name: "PLASMA MK-I", color: "#48eaff", damage: 1, delay: 0.19 },
    { name: "DUAL PHOTON", color: "#ffbd57", damage: 1.5, delay: 0.25 },
    { name: "VOID CANNON", color: "#bd80ff", damage: 3, delay: 0.55 },
    { name: "SOLAR BURST", color: "#ff668d", damage: 2, delay: 0.12 }
  ];

  let weaponIndex = 0;
  let weaponLevel = 1;
  let weaponTimer = 0;
  let dashCooldown = 0;
  let invulnerable = 0;

  // =========================================
  // RESOLUÇÃO E CENÁRIO
  // =========================================

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    W = window.innerWidth;
    H = window.innerHeight;

    for (const c of [canvas, bgCanvas]) {
      c.width = Math.floor(W * dpr);
      c.height = Math.floor(H * dpr);
      c.style.width = W + "px";
      c.style.height = H + "px";
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bg.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (player) {
      player.x = Math.min(W - 30, Math.max(30, player.x));
      player.y = Math.min(H - 100, Math.max(100, player.y));
    }

    createStars();
  }

  function createStars() {
    stars = [];

    const amount = Math.floor((W * H) / 2400);

    for (let i = 0; i < amount; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        z: Math.random(),
        size: Math.random() * 1.8 + 0.3,
        speed: Math.random() * 1.8 + 0.3,
        alpha: Math.random() * 0.7 + 0.2
      });
    }
  }

  function drawBackground(dt) {
    bg.clearRect(0, 0, W, H);

    const gradient = bg.createRadialGradient(
      W * 0.55, H * 0.4, 0,
      W * 0.55, H * 0.4, Math.max(W, H)
    );

    gradient.addColorStop(0, "#101b3b");
    gradient.addColorStop(0.5, "#080d20");
    gradient.addColorStop(1, "#03050d");

    bg.fillStyle = gradient;
    bg.fillRect(0, 0, W, H);

    // Nebulosas
    const t = performance.now() * 0.00008;

    if (effectsEnabled) {
      for (let i = 0; i < 5; i++) {
        const x = W * (0.15 + i * 0.2) + Math.sin(t + i) * 100;
        const y = H * (0.3 + Math.cos(t * 1.5 + i) * 0.2);

        const glow = bg.createRadialGradient(x, y, 0, x, y, W * 0.23);
        glow.addColorStop(0, i % 2
          ? "rgba(80,75,190,.10)"
          : "rgba(20,190,220,.08)");
        glow.addColorStop(1, "transparent");

        bg.fillStyle = glow;
        bg.fillRect(0, 0, W, H);
      }
    }

    // Estrelas em profundidade
    for (const star of stars) {
      star.y += star.speed * (running && !paused ? dt * 60 : 0.2);

      if (star.y > H) {
        star.y = 0;
        star.x = Math.random() * W;
      }

      const alpha = star.alpha * (0.6 + Math.sin(performance.now() * 0.002 + star.x) * 0.3);

      bg.fillStyle = `rgba(190,225,255,${alpha})`;
      bg.beginPath();
      bg.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      bg.fill();

      if (running && !paused && star.z > 0.8) {
        bg.strokeStyle = `rgba(100,200,255,${alpha * 0.25})`;
        bg.beginPath();
        bg.moveTo(star.x, star.y);
        bg.lineTo(star.x, star.y + star.speed * 5);
        bg.stroke();
      }
    }

    // Horizonte de distorção
    const horizon = bg.createRadialGradient(
      W * 0.5, H * 0.52, 10,
      W * 0.5, H * 0.52, W * 0.65
    );
    horizon.addColorStop(0, "transparent");
    horizon.addColorStop(1, "rgba(0,0,0,.25)");

    bg.fillStyle = horizon;
    bg.fillRect(0, 0, W, H);
  }

  // =========================================
  // INTERFACE
  // =========================================

  function showScreen(name) {
    document.querySelectorAll(".screen").forEach(el => {
      el.classList.remove("active");
    });

    const target = $(name + "Screen");
    if (target) target.classList.add("active");

    const inGame = name === "game";
    $("planilhaOpenButton").style.display = inGame ? "block" : "none";
  }

  function refreshMenu() {
    ui.highScore.textContent = highScore.toLocaleString("pt-BR");
    ui.menuCoins.textContent = credits.toLocaleString("pt-BR");
  }

  function refreshHUD() {
    if (!player) return;

    ui.score.textContent = String(score).padStart(6, "0");
    ui.wave.textContent = String(wave).padStart(2, "0");

    const hp = Math.max(0, player.hp / player.maxHp * 100);

    ui.health.style.width = hp + "%";
    ui.healthText.textContent = Math.ceil(hp) + "%";
    ui.dash.style.width = (1 - dashCooldown / 2.2) * 100 + "%";

    ui.coins.textContent = credits;
    ui.weapon.textContent = weapons[weaponIndex].name;
    ui.power.textContent = "NÍVEL " + weaponLevel;

    ui.combo.textContent = combo >= 3 ? combo + "X COMBO" : "";

    if (boss) {
      ui.boss.classList.remove("hidden");
      ui.bossName.textContent = boss.name;
      ui.bossHealth.style.width = Math.max(0, boss.hp / boss.maxHp * 100) + "%";
    } else {
      ui.boss.classList.add("hidden");
    }
  }

  function setCredits(value) {
    credits = Math.max(0, Math.floor(value));
    storage.set("credits", credits);
    refreshMenu();
    refreshHUD();
  }

  function setScore(value) {
    score = Math.max(0, value);

    if (score > highScore) {
      highScore = score;
      storage.set("highScore", highScore);
    }

    refreshHUD();
    refreshMenu();
  }

  // =========================================
  // ÁUDIO
  // =========================================

  function audio() {
    if (!audioEnabled) return null;

    try {
      if (!soundContext) {
        soundContext = new (window.AudioContext || window.webkitAudioContext)();
      }

      if (soundContext.state === "suspended") soundContext.resume();

      return soundContext;
    } catch {
      return null;
    }
  }

  function tone(freq, duration, type = "sine", volume = 0.04, endFreq = null) {
    const ac = audio();
    if (!ac) return;

    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime);

    if (endFreq) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(1, endFreq),
        ac.currentTime + duration
      );
    }

    gain.gain.setValueAtTime(volume, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      ac.currentTime + duration
    );

    osc.connect(gain);
    gain.connect(ac.destination);

    osc.start();
    osc.stop(ac.currentTime + duration);
  }

  function soundShoot() {
    tone(650, 0.07, "sawtooth", 0.018, 180);
  }

  function soundExplosion() {
    tone(120, 0.22, "sawtooth", 0.07, 35);
  }

  function soundDash() {
    tone(180, 0.24, "sawtooth", 0.04, 1200);
  }

  // =========================================
  // NOVO JOGO
  // =========================================

  function createPlayer() {
    const ship = ships[selectedShip];

    return {
      x: W / 2,
      y: H * 0.78,
      radius: 15,
      speed: ship.speed,
      maxHp: ship.armor,
      hp: ship.armor,
      power: ship.power,
      fireRate: 1,
      invulnerable: 0,
      dash: 0,
      angle: 0,
      color: ship.color
    };
  }

  function startGame() {
    player = createPlayer();

    enemies = [];
    bullets = [];
    enemyBullets = [];
    particles = [];
    pickups = [];
    floatingTexts = [];

    boss = null;

    score = 0;
    wave = 1;
    elapsed = 0;
    spawnTimer = 0;
    bossTimer = 0;
    shake = 0;
    flash = 0;
    combo = 0;
    comboTimer = 0;
    earnedCredits = 0;

    weaponIndex = 0;
    weaponLevel = 1;
    weaponTimer = 0;
    dashCooldown = 0;
    invulnerable = 0;

    running = true;
    paused = false;
    gameEnded = false;

    ui.pause.classList.add("hidden");
    ui.gameOver.classList.add("hidden");
    ui.bossWarning.classList.remove("show");

    showScreen("game");
    refreshHUD();

    tone(300, 0.4, "sine", 0.04, 900);
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  function pauseGame() {
    if (!running || gameEnded) return;

    paused = true;
    ui.pause.classList.remove("hidden");
  }

  function resumeGame() {
    if (!running || gameEnded) return;

    paused = false;
    ui.pause.classList.add("hidden");
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  function endGame() {
    if (gameEnded) return;

    gameEnded = true;
    running = false;

    const bonus = Math.floor(score / 35);
    earnedCredits += bonus;
    setCredits(credits + earnedCredits);

    ui.finalScore.textContent = score.toLocaleString("pt-BR");
    ui.finalWave.textContent = wave;
    ui.finalCoins.textContent = earnedCredits;

    ui.gameOver.classList.remove("hidden");

    soundExplosion();
    burst(player.x, player.y, "#48eaff", 55, 7);
  }

  // =========================================
  // PARTÍCULAS
  // =========================================

  function burst(x, y, color, amount = 15, force = 4) {
    if (!effectsEnabled) return;

    for (let i = 0; i < amount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * force + 0.5;

      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: Math.random() * 0.5 + 0.3,
        maxLife: 0.8,
        size: Math.random() * 3 + 1,
        color
      });
    }
  }

  function addText(x, y, text, color = "#fff") {
    floatingTexts.push({
      x, y, text, color, life: 0.9
    });
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.life -= dt;

      if (p.life <= 0) particles.splice(i, 1);
    }

    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const t = floatingTexts[i];

      t.y -= 35 * dt;
      t.life -= dt;

      if (t.life <= 0) floatingTexts.splice(i, 1);
    }
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 12;
      ctx.shadowColor = p.color;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    for (const t of floatingTexts) {
      ctx.globalAlpha = Math.max(0, t.life);
      ctx.fillStyle = t.color;
      ctx.font = "bold 14px Orbitron, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(t.text, t.x, t.y);
    }

    ctx.globalAlpha = 1;
  }

  // =========================================
  // DESENHO DA NAVE
  // =========================================

  function drawShip(x, y, color, scale = 1, enemy = false) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    if (enemy) ctx.rotate(Math.PI);

    // Propulsor
    const flame = 12 + Math.random() * 9;

    const engine = ctx.createLinearGradient(0, 10, 0, 10 + flame);
    engine.addColorStop(0, color);
    engine.addColorStop(1, "transparent");

    ctx.fillStyle = engine;
    ctx.beginPath();
    ctx.moveTo(-5, 10);
    ctx.lineTo(0, 10 + flame);
    ctx.lineTo(5, 10);
    ctx.closePath();
    ctx.fill();

    // Asas
    ctx.shadowBlur = 18;
    ctx.shadowColor = color;
    ctx.fillStyle = "#172b46";
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;

    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(16, 13);
    ctx.lineTo(7, 9);
    ctx.lineTo(0, 15);
    ctx.lineTo(-7, 9);
    ctx.lineTo(-16, 13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Núcleo
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.lineTo(4, 7);
    ctx.lineTo(-4, 7);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#dffcff";
    ctx.beginPath();
    ctx.arc(0, 1, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.shadowBlur = 0;
  }

  // =========================================
  // ARMAS
  // =========================================

  function shoot() {
    if (!player || weaponTimer > 0) return;

    const weapon = weapons[weaponIndex];
    const damage = weapon.damage * player.power * weaponLevel;

    const spread = weaponIndex === 1 ? 12 : 0;

    if (weaponIndex === 1) {
      bullets.push(
        { x: player.x - 9, y: player.y - 18, vx: -spread, vy: -10, damage, color: weapon.color, radius: 4 },
        { x: player.x + 9, y: player.y - 18, vx: spread, vy: -10, damage, color: weapon.color, radius: 4 }
      );
    } else if (weaponIndex === 2) {
      bullets.push({
        x: player.x, y: player.y - 24,
        vx: 0, vy: -13,
        damage, color: weapon.color,
        radius: 9, heavy: true
      });
    } else if (weaponIndex === 3) {
      for (let i = -1; i <= 1; i++) {
        bullets.push({
          x: player.x + i * 10,
          y: player.y - 17,
          vx: i * 1.5,
          vy: -11,
          damage, color: weapon.color, radius: 3
        });
      }
    } else {
      bullets.push({
        x: player.x, y: player.y - 20,
        vx: 0, vy: -12,
        damage, color: weapon.color, radius: 4
      });
    }

    weaponTimer = weapon.delay / player.fireRate;
    soundShoot();
  }

  function cycleWeapon() {
    weaponIndex = (weaponIndex + 1) % weapons.length;
    refreshHUD();
    tone(400, 0.08, "sine", 0.03, 700);
  }

  function updateBullets(dt) {
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];

      b.x += b.vx * dt * 60;
      b.y += b.vy * dt * 60;

      if (b.y < -30 || b.x < -30 || b.x > W + 30) {
        bullets.splice(i, 1);
        continue;
      }

      if (boss && distance(b.x, b.y, boss.x, boss.y) < boss.radius + b.radius) {
        boss.hp -= b.damage;

        if (b.heavy) burst(b.x, b.y, b.color, 8, 3);

        bullets.splice(i, 1);

        if (boss.hp <= 0) defeatBoss();
        continue;
      }

      let hit = false;

      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];

        if (distance(b.x, b.y, e.x, e.y) < e.radius + b.radius) {
          e.hp -= b.damage;
          hit = true;

          if (e.hp <= 0) defeatEnemy(e, j);

          break;
        }
      }

      if (hit) bullets.splice(i, 1);
    }
  }

  // =========================================
  // INIMIGOS
  // =========================================

  function spawnEnemy() {
    if (boss) return;

    const types = ["scout", "fighter", "tank"];
    const type = types[Math.floor(Math.random() * Math.min(3, 1 + Math.floor(wave / 2)))];

    const config = {
      scout: { hp: 1, radius: 13, speed: 2.4, color: "#ff5b80", score: 10 },
      fighter: { hp: 3, radius: 18, speed: 1.7, color: "#b17cff", score: 25 },
      tank: { hp: 8, radius: 25, speed: 0.9, color: "#ff9b4a", score: 50 }
    }[type];

    enemies.push({
      type,
      x: 30 + Math.random() * (W - 60),
      y: -40,
      hp: config.hp * difficulty * (1 + wave * 0.12),
      maxHp: config.hp * difficulty * (1 + wave * 0.12),
      radius: config.radius,
      speed: config.speed * difficulty,
      color: config.color,
      score: config.score,
      time: Math.random() * 10,
      shootTimer: 1 + Math.random() * 2
    });
  }

  function updateEnemies(dt) {
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];

      e.time += dt;
      e.y += e.speed * dt * 60;

      if (e.type === "scout") {
        e.x += Math.sin(e.time * 3) * 2;
      }

      if (e.type === "fighter") {
        e.x += Math.sin(e.time * 2) * 1.8;
      }

      if (e.type === "tank") {
        e.shootTimer -= dt;

        if (e.shootTimer <= 0) {
          enemyShoot(e);
          e.shootTimer = 2.1;
        }
      }

      if (e.y > H + 50) {
        enemies.splice(i, 1);
        continue;
      }

      if (player && distance(e.x, e.y, player.x, player.y) < e.radius + player.radius) {
        damagePlayer(15);
        enemies.splice(i, 1);
        burst(e.x, e.y, e.color, 15, 4);
      }
    }
  }

  function enemyShoot(e) {
    if (!player) return;

    const angle = Math.atan2(player.y - e.y, player.x - e.x);
    const speed = 3.5 + wave * 0.1;

    enemyBullets.push({
      x: e.x,
      y: e.y + 10,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 5,
      color: "#ff5c87",
      damage: 12
    });
  }

  function defeatEnemy(e, index) {
    enemies.splice(index, 1);

    setScore(score + e.score);
    combo++;
    comboTimer = 2.5;

    burst(e.x, e.y, e.color, 18, 4);
    addText(e.x, e.y, "+" + e.score, "#ffe77a");
    soundExplosion();

    if (Math.random() < 0.13) {
      spawnPickup(e.x, e.y);
    }

    if (combo > 0 && combo % 5 === 0) {
      addText(player.x, player.y - 45, combo + "X COMBO!", "#ffe77a");
      tone(700, 0.18, "sine", 0.04, 1100);
    }
  }

  // =========================================
  // CHEFES
  // =========================================

  function spawnBoss() {
    if (boss) return;

    ui.bossWarning.classList.add("show");

    setTimeout(() => {
      if (!running || paused || boss) return;

      ui.bossWarning.classList.remove("show");

      boss = {
        x: W / 2,
        y: -100,
        targetY: Math.max(130, H * 0.23),
        radius: 65,
        hp: 180 + wave * 55,
        maxHp: 180 + wave * 55,
        name: wave % 2 === 0 ? "VOID DESTROYER" : "COLOSSUS",
        color: wave % 2 === 0 ? "#b27bff" : "#ff4e75",
        time: 0,
        shootTimer: 1,
        phase: 1
      };

      ui.boss.classList.remove("hidden");
      refreshHUD();

      tone(90, 1, "sawtooth", 0.08, 35);
    }, 1600);
  }

  function updateBoss(dt) {
    if (!boss) return;

    boss.time += dt;

    if (boss.y < boss.targetY) {
      boss.y += 1.5;
    } else {
      boss.x = W / 2 + Math.sin(boss.time * 0.8) * W * 0.25;
    }

    boss.phase = boss.hp < boss.maxHp * 0.5 ? 2 : 1;

    boss.shootTimer -= dt;

    if (boss.shootTimer <= 0) {
      bossAttack();
      boss.shootTimer = boss.phase === 2 ? 0.55 : 1.1;
    }
  }

  function bossAttack() {
    if (!boss || !player) return;

    const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
    const count = boss.phase === 2 ? 7 : 5;

    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * 0.18;
      const a = angle + offset;
      const speed = boss.phase === 2 ? 5 : 4;

      enemyBullets.push({
        x: boss.x,
        y: boss.y + 35,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        radius: 6,
        color: boss.color,
        damage: 14
      });
    }

    if (boss.phase === 2) {
      for (let i = 0; i < 12; i++) {
        const a = (Math.PI * 2 / 12) * i + boss.time;
        enemyBullets.push({
          x: boss.x,
          y: boss.y,
          vx: Math.cos(a) * 3.1,
          vy: Math.sin(a) * 3.1,
          radius: 4,
          color: "#b27bff",
          damage: 9
        });
      }
    }
  }

  function defeatBoss() {
    if (!boss) return;

    burst(boss.x, boss.y, boss.color, 90, 9);
    burst(boss.x, boss.y, "#ffffff", 45, 6);

    addText(boss.x, boss.y, "BOSS ELIMINADO", "#ffe77a");

    setScore(score + 500);
    setCredits(credits + 100);
    earnedCredits += 100;

    boss = null;
    wave++;
    enemies = [];
    enemyBullets = [];

    shake = 18;
    flash = 0.4;

    tone(100, 0.8, "sawtooth", 0.1, 900);
    refreshHUD();
  }

  // =========================================
  // PROJÉTEIS INIMIGOS
  // =========================================

  function updateEnemyBullets(dt) {
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const b = enemyBullets[i];

      b.x += b.vx * dt * 60;
      b.y += b.vy * dt * 60;

      if (
        b.x < -50 || b.x > W + 50 ||
        b.y < -50 || b.y > H + 50
      ) {
        enemyBullets.splice(i, 1);
        continue;
      }

      if (player && distance(b.x, b.y, player.x, player.y) < player.radius + b.radius) {
        damagePlayer(b.damage);
        enemyBullets.splice(i, 1);
      }
    }
  }

  // =========================================
  // PICKUPS
  // =========================================

  function spawnPickup(x, y) {
    const types = ["health", "weapon", "credits"];
    const type = types[Math.floor(Math.random() * types.length)];

    pickups.push({
      x, y,
      type,
      vy: 1.5,
      radius: 12,
      time: 0
    });
  }

  function updatePickups(dt) {
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];

      p.y += p.vy * dt * 60;
      p.time += dt;

      if (player && distance(p.x, p.y, player.x, player.y) < 30) {
        if (p.type === "health") {
          player.hp = Math.min(player.maxHp, player.hp + 25);
          addText(p.x, p.y, "+25 HP", "#70ffad");
        }

        if (p.type === "weapon") {
          weaponLevel = Math.min(5, weaponLevel + 1);
          addText(p.x, p.y, "WEAPON UP", "#48eaff");
        }

        if (p.type === "credits") {
          setCredits(credits + 20);
          earnedCredits += 20;
          addText(p.x, p.y, "+20 CR", "#ffe77a");
        }

        burst(p.x, p.y, "#ffffff", 12, 3);
        pickups.splice(i, 1);
        tone(800, 0.12, "sine", 0.04, 1300);
        continue;
      }

      if (p.y > H + 30) pickups.splice(i, 1);
    }
  }

  // =========================================
  // DANO, DASH E HABILIDADES
  // =========================================

  function damagePlayer(amount) {
    if (!player || invulnerable > 0) return;

    player.hp -= amount;
    invulnerable = 0.8;
    shake = 9;
    flash = 0.18;

    burst(player.x, player.y, "#ff426c", 12, 3);
    tone(160, 0.16, "sawtooth", 0.05, 60);

    if (player.hp <= 0) {
      player.hp = 0;
      refreshHUD();
      endGame();
      return;
    }

    refreshHUD();
  }

  function dash() {
    if (!player || dashCooldown > 0) return;

    dashCooldown = 2.2;
    invulnerable = 0.45;
    player.dash = 0.2;

    const direction = keys.ArrowLeft || keys.a || touch.left
      ? -1
      : keys.ArrowRight || keys.d || touch.right
        ? 1 : 0;

    player.x += direction * 120;
    player.x = Math.max(25, Math.min(W - 25, player.x));

    burst(player.x, player.y, player.color, 20, 5);
    soundDash();
  }

  // =========================================
  // COLISÕES E UTILITÁRIOS
  // =========================================

  function distance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  // =========================================
  // ATUALIZAÇÃO DO JOGO
  // =========================================

  function update(dt) {
    if (!running || paused || gameEnded) return;

    elapsed += dt;

    if (!player) return;

    weaponTimer = Math.max(0, weaponTimer - dt);
    dashCooldown = Math.max(0, dashCooldown - dt);
    invulnerable = Math.max(0, invulnerable - dt);
    comboTimer -= dt;

    if (comboTimer <= 0) combo = 0;

    // Movimento
    let dx = 0;
    let dy = 0;

    if (keys.ArrowLeft || keys.a || touch.left) dx--;
    if (keys.ArrowRight || keys.d || touch.right) dx++;
    if (keys.ArrowUp || keys.w) dy--;
    if (keys.ArrowDown || keys.s) dy++;

    const magnitude = Math.hypot(dx, dy) || 1;

    player.x += dx / magnitude * player.speed * dt * 60;
    player.y += dy / magnitude * player.speed * dt * 60;

    player.x = clamp(player.x, 25, W - 25);
    player.y = clamp(player.y, 90, H - 70);

    player.angle += (dx * 0.12 - player.angle) * dt * 8;

    if (keys.Space || touch.shoot) shoot();
    if (keys.Shift && dashCooldown <= 0) dash();

    // Spawn de inimigos
    spawnTimer -= dt;

    if (spawnTimer <= 0 && !boss) {
      spawnEnemy();

      spawnTimer = Math.max(
        0.28,
        1.15 - wave * 0.055
      );
    }

    // Chefes
    bossTimer += dt;

    if (!boss && bossTimer >= 24) {
      bossTimer = 0;
      spawnBoss();
    }

    // Progressão de setor
    if (!boss && elapsed > wave * 35) {
      wave++;
      refreshHUD();
    }

    updateBullets(dt);
    updateEnemies(dt);
    updateBoss(dt);
    updateEnemyBullets(dt);
    updatePickups(dt);
    updateParticles(dt);

    shake = Math.max(0, shake - dt * 30);
    flash = Math.max(0, flash - dt);

    if (Math.random() < 0.5 && effectsEnabled) {
      particles.push({
        x: player.x + (Math.random() - 0.5) * 5,
        y: player.y + 16,
        vx: (Math.random() - 0.5) * 0.5,
        vy: 2 + Math.random() * 2,
        life: 0.2,
        maxLife: 0.2,
        size: 2,
        color: player.color
      });
    }

    refreshHUD();
  }

  // =========================================
  // DESENHO DOS OBJETOS
  // =========================================

  function drawBullets() {
    for (const b of bullets) {
      ctx.save();
      ctx.shadowBlur = 18;
      ctx.shadowColor = b.color;
      ctx.fillStyle = b.color;

      ctx.beginPath();
      ctx.ellipse(b.x, b.y, b.radius, b.radius * 2.2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    for (const b of enemyBullets) {
      ctx.save();
      ctx.shadowBlur = 15;
      ctx.shadowColor = b.color;
      ctx.fillStyle = b.color;

      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  function drawEnemies() {
    for (const e of enemies) {
      drawShip(e.x, e.y, e.color, e.radius / 16, true);

      if (e.hp < e.maxHp) {
        ctx.fillStyle = "rgba(0,0,0,.6)";
        ctx.fillRect(e.x - 15, e.y + e.radius, 30, 3);

        ctx.fillStyle = e.color;
        ctx.fillRect(
          e.x - 15,
          e.y + e.radius,
          30 * Math.max(0, e.hp / e.maxHp),
          3
        );
      }
    }
  }

  function drawBoss() {
    if (!boss) return;

    ctx.save();
    ctx.translate(boss.x, boss.y);

    const pulse = 1 + Math.sin(boss.time * 5) * 0.04;

    ctx.scale(pulse, pulse);
    ctx.shadowBlur = 35;
    ctx.shadowColor = boss.color;

    ctx.fillStyle = "#21172f";
    ctx.strokeStyle = boss.color;
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(0, -60);
    ctx.lineTo(65, -20);
    ctx.lineTo(80, 25);
    ctx.lineTo(40, 45);
    ctx.lineTo(0, 30);
    ctx.lineTo(-40, 45);
    ctx.lineTo(-80, 25);
    ctx.lineTo(-65, -20);
    ctx.closePath();

    ctx.fill();
    ctx.stroke();

    // Núcleo
    ctx.fillStyle = boss.phase === 2 ? "#ff315e" : boss.color;
    ctx.beginPath();
    ctx.arc(0, -5, 18 + Math.sin(boss.time * 8) * 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(0, -5, 5, 0, Math.PI * 2);
    ctx.fill();

    // Asas laterais
    ctx.fillStyle = "#0d1428";
    ctx.beginPath();
    ctx.moveTo(-45, -15);
    ctx.lineTo(-105, 25);
    ctx.lineTo(-65, 30);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(45, -15);
    ctx.lineTo(105, 25);
    ctx.lineTo(65, 30);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
    ctx.shadowBlur = 0;
  }

  function drawPickups() {
    for (const p of pickups) {
      const color = {
        health: "#70ffad",
        weapon: "#48eaff",
        credits: "#ffe77a"
      }[p.type];

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.time * 2);
      ctx.shadowBlur = 18;
      ctx.shadowColor = color;
      ctx.strokeStyle = color;
      ctx.fillStyle = "rgba(10,20,40,.9)";
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.rect(-10, -10, 20, 20);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        p.type === "health" ? "+" : p.type === "weapon" ? "⚡" : "$",
        0, 1
      );

      ctx.restore();
    }
  }

  function drawPlayer() {
    if (!player) return;

    if (invulnerable > 0 && Math.floor(performance.now() / 80) % 2 === 0) {
      return;
    }

    if (player.dash > 0) {
      player.dash -= 1 / 60;
      ctx.globalAlpha = 0.3;
      drawShip(player.x, player.y + 20, player.color, 1.2);
      ctx.globalAlpha = 1;
    }

    drawShip(player.x, player.y, player.color, 1);

    if (invulnerable > 0) {
      ctx.strokeStyle = "rgba(72,234,255,.7)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 27, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawEffects() {
    if (shake > 0) {
      // A vibração é aplicada pelo loop ao contexto.
    }

    if (flash > 0) {
      ctx.fillStyle = `rgba(255,50,90,${flash})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    if (!running || !player) return;

    ctx.save();

    if (shake > 0) {
      ctx.translate(
        (Math.random() - 0.5) * shake,
        (Math.random() - 0.5) * shake
      );
    }

    drawPickups();
    drawBullets();
    drawEnemies();
    drawBoss();
    drawParticles();
    drawPlayer();
    drawEffects();

    ctx.restore();
  }

  // =========================================
  // LOOP PRINCIPAL
  // =========================================

  function loop(timestamp) {
    if (!running || paused || gameEnded) return;

    const dt = Math.min((timestamp - lastTime) / 1000, 0.033);
    lastTime = timestamp;

    drawBackground(dt);
    update(dt);
    draw();

    requestAnimationFrame(loop);
  }

  // =========================================
  // GARAGEM
  // =========================================

  let previewShip = selectedShip;

  function updateGarage() {
    const ship = ships[previewShip];

    $("shipName").textContent = ship.name;
    $("shipDescription").textContent = ship.description;

    $("speedStat").style.width = (ship.speed / 10 * 100) + "%";
    $("armorStat").style.width = (ship.armor / 150 * 100) + "%";
    $("powerStat").style.width = (ship.power / 2 * 100) + "%";

    document.querySelectorAll(".ship-option").forEach(button => {
      const index = Number(button.dataset.ship);
      button.classList.toggle("selected", index === previewShip);
    });

    const unlocked = unlockedShips.includes(previewShip);
    const button = $("buyShipButton");

    if (unlocked && selectedShip === previewShip) {
      button.textContent = "NAVE EQUIPADA";
      button.disabled = true;
    } else if (unlocked) {
      button.textContent = "EQUIPAR NAVE";
      button.disabled = false;
    } else {
      button.textContent = "COMPRAR — " + ship.price + " CR";
      button.disabled = credits < ship.price;
    }
  }

  document.querySelectorAll(".ship-option").forEach(button => {
    button.addEventListener("click", () => {
      previewShip = Number(button.dataset.ship);
      updateGarage();
    });
  });

  $("buyShipButton").addEventListener("click", () => {
    const ship = ships[previewShip];

    if (!unlockedShips.includes(previewShip)) {
      if (credits < ship.price) return;

      setCredits(credits - ship.price);
      unlockedShips.push(previewShip);
      storage.set("unlockedShips", unlockedShips);
    }

    selectedShip = previewShip;
    storage.set("selectedShip", selectedShip);

    updateGarage();
    tone(700, 0.2, "sine", 0.04, 1200);
  });

  // =========================================
  // EVENTOS DE INTERFACE
  // =========================================

  $("startButton").addEventListener("click", startGame);

  $("garageButton").addEventListener("click", () => {
    previewShip = selectedShip;
    updateGarage();
    showScreen("garage");
  });

  $("garageBackButton").addEventListener("click", () => showScreen("menu"));

  $("settingsButton").addEventListener("click", () => showScreen("settings"));

  $("settingsBackButton").addEventListener("click", () => showScreen("menu"));

  $("pauseButton").addEventListener("click", pauseGame);
  $("resumeButton").addEventListener("click", resumeGame);

  $("quitButton").addEventListener("click", () => {
    running = false;
    paused = false;
    gameEnded = true;

    ui.pause.classList.add("hidden");
    showScreen("menu");
    refreshMenu();
  });

  $("retryButton").addEventListener("click", startGame);

  $("gameOverMenuButton").addEventListener("click", () => {
    ui.gameOver.classList.add("hidden");
    showScreen("menu");
    refreshMenu();
  });

  $("audioToggle").addEventListener("change", e => {
    audioEnabled = e.target.checked;
  });

  $("effectsToggle").addEventListener("change", e => {
    effectsEnabled = e.target.checked;
  });

  $("difficultySelect").addEventListener("change", e => {
    difficulty = Number(e.target.value);
  });

  $("planilhaOpenButton").addEventListener("click", () => {
    if (running && !paused) {
      paused = true;
      ui.planilha.classList.remove("hidden");
    }
  });

  function closePlanilha() {
    ui.planilha.classList.add("hidden");

    if (running && !gameEnded) {
      paused = false;
      lastTime = performance.now();
      requestAnimationFrame(loop);
    }
  }

  $("closePlanilha").addEventListener("click", closePlanilha);
  $("returnToGame").addEventListener("click", closePlanilha);

  // =========================================
  // CONTROLES DE TECLADO
  // =========================================

  window.addEventListener("keydown", e => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

    keys[key] = true;

    if ([
      "ArrowUp", "ArrowDown", "ArrowLeft",
      "ArrowRight", " ", "Shift"
    ].includes(e.key)) {
      e.preventDefault();
    }

    if (key === "Escape") {
      if (!ui.planilha.classList.contains("hidden")) {
        closePlanilha();
      } else if (paused) {
        resumeGame();
      } else {
        pauseGame();
      }
    }

    if (key === "q" && running && !paused) cycleWeapon();

    if (key === "e" && running && !paused) dash();

    if (key === "r" && running && !paused) {
      weaponLevel = Math.min(5, weaponLevel + 1);
      refreshHUD();
    }
  });

  window.addEventListener("keyup", e => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    keys[key] = false;
  });

  window.addEventListener("blur", () => {
    if (running && !paused && !gameEnded) pauseGame();
  });

  // =========================================
  // CONTROLES MOBILE
  // =========================================

  document.querySelectorAll("[data-control]").forEach(button => {
    const control = button.dataset.control;

    const press = e => {
      e.preventDefault();
      touch[control] = true;

      if (control === "dash") dash();
    };

    const release = e => {
      e.preventDefault();
      touch[control] = false;
    };

    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointerleave", release);
    button.addEventListener("pointercancel", release);
  });

  // =========================================
  // COMANDOS DE DESENVOLVEDOR
  // =========================================

  window.nv = {
    true() {
      if (!player) return;
      player.hp = player.maxHp;
      invulnerable = 999;
      console.log("MODO INVENCÍVEL ATIVADO");
    },

    false() {
      invulnerable = 0;
      console.log("MODO INVENCÍVEL DESATIVADO");
    },

    boss() {
      if (!running) return;
      bossTimer = 24;
      spawnBoss();
    },

    credits(amount = 1000) {
      setCredits(credits + Number(amount));
    },

    weapon() {
      weaponIndex = (weaponIndex + 1) % weapons.length;
      refreshHUD();
    },

    wave(number = wave + 1) {
      wave = Math.max(1, Number(number));
      refreshHUD();
    },

    heal() {
      if (player) player.hp = player.maxHp;
      refreshHUD();
    },

    level() {
      weaponLevel = Math.min(5, weaponLevel + 1);
      refreshHUD();
    },

    clear() {
      enemies = [];
      enemyBullets = [];
      bullets = [];
    }
  };

  // =========================================
  // INICIALIZAÇÃO
  // =========================================

  window.addEventListener("resize", resize);

  resize();
  refreshMenu();
  updateGarage();

  showScreen("menu");

  console.log("%cNAVE ESCAPE // SYSTEM BREACH", "color:#48eaff;font-size:20px;font-weight:bold");
  console.log("%cDeveloper console carregado. Digite nv para acessar os comandos.", "color:#a66cff");

})();