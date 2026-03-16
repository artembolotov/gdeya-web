(function () {
  var CHECK_URL = 'https://gdeya.bolotov.dev/geo/ru';
  var TIMEOUT_MS = 1500;
  var KEY = 'gdeya2026';
  var KEY_BYTES = new TextEncoder().encode(KEY);
  var resolvedAttr = null;
  var controller = null;

  function decode(encoded) {
    var binary = atob(encoded);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    for (var i = 0; i < bytes.length; i++) bytes[i] ^= KEY_BYTES[i % KEY_BYTES.length];
    return new TextDecoder().decode(bytes);
  }

  function revealElement(el) {
    el.style.transition = 'none';
    el.style.opacity = '0';
    el.innerHTML = decode(el.getAttribute(resolvedAttr));
    requestAnimationFrame(function () {
      el.style.transition = 'opacity 0.5s ease';
      el.style.opacity = '1';
    });
  }

  var observer = new MutationObserver(function (mutations) {
    if (!resolvedAttr) return;
    mutations.forEach(function (mutation) {
      mutation.addedNodes.forEach(function (node) {
        if (node.nodeType !== 1) return;
        if (node.hasAttribute('data-gdeya-ru')) revealElement(node);
        node.querySelectorAll('[data-gdeya-ru]').forEach(revealElement);
      });
    });
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });

  function reveal(attr) {
    if (attr === resolvedAttr) return;
    resolvedAttr = attr;
    document.querySelectorAll('[data-gdeya-ru]').forEach(revealElement);
  }

  function check() {
    if (controller) return;
    controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, TIMEOUT_MS);
    fetch(CHECK_URL, { method: 'HEAD', signal: controller.signal })
      .then(function (r) { if (!r.ok) throw r; })
      .then(function () { reveal('data-gdeya-intl'); })
      .catch(function () { reveal('data-gdeya-ru'); })
      .finally(function () { clearTimeout(timer); controller = null; });
  }

  check();

  window.addEventListener('online', check);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') check();
  });
})();
