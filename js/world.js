import * as THREE from 'three';
import { build, material, glowMaterials } from './assets.js';

export const STEP = 2;
export const CHUNK = 100;
export const ZONE_LEN = 2000;
const AHEAD = 450;
const BEHIND = 120;
const GROUND = 150;
const LINE = 0xf2f2f2;
const WATER = 0x3d8fb8;
const BANK = 0x8a7a5a;
const FACING = new Set(['shop', 'teaStall', 'building', 'house', 'oldBuilding', 'lampPost']);
const NIGHT = new THREE.Color(0x0b1633);
const DUSK = new THREE.Color(0xf2955e);
const MOON = new THREE.Color(0x8fa8d8);
const WHITE = new THREE.Color(0xffffff);
const DUSK_LIGHT = new THREE.Color(0xffb27a);
const zoneSky = new THREE.Color();

export const smooth = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
};

export const rand = (a, b) => a + Math.random() * (b - a);

function shuffle(list) {
    for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
}

export function pick(weights) {
    const entries = Object.entries(weights);
    let r = Math.random() * entries.reduce((sum, [, w]) => sum + w, 0);
    for (const [key, w] of entries) {
        r -= w;
        if (r <= 0) return key;
    }
    return entries[0][0];
}

export const ZONES = [
    {
        name: 'Puran Dhaka', sky: 0xc4d3dc, grass: 0x8a8178, road: 0x5a5a5a, shoulder: 0xa59a8a, roadWidth: 5,
        centerLine: false, edgeLines: false, street: { builders: { oldBuilding: 5, shop: 2, teaStall: 1 }, every: 6.5, gap: 1.5 }, lampEvery: 35,
        curvy: 0.7, maxCurve: 0.02, hilly: 0.05, maxSlope: 0.015,
        scenery: { roundTree: 1 }, sceneryCount: 3,
        traffic: { rickshaw: 5, person: 3, tesla: 3, goat: 1, cow: 0.5, pothole: 2, van: 1 }, density: 1.6,
        landmarks: [
            { at: 0.32, side: -1, gap: 5, type: 'lalbaghFort', name: 'Lalbagh Fort', fact: 'Lalbagh Fort is a 17th-century Mughal fort in Old Dhaka that was never finished.' },
            { at: 0.72, side: 1, gap: 5, type: 'ahsanManzil', name: 'Ahsan Manzil', fact: 'Ahsan Manzil, the Pink Palace by the Buriganga, was the home of the Nawabs of Dhaka. Today it is a museum.' },
        ],
    },
    {
        name: 'Sadarghat', sky: 0xb7cfdc, grass: 0x8f8a7a, road: 0x606060, shoulder: 0xa99a80, roadWidth: 6.5,
        centerLine: true, edgeLines: true, river: true, street: { builders: { oldBuilding: 2, shop: 1 }, every: 8, gap: 2, sides: [-1] }, lampEvery: 40,
        curvy: 0.5, maxCurve: 0.012, hilly: 0.05, maxSlope: 0.015,
        scenery: { roundTree: 1 }, sceneryCount: 3,
        traffic: { van: 3, rickshaw: 3, tesla: 2, person: 2, puddle: 2, pothole: 1 }, density: 1.3,
        landmarks: [
            { at: 0.32, side: 1, gap: 4, type: 'launchGhat', name: 'Sadarghat Terminal', fact: 'Sadarghat on the Buriganga River is Dhaka\'s main river port, where big launches leave for the south.' },
            { at: 0.72, side: 1, gap: 4, type: 'fishingBoats', name: 'Buriganga Boats', fact: 'Small wooden boats ferry people across the Buriganga all day long.' },
        ],
    },
    {
        name: 'Shahbag', sky: 0xa9d2ef, grass: 0x6fae4f, road: 0x555555, shoulder: 0xb5b5b5, roadWidth: 7,
        centerLine: true, edgeLines: true, sidewalk: true, street: { builders: { building: 1, oldBuilding: 1, house: 1 }, every: 16, gap: 6 }, lampEvery: 35,
        curvy: 0.5, maxCurve: 0.015, hilly: 0.05, maxSlope: 0.015,
        scenery: { roundTree: 4, palm: 1, bush: 2 }, sceneryCount: 12,
        traffic: { rickshaw: 4, tesla: 3, person: 2, car: 1.5, bus: 1, pothole: 1 }, density: 1.4,
        landmarks: [
            { at: 0.32, side: -1, gap: 4, type: 'shaheedMinar', name: 'Shaheed Minar', fact: 'The Shaheed Minar honours those killed during the 1952 Language Movement.' },
            { at: 0.72, side: 1, gap: 4, type: 'park', name: 'Ramna Park', fact: 'Ramna Park is one of the oldest and greenest parks in central Dhaka.' },
        ],
    },
    {
        name: 'Dhanmondi', sky: 0xa3d0f0, grass: 0x6aa84a, road: 0x575757, shoulder: 0xb3b3b3, roadWidth: 6.5,
        centerLine: true, edgeLines: true, sidewalk: true, street: { builders: { house: 4, building: 1 }, every: 14, gap: 3 }, lampEvery: 40,
        curvy: 0.5, maxCurve: 0.015, hilly: 0.05, maxSlope: 0.015,
        scenery: { roundTree: 4, palm: 2, bush: 3 }, sceneryCount: 12,
        traffic: { car: 3, rickshaw: 3, tesla: 2, person: 1.5, pothole: 1 }, density: 1.2,
        landmarks: [
            { at: 0.32, side: 1, gap: 5, type: 'lake', name: 'Dhanmondi Lake', fact: 'Dhanmondi Lake is a long lake with walking paths, popular for morning walks.' },
            { at: 0.72, side: -1, gap: 5, type: 'amphitheatre', name: 'Rabindra Sarobar', fact: 'Rabindra Sarobar is an open-air stage by Dhanmondi Lake, named after the poet Rabindranath Tagore.' },
        ],
    },
    {
        name: 'Motijheel', sky: 0xbccfdc, grass: 0x8f8f8f, road: 0x4d4d4d, shoulder: 0xb0b0b0, roadWidth: 9,
        centerLine: true, edgeLines: true, sidewalk: true, street: { builders: { building: 1 }, every: 13, gap: 7 }, lampEvery: 30,
        curvy: 0.4, maxCurve: 0.018, hilly: 0.05, maxSlope: 0.015,
        scenery: { roundTree: 1 }, sceneryCount: 3,
        traffic: { bus: 4, tesla: 5, rickshaw: 3, car: 2, person: 2, pothole: 1.5 }, density: 1.8,
        landmarks: [
            { at: 0.32, side: -1, gap: 4, type: 'shapla', name: 'Shapla Chattar', fact: 'Shapla Chattar in Motijheel is a fountain shaped like a water lily (shapla), the national flower of Bangladesh.' },
            { at: 0.72, side: 1, gap: 5, type: 'kamalapur', name: 'Kamalapur Station', fact: 'Kamalapur Railway Station, Dhaka\'s main station, is known for its roof of umbrella-like concrete shells.' },
        ],
    },
    {
        name: 'Gulshan', sky: 0xb0d4ee, grass: 0x7c9c6a, road: 0x4a4a4a, shoulder: 0xb8b8b8, roadWidth: 10,
        centerLine: true, edgeLines: true, sidewalk: true, street: { builders: { building: 3, house: 1 }, every: 15, gap: 8 }, lampEvery: 30,
        curvy: 0.4, maxCurve: 0.015, hilly: 0.05, maxSlope: 0.015,
        scenery: { roundTree: 3, palm: 1 }, sceneryCount: 8,
        traffic: { car: 5, tesla: 3, rickshaw: 1.5, bus: 1, person: 1 }, density: 1.5,
        landmarks: [
            { at: 0.32, side: 1, gap: 4, type: 'hatirjheel', name: 'Hatirjheel', fact: 'Hatirjheel is a lake in the middle of Dhaka with curving bridges and a lakeside road.' },
            { at: 0.72, side: -1, gap: 6, type: 'parliament', name: 'National Parliament', fact: 'The National Parliament House (Jatiya Sangsad Bhaban) was designed by the American architect Louis Kahn.' },
        ],
    },
];

