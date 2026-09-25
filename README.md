# BlockCraft: Stillness

A calm, slightly uncanny block-building game for Android phones (it also plays in a computer browser).
The world feels familiar and almost normal, until you start noticing small things that are wrong.

The whole game is one HTML file (`web/index.html`) built with Three.js. Every texture is painted in
code, so there are no image files. The sounds are real recordings under free licenses (see CREDITS.md).

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

**Phase 3: sound and music**
- Real recorded sounds (not synthesized): rain, heavy rain, wind, thunder, footsteps for every block,
  digging and placing, birds, crickets, an owl, and water dripping in caves
- The sounds react to the world: indoors everything is muffled, mines echo, thunder comes from the
  direction the lightning struck and arrives later the farther away it was, and the wind picks up on
  high ground
- Music played live on a real grand piano (recorded samples). A slow composer writes each piece as you
  play, picking a mood from the time of day, the weather and where you are. Long silences in between
- Scary sounds: during stillness every sound of the world cuts out (except your own footsteps), frozen
  rain gets stuck like a scratched CD, slow rain drops in pitch, crickets go quiet one by one as the
  moon dies, birds sing at a false dawn and then stop mid-song, and the forbidden sun rings in your ears
- Music and sound can be switched off on the title screen. Sound credits: [CREDITS.md](CREDITS.md)

**Phase 4: animals**
- Cows, sheep, pigs and chickens live in herds that belong to the world: the same herds (and the same
  animals, each with its own look and character) are still there when you come back
- Every animal has a character: bold or timid, curious, lazy, sociable, jumpy. It gets hungry and tired,
  and picks what to do next with a weighted coin toss, so you can't predict it. They graze (chickens
  peck), wander, lie down, follow the herd's leader, come over to have a look at you or at a block you
  just placed, and now and then break into a mad dash for no reason. At night they sleep; in the rain
  they gather under a tree, or huddle with their backs to the wind. They swim to the shore if they fall in
- They notice things: come at them too fast (or run) and the timid ones bolt while the bold ones barely
  look up; break a block nearby and heads turn; thunder spooks them, a little less each time. When one
  panics the herd follows, one after another. Hit one and the herd stays wary of you for a while
- They look alive: they blink (and sleep with their eyes shut), flick their ears, swish their tails, and
  their legs keep pace with the ground. Spotted cows and a rare brown one; cream, grey and (rarely) black
  sheep; spotted pigs; brown hens; and no two exactly the same size
- Hold on an animal to hit it; it drops meat (and leather or feathers). Tap a sheep to shear it (the wool
  grows back the next day) and tap a cow for a bucket of milk (once a day). Chickens lay eggs
- Items pop out and fly into your **bag** (bag button on phones, E on a keyboard). Blocks stay unlimited
- Real animal sounds that come from the animal's direction. One that has lost its herd calls more, and
  sometimes another one answers
- The animals are not quite right. Sometimes they all stop and stare at you, turning one after another,
  and they don't blink. Some mornings a herd has one more than yesterday. At night something may follow
  you (a little closer every time you turn round), stand outside your window, or walk on its back legs
  far away. Some mornings a whole field is empty. When the world goes still, so do they
- Somewhere far from home, very rarely, there is a deer. It brings bad luck, and you can't kill it

## Coming next

5. **The uncanny director:** a hidden unease that slowly grows, and the surprise after the house's
   betrayal
6. **Polish**
7. **The black storm:** what happens if you ever kill the deer

## Controls

| Phone | Action |
| --- | --- |
| Drag on the left side | Walk (push the stick all the way forward to run) |
| Drag on the right side | Look around |
| Tap | Place the selected block, shear a sheep, milk a cow |
| Tap and hold | Break blocks, hit animals |
| ⬆ button | Jump / swim up / fly up |
| ⬇ button (while flying) | Fly down |
| Hotbar | Pick a block |
| II button | Pause |
| Bag button | Your bag (items from animals) |
| F3 button | Debug menu (weather, events, time of day, animals and their moods) |

On a computer: WASD to walk, mouse to look (click to capture the mouse), Space to jump, Shift to run,
left click to break or hit, right click to place (or shear/milk), E for the bag, 1–8 or the mouse wheel to pick a block, F3 for the debug menu.

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
web/sounds.js       All sounds in one file (generated from sounds/ by tools/pack_sounds.py)
sounds/             The sound recordings (.ogg); credits in CREDITS.md
android/            Android app that shows the game full screen in a WebView
.github/workflows/  CI that builds the APK
```

Inside `web/index.html` the code is split into sections: CONFIG, UTIL (noise), WORLD, SKY & TIME,
PLAYER, EVENTS, TOUCH CONTROLS, WEATHER, POST, AUDIO, ANIMALS, DIRECTOR, DEBUG, SAVE and MAIN.
