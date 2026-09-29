# Stainless Craft

*the fear of unknown*

A calm, slightly uncanny block-building game for Android phones (it also plays in a computer browser).
The world feels familiar and almost normal, until you start noticing small things that are wrong.

The whole game is one HTML file (`web/index.html`) built with Three.js. Every texture is painted in
code, so there are no image files. The sounds are real recordings under free licenses (see CREDITS.md).

## What's in the game so far

**Phase 1: the world**
- Endless world, generated as you walk: meadows, hills, beaches, lakes and birch forests
- Break and place 9 kinds of blocks
- 10-minute day and night cycle with sun, moon, stars and matching light and fog
- Touch controls on phones; keyboard and mouse on a computer

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
- Items pop out and fly into your **bag** (bag button on phones, E on a keyboard)
- Real animal sounds that come from the animal's direction. One that has lost its herd calls more, and
  sometimes another one answers
- The animals are not quite right. Sometimes they all stop and stare at you, turning one after another,
  and they don't blink. Some mornings a herd has one more than yesterday. At night something may follow
  you (a little closer every time you turn round), stand outside your window, or walk on its back legs
  far away. Some mornings a whole field is empty. When the world goes still, so do they
- Somewhere far from home, very rarely, there is a deer. It brings bad luck, and you can't kill it

**Phase 5: menus, game modes and worlds**
- A new main menu: **Play**, **Worlds**, **Settings** and **Credits**, with the world slowly turning behind
  it. A pause menu (Resume, Settings, Save & quit), and Android's back button pauses the game or steps
  back through the menus
- As many worlds as you like, each saved on its own. Make a world with a name, a game mode and a seed (the
  same seed always grows the same world). The world from earlier versions moves in as **My World**
- **Creative:** unlimited blocks, fly (the fly button, or Space twice on a keyboard), nothing can hurt you
- **Survival:** health, hunger and air. Blocks take time to mine (cracks show how far along you are) and
  go into your inventory; you can only place what you have. You get hurt by falling, drowning and
  starving; eat food from the hotbar (raw chicken is a gamble). A full stomach heals you. When you die,
  everything you carry falls where you stood and you come back at the world's spawn
- **Hardcore:** survival with one life, a little hungrier and a little unluckier. When you die, the world
  is deleted; only its name stays in the list, like a grave
- The forbidden sun now closes only the world you looked at it in
- **Settings:** music and sound volume, render distance, graphics (fast / normal / sharp), field of view,
  look speed, left-handed controls, an FPS counter and the debug button

**Phase 5.1: inventory, crafting and the furnace**
- A real inventory: 27 slots plus the 9-slot hotbar, stacks of 64. Tap a slot to pick things up or put
  them down; hold to split a stack or put down just one (right-click on a computer). Tap outside the
  window to throw what you're holding
- Crafting: a 2×2 grid in your inventory and a 3×3 grid at the **crafting table**. The **Recipes** list
  shows every recipe and fills the grid for you when you tap one
- Recipes: planks, sticks, crafting table, furnace, and wooden and stone pickaxes, axes, shovels and swords
- Tools mine much faster (the right tool for the block: pickaxe for stone, axe for wood, shovel for dirt,
  sand and gravel). Stone and furnaces drop nothing without a pickaxe. Swords hit harder. Tools wear out
  and break
- The **furnace** smelts sand into glass and cooks meat (cooked meat fills much more hunger), burning logs,
  planks or sticks. It keeps going while you do other things, glows and crackles
- Sheep drop wool blocks you can build with. Eat by picking food in the hotbar and tapping
- Creative: every block and item in a palette
- Menu buttons click; **Auto jump** can be switched off in Settings

**Phase 5.2: a new texture pack**
- Every block was repainted at twice the detail (32 pixels instead of 16), in clustered pixel art instead
  of random noise: grass with blades and tufts, soil with pebbles and roots, slate with cracks and layers,
  sand with ripples, birch bark with dark scars, dense leaves you can see through in places, planks with
  grain and nails, glass, rounded gravel stones, woven wool, a crafting table with a saw and a hammer, and
  a stone furnace
- No two blocks look quite alike: each one is turned or mirrored differently and is a touch lighter or
  darker, so the ground no longer looks tiled
- Grass and leaves change colour slowly across the land, from cool and lush to dry and golden
- Water moves: light and dark bands drift across it, it is bluer and darker where it is deep, and the sun
  (or, at night, the moon) glitters on the waves. When the world goes still, the water stops too
- Far-away land blends smoothly instead of shimmering
- The moon is now a real moon with dark seas and craters, and it goes through its phases (a full moon the
  first night, then waning to a nearly dark new moon and back). Clouds have shaded undersides
