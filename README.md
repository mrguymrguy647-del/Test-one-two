# BlockCraft

A Minecraft-style block game for Android phones, with **Survival** and **Creative** modes, music and
sound effects. It runs completely offline: the whole game is plain HTML/JavaScript with its own WebGL
engine, and every texture, sound and song is generated in code (no downloads, no libraries).

## Features

**World**
- 160 × 160 × 64 block world with hills, snowy mountains, beaches, lakes, forests, flowers and tall grass
- Caves, with coal, iron and diamond ore underground
- Day and night cycle (12 minutes) with a moving sun and moon, stars and drifting clouds
- Real lighting: sunlight and shade, dark caves, and warm torch light

**Survival mode**
- Health, hunger and air (you can drown), plus fall damage
- Mine blocks at different speeds depending on the tool you hold; some ores need a better pickaxe
- Items drop on the ground and are picked up when you walk over them
- Crafting: planks, sticks, crafting table, torches, furnace, and pickaxes, axes, shovels and swords
  in wood, stone, iron and diamond (tools wear out)
- Smelting at a furnace: iron ingots, cooked porkchops, glass, stone and bricks
- Pigs to hunt for food, apples from leaves, and zombies that come out at night (they burn in the sun)

**The Homeless Villager**

A homeless villager lives near your starting point: red knit beanie with a pom-pom, big cold red nose,
scruffy beard, striped scarf, patched coat with odd buttons and a fish in his pocket, torn trousers, a
boot with his toe poking out, and a polka-dot bindle over his shoulder. His face changes too: happy
when you feed him, sad when he's hungry or scared, eyes closed when he sleeps. His health, hunger and trust show in a card in
the top corner, and a name tag with speech bubbles floats over his head.
- He gets hungry over time. When he's hungry he walks to food lying on the ground, forages berries
  near trees in the daytime, and begs you for food. With no food at all he slowly starves
- Tap him while holding food to feed him. Each meal builds his trust
- Once he trusts you (3 meals), tap him with empty hands to make him **follow you**; tap again to make
  him **stay**
- He finds his way around walls and up hills, runs from zombies (zombies go after him too), and at
  night he looks for a roof to sleep under: a tree, an overhang, or a house you build for him
- If he dies, a new homeless villager wanders in the next day. His state is saved with your world
- If you die you drop your items and respawn

**Creative mode**
- Every block and item, unlimited supplies, flying, and no damage

**Sound**
- A generative piano soundtrack that plays calm songs by day and darker ones at night and in caves
- Footsteps, digging and breaking sounds for each material, and sounds for placing blocks, eating,
  splashing, getting hurt, crafting and item pickups
- Mob sounds (oinking pigs and groaning zombies) that pan left and right with their position

**Other**
- Settings for music volume, sound volume, look speed, brightness and view distance
- Your world saves automatically

## BlockCraft: Stillness (in progress)

A new, calmer game built with Three.js. **The Android app now opens straight into Stillness** (the app is
called "Stillness"); the older BlockCraft stays in `web/` and still plays in a browser. It's being built in phases: the world and movement are done; weather, music and the uncanny
director come next. It uses the same phone controls as BlockCraft (and WASD/mouse on a computer), and
bundles Three.js so it works offline inside the app. The F3 button opens a debug menu.

## Controls

| Phone | Action |
| --- | --- |
| Drag on the left side | Move (push the stick all the way forward to sprint) |
| Drag on the right side | Look around |
| Tap | Place a block, eat food, hit a mob, or open a crafting table / furnace |
| Tap and hold | Mine the block you are looking at |
| ⬆ button | Jump / swim up (creative: double-tap to fly, hold to fly up) |
| ⬇ button (while flying) | Fly down |
| `•••` at the end of the hotbar | Inventory and crafting |
| II button | Pause and settings |

Computer: WASD to move, mouse to look (click to capture the mouse), left click to mine or attack,
right click to place or eat, Space to jump (double-tap in creative to fly), Ctrl to sprint, Shift to fly
down, E for inventory, Q to drop the held item, 1–9 or the mouse wheel to pick a hotbar slot.

### Getting started in survival

1. Hold on a tree trunk to collect logs.
2. Open the inventory and craft planks, then a crafting table and sticks.
3. Place the crafting table and stand near it to craft a wooden pickaxe.
4. Mine stone for cobblestone and upgrade to stone tools. Make a furnace and torches (from coal) before
   night falls.

## Getting it on your phone

### Option 1: install the APK

Every push that changes the game runs the **Build Android APK** GitHub Actions workflow. When it
finishes:

1. On your phone, open this repository's **Releases** page and find **BlockCraft APK (latest build)**
   (or download the `BlockCraft-apk` artifact from the workflow run).
2. Download `BlockCraft.apk` and open it. Android will ask you to allow installing apps from your
   browser or file manager the first time.

The APK is signed with a debug key that changes between CI builds, so to update to a newer build
you may need to uninstall the old one first (this also clears your saved world).

### Option 2: play in the browser

Host the `web/` folder anywhere (for example GitHub Pages) and open it in Chrome on your phone, then use
**Add to Home screen** to get an app icon.

## Building the APK yourself

Requires JDK 17 and the Android SDK (Android Studio installs both).

```sh
cd android
./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

Or open the `android` folder in Android Studio and press Run.

## Project layout

```
web/index.html      Page markup (menus, HUD)
web/css/style.css   Styles
web/js/util.js      Noise, random numbers, matrices
web/js/blocks.js    Blocks, items, recipes and the generated textures
web/js/world.js     World generation, lighting and chunk meshing
web/js/render.js    WebGL renderer (world, sky, clouds, mobs, items, hand)
web/js/audio.js     Synthesized sound effects and generative music
web/js/entities.js  Physics, mobs, dropped items and particles
web/js/villager.js  The homeless villager: needs, pathfinding, behaviour and his HUD
web/stillness/      BlockCraft: Stillness, the new uncanny weather game (in progress, uses Three.js)
web/js/game.js      Survival rules, inventory, crafting, controls, menus, saving, main loop
android/            Android app that shows the game full screen in a WebView
.github/workflows/  CI that builds the APK
```