function point(S, lat, y) {
    return [S.x + Math.cos(S.h) * lat, S.y + y, S.z + Math.sin(S.h) * lat];
}

function faceRoad(h, lat) {
    return lat > 0 ? Math.atan2(Math.cos(h), Math.sin(h)) : Math.atan2(-Math.cos(h), -Math.sin(h));
}

class Strips {
    constructor(world, i0, i1) {
        this.world = world;
        this.i0 = i0;
        this.i1 = i1;
        this.data = new Map();
    }

    add(color, l0, l1, y, h = 0, a = this.i0, b = this.i1) {
        if (!this.data.has(color)) this.data.set(color, []);
        const out = this.data.get(color);
        const top = y + h;
        for (let i = a; i < b; i++) {
            const A = this.world.sample(i);
            const B = this.world.sample(i + 1);
            out.push(...point(A, l0, top), ...point(A, l1, top), ...point(B, l0, top), ...point(A, l1, top), ...point(B, l1, top), ...point(B, l0, top));
            if (h > 0) {
                for (const lat of [l0, l1]) {
                    out.push(...point(A, lat, y), ...point(A, lat, top), ...point(B, lat, y), ...point(A, lat, top), ...point(B, lat, top), ...point(B, lat, y));
                }
            }
        }
    }

    build() {
        const group = new THREE.Group();
        for (const [color, positions] of this.data) {
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geometry.computeVertexNormals();
            const mesh = new THREE.Mesh(geometry, material(color, { side: THREE.DoubleSide }));
            mesh.receiveShadow = true;
            mesh.userData.own = true;
            group.add(mesh);
        }
        return group;
    }
}

