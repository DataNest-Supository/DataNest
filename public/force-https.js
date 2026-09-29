(function () {
  var location = window.location;
  var isDataNestPages = location.hostname === "datanest-supository.github.io";

  if (location.protocol === "http:" && isDataNestPages) {
    location.replace(
      "https://" +
        location.host +
        location.pathname +
        location.search +
        location.hash
    );
    return;
  }

  if (!isDataNestPages) return;

  var params = new URLSearchParams(location.search);
  var release = params.get("release");
  var reloadValue = params.get("_reload");
  var reloadAt = reloadValue ? Number(reloadValue) : NaN;
  var staleAfterMs = 15 * 60 * 1000;

  if (
    release &&
    Number.isFinite(reloadAt) &&
    Date.now() - reloadAt > staleAfterMs
  ) {
    params.delete("release");
    params.set("_reload", String(Date.now()));
    var query = params.toString();

    location.replace(
      location.protocol +
        "//" +
        location.host +
        location.pathname +
        (query ? "?" + query : "") +
        location.hash
    );
  }
})();
