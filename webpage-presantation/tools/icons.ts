/**
 * Isometric line icons, generated from geometry.
 * Faces are filled with CSS variables so each icon can be recoloured:
 *   --icon-ink   outline + shadow colour   (default #1d2b2a)
 *   --icon-top   top faces                 (default #fffdf8)
 *   --icon-side  left faces                (default #fffdf8)
 *   --icon-tint  accent faces              (default #d49c86)
 */
type Pt = [number, number];
const C = Math.cos(Math.PI / 6);
const S = 0.5;

class Canvas {
  parts: string[] = [];
  minX = Infinity; minY = Infinity; maxX = -Infinity; maxY = -Infinity;

  p(x: number, y: number, z = 0): Pt {
    const pt: Pt = [(x - y) * C, (x + y) * S - z];
    this.grow(pt[0], pt[1]);
    return pt;
  }
  grow(x: number, y: number) {
    this.minX = Math.min(this.minX, x); this.maxX = Math.max(this.maxX, x);
    this.minY = Math.min(this.minY, y); this.maxY = Math.max(this.maxY, y);
  }
  f(n: number) { return Math.round(n * 100) / 100; }
  poly(pts: Pt[], fill: string, extra = '') {
    pts.forEach((q) => this.grow(q[0], q[1]));
    const d = pts.map((q, i) => `${i ? 'L' : 'M'}${this.f(q[0])} ${this.f(q[1])}`).join('') + 'Z';
    this.parts.push(`<path d="${d}" fill="${fill}" ${extra}/>`);
  }
  line(a: Pt, b: Pt) {
    this.parts.push(`<path d="M${this.f(a[0])} ${this.f(a[1])}L${this.f(b[0])} ${this.f(b[1])}" fill="none"/>`);
  }
  path(d: string, fill: string, extra = '') {
    this.parts.push(`<path d="${d}" fill="${fill}" ${extra}/>`);
  }

  /** a box whose left-front corner sits at (x,y,z); w runs along x, d along y */
  box(x: number, y: number, z: number, w: number, d: number, h: number, o: { right?: 'ink' | 'tint' | 'plain'; top?: 'top' | 'tint'; shadow?: boolean } = {}) {
    const P = (a: number, b: number, c: number) => this.p(x + a, y + b, z + c);
    const sh: Pt = [11, 6];
    if (o.shadow) {
      const a = P(0, d, 0), b = P(w, d, 0), c = P(w, 0, 0);
      this.poly([a, b, c, [c[0] + sh[0], c[1] + sh[1]], [b[0] + sh[0], b[1] + sh[1]], [a[0] + sh[0], a[1] + sh[1]]], 'var(--icon-ink)', 'stroke="none"');
      this.grow(c[0] + sh[0], c[1] + sh[1]);
    }
    this.poly([P(0, d, 0), P(w, d, 0), P(w, d, h), P(0, d, h)], 'var(--icon-side)');
    const rf = o.right === 'tint' ? 'var(--icon-tint)' : o.right === 'plain' ? 'var(--icon-side)' : 'var(--icon-ink)';
    this.poly([P(w, 0, 0), P(w, d, 0), P(w, d, h), P(w, 0, h)], rf);
    this.poly([P(0, 0, h), P(w, 0, h), P(w, d, h), P(0, d, h)], o.top === 'tint' ? 'var(--icon-tint)' : 'var(--icon-top)');
  }

  /** vertical cylinder; (cx,cy) is the centre of the base disc */
  cyl(cx: number, cy: number, z: number, r: number, h: number, o: { shadow?: boolean; tint?: boolean } = {}) {
    const base = this.p(cx, cy, z), topc = this.p(cx, cy, z + h);
    const rx = r * C * Math.SQRT2, ry = r * S * Math.SQRT2;
    this.grow(base[0] - rx, base[1] + ry); this.grow(topc[0] + rx, topc[1] - ry);
    const [bx, by] = base, [tx, ty] = topc;
    const f = this.f.bind(this);
    if (o.shadow) {
      const dx = 11, dy = 6;
      this.path(`M${f(bx - rx + dx)} ${f(by + dy)}A${f(rx)} ${f(ry)} 0 0 0 ${f(bx + rx + dx)} ${f(by + dy)}L${f(bx + rx)} ${f(by)}L${f(bx - rx)} ${f(by)}Z`, 'var(--icon-ink)', 'stroke="none"');
      this.grow(bx + rx + dx, by + dy + ry);
    }
    this.path(`M${f(tx - rx)} ${f(ty)}L${f(bx - rx)} ${f(by)}A${f(rx)} ${f(ry)} 0 0 0 ${f(bx + rx)} ${f(by)}L${f(tx + rx)} ${f(ty)}`, 'var(--icon-side)');
    const th = (55 * Math.PI) / 180;
    const ex = bx + rx * Math.cos(th), eyb = by + ry * Math.sin(th), eyt = ty + ry * Math.sin(th);
    this.path(`M${f(bx + rx)} ${f(by)}A${f(rx)} ${f(ry)} 0 0 1 ${f(ex)} ${f(eyb)}L${f(ex)} ${f(eyt)}A${f(rx)} ${f(ry)} 0 0 0 ${f(tx + rx)} ${f(ty)}Z`, 'var(--icon-ink)', 'stroke="none"');
    this.parts.push(`<ellipse cx="${f(tx)}" cy="${f(ty)}" rx="${f(rx)}" ry="${f(ry)}" fill="${o.tint ? 'var(--icon-tint)' : 'var(--icon-top)'}"/>`);
  }

