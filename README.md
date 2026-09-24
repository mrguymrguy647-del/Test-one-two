# BlockCraft: Stillness

A calm, slightly uncanny block-building game for Android phones (it also plays in a computer browser).
The world feels familiar and almost normal, until you start noticing small things that are wrong.

The whole game is one HTML file (`web/index.html`) built with Three.js. Every texture is painted in
code, so there are no image files.

## What's in the game so far (phase 1)

- Endless world, generated as you walk: meadows, hills, beaches, lakes and birch forests
- Break and place 8 kinds of blocks
- 10-minute day and night cycle with sun, moon, stars and matching light and fog
- Touch controls on phones; keyboard and mouse on a computer
- Debug menu (F3 button) to change the time of day, fly, and change view distance

## Coming next

1. **Weather:** clear, overcast, fog, rain, thunderstorms, snow, and "stillness"
2. **Music and sound:** gentle generated piano and pads that react to weather and time, synthesized
   rain, wind, thunder and footsteps
3. **The uncanny director:** a hidden unease that slowly grows and makes strange weather and music
   events happen more often
4. **Polish**

## Controls

| Phone | Action |
| --- | --- |
| Drag on the left side | Walk (push the stick all the way forward to run) |
| Drag on the right side | Look around |
| Tap | Place the selected block |
| Tap and hold | Break blocks |
| ⬆ button | Jump / swim up / fly up |
| ⬇ button (while flying) | Fly down |
| Hotbar | Pick a block |
| II button | Pause |
| F3 button | Debug menu |

On a computer: WASD to walk, mouse to look (click to capture the mouse), Space to jump, Shift to run,
left click to break, right click to place, 1–8 or the mouse wheel to pick a block, F3 for the debug menu.

## Getting it on your phone

Every push that changes the game runs the **Build Android APK** GitHub Actions workflow. When it
finishes, the APK is on this repository's **Releases** page under "BlockCraft APK (latest build)":

https://github.com/mrguymrguy647-del/Test-one-two/releases/download/apk-latest/BlockCraft.apk

Download it on your phone and open it to install (Android asks you to allow installs from your browser
or file manager the first time). The app is called **Stillness**.

Each build is signed with a new debug key, so uninstall the old app before installing a newer build.

## Building the APK yourself

Requires JDK 17 and the Android SDK (Android Studio installs both).

```sh
cd android
./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

## Project layout

```
web/index.html      The game (HTML + CSS + JavaScript, one file)
web/three.min.js    Three.js r128, bundled so the app works offline (the same file as on cdnjs)
android/            Android app that shows the game full screen in a WebView
.github/workflows/  CI that builds the APK
```

Inside `web/index.html` the code is split into sections: CONFIG, UTIL (noise), WORLD, SKY & TIME,
PLAYER, EVENTS, TOUCH CONTROLS, WEATHER, AUDIO, DIRECTOR, DEBUG and MAIN.