- Everything is still painted in code: no image files

**Phase 5.3: you (the player)**
- **A skin and a body.** You have a face, hair, a jacket with a scarf and a belt, trousers and boots. Four
  skins to choose from in Settings (Traveler, Ranger, Night owl, Ember), with a live preview
- **Three views.** The camera button (or F5 / V) goes first person, behind you, and in front of you. Aiming,
  mining and hitting animals work the same in every view
- **Animations:** standing (breathing, blinking), walking, running (leaning forward), jumping (arms up),
  falling (arms out, flailing harder from a great height), swimming, swinging your arm when you hit or
  place something, flinching red when you are hurt, and falling over when you die (the camera pulls back
  to watch). Your arm and what you are holding are visible in first person
- **Beds and sleeping.** A bed (3 wool + 3 planks at the crafting table) is two blocks long. Tap it at night
  to lie down: you close your eyes, the screen fades, and it is morning (you heal a little and get a bit
  hungry). Tap or move to wake up early. It is also where you come back after you die
- **New hearts, hunger and air icons**, outlined and shaded. Hearts flash white when you are hit, and wave
  while you heal
- **Hunger is much slower.** A full bar lasts about 50 minutes of walking (it used to be 12), running is
  about four times cheaper than before, and healing costs less
- **A rebuilt inventory.** Put a finger on an item and drag it to its place: the item lifts off and follows
  your finger, the slot under it lights up, and it lands with a little pop. Drop it on another item to
  swap or merge stacks, drop it on nothing to send it back, drop it outside the window to throw it away.
  Items are in your hand the moment you press, like a mouse. The ½ button takes half of the next stack; put a second finger on a slot to put down one. Point at an item
  to see its name, uses left or food value. Your character stands in the inventory (turn them with a
  finger). Tap-tap still works too

**7.4:** dragging now works like a mouse (press and the item is in your hand, no waiting), and the first-person hand was reworked: it lags behind when you turn, dips when you change items, sways when you walk and swings in an arc.

**7.5:** you can climb out of water onto a bank (swim into it and you hop up). Breaking things is alive: grass sprays blades and clumps, dirt crumbles, sand sprays grains and a dust cloud, gravel stones bounce, stone chips and sparks, logs splinter, leaves drift down, glass shatters and glitters, wool floats as fluff, planks splinter, furnaces spit embers. Digging throws crumbs off the face you work on, and placing a block puffs dust.

**7.6:** the breaking animation is back in full: as you mine, black cracks spread out from the middle of the block in ten steps, the block darkens and the cracks widen until it breaks.

**Phase 6 (8.0): updates that keep your worlds**
- Every build is now signed with the same key (`android/app/stainless.keystore`), so a new APK installs
  *over* the old one and keeps your worlds and settings. Builds before 8.0 used a different key each time,
  so **uninstall once, then install 8.0**. After that you never need to uninstall again
- **Export / Import worlds.** On the Worlds screen, *Export* saves a world to a file (you pick where) and
  *Import* brings a file back, as a new world. Good for moving phones or keeping a backup
- **Update notice.** On the main menu, when you are online, the game checks for a newer version and shows
  "Version x.y is ready · tap to download"

**8.1: the caves**
- **Real caves.** Winding tunnels begin as openings in the ground and lead down to a chamber. They are dark:
  the deeper you go, the closer the black fog, with only a small glow around you
- **The deeper, the harder to leave.** You move slower and can no longer sprint, you get hungry faster, and
  now and then the way back closes behind you (survival), a tunnel you were sure was open turns to stone
- **You start to see and hear things:** footsteps behind you, someone mining far away, a whisper, drips, a
  dark figure standing in the tunnel with white eyes that is gone when you look at it or come close, a doorway
  of daylight (with birdsong) that fades as you get near, and waves of distortion
- **A false exit.** Some tunnels end in a doorway of light that looks like a way out. It is not: it takes you
  to a **false world**, an endless dusk with an abandoned village and a ruined castle, no animals, dead trees.
  The exit is used up afterwards
- **The stillness door.** The only way home is to build one there: a frame of stone **four wide and five
  tall**, with **glass** filling the inside (two by three). When the last block goes in, everything falls
  silent and the frame turns to a door with no sound. Walk through it and you are back where you left, and
  the door is gone. Some stone and glass is left for you by the well. Close the game inside and you wake up
  in there

**8.2: the deep**
- **A deeper sea.** Oceans now fall away much further, with long trenches. Under the surface you swim the way
  you look (look down and swim to dive; the ⬇ button sinks you), a **depth** meter shows how far down you are,
  and the water goes from blue-green to black. Everything sounds muffled
