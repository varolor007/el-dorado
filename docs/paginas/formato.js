(function () {
  var panel = document.getElementById("detail");
  var kind = document.getElementById("d-kind");
  var title = document.getElementById("d-title");
  var body = document.getElementById("d-body");
  var fresh = document.getElementById("d-new");
  var grid = document.getElementById("grid");
  var toggle = document.getElementById("only-new");
  var current = null;
  function close() {
    if (current) current.setAttribute("aria-pressed", "false");
    current = null;
    panel.hidden = true;
  }
  document.querySelectorAll(".grid .st").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
  document.addEventListener("click", function (e) {
    var b = e.target.closest(".grid .st");
    if (!b) return;
    if (current === b) { close(); return; }
    if (current) current.setAttribute("aria-pressed", "false");
    current = b;
    b.setAttribute("aria-pressed", "true");
    var isNew = b.classList.contains("new");
    kind.textContent = (b.getAttribute("data-kind") || "") + (isNew ? ". En prueba o por decidir" : "");
    title.textContent = b.getAttribute("data-t") || "";
    body.textContent = b.getAttribute("data-d") || "";
    var why = b.getAttribute("data-new");
    fresh.textContent = why || "";
    fresh.hidden = !why;
    panel.hidden = false;
  });
  document.getElementById("d-close").addEventListener("click", close);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  toggle.addEventListener("click", function () {
    var on = toggle.getAttribute("aria-pressed") !== "true";
    toggle.setAttribute("aria-pressed", on ? "true" : "false");
    grid.classList.toggle("only-new", on);
  });
})();
