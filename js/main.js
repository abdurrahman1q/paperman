import * as THREE from 'three';
import { World, ZONES, ZONE_LEN } from './world.js';
import { Traffic } from './traffic.js';
import { makeBike, loadModels, Sound } from './assets.js';

const $ = id => document.getElementById(id);
const clamp = THREE.MathUtils.clamp;
const isTouch = matchMedia('(pointer: coarse)').matches;
const CAMERAS = ['Chase camera', 'First person', 'Cinematic'];
const BEST_KEY = 'cycle-bangla-paper-best';
const SHIFT_START = 5.5;
const SHIFT_END = 9;
const SHIFT_SECONDS = 300;
const MAX_COMBO = 5;
const THROW_COOLDOWN = 0.3;
const GREEN_AREAS = ['Shahbag', 'Dhanmondi'];
const START_SPEED = 7;
const TOP_SPEED = 17;
const SPEED_RAMP = 0.003;
const BOOST = 3;
const MILESTONE = 1000;

const cruiseSpeed = s => Math.min(TOP_SPEED, START_SPEED + s * SPEED_RAMP);

const renderer = new THREE.WebGLRenderer({ canvas: $('game'), antialias: !isTouch });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isTouch ? 1.5 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 700);
const sound = new Sound();
const world = new World(scene);
if (isTouch) world.sun.shadow.mapSize.set(512, 512);
const traffic = new Traffic(scene, world);
const bike = makeBike();
scene.add(bike.root);

const headlight = new THREE.SpotLight(0xfff2cc, 0, 50, 0.55, 0.5, 1);
headlight.position.set(0, 1.1, -0.6);
headlight.target.position.set(0, 0, -14);
bike.root.add(headlight, headlight.target);

const input = { left: false, right: false, up: false, down: false };
const cameraTarget = new THREE.Vector3();
const lookTarget = new THREE.Vector3();
const lookSmooth = new THREE.Vector3();
const speedo = $('speedo').getContext('2d');
const minimap = $('minimap').getContext('2d');

let state = 'loading';
let player = newPlayer();
let cameraMode = 0;
let clock = 6.5;
let shake = 0;
let lastZone = -1;
let orbit = 0;
let night = 0;
let timers = { toast: 0, banner: 0, fact: 0 };

function newPlayer() {
    return {
        s: 0, lat: -1.4, speed: 0, steer: 0, stamina: 100, lives: 3, invuln: 0, shield: 0, score: 0, teslas: 0, pedal: 0, milestone: MILESTONE,
        delivered: 0, missed: 0, combo: 1, bestCombo: 1, cooldown: 0,
    };
}

function readBest() {
    try {
        return Number(localStorage.getItem(BEST_KEY)) || 0;
    } catch {
        return 0;
    }
}

function saveBest(score) {
    try {
        localStorage.setItem(BEST_KEY, String(score));
    } catch {
        return;
    }
}

function toast(text, seconds = 2.2) {
    $('toast').textContent = text;
    $('toast').classList.add('show');
    timers.toast = seconds;
}

function banner(text) {
    $('banner').textContent = text;
    $('banner').classList.add('show');
    timers.banner = 3.2;
}

function showFact(landmark) {
    $('factTitle').textContent = `📍 ${landmark.name}`;
    $('factText').textContent = landmark.fact;
    $('fact').classList.remove('hidden');
    timers.fact = 7;
}

