import { build } from './assets.js';
import { pick, rand } from './world.js';

const TYPES = {
    cow: { len: 1.9, half: 0.45, wander: true, bellable: true },
    goat: { len: 1.0, half: 0.3, wander: true, bellable: true },
    person: { len: 0.6, half: 0.3, crossing: true, bellable: true },
    pothole: { len: 1.4, half: 0.7, slow: 'Pothole! 🕳️' },
    puddle: { len: 3.0, half: 1.2, slow: 'Splash! 💦' },
    van: { len: 4.4, half: 1.0, parked: true },
    rickshaw: { len: 2.7, half: 0.6, speed: [3, 4.5], dir: 1, bellable: true, builder: 'cycleRickshaw' },
    car: { len: 4.3, half: 0.95, speed: [8, 11] },
    bus: { len: 10, half: 1.3, speed: [6, 9] },
    tesla: { len: 2.8, half: 0.7, speed: [4.5, 7], dir: 1, tesla: true },
};

const HIT_MESSAGES = {
    cow: 'Moo! You hit a cow 🐄',
    goat: 'Baa! Watch out for goats 🐐',
    person: 'Sorry bhai! 🙏',
    van: 'Crashed into a parked van!',
    rickshaw: 'Bumped a rickshaw!',
    car: 'Car crash! 🚗',
    bus: 'Bus! Dhaka buses never stop 🚌',
    tesla: 'Hit by a Tesla! 🛺',
};

const FLIGHT = 0.45;

