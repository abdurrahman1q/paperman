import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const files = (folder, names) => names.map(name => `assets/models/${folder}/${name}.glb`);

export const MODEL_FILES = {
    palm: { url: files('nature', ['tree_palmTall', 'tree_palmDetailedTall', 'tree_palmBend', 'tree_palm']), height: 7, vary: true },
    roundTree: { url: files('nature', ['tree_default', 'tree_oak', 'tree_fat', 'tree_detailed']), height: 6, vary: true },
    bush: { url: files('nature', ['plant_bushLarge', 'plant_bush', 'plant_bushDetailed']), height: 1.2, vary: true },
    car: { url: files('cars', ['sedan', 'taxi', 'suv', 'hatchback-sports']), scale: 1.3, rotY: Math.PI },
    van: { url: files('cars', ['van', 'delivery']), scale: 1.35, rotY: Math.PI },
    building: {
        url: files('city', ['building-a', 'building-b', 'building-c', 'building-d', 'building-f', 'building-g', 'building-h', 'building-i', 'building-l', 'building-m', 'building-skyscraper-a', 'building-skyscraper-c', 'building-skyscraper-e']),
        scale: 9,
        rotY: Math.PI,
        builtIn: 0.35,
    },
};

export const MUSIC_FILES = ['assets/music/shine-blitz.ogg', 'assets/music/tabla.mp3', 'assets/music/the-arplands.ogg'];

export const SOUND_FILES = {
    crash: 'assets/sounds/crash.ogg',
    splash: 'assets/sounds/bump.ogg',
    coin: 'assets/sounds/coin.ogg',
};

export const glowMaterials = [];
const gltfModels = {};
const materials = {};
const geometries = {};
const labelTextures = {};

const rand = (a, b) => a + Math.random() * (b - a);
const any = list => list[Math.floor(Math.random() * list.length)];

export function material(color, options = {}) {
    const key = color + JSON.stringify(options);
    materials[key] ??= new THREE.MeshLambertMaterial({ color, flatShading: true, ...options });
    return materials[key];
}

export function glow(color) {
    const key = 'glow' + color;
    if (!materials[key]) {
        materials[key] = new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0 });
        glowMaterials.push(materials[key]);
    }
    return materials[key];
}