  /** point on a horizontal circle (centre cx,cy,z) at angle t */
  ring(cx: number, cy: number, z: number, r: number, t: number): Pt {
    return this.p(cx + r * Math.cos(t), cy + r * Math.sin(t), z);
  }

  svg(label: string) {
    const pad = 6;
    const w = this.maxX - this.minX + pad * 2, h = this.maxY - this.minY + pad * 2;
    const body = this.parts.join('')
      .replaceAll('var(--icon-ink)', 'var(--icon-ink,#1d2b2a)')
      .replaceAll('var(--icon-top)', 'var(--icon-top,#fffdf8)')
      .replaceAll('var(--icon-side)', 'var(--icon-side,#fffdf8)')
      .replaceAll('var(--icon-tint)', 'var(--icon-tint,#d49c86)');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${this.f(this.minX - pad)} ${this.f(this.minY - pad)} ${this.f(w)} ${this.f(h)}" role="img" aria-label="${label}" fill="none" stroke="var(--icon-ink, #1d2b2a)" stroke-width="2.1" stroke-linejoin="round" stroke-linecap="round">${body}</svg>`;
  }
}

function books() {
  const c = new Canvas();
  c.box(0, 0, 0, 64, 46, 9, { shadow: true });
  c.box(5, 3, 9, 58, 42, 8, { right: 'tint' });
  c.box(2, 4, 17, 60, 40, 9);
  // page lines on the front faces
  for (const [z, x0] of [[4.5, 0], [12.5, 5], [21.5, 2]] as const) {
    const y = z === 12.5 ? 45 : z === 21.5 ? 44 : 46;
    c.line(c.p(x0 + 8, y, z), c.p(x0 + 34, y, z));
  }
  // bookmark ribbon
  c.poly([c.p(46, 44, 26), c.p(52, 44, 26), c.p(52, 44, 12), c.p(49, 44, 16), c.p(46, 44, 12)], 'var(--icon-tint)');
  return c.svg('Stack of books');
}

function cap() {
  const c = new Canvas();
  c.cyl(26, 26, 0, 21, 28, { shadow: true });
  c.box(-6, -6, 28, 64, 64, 6, { right: 'ink' });
  const m = c.p(26, 26, 34);
  c.parts.push(`<circle cx="${c.f(m[0])}" cy="${c.f(m[1])}" r="2.8" fill="var(--icon-ink)"/>`);
  const t1 = c.p(58, 46, 34);
  c.path(`M${c.f(m[0])} ${c.f(m[1])}L${c.f(t1[0])} ${c.f(t1[1])}L${c.f(t1[0])} ${c.f(t1[1] + 24)}`, 'none');
  c.poly([[t1[0] - 4, t1[1] + 24], [t1[0] + 4, t1[1] + 24], [t1[0] + 5, t1[1] + 37], [t1[0] - 5, t1[1] + 37]], 'var(--icon-tint)');
  return c.svg('Graduation cap');
}

function clock() {
  const c = new Canvas();
  c.cyl(0, 0, 0, 30, 11, { shadow: true });
  const z = 11, cx = 0, cy = 0;
  for (let i = 0; i < 12; i++) {
    const t = (i / 12) * Math.PI * 2;
    c.line(c.ring(cx, cy, z, 24, t), c.ring(cx, cy, z, 27, t));
  }
  const m = c.p(cx, cy, z);
  const h1 = c.ring(cx, cy, z, 17, -Math.PI / 2 + 0.4), h2 = c.ring(cx, cy, z, 11, Math.PI / 6);
  c.parts.push(`<path d="M${c.f(m[0])} ${c.f(m[1])}L${c.f(h1[0])} ${c.f(h1[1])}M${c.f(m[0])} ${c.f(m[1])}L${c.f(h2[0])} ${c.f(h2[1])}" stroke-width="3.2" fill="none"/>`);
  // two little bells
  c.cyl(-22, -22, z - 2, 5, 9, { tint: true });
  c.cyl(22, -22, z - 2, 5, 9, { tint: true });
  return c.svg('Clock');
}

function bars() {
  const c = new Canvas();
  c.box(0, 0, 0, 22, 22, 24, { shadow: true, right: 'ink' });
  c.box(30, 0, 0, 22, 22, 44, { right: 'tint' });
  c.box(60, 0, 0, 22, 22, 70, { right: 'ink' });
  c.cyl(14, 48, 0, 11, 4, { tint: true });
  c.cyl(14, 48, 4, 11, 4);
  c.cyl(54, 52, 0, 11, 4);
  return c.svg('Rising bars and coins');
}

function house() {
  const c = new Canvas();
  const w = 64, d = 46, h = 30, rh = 20;
  c.box(0, 0, 0, w, d, h, { shadow: true, right: 'ink' });
  const ridgeY = d / 2;
  // roof: front slope (towards +y), gable on the x=w side
  c.poly([c.p(w, 0, h), c.p(w, d, h), c.p(w, ridgeY, h + rh)], 'var(--icon-ink)');
  c.poly([c.p(-4, d + 3, h - 1), c.p(w + 4, d + 3, h - 1), c.p(w + 4, ridgeY, h + rh), c.p(-4, ridgeY, h + rh)], 'var(--icon-tint)');
  // door + window on the front face
  c.poly([c.p(10, d, 0), c.p(24, d, 0), c.p(24, d, 20), c.p(10, d, 20)], 'var(--icon-top)');
  c.poly([c.p(36, d, 10), c.p(54, d, 10), c.p(54, d, 22), c.p(36, d, 22)], 'var(--icon-top)');
  c.line(c.p(45, d, 10), c.p(45, d, 22));
  c.cyl(78, 6, 0, 5, 18, { tint: false });
  return c.svg('House');
}

function calendar() {
  const c = new Canvas();
  const w = 66, d = 9, h = 58;
  c.box(0, 0, 0, w, d, h, { shadow: true, right: 'ink' });
  c.poly([c.p(0, d, h - 14), c.p(w, d, h - 14), c.p(w, d, h), c.p(0, d, h)], 'var(--icon-tint)');
  for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) {
    const x0 = 8 + k * 14, z0 = 8 + r * 11;
    c.poly([c.p(x0, d, z0), c.p(x0 + 8, d, z0), c.p(x0 + 8, d, z0 + 6), c.p(x0, d, z0 + 6)], r === 1 && k === 2 ? 'var(--icon-ink)' : 'var(--icon-top)');
  }
  for (const x of [14, 50]) { c.line(c.p(x, 4.5, h - 2), c.p(x, 4.5, h + 9)); }
  return c.svg('Calendar');
}

