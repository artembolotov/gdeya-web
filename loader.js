(function () {
  var CHECK_URL = 'https://gdeya.bolotov.dev/geo/ru';
  var TIMEOUT_MS = 3000;
  var KEY = 'gdeya2026';

  function decode(encoded) {
    var binary = atob(encoded);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    var keyBytes = new TextEncoder().encode(KEY);
    var result = new Uint8Array(bytes.length);
    for (var i = 0; i < bytes.length; i++) {
      result[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
    }
    return new TextDecoder().decode(result);
  }

  function reveal(attr) {
    document.querySelectorAll('[data-gdeya-ru]').forEach(function (el) {
      el.innerHTML = decode(el.getAttribute(attr));
      el.style.display = '';
    });
  }

  document.querySelectorAll('[data-gdeya-ru]').forEach(function (el) {
    el.style.display = 'none';
  });

  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, TIMEOUT_MS);

  fetch(CHECK_URL, { method: 'HEAD', signal: controller.signal })
    .then(function (r) { if (!r.ok) throw r; })
    .then(function () { reveal('data-gdeya-intl'); })
    .catch(function () { reveal('data-gdeya-ru'); })
    .finally(function () { clearTimeout(timer); });
})();