export class Traffic {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.list = [];
        this.items = [];
        this.papers = [];
        this.time = 0;
    }

    throwPaper(player, side, game) {
        const target = this.world.subscribers.find(sub => !sub.delivered && !sub.missed && sub.side === side && sub.s - player.s > -3 && sub.s - player.s < 12);
        if (target) target.delivered = true;
        const mesh = build('paper');
        this.scene.add(mesh);
        const from = this.world.pointAt(player.s, player.lat).setY(this.world.sampleAt(player.s).y + 1.2);
        const to = target ? this.world.pointAt(target.s, target.lat) : this.world.pointAt(player.s + player.speed * FLIGHT + 2, side * (Math.abs(player.lat) + 3.5));
        this.papers.push({ mesh, from, to, target, time: 0, spin: rand(8, 14) });
        if (!target) game.wastedThrow();
    }

    updatePapers(dt, player, game) {
        this.papers = this.papers.filter(paper => {
            paper.time += dt;
            const k = Math.min(1, paper.time / FLIGHT);
            paper.mesh.position.lerpVectors(paper.from, paper.to, k);
            paper.mesh.position.y += Math.sin(k * Math.PI) * 2.2;
            paper.mesh.rotation.y += paper.spin * dt;
            if (k < 1) return true;
            if (paper.target) {
                paper.target.marker.visible = false;
                game.delivered();
            }
            this.scene.remove(paper.mesh);
            return false;
        });
        for (const sub of this.world.subscribers) {
            sub.marker.userData.icon.rotation.y = this.time * 2.5;
            if (!sub.delivered && !sub.missed && sub.s - player.s < -8) {
                sub.missed = true;
                sub.marker.visible = false;
                game.missed();
            }
        }
    }

    reset() {
        for (const e of [...this.list, ...this.items, ...this.papers]) this.scene.remove(e.mesh);
        this.list = [];
        this.items = [];
        this.papers = [];
        this.nextSpawn = 90;
        this.nextItem = 250;
    }

    spawn(type, s, zone, loop) {
        const t = TYPES[type];
        const hw = zone.roadWidth / 2;
        const e = { type, t, s, hw, lat: 0, targetLat: 0, latSpeed: 1, speed: 0, cruise: 0, timer: rand(1, 3), brake: 0, mesh: build(t.builder ?? type) };
        if (t.wander) {
            e.lat = rand(-hw + 0.5, hw + 1.5);
            e.yaw = rand(0, Math.PI * 2);
        } else if (t.crossing) {
            const side = Math.random() < 0.5 ? -1 : 1;
            e.lat = side * (hw + 1.2);
            e.startLat = e.lat;
            e.targetLat = -side * (hw + 2.5);
        } else if (t.slow) {
            e.lat = rand(-hw + 0.8, hw - 0.8);
        } else if (t.parked) {
            e.lat = (Math.random() < 0.6 ? -1 : 1) * (hw - 0.9);
        } else {
            const dir = t.dir ?? (Math.random() < 0.7 ? -1 : 1);
            const wrongWay = t.tesla && loop > 0 && Math.random() < 0.15 + 0.05 * loop;
            e.dir = wrongWay ? -1 : dir;
            e.lat = e.dir > 0 || wrongWay ? -hw / 2 : hw / 2;
            if (type === 'rickshaw') e.lat = -hw + 0.7;
            e.cruise = rand(...t.speed) * e.dir;
            e.speed = e.cruise;
        }
        if (!t.crossing) e.targetLat = e.lat;
        e.homeLat = e.lat;
        this.scene.add(e.mesh);
        this.list.push(e);
    }

    spawnItems(s, zone) {
        const hw = zone.roadWidth / 2;
        this.addItem('fuchka', s, rand(-hw + 0.8, hw - 0.8));
    }

    addItem(kind, s, lat) {
        const mesh = build(kind);
        this.scene.add(mesh);
        this.items.push({ kind, s, lat, mesh, phase: rand(0, 6) });
    }

    update(dt, player, game, aggression, crowd) {
        this.time += dt;
        const ahead = player.s + 260;
        while (this.nextSpawn < ahead) {
            const { zone, loop } = this.world.zoneAt(this.nextSpawn);
            this.spawn(pick(zone.traffic), this.nextSpawn, zone, loop);
            this.nextSpawn += rand(22, 55) / (zone.density * crowd);
        }
        while (this.nextItem < ahead) {
            this.spawnItems(this.nextItem, this.world.zoneAt(this.nextItem).zone);
            this.nextItem += rand(300, 500);
        }
        this.list = this.list.filter(e => this.updateEntity(e, dt, player, game, aggression));
        this.items = this.items.filter(item => this.updateItem(item, player, game));
        this.updatePapers(dt, player, game);
    }

    updateEntity(e, dt, player, game, aggression) {
        const t = e.t;
        if (t.tesla) this.teslaBrain(e, dt, player, game, aggression);
        if (t.wander && !e.scared) {
            e.timer -= dt;
            if (e.timer < 0) {
                e.timer = rand(2, 5);
                e.targetLat = Math.min(e.hw + 2, Math.max(-e.hw + 0.3, e.lat + rand(-1.5, 1.5)));
            }
        }
        const latStep = (t.crossing ? 1.1 : e.latSpeed) * dt;
        e.lat += Math.max(-latStep, Math.min(latStep, e.targetLat - e.lat));
        e.s += e.speed * dt;

        const S = this.world.sampleAt(e.s);
        const cos = Math.cos(S.h);
        const sin = Math.sin(S.h);
        e.mesh.position.set(S.x + cos * e.lat, S.y, S.z + sin * e.lat);
        if (t.crossing) {
            e.mesh.rotation.y = -S.h + (e.targetLat > e.lat ? -Math.PI / 2 : Math.PI / 2);
        } else if (e.yaw !== undefined) {
            e.mesh.rotation.y = -S.h + e.yaw;
        } else {
            const swerve = Math.max(-0.4, Math.min(0.4, (e.targetLat - e.lat) * 0.2));
            e.mesh.rotation.y = -S.h + (e.speed < 0 || e.dir < 0 ? Math.PI : 0) - swerve * Math.sign(e.dir || 1);
        }
        if (t.crossing) e.mesh.position.y += Math.abs(Math.sin(this.time * 8)) * 0.05;

        const ds = e.s - player.s;
        if (!e.hitDone && Math.abs(ds) < t.len / 2 + 0.9 && Math.abs(e.lat - player.lat) < t.half + 0.35) {
            e.hitDone = true;
            if (t.slow) game.bump(t.slow);
            else game.hit(e, HIT_MESSAGES[e.type]);
        }
        if (t.tesla && !e.passed && ds < -(t.len / 2 + 1)) {
            e.passed = true;
            if (!e.hitDone && Math.abs(e.lat - player.lat) < 2.6) game.dodgedTesla();
        }
        if (ds < -40 || ds > 520) {
            this.scene.remove(e.mesh);
            return false;
        }
        return true;
    }

    teslaBrain(e, dt, player, game, aggression) {
        e.timer -= dt * aggression;
        const ds = e.s - player.s;
        if (e.timer <= 0) {
            e.timer = rand(1.2, 3.5);
            const r = Math.random();
            if (r < 0.45) {
                e.targetLat = rand(-e.hw + 0.7, e.hw - 0.7);
                if (Math.abs(ds) < 45) game.honk(ds);
            } else if (r < 0.7) {
                e.brake = rand(0.8, 2);
            } else if (r < 0.85) {
                e.targetLat = Math.max(-e.hw + 0.7, Math.min(e.hw - 0.7, -e.lat));
                if (Math.abs(ds) < 45) game.honk(ds);
            } else {
                e.targetLat = e.homeLat;
            }
        }
        e.latSpeed = 2.2 * aggression;
        const target = e.brake > 0 ? 0 : e.cruise;
        e.brake = Math.max(0, e.brake - dt);
        const change = (e.brake > 0 ? 12 : 3) * dt;
        e.speed += Math.max(-change, Math.min(change, target - e.speed));
    }

    updateItem(item, player, game) {
        const S = this.world.sampleAt(item.s);
        item.mesh.position.set(S.x + Math.cos(S.h) * item.lat, S.y + 1 + Math.sin(this.time * 3 + item.phase) * 0.15, S.z + Math.sin(S.h) * item.lat);
        item.mesh.rotation.y = this.time * 2 + item.phase;
        const ds = item.s - player.s;
        if (Math.abs(ds) < 1.1 && Math.abs(item.lat - player.lat) < 0.9) {
            game.collect(item.kind);
            this.scene.remove(item.mesh);
            return false;
        }
        if (ds < -10) {
            this.scene.remove(item.mesh);
            return false;
        }
        return true;
    }

    ringBell(player, game) {
        let teslaNear = false;
        for (const e of this.list) {
            const ds = e.s - player.s;
            if (ds < -3 || ds > 35) continue;
            if (e.t.tesla) teslaNear = true;
            if (!e.t.bellable) continue;
            if (e.t.wander) {
                e.scared = true;
                e.targetLat = (e.lat < 0 ? -1 : 1) * (e.hw + 2.5);
                e.latSpeed = 2.5;
            } else if (e.t.crossing) {
                e.targetLat = e.startLat;
            } else {
                e.targetLat = -e.hw + 0.45;
                e.latSpeed = 1.2;
            }
        }
        if (teslaNear) game.toast('The Tesla ignores your bell 😑');
    }
}