- **The seabed remembers.** Shipwrecks (a broken mast, holes in the hull), a drowned temple with columns
  and an altar, and the bones of something huge with a skull you can swim into. Each holds a **chest**
- **Life:** schools of fish (hit one to catch it; raw fish can be cooked), and glowing jellyfish in the deep
- **Fear:** a drowned figure that stands on the seabed and creeps closer when you look away, an anglerfish that
  hunts you in the dark (it bites, then flees), and two enormous eyes far below that open and close.
  Chests wake something when you open them
- **Cursed treasure.** Gold coins, gold bars and drowned idols are cursed: the more you carry, the slower and
  hungrier you get and the more you hear and see things. Golden tools (from gold bars) are fast but cursed too.
  The way to lift it: throw the gold back into the sea. Pearls are safe, and while you carry one your breath lasts
  twice as long
- **Journals** tell what happened to the kingdom of Vael. Hold one and tap to read

## Coming next

6. **Polish**, and updates that keep your worlds (install a new version over the old one) with an update
   notice in the game
7. **The black storm:** what happens if you ever kill the deer
- Later: **the uncanny director**, a hidden unease that slowly grows, and the surprise after the house's
  betrayal

## Controls

| Phone | Action |
| --- | --- |
| Drag on the left side | Walk (push the stick all the way forward to run) |
| Drag on the right side | Look around |
| Tap | Place the selected block, eat, open a crafting table or furnace, shear a sheep, milk a cow |
| Tap and hold | Mine blocks, hit animals |
| ⬆ button | Jump / swim up / fly up |
| Fly button (creative) | Fly on and off |
| ⬇ button (while flying) | Fly down |
| Hotbar | Pick a block (in survival it shows how many you have) |
| II button or Back | Pause |
| Bag button | Inventory and crafting |
| Person button | Change the view (first person, behind you, in front of you) |
| F3 button | Debug menu (weather, events, time of day, animals and their moods) |

On a computer: WASD to walk, mouse to look (click to capture the mouse), Space to jump, Shift to run,
left click to mine or hit, right click to place, eat or use (tables, furnaces, sheep, cows), E for the inventory, F5 or V for the camera view, 1–9 or the mouse wheel to pick a block, Space twice to fly (creative), Esc to pause, F3 for the debug menu.

## Getting it on your phone

Every push that changes the game runs the **Build Android APK** GitHub Actions workflow. When it
finishes, the APK is on this repository's **Releases** page under "Stainless Craft APK (latest build)":

https://github.com/mrguymrguy647-del/Test-one-two/releases/download/apk-latest/StainlessCraft.apk

(The old link, `.../apk-latest/BlockCraft.apk`, still gives you the same file.)

Download it on your phone and open it to install (Android asks you to allow installs from your browser
or file manager the first time). The app is called **Stainless Craft**.

