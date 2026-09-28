(function () {
  if (
    window.location.protocol === "http:" &&
    window.location.hostname === "datanest-supository.github.io"
  ) {
    window.location.replace(
      "https://" +
        window.location.host +
        window.location.pathname +
        window.location.search +
        window.location.hash
    );
  }
})();