function scale() {
  const c = new Canvas();
  c.cyl(0, 0, 0, 17, 5, { shadow: true });
  c.box(-2.5, -2.5, 5, 5, 5, 52, { right: 'ink' });
  const z = 57;
  c.box(-38, -2.5, z, 76, 5, 4, { right: 'ink' });
  for (const x of [-34, 34]) {
    const top = c.p(x, 0, z), l = c.p(x - 9, 0, z - 26), r = c.p(x + 9, 0, z - 26);
    c.line(top, l); c.line(top, r);
    c.cyl(x, 0, z - 31, 13, 4, { tint: x > 0 });
  }
  return c.svg('Balance scale');
}

function lens() {
  const c = new Canvas();
  // handle
  c.box(26, -4, 0, 44, 8, 8, { right: 'ink' });
  const cx = 0, cy = 0;
  c.cyl(cx, cy, 0, 27, 8, { shadow: true });
  // hollow lens: inner ellipse
  const m = c.p(cx, cy, 8), r = 19;
  c.parts.push(`<ellipse cx="${c.f(m[0])}" cy="${c.f(m[1])}" rx="${c.f(r * C * Math.SQRT2)}" ry="${c.f(r * S * Math.SQRT2)}" fill="var(--icon-tint)"/>`);
  const a = c.ring(cx, cy, 8, 11, Math.PI * 1.15), b = c.ring(cx, cy, 8, 11, Math.PI * 1.45);
  c.parts.push(`<path d="M${c.f(a[0])} ${c.f(a[1])}Q${c.f(m[0] - 2)} ${c.f(m[1] - 7)} ${c.f(b[0])} ${c.f(b[1])}" fill="none" stroke="var(--icon-top)" stroke-width="2.4"/>`);
  return c.svg('Magnifying glass');
}

function pencil() {
  const c = new Canvas();
  c.box(0, 0, 0, 82, 9, 9, { shadow: true, right: 'ink' });
  c.poly([c.p(82, 0, 9), c.p(82, 9, 9), c.p(82, 9, 0), c.p(82, 0, 0)], 'var(--icon-ink)');
  const tip = c.p(104, 4.5, 4.5);
  c.poly([c.p(82, 9, 9), c.p(82, 9, 0), tip], 'var(--icon-top)');
  c.poly([c.p(82, 0, 9), c.p(82, 9, 9), tip], 'var(--icon-tint)');
  c.box(-13, 0, 0, 13, 9, 9, { right: 'tint', top: 'tint' });
  return c.svg('Pencil');
}

export const icons = { books, cap, clock, bars, house, calendar, scale, lens, pencil };
export type IconName = keyof typeof icons;
export const icon = (name: IconName) => icons[name]();
