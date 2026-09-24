# BlockCraft: Stillness

A calm, slightly uncanny block-building game for Android phones (it also plays in a computer browser).
The world feels familiar and almost normal, until you start noticing small things that are wrong.

The whole game is one HTML file (`web/index.html`) built with Three.js. Every texture is painted in
code, so there are no image files.

## What's in the game so far

**Phase 1: the world**
- Endless world, generated as you walk: meadows, hills, beaches, lakes and birch forests
- Break and place 8 kinds of blocks
- 10-minute day and night cycle with sun, moon, stars and matching light and fog
- Touch controls on phones; keyboard and mouse on a computer
- Your world saves by itself (every 10 seconds and when you pause)

**Phase 2: the weather and the Sky Mind**
- Weather: clear, overcast, fog, rain, thunderstorms with lightning, and snow on high ground. Blocky clouds,
  rain that stops under roofs, swaying leaves and rain ripples on water
- The **Sky Mind**, a weather AI that works like bad luck. It watches where you are (outside, inside a
  house, down a mine) and turns the weather against you when you're vulnerable:
  - climb out of a mine after a while and mist has rolled in
  - wander far from home at night and storms follow you
  - get lost and fog gathers exactly in the direction of your house
- **The dying moon:** stay outside at night and the moon slowly loses its light until it's almost pitch
  black. Stars go out one by one
- **False dawn:** some nights the sky starts to turn orange... and then goes back to night
- **Fake safety:** houses feel safe. Storms calm at your door and the moon recovers while you're inside.
  The game is earning your trust. One day the house stops protecting you
- **The forbidden sun:** on rare mornings the sun rises censored. Don't look at it
- Rare strange moments: rain that slows down or freezes in the air, fog that thickens only where you
  look, a small cloud that stays exactly above you, and moments where the wind simply stops

## Coming next

3. **Music and sound:** gentle generated piano and pads that react to weather and time, synthesized
   rain, wind, thunder and footsteps
4. **The uncanny director:** a hidden unease that slowly grows and makes strange weather and music
   events happen more often
5. **Polish**

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
| F3 button | Debug menu (weather, events, time of day) |

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
PLAYER, EVENTS, TOUCH CONTROLS, WEATHER, POST, AUDIO, DIRECTOR, DEBUG, SAVE and MAIN.
