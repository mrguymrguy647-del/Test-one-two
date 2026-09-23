# BlockCraft

A Minecraft-style block building game for Android phones. Explore a generated world of hills,
beaches, lakes and trees, then break and place blocks to build whatever you like.

- 3D voxel world (128 × 128 × 48 blocks) with grass, dirt, stone, sand, trees and water
- 11 building blocks: grass, dirt, stone, cobblestone, planks, oak log, bricks, glass, leaves, sand, water
- Touch controls made for phones, plus keyboard and mouse on a computer
- Walk, jump, swim, auto-jump up single blocks, and a creative-style **Fly** mode
- Your world saves automatically on the device
- Runs completely offline: the whole game is one self-contained file with its own WebGL engine and
  generated textures (no downloads, no libraries)

## Controls

| Phone | Action |
| --- | --- |
| Drag on the left side | Move (virtual joystick) |
| Drag on the right side | Look around |
| Tap | Place the selected block |
| Tap and hold | Break blocks |
| ⬆ button | Jump / swim up / fly up |
| ⬇ button (while flying) | Fly down |
| **Fly** button | Toggle flying |
| Hotbar | Pick a block |

On a computer: WASD to move, mouse to look (click to capture the mouse), left click to break,
right click to place, Space to jump, F to fly, Shift to fly down, 1–9 / 0 or the mouse wheel to pick
a block.

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

Open `web/index.html` in Chrome on your phone (host it anywhere, for example GitHub Pages), then use
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
web/index.html     The game (HTML + WebGL + JavaScript, single file)
android/           Android app that shows web/index.html full screen in a WebView
.github/workflows/ CI that builds the APK
```
