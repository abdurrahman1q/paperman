# Cycle Bangla: Morning Paper

A low-poly newspaper delivery game set in Dhaka. You ride a bicycle and deliver the made-up *Dhaka Morning Khobor* from 5:30 to 9:00 AM (about 5 real minutes). The goal is to deliver as many papers as you can. It runs in the browser with Three.js. There is no build step.

## How to play

| Key | Action |
|---|---|
| Q / E | Throw a paper left / right |
| ← → or A D | Steer |
| ↑ or W | Boost (uses stamina) |
| ↓ or S | Brake |
| Space | Ring the bell |
| C | Switch camera |
| P / M / N | Pause / Mute all / Music on or off |

- Subscribers are houses with a glowing 📰 marker, and they show as yellow dots on the minimap. Each 100 m of road has a random 1 to 4 of them.
- Papers are unlimited.
- A delivery scores 100 × combo, and the combo grows up to ×5. A missed subscriber or a throw at nobody resets the combo.
- The bike pedals itself and keeps getting faster. Crashes cost a heart, and 3 crashes end the shift early.
- The city has six areas in random order, each with two landmarks: Puran Dhaka, Sadarghat, Shahbag, Dhanmondi, Motijheel and Gulshan.

## Run

The game must be served over HTTP. Opening `index.html` directly from disk will not work.

```bash
php -S localhost:8000
# or
python -m http.server 8000
```

Then open http://localhost:8000.

## Files

| File | What it holds |
|---|---|
| `index.html` | HUD, menus, touch buttons and styles |
| `js/main.js` | Game loop, bike physics, throwing, combo, shift clock, cameras, HUD, minimap, speedometer |
| `js/world.js` | Endless road, Dhaka areas, buildings, subscribers, landmarks, morning light |
| `js/traffic.js` | Obstacles, Teslas, other traffic, the bell, collectibles, flying papers |
| `js/assets.js` | Built-in low-poly models, GLB loading, sounds and music |

## Included assets (all CC0)

| Folder | From | Used for |
|---|---|---|
| `assets/models/nature/` | [Nature Kit](https://kenney.nl/assets/nature-kit) | Palms, round trees, bushes |
| `assets/models/cars/` | [Car Kit](https://kenney.nl/assets/car-kit) | Cars and parked vans |
| `assets/models/city/` | [City Kit (Commercial)](https://kenney.nl/assets/city-kit-commercial) | Dhaka buildings (about a third stay built-in so their windows light up at night) |
| `assets/sounds/` | [Impact Sounds](https://kenney.nl/assets/impact-sounds), [RPG Audio](https://kenney.nl/assets/rpg-audio) | Crash, pothole bump, deliveries |
| `assets/music/` | OpenGameArt: [Electronic Indian tabla tune](https://opengameart.org/comment/51731), [Shine Blitz](https://opengameart.org/content/shine-blitz), [The Arplands](https://opengameart.org/content/the-arplands) | Background music, played in turn |

The Kenney model and sound folders include the original license files, and `assets/music/CREDITS.txt` lists the music sources. Everything else is built in code, including the Tesla, rickshaws, bus, animals, Dhaka houses and landmarks, the bell and the horn. No free CC0 models or sounds were found for those.

## Adding more models and sounds

You can replace any built-in model or sound with free CC0 assets:

- Models: [Kenney](https://kenney.nl/assets) (Nature Kit, Car Kit, City Kit) and [Quaternius](https://quaternius.com)
- Sounds: [Kenney audio packs](https://kenney.nl/assets/category:Audio) or [Freesound](https://freesound.org) filtered to CC0

1. Put the files in `assets/models/` (GLB) or `assets/sounds/` (mp3 or ogg).
2. Register them in `js/assets.js`:

```js
export const MODEL_FILES = {
    palm: { url: 'assets/models/palm.glb', height: 7 },
    bus: { url: 'assets/models/bus.glb', height: 3.2, rotY: Math.PI },
};

export const SOUND_FILES = {
    bell: 'assets/sounds/bell.ogg',
};
```

- The model key must match a builder name in `assets.js`, for example `palm`, `roundTree`, `bus`, `car`, `tesla`, `house` or `oldBuilding`.
- To add music, put the file in `assets/music/` and add its path to `MUSIC_FILES` in `assets.js`.
- `height` is the model's size in meters.
- Use `rotY` if the model faces the wrong way. Models should face −Z.
- Sound keys are `bell`, `horn`, `crash`, `splash`, `coin`, `pickup` and `chime`.
- If a file fails to load, the game falls back to the built-in shape or sound.