export class World {
    constructor(scene) {
        this.scene = scene;
        this.chunks = new Map();
        this.skyColor = new THREE.Color(ZONES[0].sky);
        scene.background = new THREE.Color();
        scene.fog = new THREE.Fog(0xffffff, 70, 340);
        this.hemi = new THREE.HemisphereLight(0xffffff, 0x4a5a3a, 1.2);
        this.sun = new THREE.DirectionalLight(0xffffff, 2.5);
        this.sun.castShadow = true;
        Object.assign(this.sun.shadow.camera, { left: -35, right: 35, top: 35, bottom: -35, near: 1, far: 220 });
        this.sun.shadow.mapSize.set(1024, 1024);
        this.sun.shadow.bias = -0.0005;
        this.groundColor = new THREE.Color(ZONES[0].grass);
        this.ground = new THREE.Mesh(new THREE.CircleGeometry(900, 32), new THREE.MeshLambertMaterial({ color: this.groundColor }));
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true;
        this.lowestY = 0;
        scene.add(this.hemi, this.sun, this.sun.target, this.ground);
    }

    reset() {
        this.subscribers = [];
        for (const ci of [...this.chunks.keys()]) this.removeChunk(ci);
        this.samples = [{ x: 0, y: 0, z: 0, h: 0, c: 0, slope: 0 }];
        this.first = 0;
        this.piece = null;
        this.queue = [];
        this.sequence = [];
        const start = this.zoneAt(0).zone;
        this.skyColor.setHex(start.sky);
        this.groundColor.setHex(start.grass);
        this.update(0, true);
    }

    get lastS() {
        return (this.first + this.samples.length - 1) * STEP;
    }