const game = {
    toast,
    hit(e, message) {
        if (player.invuln > 0) return;
        if (player.shield > 0) {
            toast('Fuchka shield saved you! ✨');
            return;
        }
        player.lives--;
        player.invuln = 2;
        player.speed *= 0.3;
        player.lat += Math.sign(player.lat - e.lat || 1) * 0.8;
        shake = 0.5;
        sound.crash();
        toast(message);
        updateLives();
        if (player.lives <= 0) gameOver('Shift cut short');
    },
    bump(message) {
        if (player.shield > 0) return;
        player.speed *= 0.55;
        shake = 0.25;
        sound.splash();
        toast(message, 1.4);
    },
    dodgedTesla() {
        player.teslas++;
        player.score += 50;
        toast('Dodged a Tesla! +50 🛺');
    },
    honk(ds) {
        sound.horn(Math.max(0.05, 0.25 - Math.abs(ds) * 0.004));
    },
    collect() {
        player.score += 50;
        player.shield = 8;
        sound.chime();
        toast('Fuchka power! Shield for 8s ✨');
    },
    delivered() {
        player.delivered++;
        player.score += 100 * player.combo;
        sound.coin();
        toast(`Delivered! +${100 * player.combo}${player.combo > 1 ? ` · ×${player.combo}` : ''} 📰`, 1.4);
        player.combo = Math.min(MAX_COMBO, player.combo + 1);
        player.bestCombo = Math.max(player.bestCombo, player.combo);
    },
    missed() {
        player.missed++;
        player.combo = 1;
        toast('Missed! 📭', 1.2);
    },
    wastedThrow() {
        if (player.combo > 1) toast('Nobody there! Combo lost', 1.2);
        player.combo = 1;
    },
};

function throwPaper(side) {
    if (state !== 'play' || player.cooldown > 0) return;
    player.cooldown = THROW_COOLDOWN;
    traffic.throwPaper(player, side, game);
}

