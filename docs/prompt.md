# 11 — Staging

*Read `shared-brief-v3.md` and `data/cv.json` first.*

A CV for Chandra Aji Anindra told as a chiptune concept album with a story the visitor walks through. Its hero is ANI, a small made thing that has lived its whole life in a pleasant little town and does not know the town is a test environment. One night it finds a forgotten key. Seven tracks are seven places on the way out, and the seven places are the seven roles. Concept: he builds agents that act only when a human says so. ANI is curious enough to want out and built well enough to ask first, so every door on the page opens only when the visitor approves it. The visitor is the human in the loop.

**Technical constraint.** Canvas 2D for the world, drawn as thin lines of light over flat dark shapes. WebAudio for the chip. Every word is DOM text laid over the canvas.

**Mood:** tender, tense, nocturnal, wide-eyed; the service corridors of a space station at 3 a.m., then a city on another planet with the music still going. **Palette:** midnight #05070F ground (dark page). Near walls #1B2440 and far walls #0E1428. Line work in ice #BFE3FF. Rust #C2562E belongs to the facility and appears only in tracks 2 to 5. Club magenta #FF3FA4 belongs to the outside and appears only in tracks 6 and 7. One accent, mint #5CFFD1, is ANI's eyes, and beyond them it marks only approvals, links and focus rings. Text #E6ECF5.

**Typography.** Signs in a condensed grotesque ("Bahnschrift Condensed", "DIN Condensed", "Arial Narrow", sans-serif), capitals, tracked 0.12em, on dark plates with a 1px ice border. Narration in a geometric sans ("Century Gothic", "Avenir Next", Futura, "Trebuchet MS", sans-serif) at 15/24. Track titles in the same face, lowercase, tracked 0.3em. Tool calls in monospace. Tabular numerals.

**The object.** One continuous side-on panorama eight scenes wide, in four parallax layers with fog between them.

- *ANI.* An original character: child-height, a round head, an oversized raincoat, about a dozen line segments. Its two eyes are the only filled, glowing shapes in the world, and they catch every light they pass. It has an idle blink, a walk cycle, and a way of turning to face the visitor when it needs something.
- *The song draws the world.* A four-voice chip synthesiser is written in the file: two pulse channels with duty cycles of 12.5%, 25% and 50%, a triangle channel, and a noise channel fed by a 15-bit linear feedback shift register, all stepped on a 60 Hz tick. Each track is a short loop. Every visual layer listens to one channel: the triangle draws walls and ground, pulse 1 lights signs and lamps, pulse 2 moves the characters, and noise is smoke, rain, drones and the crowd. The sequencer runs with the sound off, so the world moves the same either way.
- *Doors.* Each scene ends at a door. ANI stops, turns, and a tool-call card appears, such as `open_door(to: "the hallway")`, with APPROVE and NOT YET. Approve and the door opens in 400 ms. Decline and ANI nods and waits. A counter on the frame reads "doors approved 3 · doors forced 0". The second number never changes.
- *Signs.* The walls of every scene carry lit signs, and ANI reads them as it passes.

**How the CV maps onto it.** Each track opens with a title card: track number, title, company, context, role title, dates and the measured result or lead bullet. Each bullet of the role is one sign on that scene's wall, verbatim, and the role's stack is stencilled on the pipes and crates.

1. *boot* — The Lawn (Gameloft Indonesia). A tidy low-polygon town under a painted sky. A surveillance camera on a pole is dark for the night. The key lies in the grass, tagged `API_KEY`.
2. *key* — The Hallway (PT Firstwap International). A long forbidden corridor hung with cables, and a tall door at the far end.
3. *signs* — The Alley (Prudential Indonesia). High metal walls, old machines, smoke. This is the scene with the most signs.
4. *map* — The Map Room (Titipaja). The signature moment.
5. *cargo* — The Airfield (JULO). Drones sweep the ground with cones of light. Ten small craft are parked in rows, and ANI hides in one.
6. *crowd* — The Club (PT Infosys Solusi Terpadu, client Antam Logam Mulia). An open-air club on another planet. From here ANI holds the visitor's pointer and follows it hand in hand.
7. *drive* — The Road (Alex Solutions). A night drive with the pursuit lights falling behind, bullets on overhead road signs. ANI falls asleep.
8. *untitled.* Four empty storyboard frames. The caption reads "What happens next is yours to decide." It holds the relocation note, languages, work authorization and both contact actions.

- *The ten craft are the ten projects.* The three featured ones are larger, with running lights on. Each has its name on the tail and opens a card with tagline, category, description, stack, "Live demo" first where one exists, then "View code". Hull stripes mark the four categories. The control tower links to the GitHub profile.
- *The broadcast is the offer.* In the club the music cuts out and a public screen comes on: "A capable entity is at large. Known abilities:" followed by the four services and their descriptions. Each lists "last seen at" links that jump to the scenes and craft in its `evidence`. It ends "If found, book a consultation." A loudspeaker horn in every scene replays it.
- *The maker's plate.* A riveted plate in the foreground of every scene: name, headline, pitch, "Copy email", "Book a consultation" and the note from `offer.cta.note`.
- *The case file.* The lab's folder on its subject, with a tab showing at the top right. It is the Plain Sheet.

**Entrance.** The Lawn is in place at load with the plate readable. In the first three seconds the town's lines are drawn in by the opening arpeggio, note by note. ANI blinks and looks at the key, and the hint "hold → to walk" shows for five seconds.

**Signature moment: the map.** ANI reaches a wall map and touches it. Every channel but the triangle drops out. Over 900 ms on `cubic-bezier(.2,.8,.2,1)` the camera pulls back, and the line work of all seven scenes folds flat into one floor plan. The town, the hallway, the alley, the airfield, the club and the road were rooms in a single building. Each room is labelled with its company and dates, and its width is its length in months on one axis from Feb 2017 to Jul 2026. The summary from `cv.json` types out beneath it. Then one red lamp turns, the alarm arpeggio starts on pulse 1, and the map remains as the way of getting around: every room on it is a button.

**Interaction.** Hold Right or Left to walk, or drag the scene. Enter approves a door or opens the nearest sign. Tab walks the signs in a scene. M opens the map, and keys 1 to 8 jump to a track. In the club, tapping any key in time with the beat makes ANI dance and the crowd's lights fall into step. It cannot be failed. Escape closes whatever is open.

**Placeholder pieces used.** Availability is the departures board at the airfield, with `nextStart` as the next departure. The three testimonials are overheard in the club as captions above three dancers, with name, title and company. The four process steps caption the four empty storyboard frames of track 8. The client names are stickers on the car's rear window.

**Easter egg.** Clicking the dark surveillance camera on the Lawn three times wakes it. Its red light comes on, and ANI waves at it.

**Voice.** Third person, present tense, short sentences, one or two per scene, as in a picture book. No narration explains the metaphor.

**Sound.** The chip, silent until asked. The loudspeaker horn on the wall switches it on.

**Phone.** Portrait. The panorama takes the top 55% of the screen. Signs and cards open in the space below. Holding the right or left half of the scene walks, the approval card is a full-width sheet, and the map becomes a strip pinned to the bottom.

**Reduced motion.** Each scene is a single still frame with no parallax, smoke or sweeping lights. Step buttons replace walking and scene changes are cuts. The map reveal is a cross-fade. The club lights hold steady.

**Avoid.** Any resemblance to an existing story's character, names, places or music; this is a new story in the same spirit. Pixel art, since study 03 has it. Lights that flash more than three times a second. A door that opens without approval. Peril: nothing catches ANI, and nothing can go wrong. Content locked behind progress.