    zoneNumber(index) {
        while (this.sequence.length <= index) {
            const block = shuffle(ZONES.map((zone, i) => i));
            if (block[0] === this.sequence.at(-1)) [block[0], block[block.length - 1]] = [block[block.length - 1], block[0]];
            this.sequence.push(...block);
        }
        return this.sequence[index];
    }

    zoneAt(s) {
        const index = Math.max(0, Math.floor(s / ZONE_LEN));
        return { zone: ZONES[this.zoneNumber(index)], index, loop: Math.floor(index / ZONES.length) };
    }

    nextPiece() {
        const last = this.samples[this.samples.length - 1];
        const s = this.lastS;
        if (s < 160) return { steps: 80, curve: 0, slope: 0 };
        const { zone } = this.zoneAt(s + 1);
        let length = rand(60, 220);
        let curve = this.queue.shift() ?? 0;
        if (!curve && Math.random() < zone.curvy) {
            curve = (Math.random() < 0.5 ? -1 : 1) * rand(0.004, zone.maxCurve);
            if (Math.random() < 0.3) this.queue.push(-curve);
        }
        if (curve) {
            length = Math.min(length, 1.2 / (Math.abs(curve) * 0.75));
            if (Math.abs(last.h + curve * length * 0.75) > 1.3) curve = -curve;
            if (Math.abs(last.h + curve * length * 0.75) > 1.3) curve = 0;
        }
        let slope = Math.random() < zone.hilly ? rand(-1, 1) * zone.maxSlope : 0;
        if ((last.y > 30 && slope > 0) || (last.y < -8 && slope < 0)) slope = -slope;
        return { steps: Math.max(10, Math.round(length / STEP)), curve, slope };
    }

    appendSample() {
        if (!this.piece || this.piece.step >= this.piece.steps) {
            this.piece = this.nextPiece();
            this.piece.step = 0;
        }
        const piece = this.piece;
        const k = piece.step / piece.steps;
        piece.step++;
        const envelope = smooth(0, 0.25, k) * (1 - smooth(0.75, 1, k));
        const last = this.samples[this.samples.length - 1];
        const c = piece.curve * envelope;
        const slope = piece.slope * envelope;
        const h = last.h + c * STEP;
        this.samples.push({ x: last.x + Math.sin(h) * STEP, y: last.y + slope * STEP, z: last.z - Math.cos(h) * STEP, h, c, slope });
    }

    ensureTrack(s) {
        while (this.lastS < s) this.appendSample();
    }

    sample(i) {
        this.ensureTrack(i * STEP);
        return this.samples[Math.max(0, i - this.first)];
    }

    sampleAt(s) {
        const f = Math.max(0, s) / STEP;
        const i = Math.floor(f);
        const t = f - i;
        const a = this.sample(i);
        const b = this.sample(i + 1);
        return {
            x: a.x + (b.x - a.x) * t,
            y: a.y + (b.y - a.y) * t,
            z: a.z + (b.z - a.z) * t,
            h: a.h + (b.h - a.h) * t,
            c: a.c,
            slope: a.slope,
        };
    }

    pointAt(s, lat, out = new THREE.Vector3()) {
        const S = this.sampleAt(s);
        return out.set(S.x + Math.cos(S.h) * lat, S.y, S.z + Math.sin(S.h) * lat);
    }

    landmarksBetween(a, b) {
        const list = [];
        for (let index = Math.max(0, Math.floor(a / ZONE_LEN)); index <= Math.floor(b / ZONE_LEN); index++) {
            ZONES[this.zoneNumber(index)].landmarks.forEach((landmark, k) => {
                const s = (index + landmark.at) * ZONE_LEN;
                if (s >= a && s < b) list.push({ ...landmark, s, id: `${index}-${k}` });
            });
        }
        return list;
    }

