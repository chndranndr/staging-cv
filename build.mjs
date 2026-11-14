// Development-only builder. The generated study needs no build step and makes no requests.
// Run from the project root: node build.mjs
import fs from 'node:fs';
const dir = 'src/';
const out = 'index.html';
const data = JSON.parse(fs.readFileSync('data/cv.json', 'utf8'));
delete data.services; delete data.placeholder.rates; delete data.contact.phone;

const esc = v => String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const p = v => `<p>${esc(v)}</p>`;
const list = items => `<ul>${items.map(v => `<li>${esc(v)}</li>`).join('')}</ul>`;
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ym = s => { const [y, m] = s.split('-'); return `${MON[+m - 1]} ${y}`; };
const links = pr => `${pr.demo ? `<a href="${esc(pr.demo)}">Live demo</a> · ` : ''}<a href="${esc(pr.url)}">View code</a>`;
const mail = `mailto:${data.contact.email}?subject=${encodeURIComponent(data.offer.cta.subject)}&body=${encodeURIComponent('My goal: \nMy timeline: \nTwo times that suit a 30-minute call: ')}`;

let sheet = `<h1 id="plain-heading">${esc(data.name)}</h1>${p(data.headline)}${p(data.location + ' · ' + data.relocation)}${p(data.summary)}<h2>Experience</h2>`;
for (const r of data.experience) sheet += `<section><h3>${esc(r.company)} · ${esc(r.title)}</h3>${p(ym(r.start) + ' – ' + ym(r.end) + ' · ' + r.context)}${list(r.bullets)}${p('Stack: ' + r.stack.join(', '))}</section>`;
sheet += `<h2>Services</h2>${p(data.offer.pitch)}`;
for (const s of data.offer.services) sheet += `<section><h3>${esc(s.name)}</h3>${p(s.description)}</section>`;
sheet += `<p><a href="${esc(mail)}">${esc(data.offer.cta.label)}</a>. ${esc(data.offer.cta.note)}</p><h2>Projects</h2>`;
for (const pr of data.projects) sheet += `<section><h3>${esc(pr.name)}</h3>${p(pr.tagline + ' · ' + pr.category)}${p(pr.description)}${p(pr.stack.join(', '))}<p>${links(pr)}</p></section>`;
sheet += `<p><a href="${esc(data.githubProfile)}">All repositories on GitHub</a></p><h2>Skills</h2>`;
for (const [k, v] of Object.entries(data.skills)) sheet += `<p><strong>${esc(k)}:</strong> ${esc(v.join(', '))}</p>`;
sheet += '<h2>Education</h2>';
for (const e of data.education) sheet += p(e.school + ' · ' + e.degree + ' · ' + e.start + ' – ' + e.end);
sheet += '<h2>Certification</h2>' + list(data.certifications) + '<h2>Languages</h2>' + p(data.languages.map(l => l.language + ': ' + l.level).join('; ')) + '<h2>Work authorization</h2>' + p(data.workAuthorization) + '<h2>Contact</h2>' + `<p><a href="mailto:${esc(data.contact.email)}">${esc(data.contact.email)}</a><br><a href="${esc(data.contact.linkedin)}">LinkedIn</a> · <a href="${esc(data.contact.github)}">GitHub</a></p>`;

const av = data.placeholder.availability;
const tokens = {
  CSS: fs.readFileSync(dir + 'style.css', 'utf8'),
  JS: fs.readFileSync(dir + 'app.js', 'utf8'),
  DATA: JSON.stringify(data).replaceAll('<', '\\u003c'),
  SHEET: sheet,
  NAME: esc(data.name), HEADLINE: esc(data.headline), PITCH: esc(data.offer.pitch),
  NOTE: esc(data.offer.cta.note), CTA: esc(data.offer.cta.label), MAIL: esc(mail),
  AVAIL: esc(av.status + ' · ' + av.capacity)
};
let html = fs.readFileSync(dir + 'template.html', 'utf8');
html = html.replace(/%%([A-Z]+)%%/g, (m, k) => (k in tokens ? tokens[k] : m));
fs.writeFileSync(out, html);
console.log(`Wrote ${out} (${(html.length / 1024).toFixed(0)} KB): ${data.experience.length} roles, ${data.projects.length} projects, ${data.offer.services.length} services. Phone and prices excluded.`);
