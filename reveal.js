/* Adds .in-view the first time an element scrolls into view:
   figure.chart (bars grow), figure.shots (screens flip in turn), and h1, h2
   (words rise one by one; the red full stop in an h1 pops in last). */
(function () {
  // Theme switch: the saved choice (or the system setting) is applied by the inline script in <head>; this handles the button.
  var root = document.documentElement, sw = document.querySelector(".theme"), tc = document.querySelector('meta[name="theme-color"]');
  var light = tc ? tc.getAttribute("content") : "";
  var paint = function () {
    var dark = root.getAttribute("data-theme") === "dark";
    if (tc) tc.setAttribute("content", dark ? "#171615" : light);
    if (sw) { sw.setAttribute("aria-pressed", dark ? "true" : "false"); sw.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme"); }
  };
  paint();
  if (sw) sw.addEventListener("click", function () {
    var dark = root.getAttribute("data-theme") !== "dark";
    if (dark) root.setAttribute("data-theme", "dark"); else root.removeAttribute("data-theme");
    try { localStorage.setItem("theme", dark ? "dark" : "light"); } catch (e) {}
    paint();
  });
  function splitWords(root) {
    var n = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (tok) {
            if (!tok) return;
            if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(tok)); return; }
            var w = document.createElement("span"), wi = document.createElement("span");
            w.className = "w"; wi.className = "wi"; wi.textContent = tok;
            wi.style.setProperty("--i", n++);
            w.setAttribute("aria-hidden", "true");
            w.appendChild(wi); frag.appendChild(w);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          if (root.tagName === "H1" && child.tagName === "SPAN" && child.parentNode.tagName === "EM") {
            child.classList.add("dot"); child.setAttribute("aria-hidden", "true");
          } else walk(child);
        }
      });
    })(root);
    root.style.setProperty("--n", n);
  }

  var heads = document.querySelectorAll("h1, h2");
  heads.forEach(function (h) {
    h.setAttribute("aria-label", h.textContent.replace(/\s+/g, " ").trim());
    splitWords(h);
    h.classList.add("split");
  });

  // the second group, with a small square travelling along every line. Lines are measured from the layout, so
  // they follow the side-by-side and the stacked arrangement.
  function wireMap(map) {
    var NS = "http://www.w3.org/2000/svg", CYCLE = 2600;
    var gIn = map.querySelector(".g.in"), hub = map.querySelector(".hub"), gOut = map.querySelector(".g.out");
    if (!gIn || !hub || !gOut || !map.animate) return;
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "wires"); svg.setAttribute("aria-hidden", "true");
    map.insertBefore(svg, map.firstChild);
    map.classList.add("wired");
    var still = window.matchMedia("(prefers-reduced-motion:reduce)");
    var dots = [], running = false, first = true;
    var box = function (el) {
      var x = 0, y = 0, n = el;
      while (n && n !== map) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
      return { l: x, t: y, r: x + el.offsetWidth, b: y + el.offsetHeight, cx: x + el.offsetWidth / 2, cy: y + el.offsetHeight / 2 };
    };
    var centres = function (group, key) {
      var seen = [];
      group.querySelectorAll("li").forEach(function (li) {
        var v = Math.round(box(li)[key]);
        if (!seen.some(function (s) { return Math.abs(s - v) < 4; })) seen.push(v);
      });
      return seen.sort(function (a, b) { return a - b; });
    };
    function draw() {
      var a = box(gIn), h = box(hub), b = box(gOut), side = h.l >= a.r, lines = [];
      if (side) {
        var s1 = (h.l - a.r) * 0.3, s2 = (b.l - h.r) * 0.3;
        centres(gIn, "cy").forEach(function (y) { lines.push({ d: "M" + a.r + " " + y + "H" + (a.r + s1) + "L" + h.l + " " + h.cy, out: false }); });
        centres(gOut, "cy").forEach(function (y) { lines.push({ d: "M" + h.r + " " + h.cy + "L" + (b.l - s2) + " " + y + "H" + b.l, out: true }); });
      } else {
        var v1 = (h.t - a.b) * 0.3, v2 = (b.t - h.b) * 0.3;
        centres(gIn, "cx").forEach(function (x) { lines.push({ d: "M" + x + " " + a.b + "V" + (a.b + v1) + "L" + h.cx + " " + h.t, out: false }); });
        centres(gOut, "cx").forEach(function (x) { lines.push({ d: "M" + h.cx + " " + h.b + "L" + x + " " + (b.t - v2) + "V" + b.t, out: true }); });
      }
      dots.forEach(function (d) { d.remove(); });
      dots = [];
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var nIn = 0, nOut = 0;
      lines.forEach(function (ln) {
        var p = document.createElementNS(NS, "path");
        p.setAttribute("d", ln.d); p.setAttribute("pathLength", "1");
        if (ln.out) p.setAttribute("class", "out");
        svg.appendChild(p);
        if (still.matches) return;
        var dot = document.createElement("i");
        dot.className = "wire-dot";
        dot.style.offsetPath = 'path("' + ln.d + '")';
        dot.wait = ln.out ? CYCLE / 2 + 200 + 220 * nOut++ : 140 * nIn++;
        map.appendChild(dot);
        dots.push(dot);
      });
      if (running) run(0);
    }
    function run(lead) {
      running = true;
      dots.forEach(function (dot) {
        dot.animate([
          { offsetDistance: "0%", opacity: 1 },
          { offsetDistance: "100%", opacity: 1, offset: 0.5 },
          { offsetDistance: "100%", opacity: 0, offset: 0.51 },
          { offsetDistance: "100%", opacity: 0 }
        ], { duration: CYCLE, iterations: Infinity, delay: lead + dot.wait });
      });
    }
    draw();
    var started = function () {
      if (running || !map.classList.contains("in-view")) return;
      run(first ? 1700 : 0);
      setTimeout(function () { map.classList.add("settled"); }, 2200);
      first = false;
    };
    if ("MutationObserver" in window) new MutationObserver(started).observe(map, { attributes: true, attributeFilter: ["class"] });
    if ("ResizeObserver" in window) {
      var w = map.offsetWidth, ht = map.offsetHeight, raf;
      new ResizeObserver(function () {
        if (map.offsetWidth === w && map.offsetHeight === ht) return;
        w = map.offsetWidth; ht = map.offsetHeight;
        cancelAnimationFrame(raf); raf = requestAnimationFrame(draw);
      }).observe(map);
    }
    var again = function () { draw(); };
    if (still.addEventListener) still.addEventListener("change", again); else still.addListener(again);
  }
  var cmap = document.querySelector("figure.map");
  if (cmap) wireMap(cmap);

  // Contact lanes: one curved line from the source box to each link, with a small square travelling along it.
  function wirePipe(pipe) {
    var NS = "http://www.w3.org/2000/svg", LOOP = 2400;
    var src = pipe.querySelector(".src"), ends = pipe.querySelectorAll("a");
    if (!src || !ends.length || !pipe.animate) return;
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "wires"); svg.setAttribute("aria-hidden", "true");
    pipe.insertBefore(svg, pipe.firstChild);
    var still = window.matchMedia("(prefers-reduced-motion:reduce)");
    var dots = [], running = false;
    var box = function (el) {
      var x = 0, y = 0, n = el;
      while (n && n !== pipe) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
      return { l: x, r: x + el.offsetWidth, cy: y + el.offsetHeight / 2 };
    };
    function run() {
      dots.forEach(function (dot, i) {
        dot.animate([{ offsetDistance: "0%", opacity: 1 }, { offsetDistance: "100%", opacity: 1 }],
          { duration: LOOP, iterations: Infinity, delay: -i * LOOP / dots.length });
      });
    }
    function draw() {
      var s = box(src);
      dots.forEach(function (d) { d.remove(); });
      dots = [];
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      ends.forEach(function (a) {
        var e = box(a), mid = (s.r + e.l) / 2, k = Math.min(60, (e.l - s.r) * 0.3);
        var d = "M" + s.r + " " + s.cy + "H" + (mid - k) + "C" + mid + " " + s.cy + " " + mid + " " + e.cy + " " + (mid + k) + " " + e.cy + "H" + e.l;
        var p = document.createElementNS(NS, "path");
        p.setAttribute("d", d); p.setAttribute("pathLength", "1");
        svg.appendChild(p);
        if (still.matches) return;
        var dot = document.createElement("i");
        dot.className = "wire-dot";
        dot.style.offsetPath = 'path("' + d + '")';
        pipe.appendChild(dot);
        dots.push(dot);
      });
      if (running) run();
    }
    draw();
    var seen = false;
    var started = function () {
      if (seen || !pipe.classList.contains("in-view")) return;
      seen = true;
      setTimeout(function () { pipe.classList.add("settled"); running = true; run(); }, 1100);
    };
    if ("MutationObserver" in window) new MutationObserver(started).observe(pipe, { attributes: true, attributeFilter: ["class"] });
    if ("ResizeObserver" in window) {
      var w = pipe.offsetWidth, ht = pipe.offsetHeight, raf;
      new ResizeObserver(function () {
        if (pipe.offsetWidth === w && pipe.offsetHeight === ht) return;
        w = pipe.offsetWidth; ht = pipe.offsetHeight;
        cancelAnimationFrame(raf); raf = requestAnimationFrame(draw);
      }).observe(pipe);
    }
    var again = function () { draw(); };
    if (still.addEventListener) still.addEventListener("change", again); else still.addListener(again);
  }
  var cpipe = document.querySelector("nav.pipe");
  if (cpipe) wirePipe(cpipe);

  // with a small square travelling along every line.
  function wireGraph(fig) {
    var NS = "http://www.w3.org/2000/svg", LOOP = 4200;
    var rows = Array.prototype.slice.call(fig.querySelectorAll("ol > li"));
    if (rows.length < 2 || !fig.animate) return;
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "wires"); svg.setAttribute("aria-hidden", "true");
    fig.insertBefore(svg, fig.firstChild);
    var still = window.matchMedia("(prefers-reduced-motion:reduce)");
    var dots = [], running = false;
    var centre = function (el) {
      var x = 0, y = 0, n = el;
      while (n && n !== fig) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
      return { x: x + el.offsetWidth / 2, y: y + el.offsetHeight / 2 };
    };
    function run() {
      dots.forEach(function (dot) { dot.animate(dot.frames, { duration: LOOP, iterations: Infinity, delay: dot.wait }); });
    }
    function draw() {
      var pts = rows.map(function (li) { var c = centre(li.querySelector(".node")); c.main = li.classList.contains("main"); c.merge = li.classList.contains("merge"); return c; });
      var mains = pts.filter(function (p) { return p.main; });
      var top = mains[0], end = mains[mains.length - 1], span = end.y - top.y || 1, lines = [];
      lines.push({ d: "M" + top.x + " " + top.y + "V" + end.y, cls: "", wait: 0, frames: [{ offsetDistance: "0%", opacity: 1 }, { offsetDistance: "100%", opacity: 1 }] });
      pts.forEach(function (p, i) {
        if (p.main) return;
        var a, b, j;
        if (p.merge) { for (j = i + 1; j < pts.length && !pts[j].main; j++); a = p; b = pts[j]; }
        else { for (j = i - 1; j >= 0 && !pts[j].main; j--); a = pts[j]; b = p; }
        if (!a || !b) return;
        var k = (b.y - a.y) / 2, part = Math.min(0.4, (b.y - a.y) / span);
        var at = p.merge ? (b.y - top.y) / span - part : (a.y - top.y) / span;
        lines.push({
          d: "M" + a.x + " " + a.y + "C" + a.x + " " + (a.y + k) + " " + b.x + " " + (b.y - k) + " " + b.x + " " + b.y,
          cls: p.merge ? "merge" : "drop", wait: LOOP * at,
          frames: [{ offsetDistance: "0%", opacity: 1 }, { offsetDistance: "100%", opacity: 1, offset: part }, { offsetDistance: "100%", opacity: 0, offset: Math.min(0.99, part + (p.merge ? 0.01 : 0.12)) }, { offsetDistance: "100%", opacity: 0 }]
        });
      });
      dots.forEach(function (d) { d.remove(); });
      dots = [];
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      lines.forEach(function (ln) {
        var p = document.createElementNS(NS, "path");
        p.setAttribute("d", ln.d);
        if (ln.cls) p.setAttribute("class", ln.cls);
        svg.appendChild(p);
        if (still.matches) return;
        var dot = document.createElement("i");
        dot.className = "wire-dot";
        dot.style.offsetPath = 'path("' + ln.d + '")';
        dot.frames = ln.frames; dot.wait = ln.wait;
        fig.appendChild(dot);
        dots.push(dot);
      });
      if (running) run();
    }
    draw();
    var started = function () {
      if (running || !fig.classList.contains("in-view")) return;
      running = true; run();
    };
    if ("MutationObserver" in window) new MutationObserver(started).observe(fig, { attributes: true, attributeFilter: ["class"] });
    if ("ResizeObserver" in window) {
      var w = fig.offsetWidth, ht = fig.offsetHeight, raf;
      new ResizeObserver(function () {
        if (fig.offsetWidth === w && fig.offsetHeight === ht) return;
        w = fig.offsetWidth; ht = fig.offsetHeight;
        cancelAnimationFrame(raf); raf = requestAnimationFrame(draw);
      }).observe(fig);
    }
    var again = function () { draw(); };
    if (still.addEventListener) still.addEventListener("change", again); else still.addListener(again);
  }
  var cgraph = document.querySelector("figure.gitgraph");
  if (cgraph) wireGraph(cgraph);

  var items = document.querySelectorAll("figure.chart, figure.gitgraph, figure.shots, ul.verdicts, ul.stats, ol.flow, figure.map, nav.pipe, div.spanbar, h1, h2");
  if (!("IntersectionObserver" in window)) {
    items.forEach(function (el) { el.classList.add("in-view"); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add("in-view"); io.unobserve(e.target); }
    });
  }, { threshold: 0.2, rootMargin: "0px 0px -8% 0px" });
  items.forEach(function (el) { io.observe(el); });

  var burger = document.querySelector(".burger");
  if (burger) {
    var hdr = burger.closest("header");
    var setMenu = function (open) {
      hdr.classList.toggle("menu-open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    };
    burger.addEventListener("click", function () { setMenu(!hdr.classList.contains("menu-open")); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && hdr.classList.contains("menu-open")) { setMenu(false); burger.focus(); }
    });
  }

  // Articles dropdown: click or keyboard on desktop, always expanded inside the phone menu.
  var menu = document.querySelector("header nav .menu");
  if (menu) {
    var btn = menu.querySelector(".menu-btn");
    var narrow = window.matchMedia("(max-width:860px)");
    var setOpen = function (open) {
      menu.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    };
    btn.addEventListener("click", function () { setOpen(!menu.classList.contains("open")); });
    document.addEventListener("click", function (e) {
      if (!narrow.matches && !menu.contains(e.target)) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !narrow.matches && menu.classList.contains("open")) { setOpen(false); btn.focus(); }
    });
    var sync = function () { setOpen(narrow.matches); };
    sync();
    if (narrow.addEventListener) narrow.addEventListener("change", sync); else narrow.addListener(sync);
  }
})();