    update(s, all = false) {
        const from = Math.max(0, Math.floor((s - BEHIND) / CHUNK));
        const to = Math.floor((s + AHEAD) / CHUNK);
        for (const ci of [...this.chunks.keys()]) {
            if (ci < from || ci > to) this.removeChunk(ci);
        }
        for (let ci = from; ci <= to; ci++) {
            if (this.chunks.has(ci)) continue;
            this.buildChunk(ci);
            if (!all) break;
        }
        this.lowestY = Infinity;
        for (let i = Math.floor(Math.max(0, s - BEHIND) / STEP); i <= (s + AHEAD) / STEP; i += 5) this.lowestY = Math.min(this.lowestY, this.sample(i).y);
        const keep = Math.floor((s - 200) / STEP);
        if (keep - this.first > 300) {
            this.samples.splice(0, keep - this.first);
            this.first = keep;
        }
    }

    removeChunk(ci) {
        const group = this.chunks.get(ci);
        group.traverse(child => {
            if (child.userData.own) child.geometry.dispose();
        });
        this.scene.remove(group);
        this.chunks.delete(ci);
        this.subscribers = this.subscribers.filter(sub => sub.ci !== ci);
    }

    buildChunk(ci) {
        const s0 = ci * CHUNK;
        const s1 = s0 + CHUNK;
        const i0 = s0 / STEP;
        const i1 = s1 / STEP;
        this.ensureTrack(s1 + STEP);
        const { zone } = this.zoneAt(s0 + 1);
        const hw = zone.roadWidth / 2;
        const edge = hw + (zone.sidewalk ? 2.5 : 1.6);
        const curb = zone.sidewalk ? 0.15 : 0;
        const strips = new Strips(this, i0, i1);
        strips.add(zone.road, -hw, hw, 0);
        strips.add(zone.shoulder, -edge, -hw, 0, curb);
        strips.add(zone.shoulder, hw, edge, 0, curb);
        strips.add(zone.grass, -edge - GROUND, -edge, -0.03);
        if (zone.river) {
            strips.add(zone.grass, edge, edge + 10, -0.03);
            strips.add(BANK, edge + 10, edge + 10.3, -0.7, 0.67);
            strips.add(WATER, edge + 10.3, edge + GROUND, -0.6);
        } else {
            strips.add(zone.grass, edge, edge + GROUND, -0.03);
        }
        if (zone.edgeLines) {
            strips.add(LINE, -hw + 0.15, -hw + 0.3, 0.01);
            strips.add(LINE, hw - 0.3, hw - 0.15, 0.01);
        }
        if (zone.centerLine) {
            for (let i = i0; i < i1; i += 4) strips.add(LINE, -0.07, 0.07, 0.01, 0, i, i + 2);
        }
        const group = strips.build();
        this.addScenery(group, zone, ci, s0, s1, hw, edge);
        this.scene.add(group);
        this.chunks.set(ci, group);
    }

    addSubscribers(group, ci, spots, edge) {
        const count = Math.min(spots.length, 1 + Math.floor(Math.random() * 4));
        for (const spot of shuffle(spots).slice(0, count)) {
            const lat = spot.side * (edge + 0.7);
            const S = this.sampleAt(spot.s);
            const marker = build('subscriberMarker');
            marker.position.set(S.x + Math.cos(S.h) * lat, S.y, S.z + Math.sin(S.h) * lat);
            group.add(marker);
            this.subscribers.push({ ci, s: spot.s, side: spot.side, lat, marker, delivered: false, missed: false });
        }
    }

