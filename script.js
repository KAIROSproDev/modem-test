const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
function resizeCanvas() {
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();
const menu = document.getElementById("menu");
const game = document.getElementById("game");
const gameOverScreen = document.getElementById("gameOver");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const menuBtn = document.getElementById("menuBtn");
const scoreText = document.getElementById("score");
const livesText = document.getElementById("lives");
const highScoreText = document.getElementById("highScore");
const powerText = document.getElementById("powerLevel");
const finalScoreText = document.getElementById("finalScore");
const finalHighScoreText = document.getElementById("finalHighScore");
const bossHud = document.getElementById("bossHud");
const bossNameText = document.getElementById("bossName");
const bossBar = document.getElementById("bossBar");
const bossHpText = document.getElementById("bossHpText");
const bossWarning = document.getElementById("bossWarning");
const menuMusic = document.getElementById("menuMusic");
const gameMusic = document.getElementById("gameMusic");
const laserSound = document.getElementById("laserSound");
let soundEnabled = true;
menuMusic.volume = 0.3;
gameMusic.volume = 0.3;
laserSound.volume = 0.1;
menuMusic.load();
gameMusic.load();
laserSound.load();
menuMusic.addEventListener("error", () => {
console.error("❌ Erro ao carregar music/MS1stM.mp3");
});
gameMusic.addEventListener("error", () => {
console.error("❌ Erro ao carregar music/NoSuprises.mp3");
});
laserSound.addEventListener("error", () => {
console.error("❌ Erro ao carregar music/laser.mp3");
});
const soundBtn = document.getElementById("soundBtn");
function tocarMusicaMenu() {
if (!soundEnabled) return;
gameMusic.pause();
menuMusic.volume = 0.4;
menuMusic.play().catch((error) => {
console.warn("⚠️ Não foi possível iniciar a música do menu:", error);
});
}
function tocarMusicaJogo() {
if (!soundEnabled) return;
menuMusic.pause();
gameMusic.currentTime = 0;
gameMusic.volume = 0.4;
gameMusic.play().catch((error) => {
console.warn("⚠️ Não foi possível iniciar a música do jogo:", error);
});
}
function pararMusicas() {
menuMusic.pause();
gameMusic.pause();
}
soundBtn.addEventListener("click", () => {
soundEnabled = !soundEnabled;
if (soundEnabled) {
soundBtn.textContent = "🔊";
if (!game.classList.contains("hidden")) {
tocarMusicaJogo();
} else {
tocarMusicaMenu();
}
} else {
soundBtn.textContent = "🔇";
menuMusic.pause();
gameMusic.pause();
}
});
const welcomeOverlay = document.getElementById("welcomeOverlay");
const closeWelcome = document.getElementById("closeWelcome");
const enterGame = document.getElementById("enterGame");
function fecharWelcome() {
welcomeOverlay.classList.add("hidden");
tocarMusicaMenu();
}
closeWelcome.addEventListener("click", fecharWelcome);
enterGame.addEventListener("click", fecharWelcome);
let gameRunning = false;
let gameAnimationFrame = null;
let score = 0;
let lives = 3;
let frameCount = 0;
let highScore =
Number(localStorage.getItem("naveEscapeHighScore")) || 0;
highScoreText.textContent = highScore;
let powerLevel = 1;
window.nvGodMode = false;
window.nv = {
true: function () {
window.nvGodMode = true;
console.log(
"🛡️ NV TRUE — INVENCIBILIDADE ATIVADA"
);
},
false: function () {
window.nvGodMode = false;
console.log(
"⚠️ NV FALSE — INVENCIBILIDADE DESATIVADA"
);
}
};
const player = {
x: canvas.width / 2,
y: canvas.height - 100,
width: 42,
height: 48,
speed: 6.5,
cooldown: 0,
invulnerableTimer: 0
};
const keys = {};
window.addEventListener("keydown", (event) => {
keys[event.key.toLowerCase()] = true;
if (
event.code === "Space" ||
event.key === " "
) {
event.preventDefault();
keys.space = true;
}
});
window.addEventListener("keyup", (event) => {
keys[event.key.toLowerCase()] = false;
if (
event.code === "Space" ||
event.key === " "
) {
keys.space = false;
}
});
const mobileLeft = document.getElementById("mobileLeft");
const mobileRight = document.getElementById("mobileRight");
const mobileShoot = document.getElementById("mobileShoot");
let mobileLeftPressed = false;
let mobileRightPressed = false;
let mobileShootPressed = false;
if (mobileLeft) {
mobileLeft.addEventListener("pointerdown", (event) => {
event.preventDefault();
mobileLeftPressed = true;
try {
mobileLeft.setPointerCapture(event.pointerId);
} catch (error) {}
});
mobileLeft.addEventListener("pointerup", (event) => {
event.preventDefault();
mobileLeftPressed = false;
});
mobileLeft.addEventListener("pointercancel", () => {
mobileLeftPressed = false;
});
}
if (mobileRight) {
mobileRight.addEventListener("pointerdown", (event) => {
event.preventDefault();
mobileRightPressed = true;
try {
mobileRight.setPointerCapture(event.pointerId);
} catch (error) {}
});
mobileRight.addEventListener("pointerup", (event) => {
event.preventDefault();
mobileRightPressed = false;
});
mobileRight.addEventListener("pointercancel", () => {
mobileRightPressed = false;
});
}
if (mobileShoot) {
mobileShoot.addEventListener("pointerdown", (event) => {
event.preventDefault();
mobileShootPressed = true;
try {
mobileShoot.setPointerCapture(event.pointerId);
} catch (error) {}
});
mobileShoot.addEventListener("pointerup", (event) => {
event.preventDefault();
mobileShootPressed = false;
});
mobileShoot.addEventListener("pointercancel", () => {
mobileShootPressed = false;
});
}
let meteors = [];
const METEOR_MAX_SPEED = 7.5;
let meteorSpawnInterval = 38;
let meteorLevel = 0;
function criarMeteor() {
const big = Math.random() < 0.22;
const size = big
? 48 + Math.random() * 20
: 20 + Math.random() * 18;
const speed =
Math.min(
2.2 +
(score / 100) * 0.35 +
Math.random() * 1.2,
METEOR_MAX_SPEED
);
meteors.push({
x: Math.random() * canvas.width,
y: -size,
size: size,
speed: speed,
rotation: Math.random() * Math.PI * 2,
rotationSpeed:
(Math.random() - 0.5) * 0.04,
health: big ? 2 : 1,
maxHealth: big ? 2 : 1,
big: big
});
}
function spawnMeteors() {
const interval =
Math.max(
38 - meteorLevel * 5,
23
);
if (frameCount % interval !== 0) {
return;
}
criarMeteor();
if (
meteorLevel >= 1 &&
Math.random() < 0.18
) {
criarMeteor();
}
if (
meteorLevel >= 2 &&
Math.random() < 0.22
) {
criarMeteor();
}
if (
meteorLevel >= 3 &&
Math.random() < 0.25
) {
criarMeteor();
}
}
let bullets = [];
function shoot() {
if (player.cooldown > 0) {
return;
}
bullets.push({
x: player.x,
y: player.y - 25,
width: 4,
height: 15,
speed: 10,
damage: powerLevel
});
player.cooldown = 10;
if (soundEnabled) {
const shot =
new Audio("music/laser.mp3");
shot.volume = 0.1;
shot.play().catch((error) => {
console.warn("⚠️ Não foi possível reproduzir o laser:", error);
});
}
}
const bossConfigs = [
{
score: 200,
name: "BOSS I",
health: 130,
size: 125,
speed: 0.85,
projectileSpeed: 4.5,
fireRate: 68
},
{
score: 500,
name: "BOSS II",
health: 260,
size: 155,
speed: 1.0,
projectileSpeed: 5.0,
fireRate: 52
},
{
score: 1000,
name: "BOSS III",
health: 430,
size: 190,
speed: 1.15,
projectileSpeed: 5.7,
fireRate: 42
},
{
score: 2000,
name: "BOSS IV — O INEVITÁVEL",
health: 1000,
size: 220,
speed: 1.35,
projectileSpeed: 6.4,
fireRate: 27,
shield: true
}
];
let boss = null;
let bossProjectiles = [];
let bossCoins = [];
let defeatedBosses = 0;
let nextBossIndex = 0;
function spawnBoss(config, index) {
meteors = [];
bossProjectiles = [];
bossCoins = [];
boss = {
index: index,
name: config.name,
x: canvas.width / 2,
y: 150,
size: config.size,
health: config.health,
maxHealth: config.health,
speed: config.speed,
direction: 1,
verticalDirection: 1,
verticalOffset: 0,
projectileSpeed:
config.projectileSpeed,
fireRate:
config.fireRate,
fireCooldown: 40,
shield:
config.shield || false,
shieldEnergy:
config.shield ? 100 : 0,
shieldRecharge:
config.shield ? 0.08 : 0,
randomShotCooldown: 75,
hitFlash: 0
};
bossHud.classList.remove("hidden");
bossNameText.textContent = boss.name;
atualizarBossHud();
mostrarBossWarning();
}
function mostrarBossWarning() {
bossWarning.classList.remove("hidden");
setTimeout(() => {
bossWarning.classList.add("hidden");
}, 2200);
}
function atualizarBossHud() {
if (!boss) {
bossHud.classList.add("hidden");
return;
}
bossNameText.textContent =
boss.name;
const percentage =
Math.max(
0,
boss.health / boss.maxHealth
) * 100;
bossBar.style.width =
percentage + "%";
bossHpText.textContent =
Math.ceil(boss.health);
}
function criarProjetilTeleguiado() {
if (!boss) return;
const dx =
player.x - boss.x;
const dy =
player.y - boss.y;
const distance =
Math.sqrt(
dx * dx +
dy * dy
) || 1;
const speed =
boss.projectileSpeed;
bossProjectiles.push({
x: boss.x,
y: boss.y + boss.size * 0.35,
radius: 8,
vx: (dx / distance) * speed,
vy: (dy / distance) * speed,
homing: false,
life: 500,
dangerous: true
});
}
function criarPedrinhasAleatorias() {
if (!boss) return;
const amount =
boss.index === 3
? 7
: 3 + boss.index;
for (let i = 0; i < amount; i++) {
const angle =
Math.random() * Math.PI * 2;
const speed =
2.5 +
Math.random() * 3.5 +
boss.index * 0.5;
bossProjectiles.push({
x: boss.x,
y: boss.y,
radius:
4 + Math.random() * 4,
vx:
Math.cos(angle) * speed,
vy:
Math.sin(angle) * speed,
homing: false,
life: 250,
dangerous: false
});
}
}
function bossShoot() {
if (!boss) return;
criarProjetilTeleguiado();
if (Math.random() < 0.75) {
criarPedrinhasAleatorias();
}
}
function updateBoss() {
if (!boss) return;
boss.x +=
boss.speed *
boss.direction;
if (
boss.x - boss.size / 2 < 0 ||
boss.x + boss.size / 2 > canvas.width
) {
boss.direction *= -1;
}
boss.verticalOffset +=
0.025 * boss.verticalDirection;
if (Math.abs(boss.verticalOffset) > 35) {
boss.verticalDirection *= -1;
}
boss.fireCooldown--;
if (boss.fireCooldown <= 0) {
bossShoot();
boss.fireCooldown =
boss.fireRate +
Math.floor(Math.random() * 10);
}
if (boss.index === 3) {
boss.randomShotCooldown--;
if (boss.randomShotCooldown <= 0) {
criarPedrinhasAleatorias();
boss.randomShotCooldown =
35 +
Math.floor(Math.random() * 30);
}
}
if (boss.shield) {
if (boss.shieldEnergy < 100) {
boss.shieldEnergy +=
boss.shieldRecharge;
}
}
if (boss.hitFlash > 0) {
boss.hitFlash--;
}
atualizarBossHud();
}
function damageBoss(amount) {
if (!boss) return;
if (boss.shield) {
if (boss.shieldEnergy > 0) {
const shieldDamage =
Math.min(
boss.shieldEnergy,
amount * 0.8
);
boss.shieldEnergy -=
shieldDamage;
amount -=
shieldDamage * 0.35;
if (amount < 0.1) {
amount = 0;
}
}
}
if (amount > 0) {
boss.health -= amount;
}
boss.hitFlash = 5;
atualizarBossHud();
if (boss.health <= 0) {
derrotarBoss();
}
}
function derrotarBoss() {
if (!boss) return;
const bonus =
25 *
(defeatedBosses + 1);
score += bonus;
defeatedBosses++;
meteorLevel++;
boss = null;
bossProjectiles = [];
bossCoins = [];
bossHud.classList.add("hidden");
nextBossIndex++;
for (let i = 0; i < 35; i++) {
particles.push({
x:
canvas.width / 2,
y:
canvas.height / 2,
vx:
(Math.random() - 0.5) * 10,
vy:
(Math.random() - 0.5) * 10,
life: 60 +
Math.random() * 50,
size:
2 +
Math.random() * 5
});
}
}
function criarPowerCoin() {
if (!boss) return;
bossCoins.push({
x:
50 +
Math.random() *
(canvas.width - 100),
y:
-20,
radius: 11,
speed:
1.5 +
Math.random() * 1.5
});
}
function updatePowerCoins() {
for (
let i = bossCoins.length - 1;
i >= 0;
i--
) {
const coin =
bossCoins[i];
coin.y += coin.speed;
const dx =
player.x - coin.x;
const dy =
player.y - coin.y;
const distance =
Math.sqrt(
dx * dx +
dy * dy
);
if (
distance <
player.width / 2 +
coin.radius
) {
powerLevel++;
bossCoins.splice(i, 1);
continue;
}
if (
coin.y >
canvas.height + 30
) {
bossCoins.splice(i, 1);
}
}
}
function updateBossProjectiles() {
for (
let i = bossProjectiles.length - 1;
i >= 0;
i--
) {
const projectile =
bossProjectiles[i];
projectile.x +=
projectile.vx;
projectile.y +=
projectile.vy;
projectile.life--;
const dx =
player.x -
projectile.x;
const dy =
player.y -
projectile.y;
const distance =
Math.sqrt(
dx * dx +
dy * dy
);
if (
distance <
player.width / 2 +
projectile.radius
) {
if (
!window.nvGodMode
) {
if (projectile.dangerous) {
lives = 0;
atualizarHUD();
gameOver();
return;
} else {
loseLife();
}
}
bossProjectiles.splice(i, 1);
continue;
}
if (
projectile.x <
-50 ||
projectile.x >
canvas.width + 50 ||
projectile.y <
-50 ||
projectile.y >
canvas.height + 50 ||
projectile.life <= 0
) {
bossProjectiles.splice(i, 1);
}
}
}
function updateMeteors() {
for (
let i = meteors.length - 1;
i >= 0;
i--
) {
const meteor =
meteors[i];
meteor.y += meteor.speed;
meteor.rotation +=
meteor.rotationSpeed;
const dx =
player.x -
meteor.x;
const dy =
player.y -
meteor.y;
const distance =
Math.sqrt(
dx * dx +
dy * dy
);
if (
distance <
meteor.size / 2 +
player.width / 2
) {
if (
!window.nvGodMode
) {
loseLife();
}
meteors.splice(i, 1);
continue;
}
if (
meteor.y >
canvas.height +
meteor.size
) {
meteors.splice(i, 1);
}
}
}
function updateBullets() {
for (
let i = bullets.length - 1;
i >= 0;
i--
) {
const bullet =
bullets[i];
bullet.y -= bullet.speed;
if (boss) {
const dx =
bullet.x -
boss.x;
const dy =
bullet.y -
boss.y;
const distance =
Math.sqrt(
dx * dx +
dy * dy
);
if (
distance <
boss.size / 2
) {
damageBoss(
bullet.damage
);
bullets.splice(i, 1);
continue;
}
}
let hitMeteor = false;
for (
let m = meteors.length - 1;
m >= 0;
m--
) {
const meteor =
meteors[m];
const dx =
bullet.x -
meteor.x;
const dy =
bullet.y -
meteor.y;
const distance =
Math.sqrt(
dx * dx +
dy * dy
);
if (
distance <
meteor.size / 2
) {
meteor.health -= 1;
bullets.splice(i, 1);
hitMeteor = true;
if (
meteor.health <= 0
) {
score +=
meteor.big
? 6
: 3;
for (
let p = 0;
p < 8;
p++
) {
particles.push({
x: meteor.x,
y: meteor.y,
vx:
(Math.random() - 0.5) * 4,
vy:
(Math.random() - 0.5) * 4,
life:
30 +
Math.random() * 25,
size:
2 +
Math.random() * 3
});
}
meteors.splice(
m,
1
);
}
break;
}
}
if (
!hitMeteor &&
bullet.y < -30
) {
bullets.splice(i, 1);
}
}
}
function updatePlayer() {
if (
keys["arrowleft"] ||
keys["a"] ||
mobileLeftPressed
) {
player.x -=
player.speed;
}
if (
keys["arrowright"] ||
keys["d"] ||
mobileRightPressed
) {
player.x +=
player.speed;
}
const half =
player.width / 2;
if (player.x < half) {
player.x = half;
}
if (
player.x >
canvas.width - half
) {
player.x =
canvas.width - half;
}
if (
keys.space ||
mobileShootPressed
) {
shoot();
}
if (
player.cooldown > 0
) {
player.cooldown--;
}
if (
player.invulnerableTimer > 0
) {
player.invulnerableTimer--;
}
}
function loseLife() {
if (
window.nvGodMode
) {
return;
}
if (
player.invulnerableTimer > 0
) {
return;
}
lives--;
player.invulnerableTimer =
90;
atualizarHUD();
if (lives <= 0) {
gameOver();
}
}
function gameOver() {
gameRunning = false;
pararMusicas();
game.classList.add("hidden");
gameOverScreen.classList.remove("hidden");
finalScoreText.textContent =
score;
if (
score > highScore
) {
highScore = score;
localStorage.setItem(
"naveEscapeHighScore",
highScore
);
}
finalHighScoreText.textContent =
highScore;
highScoreText.textContent =
highScore;
}
function checkBossSpawn() {
if (boss) return;
if (
nextBossIndex >=
bossConfigs.length
) {
return;
}
const config =
bossConfigs[nextBossIndex];
if (
score >= config.score
) {
spawnBoss(
config,
nextBossIndex
);
}
}
function updateScore() {
if (
frameCount % 60 === 0
) {
score++;
}
}
let stars = [];
function createStars() {
stars = [];
const amount =
Math.floor(
canvas.width *
canvas.height /
7000
);
for (
let i = 0;
i < amount;
i++
) {
stars.push({
x:
Math.random() *
canvas.width,
y:
Math.random() *
canvas.height,
size:
Math.random() * 2,
speed:
0.3 +
Math.random() * 1.2
});
}
}
createStars();
window.addEventListener(
"resize",
createStars
);
function updateStars() {
for (
const star of stars
) {
star.y += star.speed;
if (
star.y >
canvas.height
) {
star.y = 0;
star.x =
Math.random() *
canvas.width;
}
}
}
let particles = [];
function updateParticles() {
for (
let i = particles.length - 1;
i >= 0;
i--
) {
const particle =
particles[i];
particle.x +=
particle.vx;
particle.y +=
particle.vy;
particle.life--;
if (
particle.life <= 0
) {
particles.splice(i, 1);
}
}
}
function drawStars() {
ctx.fillStyle = "#ffffff";
for (
const star of stars
) {
ctx.globalAlpha =
0.3 +
Math.random() * 0.5;
ctx.fillRect(
star.x,
star.y,
star.size,
star.size
);
}
ctx.globalAlpha = 1;
}
function drawPlayer() {
if (
player.invulnerableTimer > 0 &&
Math.floor(
player.invulnerableTimer / 5
) % 2 === 0
) {
return;
}
ctx.save();
ctx.translate(
player.x,
player.y
);
ctx.fillStyle = "#00eaff";
ctx.beginPath();
ctx.moveTo(
0,
-player.height / 2
);
ctx.lineTo(
player.width / 2,
player.height / 2
);
ctx.lineTo(
0,
player.height / 3
);
ctx.lineTo(
-player.width / 2,
player.height / 2
);
ctx.closePath();
ctx.fill();
ctx.fillStyle = "#071522";
ctx.beginPath();
ctx.arc(
0,
-5,
7,
0,
Math.PI * 2
);
ctx.fill();
ctx.fillStyle = "#ff7b00";
ctx.beginPath();
ctx.moveTo(
-7,
20
);
ctx.lineTo(
0,
35 +
Math.random() * 8
);
ctx.lineTo(
7,
20
);
ctx.closePath();
ctx.fill();
ctx.restore();
}
function drawMeteors() {
for (
const meteor of meteors
) {
ctx.save();
ctx.translate(
meteor.x,
meteor.y
);
ctx.rotate(
meteor.rotation
);
if (meteor.big) {
ctx.fillStyle = "#8e273c";
ctx.strokeStyle = "#ff4b5c";
ctx.shadowColor =
"#ff304f";
ctx.shadowBlur = 10;
} else {
ctx.fillStyle = "#6d7480";
ctx.strokeStyle = "#aeb8c4";
ctx.shadowColor =
"transparent";
ctx.shadowBlur = 0;
}
ctx.lineWidth = 2;
ctx.beginPath();
const points = 8;
for (
let i = 0;
i < points;
i++
) {
const angle =
(Math.PI * 2 / points) *
i;
const variation =
0.75 +
Math.random() *
0.25;
const radius =
(meteor.size / 2) *
variation;
const x =
Math.cos(angle) *
radius;
const y =
Math.sin(angle) *
radius;
if (i === 0) {
ctx.moveTo(
x,
y
);
} else {
ctx.lineTo(
x,
y
);
}
}
ctx.closePath();
ctx.fill();
ctx.stroke();
if (meteor.big) {
ctx.strokeStyle =
"rgba(255,180,180,0.5)";
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(
-meteor.size * 0.18,
-meteor.size * 0.1
);
ctx.lineTo(
meteor.size * 0.1,
meteor.size * 0.18
);
ctx.stroke();
}
ctx.restore();
}
}
function drawBoss() {
if (!boss) return;
ctx.save();
ctx.translate(
boss.x,
boss.y +
boss.verticalOffset
);
if (
boss.shield &&
boss.shieldEnergy > 0
) {
ctx.strokeStyle =
"rgba(0, 234, 255, 0.75)";
ctx.lineWidth = 5;
ctx.shadowColor =
"#00eaff";
ctx.shadowBlur = 25;
ctx.beginPath();
ctx.arc(
0,
0,
boss.size * 0.68,
0,
Math.PI * 2
);
ctx.stroke();
}
ctx.shadowColor =
"#ff2020";
ctx.shadowBlur = 20;
ctx.fillStyle =
boss.hitFlash > 0
? "#ffffff"
: "#3b0505";
ctx.strokeStyle =
"#ff3030";
ctx.lineWidth = 4;
ctx.beginPath();
ctx.moveTo(
0,
-boss.size / 2
);
ctx.lineTo(
boss.size / 2,
boss.size / 4
);
ctx.lineTo(
boss.size * 0.28,
boss.size / 2
);
ctx.lineTo(
0,
boss.size * 0.32
);
ctx.lineTo(
-boss.size * 0.28,
boss.size / 2
);
ctx.lineTo(
-boss.size / 2,
boss.size / 4
);
ctx.closePath();
ctx.fill();
ctx.stroke();
ctx.fillStyle =
boss.index === 3
? "#00eaff"
: "#ff3030";
ctx.shadowColor =
boss.index === 3
? "#00eaff"
: "#ff0000";
ctx.shadowBlur = 25;
ctx.beginPath();
ctx.arc(
0,
0,
boss.size * 0.15,
0,
Math.PI * 2
);
ctx.fill();
if (
boss.index === 3
) {
ctx.fillStyle =
"#ff8c00";
ctx.shadowColor =
"#ff8c00";
ctx.beginPath();
ctx.arc(
-boss.size * 0.28,
0,
boss.size * 0.07,
0,
Math.PI * 2
);
ctx.fill();
ctx.beginPath();
ctx.arc(
boss.size * 0.28,
0,
boss.size * 0.07,
0,
Math.PI * 2
);
ctx.fill();
}
ctx.restore();
}
function drawBossProjectiles() {
for (
const projectile of bossProjectiles
) {
ctx.save();
ctx.translate(
projectile.x,
projectile.y
);
if (
projectile.dangerous
) {
ctx.fillStyle =
"#ff3030";
ctx.strokeStyle =
"#ffaaaa";
ctx.shadowColor =
"#ff0000";
ctx.shadowBlur = 15;
} else {
ctx.fillStyle =
"#a0a0a0";
ctx.strokeStyle =
"#e0e0e0";
ctx.shadowColor =
"#ffffff";
ctx.shadowBlur = 5;
}
ctx.beginPath();
ctx.arc(
0,
0,
projectile.radius,
0,
Math.PI * 2
);
ctx.fill();
ctx.stroke();
ctx.restore();
}
}
function drawPowerCoins() {
for (
const coin of bossCoins
) {
ctx.save();
ctx.translate(
coin.x,
coin.y
);
ctx.fillStyle =
"#ffd000";
ctx.strokeStyle =
"#fff5a0";
ctx.shadowColor =
"#ffd000";
ctx.shadowBlur = 15;
ctx.beginPath();
ctx.arc(
0,
0,
coin.radius,
0,
Math.PI * 2
);
ctx.fill();
ctx.stroke();
ctx.fillStyle =
"#6b5100";
ctx.font =
"bold 12px Arial";
ctx.textAlign =
"center";
ctx.textBaseline =
"middle";
ctx.fillText(
"P",
0,
1
);
ctx.restore();
}
}
function drawBullets() {
for (
const bullet of bullets
) {
ctx.save();
ctx.fillStyle =
"#ff0000";
ctx.shadowColor =
"#ffee00";
ctx.shadowBlur = 12;
ctx.fillRect(
bullet.x -
bullet.width / 2,
bullet.y,
bullet.width,
bullet.height
);
ctx.restore();
}
}
function drawParticles() {
for (
const particle of particles
) {
ctx.fillStyle =
"#ff9d00";
ctx.globalAlpha =
Math.max(
0,
particle.life / 80
);
ctx.fillRect(
particle.x,
particle.y,
particle.size,
particle.size
);
}
ctx.globalAlpha = 1;
}
function atualizarHUD() {
scoreText.textContent =
score;
livesText.textContent =
lives;
highScoreText.textContent =
highScore;
powerText.textContent =
powerLevel;
}
function resetGame() {
score = 0;
lives = 3;
powerLevel = 1;
frameCount = 0;
meteorLevel = 0;
defeatedBosses = 0;
nextBossIndex = 0;
boss = null;
meteors = [];
bullets = [];
bossProjectiles = [];
bossCoins = [];
particles = [];
player.x =
canvas.width / 2;
player.y =
canvas.height - 100;
player.cooldown = 0;
player.invulnerableTimer = 0;
bossHud.classList.add("hidden");
bossWarning.classList.add("hidden");
atualizarHUD();
}
function startGame() {
if (gameAnimationFrame !== null) {
cancelAnimationFrame(gameAnimationFrame);
gameAnimationFrame = null;
}
resetGame();
menu.classList.add("hidden");
gameOverScreen.classList.add("hidden");
game.classList.remove("hidden");
gameRunning = true;
tocarMusicaJogo();
gameAnimationFrame = requestAnimationFrame(gameLoop);
}
function voltarMenu() {
gameRunning = false;
if (gameAnimationFrame !== null) {
cancelAnimationFrame(gameAnimationFrame);
gameAnimationFrame = null;
}
pararMusicas();
game.classList.add("hidden");
gameOverScreen.classList.add("hidden");
menu.classList.remove("hidden");
tocarMusicaMenu();
}
startBtn.addEventListener(
"click",
startGame
);
restartBtn.addEventListener(
"click",
startGame
);
menuBtn.addEventListener(
"click",
voltarMenu
);
const fullscreenBtn =
document.getElementById("fullscreenBtn");
function atualizarBotaoFullscreen() {
if (!fullscreenBtn) {
return;
}
if (document.fullscreenElement) {
fullscreenBtn.textContent = "✕";
} else {
fullscreenBtn.textContent = "⛶";
}
}
async function alternarTelaCheia() {
if (!fullscreenBtn) {
return;
}
try {
if (!document.fullscreenElement) {
await document.documentElement.requestFullscreen();
} else {
await document.exitFullscreen();
}
} catch (error) {
console.warn(
"⚠️ Não foi possível ativar a tela cheia:",
error
);
}
}
if (fullscreenBtn) {
fullscreenBtn.addEventListener(
"click",
alternarTelaCheia
);
}
document.addEventListener(
"fullscreenchange",
() => {
atualizarBotaoFullscreen();
setTimeout(() => {
resizeCanvas();
player.y =
canvas.height - 100;
}, 100);
}
);
function gameLoop() {
gameAnimationFrame = null;
if (!gameRunning) {
return;
}
frameCount++;
updateStars();
updatePlayer();
if (!boss) {
spawnMeteors();
}
updateMeteors();
updateBullets();
updateBoss();
updateBossProjectiles();
updatePowerCoins();
updateParticles();
updateScore();
checkBossSpawn();
if (
boss &&
frameCount % 420 === 0 &&
Math.random() < 0.55
) {
criarPowerCoin();
}
ctx.clearRect(
0,
0,
canvas.width,
canvas.height
);
ctx.fillStyle = "#000";
ctx.fillRect(
0,
0,
canvas.width,
canvas.height
);
drawStars();
drawMeteors();
drawPowerCoins();
drawBossProjectiles();
drawBoss();
drawBullets();
drawParticles();
drawPlayer();
atualizarHUD();
if (gameRunning) {
gameAnimationFrame = requestAnimationFrame(gameLoop);
}
}
atualizarHUD();
atualizarBotaoFullscreen();
tocarMusicaMenu();
console.log(
"🚀 System of Burla carregado."
);
console.log(
"🛡️ Teste de invencibilidade: nv.true() / nv.false()"
);
console.log(
"👹 Bosses: 200 / 500 / 1000 / 2000"
);
const planilhaStyle = document.createElement("style");
planilhaStyle.textContent = `
#planilhaOpenButton {
    position: fixed !important;
    top: 25vh !important;
    left: 20px !important;
    right: auto !important;
    bottom: auto !important;

    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;

    width: auto !important;
    height: auto !important;
    min-width: 0 !important;
    min-height: 0 !important;
    max-width: 180px !important;

    padding: 10px 16px !important;
    margin: 0 !important;

    border: 1px solid #00eaff !important;
    border-radius: 6px !important;
    background: rgba(0, 0, 0, 0.82) !important;
    color: #00eaff !important;

    font-size: 12px !important;
    font-weight: bold !important;
    letter-spacing: 1px !important;
    cursor: pointer !important;

    z-index: 20000 !important;
}
#planilhaOpenButton:hover {
background: rgba(0, 234, 255, 0.16);
box-shadow: 0 0 12px rgba(0, 234, 255, 0.4);
}
#planilhaSiteOverlay {
position: fixed;
inset: 0;
z-index: 30000;
display: none;
overflow-y: auto;
background: #f4f6f8;
color: #20242a;
font-family: Arial, Helvetica, sans-serif;
touch-action: pan-y;
}
#planilhaSiteOverlay.planilha-visible {
display: block;
}
#planilhaSiteOverlay * {
box-sizing: border-box;
}
#planilhaSiteOverlay .ph-header {
background: #ffffff;
border-bottom: 1px solid #e5e7eb;
padding: 18px 7%;
display: flex;
align-items: center;
justify-content: space-between;
gap: 15px;
}
#planilhaSiteOverlay .ph-logo {
color: #16834a;
font-size: 23px;
font-weight: 800;
letter-spacing: -1px;
}
#planilhaSiteOverlay .ph-logo span {
color: #252b33;
}
#planilhaSiteOverlay .ph-back {
border: 1px solid #16834a;
background: #ffffff;
color: #16834a;
padding: 10px 16px;
border-radius: 6px;
font-size: 13px;
font-weight: bold;
cursor: pointer;
}
#planilhaSiteOverlay .ph-back:hover {
background: #16834a;
color: white;
}
#planilhaSiteOverlay .ph-page {
width: min(900px, 90%);
margin: 42px auto;
background: #ffffff;
padding: clamp(22px, 5vw, 55px);
border-radius: 10px;
box-shadow: 0 4px 25px rgba(0, 0, 0, 0.06);
}
#planilhaSiteOverlay .ph-category {
color: #16834a;
font-size: 12px;
font-weight: bold;
letter-spacing: 1.5px;
text-transform: uppercase;
margin-bottom: 15px;
}
#planilhaSiteOverlay .ph-page h1 {
color: #20242a;
font-size: clamp(30px, 5vw, 46px);
line-height: 1.15;
margin-bottom: 18px;
}
#planilhaSiteOverlay .ph-subtitle {
color: #626b75;
font-size: 18px;
line-height: 1.6;
margin-bottom: 25px;
}
#planilhaSiteOverlay .ph-author {
color: #747d87;
font-size: 13px;
border-bottom: 1px solid #e8ebee;
padding-bottom: 24px;
margin-bottom: 28px;
}
#planilhaSiteOverlay .ph-page h2 {
color: #20242a;
font-size: 25px;
margin: 32px 0 14px;
}
#planilhaSiteOverlay .ph-page p {
color: #424a53;
font-size: 16px;
line-height: 1.85;
margin: 14px 0;
}
#planilhaSiteOverlay .ph-page ul {
margin: 15px 0 20px 25px;
color: #424a53;
line-height: 1.9;
}
#planilhaSiteOverlay .ph-code {
background: #17231d;
color: #b9f5cf;
padding: 20px;
border-radius: 7px;
margin: 20px 0;
overflow-x: auto;
font-family: Consolas, monospace;
font-size: 14px;
line-height: 1.8;
}
#planilhaSiteOverlay .ph-tip {
background: #eaf7ef;
border-left: 4px solid #16834a;
padding: 18px;
margin: 22px 0;
color: #28583c;
line-height: 1.7;
}
#planilhaSiteOverlay .ph-footer {
border-top: 1px solid #e8ebee;
margin-top: 40px;
padding-top: 22px;
color: #8a929a;
font-size: 12px;
text-align: center;
}
@media (max-width: 600px) {
#planilhaOpenButton {
top: 12px;
left: 12px;
padding: 9px 12px;
font-size: 10px;
}
#planilhaSiteOverlay .ph-header {
padding: 15px;
}
#planilhaSiteOverlay .ph-logo {
font-size: 19px;
}
#planilhaSiteOverlay .ph-back {
padding: 9px 11px;
font-size: 11px;
}
#planilhaSiteOverlay .ph-page {
width: 94%;
margin: 18px auto;
padding: 22px 18px;
}
#planilhaSiteOverlay .ph-page p {
font-size: 15px;
}
}
`;
document.head.appendChild(planilhaStyle);
const planilhaOpenButton = document.createElement("button");
planilhaOpenButton.id = "planilhaOpenButton";
planilhaOpenButton.textContent = "PLANILHA HOJE";
planilhaOpenButton.type = "button";
document.body.appendChild(planilhaOpenButton);
const planilhaSiteOverlay = document.createElement("section");
planilhaSiteOverlay.id = "planilhaSiteOverlay";
planilhaSiteOverlay.innerHTML = `
<header class="ph-header">
<div class="ph-logo">
Planilha<span>Hoje</span>
</div>
</header>
<main class="ph-page">
<div class="ph-category">
EXCEL • PRODUTIVIDADE
</div>
<h1>
Como usar a função PROCV no Excel: guia completo para iniciantes
</h1>
<p class="ph-subtitle">
Aprenda a localizar informações em tabelas de maneira rápida,
organizar seus dados e economizar tempo usando uma das funções
mais conhecidas do Excel.
</p>
<div class="ph-author">
Por Rafael Martins • Planilha Hoje • 12 de agosto de 2026
</div>
<p>
O Excel é uma ferramenta muito utilizada para organizar informações,
controlar despesas, montar relatórios e realizar cálculos.
Entre suas diversas funções, o PROCV se destaca pela capacidade
de procurar um valor em uma tabela e retornar uma informação
relacionada a ele.
</p>
<h2>O que é a função PROCV?</h2>
<p>
PROCV significa procura vertical. Na prática, essa função procura
um determinado valor na primeira coluna de uma tabela e retorna
uma informação localizada em outra coluna da mesma linha.
</p>
<p>
Imagine uma tabela com o nome de funcionários, seus cargos e
salários. Em vez de procurar manualmente cada pessoa, você pode
utilizar o PROCV para encontrar o registro desejado.
</p>
<h2>Como funciona a fórmula?</h2>
<p>
A estrutura básica da função é:
</p>
<div class="ph-code">
=PROCV(valor_procurado; matriz_tabela; núm_índice_coluna; [procurar_intervalo])
</div>
<p>
Cada parte possui uma finalidade:
</p>
<ul>
<li><strong>valor_procurado:</strong> o dado que você deseja localizar.</li>
<li><strong>matriz_tabela:</strong> o intervalo de células onde a busca será realizada.</li>
<li><strong>núm_índice_coluna:</strong> o número da coluna que contém o resultado desejado.</li>
<li><strong>procurar_intervalo:</strong> define se a busca será exata ou aproximada.</li>
</ul>
<h2>Exemplo prático</h2>
<p>
Imagine que você tenha uma tabela de produtos com seus respectivos
códigos, nomes e preços.
</p>
<div class="ph-code">
A2: 101     B2: Teclado     C2: 89,90<br>
A3: 102     B3: Mouse       C3: 49,90<br>
A4: 103     B4: Monitor     C4: 799,90
</div>
<p>
Se você quiser descobrir o preço do produto de código 102,
poderá utilizar:
</p>
<div class="ph-code">
=PROCV(102; A2:C4; 3; FALSO)
</div>
<p>
O Excel procurará o código 102 na primeira coluna do intervalo
e retornará o conteúdo da terceira coluna daquela linha.
O resultado será 49,90.
</p>
<h2>Por que utilizar FALSO?</h2>
<p>
O último argumento determina o tipo de correspondência.
Quando você utiliza FALSO, o Excel procura uma correspondência
exata com o valor informado.
</p>
<div class="ph-tip">
<strong>Dica:</strong> na maioria das pesquisas por códigos,
nomes ou identificadores, utilizar FALSO é a opção mais segura,
pois evita resultados aproximados inesperados.
</div>
<h2>Erros comuns ao utilizar PROCV</h2>
<p>
Um erro frequente acontece quando o valor procurado não está
na primeira coluna do intervalo selecionado. O PROCV sempre
começa sua busca pela primeira coluna da matriz.
</p>
<p>
Outro problema comum é informar o número errado da coluna.
Lembre-se de que a contagem começa na primeira coluna do
intervalo selecionado, e não necessariamente na coluna A
da planilha.
</p>
<h2>Conclusão</h2>
<p>
A função PROCV é uma ótima ferramenta para quem deseja trabalhar
melhor com planilhas. Com um pouco de prática, ela pode facilitar
pesquisas, relatórios e a organização de grandes quantidades
de informações.
</p>
<p>
Experimente criar uma pequena tabela e testar diferentes valores.
Aprender fazendo é uma das melhores maneiras de dominar o Excel.
</p>
<footer class="ph-footer">
    <span
        id="ph-voltar-jogo"
        title="Voltar ao Nave Escape"
        style="cursor: pointer;"
    >
        © 2026 Planilha Hoje — Conteúdo educativo sobre Excel e produtividade.
        <br>
        Este é um site educativo.
    </span>
</footer>
</main>
`;
document.body.appendChild(planilhaSiteOverlay);
const botaoVoltarJogo = document.getElementById("ph-voltar-jogo");

if (botaoVoltarJogo) {
    botaoVoltarJogo.addEventListener("click", () => {
        fecharPlanilhaSite();
    });
}
let planilhaGameWasRunning = false;
let planilhaMenuMusicWasPlaying = false;
let planilhaGameMusicWasPlaying = false;
let planilhaMenuMusicTime = 0;
let planilhaGameMusicTime = 0;
function abrirPlanilhaSite() {
if (
planilhaSiteOverlay.classList.contains("planilha-visible")
) {
return;
}
planilhaGameWasRunning = gameRunning;
planilhaMenuMusicWasPlaying =
!menuMusic.paused;
planilhaGameMusicWasPlaying =
!gameMusic.paused;
planilhaMenuMusicTime =
menuMusic.currentTime;
planilhaGameMusicTime =
gameMusic.currentTime;
gameRunning = false;
if (gameAnimationFrame !== null) {
cancelAnimationFrame(gameAnimationFrame);
gameAnimationFrame = null;
}
menuMusic.pause();
gameMusic.pause();
planilhaSiteOverlay.classList.add("planilha-visible");
planilhaOpenButton.style.display = "none";
const page =
planilhaSiteOverlay.querySelector(".ph-page");
if (page) {
page.scrollTop = 0;
}
}
function fecharPlanilhaSite(event) {
if (event) {
event.preventDefault();
}
planilhaSiteOverlay.classList.remove("planilha-visible");
planilhaOpenButton.style.display = "block";
menuMusic.currentTime =
planilhaMenuMusicTime;
gameMusic.currentTime =
planilhaGameMusicTime;
if (
planilhaGameWasRunning &&
!game.classList.contains("hidden")
) {
gameRunning = true;
gameAnimationFrame =
requestAnimationFrame(gameLoop);
}
if (soundEnabled) {
if (planilhaGameMusicWasPlaying) {
gameMusic.play().catch(() => {});
} else if (planilhaMenuMusicWasPlaying) {
menuMusic.play().catch(() => {});
}
}
}
planilhaOpenButton.addEventListener(
"click",
abrirPlanilhaSite
);
planilhaSiteOverlay
.querySelector(".ph-back")
.addEventListener(
"click",
fecharPlanilhaSite
);
console.log(
"📊 Planilha Hoje integrado ao Nave Escape."
);