Each build is signed with a new debug key, so uninstall the old app before installing a newer build.
**Uninstalling deletes your worlds** (fixing this is planned for Phase 6).

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
SETTINGS, PLAYER, EVENTS, TOUCH CONTROLS, WEATHER, POST, AUDIO, INVENTORY, ANIMALS, SURVIVAL, DIRECTOR,
DEBUG, SAVE (the world list and each world's save) and MAIN (menus and the game loop).

## 8.3 – Bug fixes
- Forbidden-sun stare effects now only build when the forbidden sun is truly visible (not behind clouds, mist, leaves, water, underground, in the fake world, asleep).
- Controls: joystick dead zone + response curve, sprint latches when pushed fully forward, better air control, short jump grace after leaving a ledge, steadier hold-to-mine and look-drag thresholds.

## 8.4 – Ores, silver, diamonds and new blocks
- **Ores** in the stone underground: coal (common), silver (deeper), diamond (rare, deep). They form small veins and show up in cave walls.
- **New items:** coal (fuel), raw silver (smelt it in a furnace → silver ingot), diamond.
- **New tools:** silver (faster and longer-lasting than stone) and diamond (fastest, very durable, strongest sword) — pickaxe, axe, shovel, sword.
- **Mining tiers:** wood/gold pickaxes get coal and bricks, stone gets silver, silver gets diamond. Too weak a pickaxe means the ore breaks slowly and drops nothing.
- **New blocks:** bricks (stone + gravel), lamp (glass + coal), and blocks of coal, silver and diamond (9 ingots → block, block → 9 back).

## 8.5 – The Other
A hostile who lives in the world the way you do. Survival and hardcore only (switch it off in Settings → “The Other”).
- **Your kind of body:** 20 hearts' worth of health, a hunger bar, air, fall damage. It wears a drained copy of your own skin, with white eyes.
- **It doesn't know where you are.** It wakes up 110–170 blocks away with no idea. It has to find you: it sees you (day/night, fog, line of sight, field of view), hears you (digging, building, fighting, sprinting), reads the marks you leave on the land, and remembers where it saw you, where you sleep and where you spend time.
- **It lives:** cuts trees, mines stone, coal, silver and diamonds, crafts better tools and swords, smelts, eats (hunts the herds), rests, and builds itself a stone house with a table and furnace. Its stash falls out if you break its table.
- **It thinks:** every half second it weighs fighting, stalking, fleeing, hunting food, resting, stealing, getting stronger, building and searching. It stalks you and stands perfectly still while you look at it; it retreats when hurt, heals, and comes back.
- **It steals:** a hit can take something from your pockets (it prefers what it needs), and when you are away it empties your furnaces and picks up what you dropped. Kill it to get your things back.
- **It learns:** every death teaches it (your weapon, whether ambushing or open fights win, that heights and water hurt) and it comes back more careful and cleverer. It keeps its memory (and its house) between sessions.
- **Debug (F3):** “The Other” spawns one unaware, “(hunting)” one that knows where you are, “Kill it”; the debug text shows what it is doing, what it carries and what it has learned.

## 8.6 – The Other thinks
It now has one purpose and works out the rest for itself.
- **One fixed goal:** end the other (you). Every other goal is one it invents because it would get it closer.
- **It weighs its options** every second or so: finish you now, get stronger first, heal, lay in food, build a shelter, watch you from a distance, wait near where you sleep, climb a hill to look around, take what you leave lying around, take your bed, take back what it dropped when it died. Each has a reason it can state (see the debug text: “plan” and its last thoughts), and each is judged by how well that kind of plan has worked for it before.
- **It predicts fights:** it works out how a fight would go from both sides' health, weapons, hunger, whether you are asleep, and only commits when its chance is high enough (bolder or more careful depending on its history). After each fight it compares what it expected with what happened and corrects its own judgement.
- **It learns your habits:** when it has seen you asleep, it notes the hour and waits for it. It remembers where you sleep and where you spend time.
- **It improvises like a player:** if you stand on a ledge or a pillar, it builds a stair of blocks under its feet to reach you; if a plan stalls or takes too long it gives up and tries another.

## 8.7 – Finding The Other
It arrives about 8 minutes into a survival world and starts far away, so it is hard to stumble on. To test it: open the debug menu (the bug button on phones, F3 on a computer) → **The Other** (brings one 34 blocks behind you), **Red beacon on it** (a red light you can see from far away), **Take me to it**. The debug text now says how far it is and which way.

## 8.9 – The Other prepares, talks, and lies
- **It prepares like a player.** It will not start a fight without a kit: a real sword, a pickaxe, food in its pockets, blocks to climb and hide behind, and good health (unless you are asleep, badly hurt, or you hit it first). It works out what it is missing (“it is missing a real sword, food, blocks”) and goes and gets it, builds a shelter, and waits out the night at home when it is not ready.
- **It fights smarter:** it hits and steps back out of your reach, and knockback now really throws you.
- **You can talk to it.** Tap it (or press T on a computer, or use “Talk to it” in F3) within a few blocks: quick replies (Hello, Who are you, Let us make peace, Here take this, Do you have food, Come with me, Leave me alone, I will kill you) or type anything. On a computer the keys 1–8 pick a quick reply.
- **It can lie.** If it is not ready to fight (or sees a cliff behind you) it walks up unarmed and says it only wants to talk, and will agree to peace. It follows you like a friend, and while it does it studies the ground. When you turn your back with a drop in front of you, deep enough that the fall would kill you, it shoves you off. Water below saves you. Hit it, or say you will kill it, and the friendship is over.

## 9.0 – The toxic friend
If The Other becomes your friend, it is not a friend. While it walks beside you it is always working on something, and its mood swings between sweet, sour and manic (so it is hard to predict):
- **Guilt and gaslighting:** “After everything I have done for you.” Accuse it of anything and it denies it.
- **Demands:** “Give me your sword. Friends share.” Refuse, and it sulks, then takes it anyway.
- **Pilfering:** when your back is turned or your inventory is open, it quietly takes your best things.
- **Fake injury:** it lies down groaning for help, then strikes when you come close.
- **Luring:** it takes you to a place with a fatal drop (“Come look at this”), tells you to look down, and pushes.
- **Pranks:** small pushes off short drops (“Relax, it was a joke”).
- **Spiked food:** food it “cooked for you” can make you sick (poison now slowly costs hearts, never below two).
- **Abandoning you** in the dark, then coming back with “Sorry, I got lost.”
- If you die, it takes everything you dropped. If you forgive it, it uses that: it remembers who forgives.
It also learns which schemes work on you and uses those more.
