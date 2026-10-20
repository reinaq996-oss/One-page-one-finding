/**
 * Generates index.html from student-por.csv.
 * Run:  npx tsx tools/build.ts      (only needed when you change copy or data)
 * The committed index.html + assets/ is what GitHub Pages serves.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { icon, type IconName } from './icons.ts';

// ---------- data ----------
type Row = Record<string, string>;
const lines = readFileSync('student-por.csv', 'utf8').trim().split(/\r?\n/);
const head = lines[0].split(',');
const rows: Row[] = lines.slice(1).map((l) => Object.fromEntries(l.split(',').map((v, i) => [head[i], v.replace(/"/g, '')])));
const num = (r: Row, k: string) => Number(r[k]);
const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
const f2 = (n: number) => n.toFixed(2);
const f1 = (n: number) => n.toFixed(1);
const g3 = rows.map((r) => num(r, 'G3'));

const corr = (a: number[], b: number[]) => {
  const ma = mean(a), mb = mean(b);
  let sab = 0, saa = 0, sbb = 0;
  a.forEach((x, i) => { sab += (x - ma) * (b[i] - mb); saa += (x - ma) ** 2; sbb += (b[i] - mb) ** 2; });
  return sab / Math.sqrt(saa * sbb);
};
const col = (k: string) => rows.map((r) => num(r, k));
const bin = (k: string, v: (r: Row) => number) => rows.map(v);
const factors: { label: string; v: number; cat: 'academic' | 'study' | 'background' | 'lifestyle' }[] = [
  { label: 'Previous grade (G2)', v: corr(col('G2'), g3), cat: 'academic' },
  { label: 'Previous grade (G1)', v: corr(col('G1'), g3), cat: 'academic' },
  { label: 'Previous failures', v: corr(col('failures'), g3), cat: 'academic' },
  { label: 'School (MS vs GP)', v: corr(bin('school', (r) => (r.school === 'MS' ? 1 : 0)), g3), cat: 'background' },
  { label: 'Weekly study time', v: corr(col('studytime'), g3), cat: 'study' },
  { label: 'Mother’s education', v: corr(col('Medu'), g3), cat: 'background' },
  { label: 'Father’s education', v: corr(col('Fedu'), g3), cat: 'background' },
  { label: 'Urban address', v: corr(bin('address', (r) => (r.address === 'U' ? 1 : 0)), g3), cat: 'background' },
  { label: 'Sex (male)', v: corr(bin('sex', (r) => (r.sex === 'M' ? 1 : 0)), g3), cat: 'background' },
  { label: 'School absences', v: corr(col('absences'), g3), cat: 'study' },
  { label: 'Going out with friends', v: corr(col('goout'), g3), cat: 'lifestyle' },
  { label: 'Family educational support', v: corr(bin('famsup', (r) => (r.famsup === 'yes' ? 1 : 0)), g3), cat: 'background' },
].map((x) => ({ ...x, v: Math.abs(x.v) }));

const groupStats = (key: string, vals: string[]) =>
  vals.map((v) => {
    const sel = rows.filter((r) => r[key] === v).map((r) => num(r, 'G3'));
    return { v, n: sel.length, m: mean(sel) };
  });
const study = groupStats('studytime', ['1', '2', '3', '4']);
const fails = groupStats('failures', ['0', '1', '2', '3']);
const medu = groupStats('Medu', ['0', '1', '2', '3', '4']);
const fedu = groupStats('Fedu', ['0', '1', '2', '3', '4']);
const rose = rows.filter((r) => num(r, 'G3') > num(r, 'G2')).length;
const same = rows.filter((r) => num(r, 'G3') === num(r, 'G2')).length;
const fell = rows.length - rose - same;
const within1 = rows.filter((r) => Math.abs(num(r, 'G3') - num(r, 'G2')) <= 1).length / rows.length;
const zeros = rows.filter((r) => num(r, 'G3') === 0);

const gm = (k: string, v: string) => mean(rows.filter((r) => r[k] === v).map((r) => num(r, 'G3')));
const share = (k: string, v: string, ref: number) => {
  const s = rows.filter((r) => r[k] === v);
  return s.filter((r) => num(r, 'G3') > ref).length / s.length;
};
const boysAbove = share('sex', 'M', gm('sex', 'F'));
const ruralAbove = share('address', 'R', gm('address', 'U'));

// sanity checks against the published notebook, fail loudly if the data changes
const expect = (label: string, got: number, want: number, tol = 0.006) => {
  if (Math.abs(got - want) > tol) throw new Error(`${label}: got ${got}, notebook says ${want}`);
};
expect('n', rows.length, 649, 0);
expect('G2 corr', factors[0].v, 0.92, 0.006);
expect('study 5-10h', study[2].m, 13.23);
expect('no failures', fails[0].m, 12.51);
expect('boys above', boysAbove, 0.35, 0.002);
expect('rural above', ruralAbove, 0.299, 0.002);
expect('zeros', zeros.length, 15, 0);

// ---------- swarm layout ----------
const X0 = 28, BIN = 44;
const px = (g: number) => X0 + g * BIN + BIN / 2;
type Layout = { r: number; pos: [number, number][]; grp: number[]; means: { x: number; y0: number; y1: number; label: string; grp: number }[]; stat: { big: string; text: string } };
function layout(bands: { name: string; test: (r: Row) => boolean; base: number; top: number }[], statBig: string, statText: string, g: { cols: number; step: number; r: number }): Layout {
  const { cols: COLS, step: STEP, r: R } = g;
  const pos: [number, number][] = rows.map(() => [0, 0]);
  const grp: number[] = rows.map(() => 0);
  const means: Layout['means'] = [];
  bands.forEach((b, gi) => {
    const idx = rows.map((r, i) => (b.test(r) ? i : -1)).filter((i) => i >= 0);
    const byGrade = new Map<number, number[]>();
    idx.forEach((i) => { const g = g3[i]; byGrade.set(g, [...(byGrade.get(g) ?? []), i]); });
    byGrade.forEach((list, g) => {
      list.forEach((i, k) => {
        const c = k % COLS, rw = Math.floor(k / COLS);
        pos[i] = [px(g) + (c - (COLS - 1) / 2) * STEP, b.base - R - rw * STEP];
        grp[i] = bands.length === 1 ? 2 : gi;
      });
    });
    const m = mean(idx.map((i) => g3[i]));
    means.push({ x: px(m), y0: b.base + 3, y1: b.top, label: `${b.name} average ${f1(m)}`, grp: bands.length === 1 ? 2 : gi });
  });
  return { r: R, pos, grp, means, stat: { big: statBig, text: statText } };
}
const L: Record<string, Layout> = {
  all: layout([{ name: 'Everyone', test: () => true, base: 322, top: 40 }], `${rows.length}`, 'students, one dot each. Most land between 10 and 14.', { cols: 4, step: 10.6, r: 4.7 }),
  address: layout(
    [{ name: 'Urban', test: (r) => r.address === 'U', base: 168, top: 28 }, { name: 'Rural', test: (r) => r.address === 'R', base: 338, top: 198 }],
    `${f1(ruralAbove * 100)}%`, 'of rural students score above the average urban student.', { cols: 6, step: 7.1, r: 3.05 }),
  sex: layout(
    [{ name: 'Girls', test: (r) => r.sex === 'F', base: 168, top: 28 }, { name: 'Boys', test: (r) => r.sex === 'M', base: 338, top: 198 }],
    `${f1(boysAbove * 100)}%`, 'of boys score above the average girl.', { cols: 6, step: 7.1, r: 3.05 }),
};
const axis = Array.from({ length: 21 }, (_, g) => `<text x="${px(g)}" y="352" text-anchor="middle">${g}</text>`).join('');
const dots = rows.map((_, i) => `<circle r="${L.all.r}" cx="0" cy="0" style="transform:translate(${L.all.pos[i][0].toFixed(1)}px,${L.all.pos[i][1].toFixed(1)}px)" class="g2"/>`).join('');
const swarmJson = JSON.stringify(Object.fromEntries(Object.entries(L).map(([k, v]) => [k, { r: v.r, pos: v.pos.map(([a, b]) => [Math.round(a * 10) / 10, Math.round(b * 10) / 10]), grp: v.grp, means: v.means, stat: v.stat }])));

// ---------- helpers ----------
const ic = (n: IconName, cls = '') => `<span class="ico ${cls}" aria-hidden="true">${icon(n).replace(' role="img"', '').replace(/aria-label="[^"]*"/, '')}</span>`;
const ph = (label: string, cls = '') => `<div class="ph ${cls}" role="img" aria-label="Image placeholder: ${label}"><span class="ph-tag">Placeholder image</span><span class="ph-label">${label}</span></div>`;
const catColor: Record<string, string> = { academic: 'var(--slate)', study: 'var(--sage)', background: 'var(--rose)', lifestyle: 'var(--lilac)' };

const factorRows = factors.map((x) => `
      <li class="hrow"><span class="hl">${x.label}</span><span class="track"><i class="fill" style="--w:${x.v};background:${catColor[x.cat]}"></i></span><b class="hv">${f2(x.v)}</b></li>`).join('');

const maxStudy = 14;
const studyCols = study.map((s, i) => {
  const labels = ['Under 2 hours', '2 to 5 hours', '5 to 10 hours', 'Over 10 hours'];
  const colr = ['var(--slate)', 'var(--sage)', 'var(--rose)', 'var(--lilac)'][i];
  return `<li class="vcol"><b class="vv">${f2(s.m)}</b><span class="vtrack"><i class="vfill" style="--h:${s.m / maxStudy};background:${colr}"></i></span><span class="vl">${labels[i]}</span><span class="vn">${s.n} students</span></li>`;
}).join('');

const failRows = fails.map((s) => {
  const lab = s.v === '0' ? 'No failures' : s.v === '1' ? '1 failure' : `${s.v} failures`;
  return `<li class="hrow"><span class="hl">${lab}</span><span class="track"><i class="fill" style="--w:${s.m / 14};background:${s.v === '0' ? 'var(--ink)' : 'var(--rose)'}"></i></span><b class="hv">${f2(s.m)}</b><span class="hn">${s.n}</span></li>`;
}).join('');

const eduLabels = ['None', 'Primary', '5th to 9th grade', 'Secondary', 'Higher'];
const eduCols = eduLabels.map((l, i) => `
      <li class="edu ${i === 0 ? 'faint' : ''}">
        <span class="pair">
          <span class="pcol"><b>${f2(medu[i].m)}</b><i class="vfill m" style="--h:${medu[i].m / 14}"></i></span>
          <span class="pcol"><b>${f2(fedu[i].m)}</b><i class="vfill f" style="--h:${fedu[i].m / 14}"></i></span>
        </span>
        <span class="vl">${l}</span><span class="vn">${medu[i].n} | ${fedu[i].n}</span>
      </li>`).join('');

const pct = (n: number) => `${(n / rows.length) * 100}%`;
const fairness = [
  ['books', 'Previous grades and failures', 'Identify current learning needs and offer support.', 'Past results should not define a student’s permanent ability or potential.'],
  ['clock', 'Study time and absences', 'Explore possible barriers and start a conversation about support.', 'The data say nothing about health, family responsibilities or transport.'],
  ['house', 'Sex, address, school and parents’ education', 'Examine inequalities and differences in access to resources, at group level.', 'Using them to rank individual students can reinforce disadvantage or discrimination.'],
  ['pencil', 'Family support and lifestyle', 'Add context, cautiously, when it is relevant.', 'These answers are self-reported, private and not enough to judge ability.'],
] as const;
const fairRows = fairness.map(([i, t, a, c], k) => `
      <details class="frow"${k === 2 ? ' open' : ''}>
        <summary>${ic(i, 'sm')}<span>${t}</span><i class="plus" aria-hidden="true"></i></summary>
        <div class="fbody"><div><h4>Where it can help</h4><p>${a}</p></div><div><h4>Why it worries us</h4><p>${c}</p></div></div>
      </details>`).join('');

const limits: [IconName, string, string][] = [
  ['lens', 'Association is not causation.', 'Students who receive extra school support score lower on average, but they may already be the ones struggling. The data cannot tell the two stories apart.'],
  ['house', 'Some groups are tiny.', 'Only six students have mothers with no formal education. Their average is too unstable to read.'],
  ['calendar', `${zeros.length} zero grades, no explanation.`, `All ${zeros.length} have zero recorded absences, ${zeros.filter((r) => r.school === 'MS').length} attend school MS, and ${zeros.filter((r) => num(r, 'G2') === 0).length} also scored zero in G2. We kept them in, and checked that the main pattern holds without them.`],
  ['cap', 'Two schools, one subject.', 'These are Portuguese-language grades from two secondary schools in Portugal. The patterns may not hold elsewhere.'],
];
const limRows = limits.map(([i, t, b]) => `<li>${ic(i, 'sm')}<div><h3>${t}</h3><p>${b}</p></div></li>`).join('');

// ---------- page ----------
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Beyond the grades</title>
<meta name="description" content="What predicts a final grade, and which of those things would we refuse to use? A one-page-one-finding study of 649 students.">
<meta name="theme-color" content="#5a2a22">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300..700&family=Newsreader:ital,opsz,wght@0,6..72,400..600;1,6..72,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/site.css">
<script>document.documentElement.classList.add('js')</script>
</head>
<body>
<div class="backdrop" aria-hidden="true"></div>

<header class="nav">
  <a class="brand" href="#top">${ic('cap', 'brand-ico')}<span>Beyond the grades</span></a>
  <nav aria-label="Sections">
    <a href="#previous">Previous grades</a><a href="#habits">Study habits</a><a href="#background">Background</a><a href="#individual">Individuals</a><a href="#fairness">Fairness</a>
  </nav>
</header>

<main id="top">
  <section class="hero">
    <div class="hero-frame">
      <h1><span class="l1">Grades can signal performance.</span> <span class="l2">They should never define potential.</span></h1>
      <div class="hero-foot">
        <p class="hero-note">A study of ${rows.length} students from two Portuguese secondary schools, and of what we should refuse to use when we judge them.</p>
        <aside class="glass q">
          <div class="q-head">${ic('lens', 'sm light')}<span>Our question</span></div>
          <p>What predicts a final grade, and which of those things would you refuse to use?</p>
          <a class="pill" href="#previous"><i class="dot"></i>Start with the strongest signal</a>
        </aside>
      </div>
    </div>
  </section>

  <section class="panel" id="question"><div class="inner paper split">
    <div>
      <h2>A final grade says how a student performed. It can’t say why.</h2>
      <p class="lead">We took grades, habits and family background for ${rows.length} students and asked what lines up with the final result, and what we would never want to hold against a student.</p>
      <dl class="facts">
        <div><dt>${rows.length}</dt><dd>students</dd></div>
        <div><dt>2</dt><dd>Portuguese schools</dd></div>
        <div><dt>0 to 20</dt><dd>grade scale, Portuguese language</dd></div>
      </dl>
    </div>
    <figure class="pic"><img src="assets/classroom.jpg" width="500" height="281" alt="An empty classroom with wooden desks, lit by strong sunlight through tall windows." loading="lazy"></figure>
  </div></section>

  <section class="panel" id="previous"><div class="inner brick split">
    <div class="copy">
      ${ic('books', 'lg light')}
      <h2>Last term’s grades say the most.</h2>
      <p class="lead">Earlier grades from the same year track the final grade closely: ${f2(factors[0].v)} for the second period, ${f2(factors[1].v)} for the first. Background factors sit far lower, and students don’t choose them.</p>
      <div class="change">
        <p><b>${f1(within1 * 100)}%</b> finished within one point of their second-period grade.</p>
        <div class="stack" role="img" aria-label="${rose} students rose, ${same} stayed the same, ${fell} fell">
          <i style="--w:${pct(rose)}" class="up"></i><i style="--w:${pct(same)}" class="eq"></i><i style="--w:${pct(fell)}" class="dn"></i>
        </div>
        <p class="stack-l"><span>${rose} rose</span><span>${same} unchanged</span><span>${fell} fell</span></p>
        <p class="caveat">That is continuity over a year, not a verdict on what a student can do next.</p>
      </div>
    </div>
    <figure class="card chart">
      <figcaption>How strongly is each factor associated with the final grade?</figcaption>
      <ul class="hbars">${factorRows}
      </ul>
      <p class="axis-note">Strength of association (absolute correlation), 0 to 1</p>
      <ul class="legend"><li style="--c:var(--slate)">Academic history</li><li style="--c:var(--sage)">Study behaviour</li><li style="--c:var(--rose)">Background and circumstances</li><li style="--c:var(--lilac)">Lifestyle</li></ul>
    </figure>
  </div></section>

  <section class="panel" id="habits"><div class="inner paper">
    <div class="head">
      ${ic('clock', 'lg')}
      <div>
        <h2>Grades rise with study time, then level off.</h2>
        <p class="lead">Students who report 5 to 10 hours a week average ${f2(study[2].m)}, against ${f2(study[0].m)} for under two hours. The smallest group dips slightly, but it holds only ${study[3].n} students. This is an association, not proof that study time causes better grades.</p>
      </div>
    </div>
    <div class="duo">
      <figure class="card chart tint">
        <figcaption>Average final grade by weekly study time</figcaption>
        <ul class="vbars">${studyCols}</ul>
      </figure>
      <figure class="card chart tint">
        <figcaption>Average final grade by previous class failures</figcaption>
        <ul class="hbars wide">${failRows}</ul>
        <p class="axis-note">Number on the right is how many students are in each group. Two and three failures are small groups, so read them with care.</p>
      </figure>
    </div>
  </div></section>

  <section class="panel" id="background"><div class="inner sage split rev">
    <figure class="card chart">
      <figcaption>Average final grade by parents’ education</figcaption>
      <ul class="vbars edu-bars">${eduCols}
      </ul>
      <ul class="legend"><li style="--c:var(--slate)">Mother</li><li style="--c:var(--rose)">Father</li></ul>
      <p class="axis-note">Below each level: students with mother | father at that level. The “None” group has 6 and 7 students, too few to read.</p>
    </figure>
    <div class="copy">
      ${ic('house', 'lg')}
      <h2>Background shows up in the averages. It isn’t the student.</h2>
      <p class="lead">Grades rise with parents’ education, from ${f2(medu[1].m)} with primary-educated mothers to ${f2(medu[4].m)} with higher-educated ones. A student can’t choose that, so it describes where they start, not their effort or ability.</p>
      <p class="aside">Even the address gap is partly something else. Urban students average <b>${f2(+f2(gm('address', 'U')) - +f2(gm('address', 'R')))}</b> points higher overall, but only about <b>0.54</b> within each school. Part of the “address effect” is really a school effect.</p>
    </div>
  </div></section>

  <section class="panel" id="individual"><div class="inner paper">
    <div class="head">
      ${ic('lens', 'lg')}
      <div>
        <h2>The group is not the individual.</h2>
        <p class="lead">Averages describe groups. Every dot below is one student’s final grade. Switch the view and see how far the groups overlap.</p>
      </div>
    </div>
    <div class="swarm card">
      <div class="seg" role="group" aria-label="Group the students by">
        <button type="button" data-mode="all" aria-pressed="true">Everyone</button>
        <button type="button" data-mode="address" aria-pressed="false">Urban and rural</button>
        <button type="button" data-mode="sex" aria-pressed="false">Girls and boys</button>
      </div>
      <div class="swarm-wrap"><svg id="swarm" viewBox="0 0 960 372" role="img" aria-label="Dot plot of all ${rows.length} students' final grades, which can be split by address or sex">
        <g class="axis">${axis}<text x="480" y="372" text-anchor="middle" class="axt">Final grade (0 to 20)</text></g>
        <g id="means"></g>
        <g id="dots">${dots}</g>
      </svg></div>
      <p class="swipe">Swipe sideways to see every grade.</p>
      <div class="swarm-stat" aria-live="polite"><b id="stat-big">${L.all.stat.big}</b><span id="stat-text">${L.all.stat.text}</span></div>
      <script type="application/json" id="swarm-data">${swarmJson}</script>
    </div>
  </div></section>

  <section class="panel" id="quote"><div class="inner photo">
    <img class="band" src="assets/hallway.jpg" width="1200" height="672" alt="A long school corridor with a glossy floor reflecting warm light, with students sitting along the walls." loading="lazy">
    <blockquote>Judging a student by their group’s average would be wrong for a large share of that group.</blockquote>
  </div></section>

  <section class="panel" id="fairness"><div class="inner ink">
    <div class="head">
      ${ic('scale', 'lg light')}
      <div>
        <h2>Strong signal is not the same as fair to use.</h2>
        <p class="lead">Two questions, asked separately: how strongly is a factor linked to the grade, and is it fair to judge a student by it? The answer to the second depends on the decision being made.</p>
      </div>
    </div>
    <div class="flist">${fairRows}
    </div>
  </div></section>

  <section class="panel" id="limits"><div class="inner paper split">
    <div>
      <h2>What this analysis can’t tell you.</h2>
      <p class="lead">Group averages do not describe every individual, and a few of the patterns rest on very few students.</p>
    </div>
    <ul class="limits">${limRows}</ul>
  </div></section>

  <section class="panel" id="poster"><div class="inner paper">
    <div class="head">
      ${ic('pencil', 'lg')}
      <div>
        <h2>The one-page version.</h2>
        <p class="lead">The poster puts the whole finding on a single page. The notebook behind it shows every step, including the checks that changed our minds.</p>
        <div class="btns">
          <a class="pill solid" href="https://github.com/reinaq996-oss/One-page-one-finding/blob/main/Student_Performance%20(4).ipynb"><i class="dot"></i>Open the notebook</a>
          <a class="pill" href="https://github.com/reinaq996-oss/One-page-one-finding#readme"><i class="dot"></i>Read the README</a>
          <a class="pill" href="https://archive.ics.uci.edu/dataset/320/student+performance"><i class="dot"></i>See the dataset</a>
        </div>
      </div>
    </div>
    <a class="poster" href="poster.png"><img src="poster.png" width="1521" height="725" alt="The project poster: Grades can signal performance. They should never define potential. Three charts show previous grades, weekly study time and parents' education against the final grade." loading="lazy"></a>
  </div></section>
</main>

<footer class="foot">
  <p class="close">Grades can signal performance.<br>They should never define potential.</p>
  <div class="foot-meta">
    <p>Gjergj Garuli, Sejbi Koromani and Reina Qose</p>
    <p class="src">Source: Cortez, P. (2008). Student Performance. UCI Machine Learning Repository. DOI: 10.24432/C5TG7T. Portuguese-language data, ${rows.length} students from two secondary schools. Descriptive associations, not causal effects. Findings may not generalise beyond this dataset.</p>
  </div>
</footer>
<script src="assets/site.js" defer></script>
</body>
</html>
`;
writeFileSync('index.html', html);
console.log('index.html written,', Math.round(html.length / 1024), 'KB');