function clockText(hours) {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}:${String(m).padStart(2, '0')} AM`;
}

function updateLives() {
    $('lives').textContent = '❤️'.repeat(Math.max(0, player.lives)) + '🖤'.repeat(Math.max(0, 3 - player.lives));
}

function setOverlay(id) {
    for (const overlay of ['menu', 'pause', 'over']) $(overlay).classList.toggle('hidden', overlay !== id);
    $('hud').classList.toggle('hidden', id === 'menu');
    $('touch').classList.toggle('hidden', !isTouch || id !== null);
}

function startRide() {
    sound.start();
    sound.playMusic();
    player = newPlayer();
    world.reset();
    traffic.reset();
    lastZone = -1;
    clock = SHIFT_START;
    shake = 0;
    $('fact').classList.add('hidden');
    updateLives();
    state = 'play';
    setOverlay(null);
}

function gameOver(title) {
    state = 'over';
    const score = Math.floor(player.score);
    const best = Math.max(score, readBest());
    const chances = player.delivered + player.missed;
    saveBest(best);
    $('overTitle').textContent = title;
    $('overScore').textContent = score.toLocaleString();
    $('overDelivered').textContent = player.delivered;
    $('overAccuracy').textContent = chances ? `${Math.round((player.delivered / chances) * 100)}%` : '–';
    $('overCombo').textContent = `×${player.bestCombo}`;
    $('overDistance').textContent = `${(player.s / 1000).toFixed(2)} km`;
    $('overTeslas').textContent = player.teslas;
    $('overBest').textContent = best.toLocaleString();
    setTimeout(() => setOverlay('over'), 700);
}

function togglePause() {
    if (state === 'play') {
        state = 'paused';
        setOverlay('pause');
    } else if (state === 'paused') {
        state = 'play';
        setOverlay(null);
    }
}

function ringBell() {
    if (state !== 'play') return;
    sound.bell();
    traffic.ringBell(player, game);
}

function switchCamera() {
    cameraMode = (cameraMode + 1) % CAMERAS.length;
    toast(`🎥 ${CAMERAS[cameraMode]}`, 1.2);
}

function toggleMute() {
    $('muteBtn').textContent = sound.toggleMute() ? '🔇' : '🔊';
}

function toggleMusic() {
    $('musicBtn').classList.toggle('off', !sound.toggleMusic());
}

function update(dt) {
    const p = player;
    const S = world.sampleAt(p.s);
    const { zone, index, loop } = world.zoneAt(p.s);
    const hw = zone.roadWidth / 2;
    const boosting = input.up && !input.down && p.stamina > 0;
    const offRoad = Math.abs(p.lat) > hw + 0.4;
    let target = cruiseSpeed(p.s) + (boosting ? BOOST : 0);
    if (input.down) target = 2;
    if (offRoad) target = Math.min(target, 5);
    const rate = p.speed < target ? 2.5 : input.down ? 7 : 3;
    p.speed += clamp(target - p.speed, -rate * dt, rate * dt);
    p.speed = clamp(p.speed - S.slope * 9.8 * 0.35 * dt, 0, TOP_SPEED + BOOST);
    if (offRoad && p.speed > 2) shake = Math.max(shake, 0.05);

    const steerInput = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    p.steer += (steerInput - p.steer) * Math.min(1, dt * 4);
    const grip = Math.min(1, p.speed / 2);
    p.lat += (p.steer * (1.2 + p.speed * 0.32) * grip - S.c * p.speed * p.speed * 0.55) * dt;
    p.lat = clamp(p.lat, -(hw + 9), hw + 9);

    const previous = p.s;
    p.s += p.speed * dt;
    p.pedal += p.speed * (boosting ? 1.6 : 1) * dt;
    p.stamina = clamp(p.stamina + (boosting ? -14 : 5) * dt, 0, 100);
    if (p.s >= p.milestone) {
        toast(`${p.milestone / MILESTONE} km · ${cruiseSpeed(p.s) < TOP_SPEED ? 'Speed up! 🚀' : 'Top speed! 🔥'}`);
        p.milestone += MILESTONE;
    }
    p.score += p.speed * dt;
    p.invuln = Math.max(0, p.invuln - dt);
    p.shield = Math.max(0, p.shield - dt);
    p.cooldown = Math.max(0, p.cooldown - dt);

    const aggression = 1 + loop * 0.35 + p.s / 6000 + (zone.name === 'Motijheel' ? 0.3 : 0);
    const crowd = Math.min(2.5, 1 + p.s / 4000);
    traffic.update(dt, p, game, aggression, crowd);
    world.update(p.s);

    if (index !== lastZone) {
        lastZone = index;
        $('zone').textContent = zone.name;
        banner(loop > 0 && index % ZONES.length === 0 ? `Loop ${loop + 1} · ${zone.name} · More Teslas ahead!` : `Entering ${zone.name}`);
    }
    for (const landmark of world.landmarksBetween(previous, p.s)) {
        p.score += 200;
        sound.chime();
        toast(`📍 ${landmark.name} +200`);
        showFact(landmark);
    }
    sound.setWind(p.speed);
    sound.ambient(!GREEN_AREAS.includes(zone.name), dt);
    clock += (dt * (SHIFT_END - SHIFT_START)) / SHIFT_SECONDS;
    if (clock >= SHIFT_END && p.lives > 0) {
        clock = SHIFT_END;
        gameOver('Shift over! 🗞️');
    }
}

function placeBike(dt) {
    const p = player;
    const S = world.sampleAt(p.s);
    world.pointAt(p.s, p.lat, bike.root.position);
    bike.root.rotation.set(Math.atan(S.slope), -S.h - p.steer * 0.25, -p.steer * 0.3 * Math.min(1, p.speed / 5), 'YXZ');
    for (const wheel of bike.wheels) wheel.rotation.x -= (p.speed * dt) / 0.36;
    bike.pedal(-p.pedal);
    bike.root.visible = p.invuln > 0 ? Math.floor(p.invuln * 10) % 2 === 0 : true;
    bike.shield.visible = p.shield > 0;
    bike.body.visible = cameraMode !== 1;
}

function updateCamera(dt) {
    const p = player;
    const S = world.sampleAt(p.s);
    const base = bike.root.position;
    const fx = Math.sin(S.h);
    const fz = -Math.cos(S.h);
    const rx = Math.cos(S.h);
    const rz = Math.sin(S.h);
    let k = 1 - Math.exp(-dt * 4);

    if (state === 'menu' || state === 'loading') {
        orbit += dt * 0.15;
        cameraTarget.set(base.x + Math.sin(orbit) * 9, base.y + 3.2, base.z + Math.cos(orbit) * 9);
        lookTarget.set(base.x, base.y + 1, base.z);
    } else if (cameraMode === 0) {
        cameraTarget.set(base.x - fx * 5.5, base.y + 2.4, base.z - fz * 5.5);
        lookTarget.set(base.x + fx * 8, base.y + 1, base.z + fz * 8);
    } else if (cameraMode === 1) {
        const yaw = S.h + p.steer * 0.25;
        const ffx = Math.sin(yaw);
        const ffz = -Math.cos(yaw);
        cameraTarget.set(base.x + ffx * 0.05, base.y + 1.62, base.z + ffz * 0.05);
        lookTarget.set(base.x + ffx * 12, base.y + 0.9 + S.slope * 12, base.z + ffz * 12);
        k = 1;
    } else {
        cameraTarget.set(base.x - fx * 15 + rx * 7, base.y + 9, base.z - fz * 15 + rz * 7);
        lookTarget.set(base.x + fx * 10, base.y, base.z + fz * 10);
    }
    camera.position.lerp(cameraTarget, k);
    lookSmooth.lerp(lookTarget, cameraMode === 1 ? 1 : k);
    if (shake > 0) {
        camera.position.x += (Math.random() - 0.5) * shake * 0.6;
        camera.position.y += (Math.random() - 0.5) * shake * 0.6;
        shake = Math.max(0, shake - dt);
    }
    camera.lookAt(lookSmooth);
}

function drawSpeedo(kmh) {
    const ctx = speedo;
    const size = ctx.canvas.width;
    const c = size / 2;
    const r = c - 10;
    const start = Math.PI * 0.75;
    const sweep = Math.PI * 1.5;
    const max = 80;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(12, 18, 28, 0.78)';
    ctx.beginPath();
    ctx.arc(c, c, r + 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.arc(c, c, r - 4, start, start + sweep);
    ctx.stroke();
    ctx.strokeStyle = kmh > 55 ? '#ff7a59' : '#4fd1a5';
    ctx.beginPath();
    ctx.arc(c, c, r - 4, start, start + sweep * Math.min(1, kmh / max));
    ctx.stroke();
    ctx.fillStyle = '#d8e2ee';
    ctx.font = `${Math.round(size * 0.075)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let v = 0; v <= max; v += 20) {
        const a = start + sweep * (v / max);
        ctx.fillText(String(v), c + Math.cos(a) * (r - 22), c + Math.sin(a) * (r - 22));
    }
    const a = start + sweep * Math.min(1, kmh / max);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(c, c);
    ctx.lineTo(c + Math.cos(a) * (r - 12), c + Math.sin(a) * (r - 12));
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(size * 0.17)}px sans-serif`;
    ctx.fillText(String(Math.round(kmh)), c, c + r * 0.45);
    ctx.font = `${Math.round(size * 0.07)}px sans-serif`;
    ctx.fillText('km/h', c, c + r * 0.72);
}

function drawMinimap() {
    const ctx = minimap;
    const size = ctx.canvas.width;
    const cx = size / 2;
    const cy = size * 0.72;
    const scale = 0.26;
    const me = world.sampleAt(player.s);
    const toScreen = (s, lat = 0) => {
        const P = world.sampleAt(s);
        const x = P.x + Math.cos(P.h) * lat - me.x;
        const z = P.z + Math.sin(P.h) * lat - me.z;
        const right = x * Math.cos(me.h) + z * Math.sin(me.h);
        const forward = x * Math.sin(me.h) - z * Math.cos(me.h);
        return [cx + right * scale, cy - forward * scale];
    };
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(12, 18, 28, 0.78)';
    ctx.fill();
    ctx.clip();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#c9d3df';
    ctx.lineWidth = 6;
    ctx.beginPath();
    for (let s = Math.max(0, player.s - 60); s <= player.s + 520; s += 8) {
        const [x, y] = toScreen(s);
        if (s <= Math.max(0, player.s - 60)) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
    const nextGate = Math.ceil((player.s + 1) / ZONE_LEN) * ZONE_LEN;
    if (nextGate < player.s + 520) {
        const [x, y] = toScreen(nextGate);
        ctx.fillStyle = '#4fd1a5';
        ctx.fillRect(x - 7, y - 2, 14, 4);
    }
    for (const e of traffic.list) {
        if (!e.t.tesla || e.s < player.s - 60) continue;
        const [x, y] = toScreen(e.s, e.lat);
        ctx.fillStyle = '#ff5a5a';
        ctx.beginPath();
        ctx.arc(x, y, 2.6, 0, Math.PI * 2);
        ctx.fill();
    }
    for (const sub of world.subscribers) {
        if (sub.delivered || sub.missed || sub.s < player.s - 10 || sub.s > player.s + 520) continue;
        const [x, y] = toScreen(sub.s, sub.lat);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffd24a';
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const landmark of world.landmarksBetween(player.s, player.s + 520)) {
        const [x, y] = toScreen(landmark.s, landmark.side * 8);
        ctx.fillStyle = '#ffd24a';
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillText('📍', x, y - 14);
    }
    const [px, py] = toScreen(player.s, player.lat);
    ctx.fillStyle = '#4fa3ff';
    ctx.beginPath();
    ctx.moveTo(px, py - 8);
    ctx.lineTo(px - 5.5, py + 5);
    ctx.lineTo(px + 5.5, py + 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function updateHud(dt) {
    $('score').textContent = Math.floor(player.score).toLocaleString();
    $('distance').textContent = `${(player.s / 1000).toFixed(2)} km`;
    $('clock').textContent = clockText(clock);
    $('delivered').textContent = player.delivered;
    $('combo').textContent = `×${player.combo}`;
    $('combo').classList.toggle('hot', player.combo > 1);
    $('stamina').style.width = `${player.stamina}%`;
    $('stamina').classList.toggle('low', player.stamina < 25);
    drawSpeedo(player.speed * 3.6);
    drawMinimap();
    for (const [key, id] of [['toast', 'toast'], ['banner', 'banner']]) {
        if (timers[key] > 0 && (timers[key] -= dt) <= 0) $(id).classList.remove('show');
    }
    if (timers.fact > 0 && (timers.fact -= dt) <= 0) $('fact').classList.add('hidden');
}

const frameTimer = new THREE.Clock();

function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(frameTimer.getDelta(), 0.05);
    if (state === 'play') {
        update(dt);
        updateHud(dt);
    }
    placeBike(state === 'play' ? dt : 0);
    updateCamera(dt);
    const { zone } = world.zoneAt(player.s);
    night = world.updateSky(clock / 24, bike.root.position, zone, dt);
    headlight.intensity = night * 30;
    renderer.render(scene, camera);
}

function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
}

const KEYS = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down' };

window.addEventListener('keydown', event => {
    if (KEYS[event.code]) {
        input[KEYS[event.code]] = true;
        event.preventDefault();
    }
    if (event.repeat) return;
    if (event.code === 'Space') {
        event.preventDefault();
        ringBell();
    }
    if (event.code === 'KeyQ') throwPaper(-1);
    if (event.code === 'KeyE') throwPaper(1);
    if (event.code === 'KeyC') switchCamera();
    if (event.code === 'KeyM') toggleMute();
    if (event.code === 'KeyN') toggleMusic();
    if (event.code === 'KeyP' || event.code === 'Escape') togglePause();
    if (event.code === 'Enter' && (state === 'menu' || state === 'over')) startRide();
});

window.addEventListener('keyup', event => {
    if (KEYS[event.code]) input[KEYS[event.code]] = false;
});

window.addEventListener('blur', () => {
    for (const key of Object.keys(input)) input[key] = false;
    if (state === 'play') togglePause();
});

for (const button of document.querySelectorAll('[data-input]')) {
    const key = button.dataset.input;
    const release = () => (input[key] = false);
    button.addEventListener('pointerdown', event => {
        event.preventDefault();
        input[key] = true;
    });
    button.addEventListener('pointerup', release);
    button.addEventListener('pointerleave', release);
    button.addEventListener('pointercancel', release);
}

for (const [id, action] of [['bellBtn', ringBell], ['throwLeftBtn', () => throwPaper(-1)], ['throwRightBtn', () => throwPaper(1)]]) {
    $(id).addEventListener('pointerdown', event => {
        event.preventDefault();
        action();
    });
}
$('startBtn').addEventListener('click', startRide);
$('againBtn').addEventListener('click', startRide);
$('resumeBtn').addEventListener('click', togglePause);
$('pauseBtn').addEventListener('click', togglePause);
$('camBtn').addEventListener('click', switchCamera);
$('muteBtn').addEventListener('click', toggleMute);
$('musicBtn').addEventListener('click', toggleMusic);
window.addEventListener('resize', resize);

resize();
world.reset();
frame();
loadModels(progress => ($('startBtn').textContent = `Loading ${Math.round(progress * 100)}%`)).then(() => {
    state = 'menu';
    $('menuBest').textContent = readBest().toLocaleString();
    $('startBtn').textContent = 'Start the shift';
    $('startBtn').disabled = false;
    setOverlay('menu');
});
