# Shared brief v3 — prepend to creative direction prompts 05 onward

You are building one study in a series of CV pages for the same person. Every study uses the same data and a completely different world. Read `data/cv.json` first; it is the single source of truth.

Studies 01 and 02 were built from the first version of this brief and came out as long brochures with a small widget on top. This version exists to stop that. The interactive object is the page. The CV text is a sheet you can pull out of it.

Version 3 changes what the page sells. Studies 03 and 04 showed packages and rates. From 05 onward the page offers four services and invites the visitor to book a consultation. No price appears anywhere.

## Output

- One self-contained file at `index.html`: inline CSS and JS, no build step, no network requests, no external fonts or libraries.
- Embed the contents of `data/cv.json` in a `<script type="application/json">` block and render from it. Leave out the top-level `services` block and `placeholder.rates`; the `offer` block replaces both.
- Canvas 2D, hand-written WebGL, SVG, CSS 3D and WebAudio are all allowed. The direction says which one the study is built on.

## The stage

- The object fills the first viewport edge to edge and stays the main thing on the page. It is not a hero above a website.
- No header bar, no nav strip, no section headings stacked down the page, no card grid, no footer. If a screenshot at 50% zoom could be mistaken for a landing page or a document, start again.
- The world has one way of getting around, and the direction names it. Controls are objects in the world: a lever, a crank, a page corner, a key on a device.

## The identity plate

Name, headline and a "Copy email" control are real DOM text inside the world, in the first viewport, readable within one second and before any animation finishes.

The offer sits with them: the sentence in `offer.pitch` ("I build websites, Android apps, agentic apps and AI integrations.") and a "Book a consultation" control, also real DOM text in the first viewport. Availability from `placeholder.availability` sits beside it.

## The Plain Sheet

Every study contains one compact, undecorated text CV, called the Plain Sheet. It is the only place where completeness is required, so nothing needs to be printed twice.

- It holds every item in `cv.json` as selectable text in the standard order: name, headline, location, relocation note, summary, all seven roles with dates and every bullet, the pitch and the four services from `offer`, all ten projects with links, all seven skill groups, education, certification, languages, work authorization, email, LinkedIn and GitHub.
- It is in the DOM from load. It opens from one always-visible drawn control and from the `?` key, and `#cv` in the URL opens it directly.
- It is set in the study's own type, in one or two columns, with no illustration. It should fit in about two screens.
- It is what `@media print` outputs, black on white, with the object hidden.
- It is the path for screen readers and the fallback when scripts or canvas fail.

## What the object itself must carry

The visitor should be able to get these from the world without opening the Plain Sheet:

- All seven roles: company, title, dates, and either the measured result or the lead bullet. The full bullets appear when a role is selected.
- All ten projects: name, tagline, category, and links. "Live demo" comes first where a `demo` URL exists, then "View code". The three with `"featured": true` get the most room. There is a link to `githubProfile`.
- The four services in `offer.services`, each with its description and pointing at the roles and projects in its `evidence`.
- Both contact actions. "Copy email" is for anyone. "Book a consultation" opens a `mailto:` with the subject from `offer.cta.subject` ("Consultation request") and a three-line body prompting for the goal, the timeline and two times that suit a 30-minute call. The line in `offer.cta.note` sits beside it. No form sends data anywhere, and no outside booking service is linked.

Skills, education, certification, languages and authorization may live in the world if they fit, and otherwise only in the Plain Sheet.

## Invented content

The `placeholder` block supplies invented availability, stats, project stats, testimonials, client names, a process and an FAQ. It is optional material, not a checklist.

- Each direction lists the pieces it uses and stages them as objects in its world. Use only those.
- Never set them as a row of testimonial cards or a logo strip.
- No prices. `placeholder.rates` is not used: no rate, package, fee, quote figure or currency symbol appears in the object, in the Plain Sheet or in print. The page offers services and a consultation, and the price is a conversation.
- If the world needs more invented texture, such as a caption, a sign or a serial number, make it up in the same spirit.

## Truth rules

- Employers, titles, dates, role bullets, education and certification come from `cv.json` unchanged. Invent around them, never over them.
- Each metric stays with the role it came from. The 5x, 50% and 30% figures belong to the Antam work, the 99.95% uptime and doubled deployment frequency to JULO, the 40% and 60% figures to Titipaja. Never present a role's metric as a career-wide figure.
- Numbers produced by a simulation in the page are labelled as belonging to the simulation.
- The most recent role ended in Jul 2026. No role is described as the present one.
- Gaps between roles are shown neutrally or not at all.
- The phone number is never rendered, on screen or in print.

## Craft bar

- Spend about 70% of the effort on the object. A beautiful object with a plain sheet beats a mediocre object with polished sections.
- Give it depth and material: light, shadow, texture, weight. Flat vector outlines are allowed only where the direction asks for flatness.
- It is alive when idle. Something small is always moving.
- Every input gets a response within 100 ms, with anticipation, action and a reaction such as a settle, a sound or a particle.
- Real logic, not faked motion. Where the direction names a simulation or a formula, implement it.
- Show one short hint in the world for the first five seconds, such as "drag the crank". Then remove it.
- Hide one easter egg. The direction names it.
- Hold 60 fps on a mid-range laptop. Canvases respect `devicePixelRatio` and pause when the tab is hidden.
- Be original. Do not recreate an existing game, character, device, book or brand.

## Build loop

1. Build the object first as a toy, with dummy labels and no CV text.
2. Take screenshots at 1440×900 and 390×844. Compare them with the direction's mood, palette and object. Write down what looks cheap or empty.
3. Fix and repeat. Do this at least three times before going further.
4. Wire the CV data into the object.
5. Add the Plain Sheet and the print style.
6. Check every fallback below in a browser.

## Fallbacks

- **Phone:** works at 375 px wide with no horizontal scroll. The direction says what changes.
- **Keyboard:** every action on the object is also a real focusable control with a visible focus state. Controls drawn on a canvas get transparent buttons laid over them.
- **Reduced motion:** honour `prefers-reduced-motion` with the designed still state the direction describes.
- **Accessibility:** canvas and decorative SVG are `aria-hidden`; a polite live region narrates what the object just did; text contrast is at least 4.5:1; nothing exists only as pixels.
- **Sound:** synthesised with WebAudio, silent until the visitor asks for it, switched by a drawn object.
