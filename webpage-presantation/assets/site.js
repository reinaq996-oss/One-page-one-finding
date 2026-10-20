(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Bars grow once, when their chart scrolls into view. */
  var charts = document.querySelectorAll('.chart, .change');
  charts.forEach(function (c) {
    c.querySelectorAll('.fill, .vfill, .stack i').forEach(function (el, i) {
      el.style.setProperty('--d', (i * 0.06) + 's');
    });
  });
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.25 });
    charts.forEach(function (c) { io.observe(c); });
  } else {
    charts.forEach(function (c) { c.classList.add('in'); });
  }

  /* Student dot plot: every dot is one student and moves between layouts. */
  var svg = document.getElementById('swarm');
  var dataEl = document.getElementById('swarm-data');
  if (!svg || !dataEl) return;
  var data = JSON.parse(dataEl.textContent);
  var dots = svg.querySelectorAll('#dots circle');
  var means = document.getElementById('means');
  var statBig = document.getElementById('stat-big');
  var statText = document.getElementById('stat-text');
  var buttons = document.querySelectorAll('.seg button');
  var NS = 'http://www.w3.org/2000/svg';

  function show(mode) {
    var L = data[mode];
    dots.forEach(function (c, i) {
      c.style.setProperty('--d', ((i % 24) * 0.012) + 's');
      c.style.transform = 'translate(' + L.pos[i][0] + 'px,' + L.pos[i][1] + 'px)';
      c.setAttribute('r', L.r);
      c.setAttribute('class', 'g' + L.grp[i]);
    });
    while (means.firstChild) means.removeChild(means.firstChild);
    L.means.forEach(function (m) {
      var g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'g' + m.grp);
      var line = document.createElementNS(NS, 'line');
      line.setAttribute('x1', m.x); line.setAttribute('x2', m.x);
      line.setAttribute('y1', m.y0); line.setAttribute('y2', m.y1);
      var t = document.createElementNS(NS, 'text');
      t.setAttribute('x', m.x + 8); t.setAttribute('y', m.y1 + 4);
      t.textContent = m.label;
      g.appendChild(line); g.appendChild(t);
      means.appendChild(g);
    });
    statBig.textContent = L.stat.big;
    statText.textContent = L.stat.text;
    buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.mode === mode)); });
  }
  buttons.forEach(function (b) { b.addEventListener('click', function () { show(b.dataset.mode); }); });
  show('all');
})();
