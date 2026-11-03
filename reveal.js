/* Site navigation and theme switch: the burger menu on phones, the Articles dropdown on desktop, and the dark theme button. */
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