    addScenery(group, zone, ci, s0, s1, hw, edge) {
        const landmarks = this.landmarksBetween(s0 - 45, s1 + 45);
        const nearLandmark = (s, side, range = 30) => landmarks.some(L => L.side === side && Math.abs(L.s - s) < range);
        const place = (name, s, lat, face, ...args) => {
            const object = build(name, ...args);
            const S = this.sampleAt(s);
            object.position.set(S.x + Math.cos(S.h) * lat, S.y, S.z + Math.sin(S.h) * lat);
            object.rotation.y = face ? faceRoad(S.h, lat) : Math.random() * Math.PI * 2;
            group.add(object);
            return object;
        };

        if (s0 > 0 && s0 % ZONE_LEN === 0) {
            const gate = place('gate', s0 + 2, 0, false, `Welcome to ${zone.name}`, edge * 2 + 1);
            const h = this.sampleAt(s0 + 2).h;
            gate.rotation.y = Math.atan2(Math.sin(h), -Math.cos(h));
        }
        const spots = [];
        for (const side of zone.street.sides ?? [-1, 1]) {
            for (let s = s0 + rand(0, 6); s < s1; s += zone.street.every * rand(0.85, 1.2)) {
                if (nearLandmark(s, side, 45)) continue;
                place(pick(zone.street.builders), s, side * (edge + zone.street.gap + rand(0, 1.5)), true);
                spots.push({ s, side });
            }
        }
        if (s0 > 0) this.addSubscribers(group, ci, spots, edge);
        if (zone.lampEvery) {
            for (let s = s0; s < s1; s += zone.lampEvery) {
                const side = Math.floor(s / zone.lampEvery) % 2 ? 1 : -1;
                place('lampPost', s, side * (hw + 0.8), true);
            }
        }
        const minLat = edge + zone.street.gap + 12;
        for (let n = 0; n < zone.sceneryCount; n++) {
            const s = rand(s0, s1);
            const side = Math.random() < 0.5 ? -1 : 1;
            if (nearLandmark(s, side)) continue;
            const name = zone.river && side > 0 ? 'palm' : pick(zone.scenery);
            const lat = zone.river && side > 0 ? rand(edge + 2, edge + 8) : rand(minLat, minLat + 35);
            place(name, s, side * lat, FACING.has(name));
        }
        if (zone.river) {
            for (let n = 0; n < 3; n++) {
                const s = rand(s0, s1);
                if (nearLandmark(s, 1)) continue;
                const boat = place('boat', s, rand(edge + 18, edge + 70), false);
                boat.position.y -= 0.6;
            }
        }
        for (const L of landmarks.filter(L => L.s >= s0 && L.s < s1)) place(L.type, L.s, L.side * (edge + L.gap), true, L.name);
    }

    updateSky(t, center, zone, dt) {
        const elevation = Math.sin((t - 0.25) * Math.PI * 2);
        const day = smooth(-0.12, 0.25, elevation);
        const dusk = Math.max(0, 1 - Math.abs(elevation) / 0.3) * smooth(-0.25, 0, elevation);
        this.skyColor.lerp(zoneSky.setHex(zone.sky), 1 - Math.exp(-dt * 0.8));
        this.groundColor.lerp(zoneSky.setHex(zone.grass), 1 - Math.exp(-dt * 0.8));
        this.ground.material.color.copy(this.groundColor);
        this.ground.position.set(center.x, this.lowestY - 0.8, center.z);
        const sky = this.scene.background.copy(NIGHT).lerp(this.skyColor, day).lerp(DUSK, dusk * 0.55);
        this.scene.fog.color.copy(sky);
        this.sun.intensity = 0.3 + 2.3 * day;
        this.sun.color.copy(MOON).lerp(WHITE, day).lerp(DUSK_LIGHT, dusk * 0.6);
        this.hemi.intensity = 0.35 + 0.95 * day;
        const angle = (t - 0.25) * Math.PI * 2;
        const x = elevation > 0 ? Math.cos(angle) : -0.4;
        const y = elevation > 0 ? Math.max(0.25, elevation) : 0.8;
        this.sun.position.set(center.x + x * 80, center.y + y * 80, center.z - 30);
        this.sun.target.position.copy(center);
        const night = 1 - day;
        for (const m of glowMaterials) m.emissiveIntensity = night * 1.6;
        return night;
    }
}
