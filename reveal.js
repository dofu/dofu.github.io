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

  var items = document.querySelectorAll("figure.chart, figure.shots, ul.verdicts, ul.stats, ol.flow, figure.map, div.spanbar, h1, h2");
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