const cached = (key, create) => (geometries[key] ??= create());
const box = (w, h, d) => cached(`b${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d));
const cylinder = (top, bottom, h, seg = 8) => cached(`c${top}|${bottom}|${h}|${seg}`, () => new THREE.CylinderGeometry(top, bottom, h, seg));
const cone = (r, h, seg = 6) => cached(`k${r}|${h}|${seg}`, () => new THREE.ConeGeometry(r, h, seg));
const ball = (r, detail = 0) => cached(`s${r}|${detail}`, () => new THREE.IcosahedronGeometry(r, detail));
const torus = (r, t) => cached(`t${r}|${t}`, () => new THREE.TorusGeometry(r, t, 6, 16));

function mesh(geometry, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    const m = new THREE.Mesh(geometry, typeof color === 'number' ? material(color) : color);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz, 'YXZ');
    m.castShadow = true;
    return m;
}

function group(...children) {
    const g = new THREE.Group();
    if (children.length) g.add(...children);
    return g;
}

function at(object, x, y, z, ry = 0) {
    object.position.set(x, y, z);
    object.rotation.y = ry;
    return object;
}

export function label(text, w, h, bg = '#1f6f3f', fg = '#ffffff') {
    const key = `${text}|${w}|${h}|${bg}|${fg}`;
    if (!labelTextures[key]) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = Math.round(512 * h / w);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        let size = Math.floor(canvas.height * 0.62);
        ctx.font = `bold ${size}px sans-serif`;
        while (ctx.measureText(text).width > canvas.width * 0.9 && size > 10) {
            size -= 2;
            ctx.font = `bold ${size}px sans-serif`;
        }
        ctx.fillStyle = fg;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2 + size * 0.04);
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 4;
        labelTextures[key] = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
    }
    return new THREE.Mesh(cached(`p${w}|${h}`, () => new THREE.PlaneGeometry(w, h)), labelTextures[key]);
}

function signBoard(text) {
    const board = label(text, 3.6, 0.9, '#5a3d22', '#ffe9b0');
    board.position.set(0, 2.1, -0.07);
    board.rotation.y = Math.PI;
    return group(
        mesh(cylinder(0.07, 0.07, 2.6, 6), 0x5a3d22, -1.6, 1.3, 0),
        mesh(cylinder(0.07, 0.07, 2.6, 6), 0x5a3d22, 1.6, 1.3, 0),
        mesh(box(3.8, 1.05, 0.1), 0x3f2a17, 0, 2.1, 0),
        board,
    );
}

let buildingMaterials;

function windowCanvas(wall, lit) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = lit ? '#000000' : wall;
    ctx.fillRect(0, 0, 128, 256);
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 4; col++) {
            const on = Math.random() < 0.55;
            ctx.fillStyle = lit ? (on ? '#ffd890' : '#000000') : '#36475a';
            ctx.fillRect(10 + col * 30, 12 + row * 30, 18, 18);
        }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function getBuildingMaterials() {
    if (buildingMaterials) return buildingMaterials;
    const roof = material(0x7d7d7d);
    buildingMaterials = ['#e8dcc0', '#d9a6a0', '#bfd3c1', '#c9c9c9', '#e6c27a', '#a8c4e0'].map(wall => {
        const side = new THREE.MeshLambertMaterial({
            map: windowCanvas(wall, false),
            emissive: 0xffffff,
            emissiveMap: windowCanvas(wall, true),
            emissiveIntensity: 0,
        });
        glowMaterials.push(side);
        return [side, side, roof, roof, side, side];
    });
    return buildingMaterials;
}

function wheel(r, x, y, z, width = 0.12) {
    return mesh(cylinder(r, r, width, 10), 0x1a1a1a, x, y, z, 0, 0, Math.PI / 2);
}

function person(shirt = any([0xf28f3b, 0x2b6cb0, 0xe85d5d, 0xf2f2f2, 0x6cc070, 0xd97bd1])) {
    return group(
        mesh(cylinder(0.2, 0.26, 0.85, 7), any([0x2b4c7e, 0x3f6b3f, 0x7a3b3b, 0x555555]), 0, 0.42, 0),
        mesh(box(0.44, 0.55, 0.26), shirt, 0, 1.12, 0),
        mesh(box(0.1, 0.5, 0.1), 0x8d5524, -0.28, 1.1, 0),
        mesh(box(0.1, 0.5, 0.1), 0x8d5524, 0.28, 1.1, 0),
        mesh(ball(0.15, 1), 0x8d5524, 0, 1.55, 0),
    );
}

function artPanel() {
    const key = 'rickshaw-art';
    if (!labelTextures[key]) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#f2c14e';
        ctx.fillRect(0, 0, 128, 128);
        const colors = ['#e23d6e', '#2b6cb0', '#1f9d55', '#ffffff', '#e85d5d'];
        for (let i = 0; i < 14; i++) {
            ctx.fillStyle = colors[i % colors.length];
            ctx.beginPath();
            ctx.arc(rand(10, 118), rand(10, 118), rand(6, 16), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 6;
        ctx.strokeRect(3, 3, 122, 122);
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        labelTextures[key] = new THREE.MeshLambertMaterial({ map: texture });
    }
    return labelTextures[key];
}

const builders = {
    palm() {
        const g = group(
            mesh(cylinder(0.14, 0.22, 3.2, 6), 0x8b6b45, 0, 1.6, 0, 0, 0, 0.05),
            mesh(cylinder(0.12, 0.14, 3.2, 6), 0x8b6b45, 0.12, 4.7, 0, 0, 0, -0.08),
        );
        for (let i = 0; i < 7; i++) {
            const a = (i / 7) * Math.PI * 2;
            g.add(mesh(box(0.5, 0.05, 2.8), 0x3f9b3a, Math.sin(a) * 1.2, 6.0, Math.cos(a) * 1.2, 0.4, a, 0));
        }
        g.add(mesh(ball(0.16), 0x6b4f2a, 0.2, 5.9, 0.1), mesh(ball(0.16), 0x6b4f2a, -0.1, 5.85, -0.2));
        g.scale.setScalar(rand(0.8, 1.2));
        return g;
    },
    roundTree() {
        const leaf = any([0x3d8c40, 0x4c9f38, 0x2f7d32, 0x5aa83c]);
        const g = group(
            mesh(cylinder(0.22, 0.32, 2.6, 6), 0x7a5a3a, 0, 1.3, 0),
            mesh(ball(1.9, 1), leaf, 0, 3.9, 0),
            mesh(ball(1.3, 1), leaf, 0.9, 3.3, 0.5),
        );
        g.scale.setScalar(rand(0.8, 1.3));
        return g;
    },
    bush() {
        const g = group(mesh(ball(0.8), any([0x4a9a3a, 0x3f8a35, 0x5aa83c]), 0, 0.45, 0));
        g.scale.set(rand(0.8, 1.4), rand(0.6, 0.9), rand(0.8, 1.4));
        return g;
    },
    pond() {
        const g = group(mesh(cylinder(4, 4, 0.06, 14), 0x4a9cc0, 0, 0.03, 0));
        g.children[0].castShadow = false;
        g.scale.set(rand(1, 1.6), 1, rand(0.8, 1.2));
        return g;
    },
    shop() {
        const wall = any([0xe8dcc0, 0xd9c2a0, 0xbfd3c1, 0xe6c27a, 0xd9a6a0]);
        const accent = any([0xe85d5d, 0x2b6cb0, 0xf2c14e, 0x6cc070, 0xd97bd1, 0xf28f3b]);
        return group(
            mesh(box(4, 3.2, 3.5), wall, 0, 1.6, 0),
            mesh(box(4.3, 0.1, 1.6), accent, 0, 2.45, -2.3, -0.35),
            mesh(box(3.6, 0.9, 0.6), 0x8b5a2b, 0, 0.45, -2.1),
            mesh(box(0.5, 0.35, 0.4), any([0xf2a93b, 0xd62828, 0x6cc070]), -1, 1.07, -2.1),
            mesh(box(0.5, 0.35, 0.4), any([0xf2a93b, 0xd62828, 0x6cc070]), 0.6, 1.07, -2.1),
            mesh(box(3.6, 0.7, 0.1), accent, 0, 3.55, -1.8),
        );
    },
    teaStall() {
        return group(
            mesh(box(2.4, 2.1, 2), 0xb08850, 0, 1.05, 0),
            mesh(box(3, 0.08, 2.8), 0x2b6cb0, 0, 2.5, -0.4, -0.2),
            mesh(box(2.2, 0.9, 0.5), 0x8b5a2b, 0, 0.45, -1.2),
            mesh(cylinder(0.15, 0.2, 0.32, 8), 0x9a9a9a, -0.5, 1.06, -1.2),
            mesh(box(2, 0.12, 0.45), 0x6b4a2b, 0, 0.45, -2.3),
            mesh(box(0.1, 0.4, 0.1), 0x6b4a2b, -0.8, 0.2, -2.3),
            mesh(box(0.1, 0.4, 0.1), 0x6b4a2b, 0.8, 0.2, -2.3),
        );
    },
    building() {
        const w = any([7, 9, 11]);
        const h = any([8, 12, 16, 22]);
        const body = new THREE.Mesh(box(w, h, 8), any(getBuildingMaterials()));
        body.position.y = h / 2;
        body.castShadow = true;
        const g = group(body, mesh(box(w * 0.8, 1, 0.1), any([0xe85d5d, 0x2b6cb0, 0x1f9d55, 0xf2c14e]), 0, 3.2, -4.06));
        if (Math.random() < 0.5) g.add(mesh(cylinder(0.7, 0.7, 1.2, 8), 0x2a2a2a, w * 0.25, h + 0.6, 1));
        return g;
    },
    lampPost() {
        return group(
            mesh(cylinder(0.07, 0.1, 5.5, 6), 0x555555, 0, 2.75, 0),
            mesh(box(0.08, 0.08, 1.4), 0x555555, 0, 5.45, -0.7),
            mesh(ball(0.2), glow(0xffd27a), 0, 5.3, -1.35),
        );
    },
    boat() {
        const hood = mesh(cylinder(0.65, 0.65, 2, 8), 0x6b5a3a, 0, 0.55, 0.3, Math.PI / 2, 0, 0);
        hood.scale.set(1, 1, 0.8);
        return group(
            mesh(box(1.6, 0.6, 5.5), 0x8b5a2b, 0, 0.1, 0),
            mesh(cone(0.8, 1.2, 4), 0x8b5a2b, 0, 0.1, -3.2, -Math.PI / 2, Math.PI / 4, 0),
            hood,
        );
    },
    launch() {
        return group(
            mesh(box(5, 1.6, 24), 0xf2f2f2, 0, 0.4, 0),
            mesh(box(5.05, 0.35, 24.05), 0xc0392b, 0, 0.5, 0),
            mesh(box(4.6, 2, 18), 0xf2f2f2, 0, 2.2, 1),
            mesh(box(4.65, 0.6, 18.05), 0x2c7be5, 0, 2.4, 1),
            mesh(box(4, 1.8, 9), 0xf2f2f2, 0, 4.1, 2),
            mesh(cylinder(0.5, 0.5, 2, 8), 0xc0392b, 0, 5.8, 4),
        );
    },
    cow() {
        const g = group(
            mesh(box(0.75, 0.75, 1.7), any([0xf2efe6, 0x8b5a2b, 0xd9c8a9, 0x5a4030]), 0, 1.05, 0),
            mesh(box(0.35, 0.25, 0.4), 0xd9c8a9, 0, 1.5, -0.55),
            mesh(box(0.42, 0.42, 0.6), 0xd9c8a9, 0, 1.3, -1.05),
            mesh(cone(0.05, 0.25, 4), 0xeeeeee, -0.15, 1.62, -1.0),
            mesh(cone(0.05, 0.25, 4), 0xeeeeee, 0.15, 1.62, -1.0),
            mesh(cylinder(0.03, 0.03, 0.6, 4), 0x5a4030, 0, 0.9, 0.88),
        );
        for (const [x, z] of [[-0.25, -0.6], [0.25, -0.6], [-0.25, 0.6], [0.25, 0.6]]) g.add(mesh(box(0.15, 0.7, 0.15), 0x5a4030, x, 0.35, z));
        return g;
    },
    goat() {
        const fur = any([0x2a2a2a, 0xf2efe6, 0x8b5a2b]);
        const g = group(
            mesh(box(0.4, 0.4, 0.8), fur, 0, 0.6, 0),
            mesh(box(0.25, 0.28, 0.35), fur, 0, 0.88, -0.5),
            mesh(cone(0.03, 0.2, 4), 0x999999, -0.07, 1.08, -0.45, 0.4),
            mesh(cone(0.03, 0.2, 4), 0x999999, 0.07, 1.08, -0.45, 0.4),
        );
        for (const [x, z] of [[-0.13, -0.28], [0.13, -0.28], [-0.13, 0.28], [0.13, 0.28]]) g.add(mesh(box(0.08, 0.4, 0.08), fur, x, 0.2, z));
        return g;
    },
    person: () => person(),
    pothole() {
        const g = group(mesh(cylinder(0.65, 0.75, 0.03, 9), 0x262626, 0, 0.012, 0));
        g.children[0].castShadow = false;
        g.scale.set(1, 1, 1.2);
        return g;
    },
    puddle() {
        const g = group(mesh(cylinder(1.2, 1.2, 0.02, 12), material(0x5f84a3, { transparent: true, opacity: 0.85 }), 0, 0.015, 0));
        g.children[0].castShadow = false;
        g.scale.set(1, 1, 1.5);
        return g;
    },
    van() {
        const g = group(
            mesh(box(1.9, 0.4, 4.2), 0x333333, 0, 0.55, 0),
            mesh(box(1.8, 1.4, 1.5), any([0x2a7ab9, 0xc0392b, 0xe6e6e6]), 0, 1.4, -1.35),
            mesh(box(1.6, 0.6, 0.05), 0x223344, 0, 1.75, -2.11),
            mesh(box(1.9, 1.5, 2.6), 0x3d7a3d, 0, 1.5, 0.75),
        );
        for (const [x, z] of [[-0.9, -1.3], [0.9, -1.3], [-0.9, 1.3], [0.9, 1.3]]) g.add(wheel(0.36, x, 0.36, z, 0.25));
        return g;
    },
    bus() {
        const paint = any([0x1f7a3f, 0x2b5aa8, 0xc0392b, 0xe0a42b]);
        const g = group(
            mesh(box(2.5, 2.7, 10), paint, 0, 1.85, 0),
            mesh(box(2.54, 0.8, 8.4), 0x223344, 0, 2.4, 0.4),
            mesh(box(2.2, 1.0, 0.05), 0x223344, 0, 2.4, -5.02),
            mesh(box(2.54, 0.3, 10.02), any([0xf2f2f2, 0xf2c14e]), 0, 1.3, 0),
            mesh(ball(0.14), glow(0xfff2c0), -0.9, 1.0, -5.02),
            mesh(ball(0.14), glow(0xfff2c0), 0.9, 1.0, -5.02),
        );
        for (const [x, z] of [[-1.15, -3.3], [1.15, -3.3], [-1.15, 3.3], [1.15, 3.3]]) g.add(wheel(0.5, x, 0.5, z, 0.3));
        return g;
    },
    car() {
        const g = group(
            mesh(box(1.8, 0.7, 4.2), any([0xf2f2f2, 0x2a2a2a, 0xc0392b, 0x9aa5b1, 0x2b5aa8]), 0, 0.65, 0),
            mesh(box(1.6, 0.6, 2.2), 0x334455, 0, 1.28, 0.2),
            mesh(ball(0.12), glow(0xfff2c0), -0.65, 0.7, -2.11),
            mesh(ball(0.12), glow(0xfff2c0), 0.65, 0.7, -2.11),
        );
        for (const [x, z] of [[-0.85, -1.35], [0.85, -1.35], [-0.85, 1.35], [0.85, 1.35]]) g.add(wheel(0.33, x, 0.33, z, 0.2));
        return g;
    },
    cycleRickshaw() {
        const hood = any([0xe23d6e, 0xc0392b, 0x2b6cb0, 0x6c3fb0]);
        const g = group(
            mesh(box(0.08, 0.08, 1.9), 0x2a2a2a, 0, 0.6, -0.45),
            mesh(box(1.15, 0.25, 0.65), 0xc0392b, 0, 1.0, 0.45),
            mesh(box(1.2, 0.08, 1.0), hood, 0, 2.0, 0.45),
            mesh(box(0.06, 1.0, 0.06), 0x2a2a2a, -0.55, 1.5, 0.05),
            mesh(box(0.06, 1.0, 0.06), 0x2a2a2a, 0.55, 1.5, 0.05),
            new THREE.Mesh(box(1.15, 0.9, 0.06), artPanel()),
            wheel(0.33, -0.55, 0.33, 0.5, 0.06),
            wheel(0.33, 0.55, 0.33, 0.5, 0.06),
            wheel(0.33, 0, 0.33, -1.4, 0.06),
            at(person(), 0, 0.15, -0.9),
        );
        g.children[5].position.set(0, 1.4, 0.95);
        return g;
    },
    tesla() {
        const paint = any([0x1f9d55, 0x1f6fd0, 0x2aa198]);
        const plate = label('TESLA', 0.9, 0.28, '#ffffff', '#c0392b');
        plate.position.set(0, 0.85, 1.37);
        const g = group(
            mesh(box(1.25, 0.35, 2.7), paint, 0, 0.5, 0),
            mesh(box(1.27, 0.12, 2.72), 0xf2c14e, 0, 0.72, 0),
            mesh(box(0.95, 0.95, 0.5), paint, 0, 0.95, -1.3),
            mesh(box(1.1, 0.6, 0.04), 0x223344, 0, 1.6, -1.15),
            mesh(box(1.4, 0.08, 2.6), 0xf2c14e, 0, 2.05, 0),
            mesh(box(1.1, 0.15, 0.5), 0x8b2a2a, 0, 0.9, 0.2),
            mesh(box(1.1, 0.15, 0.5), 0x8b2a2a, 0, 0.9, 0.95),
            mesh(ball(0.1), glow(0xfff2c0), 0, 1.25, -1.57),
            wheel(0.28, 0, 0.28, -1.15, 0.14),
            wheel(0.28, -0.6, 0.28, 0.9, 0.14),
            wheel(0.28, 0.6, 0.28, 0.9, 0.14),
            at(person(0x2a2a2a), 0, 0.3, -0.6),
            plate,
        );
        for (const [x, z] of [[-0.62, -1.15], [0.62, -1.15], [-0.62, 1.15], [0.62, 1.15]]) g.add(mesh(cylinder(0.03, 0.03, 1.35, 4), 0x888888, x, 1.4, z));
        return g;
    },
    fuchka() {
        const shell = mesh(ball(0.3, 1), material(0xd9a35b, { emissive: 0x4a2a00 }), 0, 0, 0);
        shell.scale.set(1, 0.85, 1);
        return group(shell, mesh(torus(0.55, 0.03), material(0x7fe3ff, { emissive: 0x2a8fb0 }), 0, 0, 0, Math.PI / 2, 0, 0));
    },
    gate(text, width) {
        const sign = label(text, width, 0.9, '#1f6f3f', '#ffffff');
        sign.position.set(0, 5.6, -0.27);
        sign.rotation.y = Math.PI;
        return group(
            mesh(box(0.7, 5.6, 0.7), 0xc0392b, -width / 2, 2.8, 0),
            mesh(box(0.7, 5.6, 0.7), 0xc0392b, width / 2, 2.8, 0),
            mesh(box(width + 1.4, 1.2, 0.5), 0x1f6f3f, 0, 5.6, 0),
            sign,
        );
    },
    launchGhat(name) {
        const g = group(at(signBoard(name), 0, 0, -1.5), at(builders.launch(), 6, -0.9, 18, Math.PI / 2));
        for (let i = 0; i < 6; i++) g.add(mesh(box(8, 0.4, 1.2), 0xb5b0a5, 0, -0.1 - i * 0.12, 1 + i * 1.2));
        g.add(mesh(box(3, 0.3, 9), 0x8b5a2b, 0, -0.35, 11));
        return g;
    },
    fishingBoats(name) {
        const g = group(at(signBoard(name), 0, 0, -1.5));
        for (let i = 0; i < 5; i++) g.add(at(builders.boat(), rand(-12, 12), -0.75, rand(10, 30), rand(0, Math.PI)));
        return g;
    },
    shaheedMinar(name) {
        const white = 0xf5f5f5;
        const g = group(
            mesh(box(16, 0.6, 8), 0xdddddd, 0, 0.3, 1),
            mesh(box(16, 0.3, 1), 0xcccccc, 0, 0.15, -3.4),
            mesh(cylinder(2.6, 2.6, 0.2, 28), 0xc8102e, 0, 5.8, 3, Math.PI / 2, 0, 0),
            mesh(box(0.5, 8, 0.5), white, -1.3, 4.6, 1),
            mesh(box(0.5, 8, 0.5), white, 1.3, 4.6, 1),
            mesh(box(3.1, 0.45, 0.5), white, 0, 8.6, 1),
            mesh(box(3.1, 0.45, 2.2), white, 0, 8.9, 0.1, 0.5),
            at(signBoard(name), 0, 0, -5),
        );
        for (const side of [-1, 1]) {
            for (const [x, h] of [[3.4, 6.5], [4.4, 6.5], [5.8, 5], [6.8, 5]]) g.add(mesh(box(0.4, h, 0.4), white, side * x, 0.6 + h / 2, 1));
            g.add(mesh(box(1.4, 0.4, 0.4), white, side * 3.9, 7.1, 1));
            g.add(mesh(box(1.4, 0.4, 0.4), white, side * 6.3, 5.6, 1));
        }
        return g;
    },
    park(name) {
        const sign = label(name, 6, 0.7, '#1f6f3f', '#ffffff');
        sign.position.set(0, 4.2, -0.42);
        sign.rotation.y = Math.PI;
        const g = group(
            mesh(box(30, 0.04, 26), 0x5aa83c, 0, 0.02, 13),
            mesh(box(0.8, 4.5, 0.8), 0xb5651d, -3.5, 2.25, 0),
            mesh(box(0.8, 4.5, 0.8), 0xb5651d, 3.5, 2.25, 0),
            mesh(box(8.2, 0.8, 0.8), 0xb5651d, 0, 4.2, 0),
            sign,
            mesh(box(11, 1, 0.12), 0x2f5f2f, -9.5, 0.5, 0),
            mesh(box(11, 1, 0.12), 0x2f5f2f, 9.5, 0.5, 0),
            at(builders.pond(), 6, 0, 16),
            mesh(box(2, 0.12, 0.5), 0x6b4a2b, -5, 0.45, 6),
            mesh(box(2, 0.12, 0.5), 0x6b4a2b, 5, 0.45, 6),
        );
        for (const [x, z] of [[-10, 8], [-6, 18], [-12, 20], [10, 6], [0, 22], [12, 22]]) g.add(at(builders.roundTree(), x, 0, z));
        return g;
    },
    house() {
        const wall = any([0xf2ead8, 0xe8d3b0, 0xd8e4d0, 0xf0d0c0, 0xe0e0e8]);
        const floors = any([2, 3]);
        const g = group(
            mesh(box(3.6, 1.7, 0.25), 0xd8d0c0, -2.7, 0.85, 0),
            mesh(box(3.6, 1.7, 0.25), 0xd8d0c0, 2.7, 0.85, 0),
            mesh(box(1.8, 1.6, 0.08), any([0x2f4f6f, 0x5a3d22, 0x3d6b3d]), 0, 0.8, 0),
            mesh(box(0.25, 1.7, 7), 0xd8d0c0, -4.4, 0.85, 3.5),
            mesh(box(0.25, 1.7, 7), 0xd8d0c0, 4.4, 0.85, 3.5),
            mesh(box(7, floors * 3, 5.5), wall, 0, floors * 1.5, 4.5),
            mesh(box(7.3, 0.3, 5.8), 0xbdbdbd, 0, floors * 3 + 0.15, 4.5),
        );
        for (let f = 0; f < floors; f++) {
            g.add(mesh(box(1.2, 1.2, 0.1), 0x36475a, -2, f * 3 + 1.6, 1.7), mesh(box(1.2, 1.2, 0.1), 0x36475a, 2, f * 3 + 1.6, 1.7));
            if (f > 0) g.add(mesh(box(3, 0.15, 1), 0xcfcfcf, 0, f * 3, 1.2), mesh(box(3, 0.6, 0.06), 0x555555, 0, f * 3 + 0.35, 0.72));
        }
        g.add(at(builders.bush(), -3, 0, 1.2), at(builders.bush(), 3, 0, 1.2));
        return g;
    },
    oldBuilding() {
        const paint = any([0xe8a87c, 0xd9c060, 0x8fbcd4, 0xe07a7a, 0xb5d99c, 0xc9a0dc, 0xf2e0b0]);
        const floors = any([3, 3, 4, 5]);
        const w = any([4, 4.5, 5]);
        const g = group(
            mesh(box(w, floors * 2.8, 6), paint, 0, floors * 1.4, 3),
            mesh(box(w * 0.85, 2.2, 0.08), any([0x7a7a7a, 0x4a6a8a, 0x8a5a3a]), 0, 1.1, -0.02),
            mesh(box(w * 0.8, 0.6, 0.1), any([0xe85d5d, 0x2b6cb0, 0x1f9d55, 0xf2c14e]), 0, 2.5, -0.1),
        );
        for (let f = 1; f < floors; f++) {
            const y = f * 2.8;
            g.add(mesh(box(w * 0.7, 0.12, 0.8), 0xbfbfbf, 0, y, -0.4), mesh(box(w * 0.7, 0.5, 0.05), 0x3a3a3a, 0, y + 0.3, -0.78));
            g.add(mesh(box(0.9, 1.3, 0.08), 0x36475a, -w * 0.22, y + 1.2, -0.02), mesh(box(0.9, 1.3, 0.08), 0x36475a, w * 0.22, y + 1.2, -0.02));
        }
        if (Math.random() < 0.5) g.add(mesh(box(w * 0.6, 1.2, 0.1), any([0xf2f2f2, 0xe23d6e, 0x1f6fd0]), 0, floors * 2.8 + 0.6, 0.5));
        return g;
    },
    lalbaghFort(name) {
        const brick = 0xa0472e;
        const g = group(
            mesh(box(36, 0.05, 26), 0x5aa83c, 0, 0.03, 14),
            mesh(box(14, 4, 1.2), brick, -11, 2, 1),
            mesh(box(14, 4, 1.2), brick, 11, 2, 1),
            mesh(box(8, 9, 4), brick, 0, 4.5, 1.5),
            mesh(box(3, 5, 0.2), 0x3a1f15, 0, 2.5, -0.55),
            mesh(box(8, 5, 8), 0xe8e0d0, 0, 2.5, 16),
            mesh(ball(3, 1), 0xe8e0d0, 0, 6, 16),
            at(signBoard(name), -8, 0, -2),
        );
        for (const x of [-3.5, 3.5]) g.add(mesh(cylinder(0.6, 0.7, 11, 8), brick, x, 5.5, -0.5), mesh(ball(0.8, 1), 0xe8e0d0, x, 11.4, -0.5));
        for (const [x, z] of [[-4, 12], [4, 12], [-4, 20], [4, 20]]) g.add(mesh(cylinder(0.5, 0.5, 6, 8), 0xe8e0d0, x, 3, z), mesh(ball(0.7, 1), 0xe8e0d0, x, 6.4, z));
        return g;
    },
    ahsanManzil(name) {
        const pink = 0xe39aa6;
        const dome = mesh(ball(3, 2), pink, 0, 12.5, 6);
        dome.scale.set(1, 1.15, 1);
        const g = group(
            mesh(box(26, 0.05, 18), 0x5aa83c, 0, 0.03, 6),
            mesh(box(24, 9, 8), pink, 0, 4.5, 8),
            mesh(box(7, 9, 2.5), pink, 0, 4.5, 3),
            mesh(box(24.4, 0.4, 8.4), 0xf2f2f2, 0, 4.6, 8),
            mesh(cylinder(2.6, 2.6, 2.5, 12), pink, 0, 10.2, 6),
            dome,
            mesh(cylinder(0.1, 0.1, 1.4, 6), 0xf2c14e, 0, 16.4, 6),
            at(signBoard(name), -9, 0, -3),
        );
        for (let i = 0; i < 5; i++) g.add(mesh(box(9, 0.35, 1), 0xf2f2f2, 0, i * 0.35 + 0.17, 1.2 - i * 0.6 - 1.4));
        for (const x of [-10, -7, 7, 10]) g.add(mesh(box(1.2, 2.4, 0.1), 0x5a2a33, x, 2, 3.95), mesh(box(1.2, 2.4, 0.1), 0x5a2a33, x, 6.6, 3.95));
        for (const x of [-2.6, -0.9, 0.9, 2.6]) g.add(mesh(cylinder(0.25, 0.25, 8.5, 8), 0xf2f2f2, x, 4.3, 1.6));
        return g;
    },
    lake(name) {
        const water = mesh(cylinder(12, 12, 0.1, 24), material(0x4a90b8), 0, 0.03, 18);
        water.scale.set(2, 1, 1);
        water.castShadow = false;
        const g = group(
            mesh(box(50, 0.05, 30), 0x6aa84a, 0, 0.02, 16),
            water,
            mesh(box(44, 0.08, 1.6), 0xd8c8a0, 0, 0.05, 4.5),
            mesh(box(2, 0.12, 0.5), 0x6b4a2b, -6, 0.45, 3.3),
            mesh(box(2, 0.12, 0.5), 0x6b4a2b, 6, 0.45, 3.3),
            at(person(), -2, 0, 4.5, Math.PI / 2),
            at(person(), 9, 0, 4.5, -Math.PI / 2),
            at(signBoard(name), -14, 0, 1),
        );
        for (const x of [-20, -12, 14, 21]) g.add(at(builders.roundTree(), x, 0, 3));
        return g;
    },
    amphitheatre(name) {
        const g = group(
            mesh(box(30, 0.05, 24), 0x6aa84a, 0, 0.02, 12),
            mesh(box(8, 1, 4), 0xc9b79a, 0, 0.5, 4),
            mesh(box(8, 3, 0.3), 0x8b5a2b, 0, 2.5, 2.2),
            at(signBoard(name), -12, 0, -1),
        );
        for (let row = 0; row < 4; row++) {
            const r = 9 + row * 2.2;
            for (let a = -1.05; a <= 1.05; a += 0.35) g.add(mesh(box(2.8, 0.5 * (row + 1), 1.8), 0xbdb3a0, Math.sin(a) * r, 0.25 * (row + 1), 4 + Math.cos(a) * r, 0, a, 0));
        }
        return g;
    },
    shapla(name) {
        const g = group(
            mesh(cylinder(7, 7.5, 0.8, 24), 0xe8e8e8, 0, 0.4, 10),
            mesh(cylinder(6.5, 6.5, 0.1, 24), material(0x5fa8d3), 0, 0.85, 10),
            mesh(cylinder(0.6, 0.8, 4, 10), 0xe8e8e8, 0, 2.8, 10),
            mesh(ball(0.8, 1), 0xf2c14e, 0, 5.4, 10),
            at(signBoard(name), -9, 0, 1),
        );
        for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2;
            g.add(mesh(cone(0.9, 3.2, 4), i % 2 ? 0xf5f5f5 : 0xf2c6d0, Math.sin(a) * 1.3, 5.6, 10 + Math.cos(a) * 1.3, 0.6, a, 0));
        }
        return g;
    },
    kamalapur(name) {
        const g = group(
            mesh(box(44, 0.6, 14), 0xc9c9c9, 0, 0.3, 9),
            mesh(box(40, 3, 3.2), 0x2f6f3f, 0, 2.4, 18),
            mesh(box(40.2, 0.6, 3.3), 0xd8c050, 0, 3.2, 18),
            at(signBoard(name), -16, 0, 1),
        );
        for (let x = -16; x <= 16; x += 8) {
            const shell = mesh(cone(4.6, 1.6, 4), 0xe8e8e8, x, 7.6, 9, Math.PI, Math.PI / 4, 0);
            g.add(mesh(cylinder(0.4, 0.55, 7, 8), 0xe8e8e8, x, 3.8, 9), shell);
        }
        return g;
    },
    hatirjheel(name) {
        const g = group(
            mesh(box(56, 0.1, 34), material(0x4a90b8), 0, -0.2, 21),
            mesh(box(56, 0.05, 4), 0x7c9c6a, 0, 0.02, 2),
            at(signBoard(name), -20, 0, 1),
        );
        g.children[0].castShadow = false;
        for (let i = 0; i <= 14; i++) {
            const a = -1.2 + (i / 14) * 2.4;
            const x = Math.sin(a) * 18;
            const z = 22 - Math.cos(a) * 14;
            g.add(mesh(box(4.2, 0.5, 3.2), 0xd8d8d8, x, 2.4 + Math.cos(a) * 1.5, z, 0, -a, 0));
            if (i % 3 === 0) g.add(mesh(cylinder(0.3, 0.3, 3, 6), 0xbdbdbd, x, 1, z), mesh(ball(0.25), glow(0xffd27a), x, 4.4 + Math.cos(a) * 1.5, z));
        }
        return g;
    },
    parliament(name) {
        const concrete = 0xb8b2a6;
        const g = group(
            mesh(box(54, 0.1, 10), material(0x4a90b8), 0, -0.1, 8),
            mesh(box(56, 0.05, 30), 0x7c9c6a, 0, 0.02, 20),
            mesh(cylinder(10, 10, 15, 8), concrete, 0, 7.5, 26),
            at(signBoard(name), -18, 0, 1),
        );
        g.children[0].castShadow = false;
        for (const [x, z, h] of [[-13, 18, 12], [13, 18, 12], [-7, 15, 13], [7, 15, 13], [0, 14.5, 14]]) {
            g.add(mesh(box(6, h, 6), concrete, x, h / 2, z));
            g.add(mesh(cylinder(1.8, 1.8, 0.1, 16), 0x2a2a2a, x, h * 0.55, z - 3.05, Math.PI / 2, 0, 0));
            g.add(mesh(cone(1.6, 2.2, 3), 0x2a2a2a, x, h * 0.85, z - 3.05, Math.PI / 2, 0, 0));
        }
        return g;
    },
    paper() {
        return group(
            mesh(cylinder(0.09, 0.09, 0.5, 8), 0xf2f0e6, 0, 0, 0, 0, 0, Math.PI / 2),
            mesh(cylinder(0.095, 0.095, 0.08, 8), 0xc0392b, 0, 0, 0, 0, 0, Math.PI / 2),
        );
    },
    subscriberMarker() {
        const icon = builders.paper();
        icon.scale.setScalar(2.2);
        icon.position.y = 2.6;
        const g = group(
            mesh(torus(0.9, 0.07), material(0xffd24a, { emissive: 0x8a6a00 }), 0, 0.08, 0, Math.PI / 2, 0, 0),
            mesh(cylinder(0.03, 0.03, 2.2, 4), 0xffd24a, 0, 1.2, 0),
            mesh(ball(0.55, 1), material(0xffd24a, { emissive: 0x8a6a00, transparent: true, opacity: 0.35 }), 0, 2.6, 0),
            icon,
        );
        g.userData.icon = icon;
        return g;
    },
};

export function build(name, ...args) {
    const variants = gltfModels[name];
    if (!variants?.length || Math.random() < (MODEL_FILES[name].builtIn ?? 0)) return builders[name](...args);
    const { model, config } = any(variants);
    const object = model.clone(true);
    if (config.vary) object.scale.setScalar(rand(0.8, 1.25));
    return object;
}

export async function loadModels(onProgress) {
    const loader = new GLTFLoader();
    const files = Object.entries(MODEL_FILES).flatMap(([name, config]) => [config.url].flat().map(url => ({ name, url, config })));
    let done = 0;
    await Promise.all(files.map(async ({ name, url, config }) => {
        try {
            const gltf = await loader.loadAsync(url);
            (gltfModels[name] ??= []).push({ model: normalizeModel(gltf.scene, config), config });
        } catch {
            console.warn(`Model "${url}" could not be loaded, using the built-in shape for "${name}".`);
        }
        onProgress(++done / files.length);
    }));
}

function normalizeModel(object, { height = 1, scale, rotY = 0 }) {
    object.rotation.y = rotY;
    const size = new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
    object.scale.multiplyScalar(scale ?? height / (size.y || 1));
    const bounds = new THREE.Box3().setFromObject(object);
    const center = bounds.getCenter(new THREE.Vector3());
    object.position.set(-center.x, -bounds.min.y, -center.z);
    object.traverse(child => {
        if (!child.isMesh) return;
        child.castShadow = true;
        for (const m of [child.material].flat()) {
            m.metalness = 0;
            m.roughness = 1;
        }
    });
    return group(object);
}

export function makeBike() {
    const root = new THREE.Group();
    const frame = 0x1e5aa8;
    const makeWheel = z => {
        const g = group(
            mesh(torus(0.32, 0.04), 0x1a1a1a, 0, 0, 0, 0, Math.PI / 2, 0),
            mesh(box(0.02, 0.62, 0.02), 0xbbbbbb),
            mesh(box(0.02, 0.02, 0.62), 0xbbbbbb),
        );
        g.position.set(0, 0.36, z);
        return g;
    };
    const front = makeWheel(-0.55);
    const rear = makeWheel(0.55);
    const body = group(
        mesh(box(0.42, 0.55, 0.25), 0xf28f3b, 0, 1.3, 0.05, -0.35),
        mesh(ball(0.15, 1), 0x8d5524, 0, 1.72, -0.08),
        mesh(cylinder(0.16, 0.16, 0.08, 10), 0x1f6f3f, 0, 1.84, -0.08),
        mesh(box(0.08, 0.08, 0.55), 0x8d5524, -0.2, 1.25, -0.25, 0.45),
        mesh(box(0.08, 0.08, 0.55), 0x8d5524, 0.2, 1.25, -0.25, 0.45),
    );
    const legs = [mesh(box(0.11, 1, 0.11), 0x2b4c7e), mesh(box(0.11, 1, 0.11), 0x2b4c7e)];
    const shield = new THREE.Mesh(ball(1.3, 2), new THREE.MeshBasicMaterial({ color: 0x7fe3ff, transparent: true, opacity: 0.22, depthWrite: false }));
    shield.position.y = 1;
    shield.visible = false;
    root.add(
        front, rear, body, shield, ...legs,
        mesh(box(0.05, 0.05, 0.8), frame, 0, 0.85, 0),
        mesh(box(0.05, 0.05, 0.72), frame, 0, 0.62, -0.2, 0.72),
        mesh(box(0.05, 0.6, 0.05), frame, 0, 0.6, 0.15),
        mesh(box(0.05, 0.05, 0.55), frame, 0, 0.37, 0.3),
        mesh(box(0.04, 0.6, 0.04), frame, 0, 0.66, -0.5, -0.25),
        mesh(box(0.05, 0.25, 0.05), 0x555555, 0, 0.98, -0.45),
        mesh(box(0.62, 0.04, 0.04), 0x555555, 0, 1.08, -0.43),
        mesh(cylinder(0.04, 0.04, 0.03, 10), 0xdddddd, 0.2, 1.11, -0.43),
        mesh(box(0.16, 0.06, 0.26), 0x222222, 0, 0.93, 0.18),
        mesh(box(0.36, 0.22, 0.26), 0x9a6b3a, 0, 0.92, -0.66),
        mesh(box(0.3, 0.04, 0.42), 0x333333, 0, 0.8, 0.5),
        mesh(box(0.42, 0.26, 0.34), 0xf2f0e6, 0, 0.95, 0.5),
        mesh(box(0.44, 0.04, 0.36), 0xc0392b, 0, 0.98, 0.5),
        mesh(ball(0.06), glow(0xfff2c0), 0, 0.84, -0.8),
    );
    const hip = new THREE.Vector3();
    const foot = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const direction = new THREE.Vector3();
    const pedal = phase => {
        legs.forEach((leg, i) => {
            const a = phase + i * Math.PI;
            const side = i ? 0.1 : -0.1;
            hip.set(side, 1.0, 0.12);
            foot.set(side * 1.4, 0.38 + Math.sin(a) * 0.16, 0.02 + Math.cos(a) * 0.16);
            direction.subVectors(hip, foot);
            leg.scale.y = direction.length();
            leg.position.lerpVectors(hip, foot, 0.5);
            leg.quaternion.setFromUnitVectors(up, direction.normalize());
        });
    };
    pedal(0);
    return { root, wheels: [front, rear], body, shield, pedal };
}

export class Sound {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.buffers = {};
    }

    start() {
        if (this.ctx) {
            this.ctx.resume();
            return;
        }
        const Context = window.AudioContext || window.webkitAudioContext;
        if (!Context) return;
        this.ctx = new Context();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.7;
        this.master.connect(this.ctx.destination);
        const length = this.ctx.sampleRate * 2;
        this.noise = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
        const data = this.noise.getChannelData(0);
        for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
        const source = this.ctx.createBufferSource();
        source.buffer = this.noise;
        source.loop = true;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 500;
        this.wind = this.ctx.createGain();
        this.wind.gain.value = 0;
        source.connect(filter).connect(this.wind).connect(this.master);
        source.start();
        this.loadFiles();
    }

    async loadFiles() {
        for (const [name, url] of Object.entries(SOUND_FILES)) {
            try {
                const response = await fetch(url);
                this.buffers[name] = await this.ctx.decodeAudioData(await response.arrayBuffer());
            } catch {
                console.warn(`Sound "${name}" could not be loaded, using the built-in sound.`);
            }
        }
    }

    playFile(name, volume = 1) {
        const buffer = this.buffers[name];
        if (!buffer) return false;
        const source = this.ctx.createBufferSource();
        const gain = this.ctx.createGain();
        source.buffer = buffer;
        gain.gain.value = volume;
        source.connect(gain).connect(this.master);
        source.start();
        return true;
    }

    tone(frequency, duration, { type = 'sine', volume = 0.2, delay = 0, slide = null } = {}) {
        if (!this.ctx) return;
        const t = this.ctx.currentTime + delay;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, t);
        if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t + duration);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(volume, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
        osc.connect(gain).connect(this.master);
        osc.start(t);
        osc.stop(t + duration + 0.05);
    }

    noiseBurst(duration, { volume = 0.3, frequency = 1000, type = 'lowpass' } = {}) {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const source = this.ctx.createBufferSource();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();
        source.buffer = this.noise;
        filter.type = type;
        filter.frequency.value = frequency;
        gain.gain.setValueAtTime(volume, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
        source.connect(filter).connect(gain).connect(this.master);
        source.start(t, Math.random());
        source.stop(t + duration);
    }

    bell() {
        if (!this.ctx || this.playFile('bell')) return;
        for (const delay of [0, 0.16]) {
            this.tone(2400, 0.9, { volume: 0.16, delay });
            this.tone(3600, 0.6, { volume: 0.07, delay });
            this.tone(1200, 0.5, { type: 'triangle', volume: 0.05, delay });
        }
    }

    horn(volume = 0.2) {
        if (!this.ctx || this.playFile('horn', volume * 4)) return;
        for (const delay of [0, 0.18]) {
            this.tone(440, 0.13, { type: 'square', volume: volume * 0.5, delay });
            this.tone(554, 0.13, { type: 'square', volume: volume * 0.4, delay });
        }
    }

    crash() {
        if (!this.ctx || this.playFile('crash')) return;
        this.noiseBurst(0.45, { volume: 0.5, frequency: 900 });
        this.tone(110, 0.35, { type: 'triangle', volume: 0.4, slide: 45 });
    }

    splash() {
        if (!this.ctx || this.playFile('splash')) return;
        this.noiseBurst(0.35, { volume: 0.35, frequency: 1800, type: 'bandpass' });
    }

    coin() {
        if (!this.ctx || this.playFile('coin')) return;
        this.tone(988, 0.08, { type: 'square', volume: 0.07 });
        this.tone(1319, 0.25, { type: 'square', volume: 0.07, delay: 0.07 });
    }

    pickup() {
        if (!this.ctx || this.playFile('pickup')) return;
        this.tone(523, 0.12, { volume: 0.15 });
        this.tone(784, 0.2, { volume: 0.15, delay: 0.1 });
    }

    chime() {
        if (!this.ctx || this.playFile('chime')) return;
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.45, { type: 'triangle', volume: 0.12, delay: i * 0.1 }));
    }

    chirp() {
        const base = rand(2800, 4200);
        for (let i = 0; i < 3; i++) this.tone(base, 0.07, { volume: 0.035, delay: i * 0.11, slide: base * 1.3 });
    }

    setWind(speed) {
        if (!this.ctx) return;
        this.wind.gain.setTargetAtTime(Math.min(0.12, speed * 0.011), this.ctx.currentTime, 0.2);
    }

    ambient(city, dt) {
        if (!this.ctx) return;
        if (!city && Math.random() < dt * 0.5) this.chirp();
        if (city && Math.random() < dt * 0.6) this.horn(rand(0.02, 0.05));
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.master) this.master.gain.value = this.muted ? 0 : 0.7;
        this.updateMusic();
        return this.muted;
    }

    playMusic() {
        if (!this.music) {
            this.track = Math.floor(Math.random() * MUSIC_FILES.length);
            this.music = new Audio(MUSIC_FILES[this.track]);
            this.music.volume = 0.35;
            this.music.addEventListener('ended', () => this.nextTrack());
            this.musicOn = true;
        }
        this.updateMusic();
    }

    nextTrack() {
        this.track = (this.track + 1) % MUSIC_FILES.length;
        this.music.src = MUSIC_FILES[this.track];
        this.updateMusic();
    }

    toggleMusic() {
        this.musicOn = !this.musicOn;
        this.updateMusic();
        return this.musicOn;
    }

    updateMusic() {
        if (!this.music) return;
        if (this.musicOn && !this.muted) this.music.play().catch(() => {});
        else this.music.pause();
    }
}
