(function () {
  var THEMES = ['tokyo', 'carbon', 'graphite', 'obsidian', 'slate', 'crimson', 'ash', 'original'];
  var STORAGE_KEY = 'indiTheme';

  var SWITCHER_CSS = [
    '#theme-switcher{position:fixed;bottom:1rem;right:1rem;z-index:9999;font-family:Inter,system-ui,sans-serif}',
    '#theme-switcher-toggle{width:42px;height:42px;border-radius:50%;background:#1a1d28;border:1px solid #2a3245;color:#d8dee9;font-size:1.15rem;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;transition:all .15s}',
    '#theme-switcher-toggle:hover{background:#252d40;border-color:#7aa2f7;color:#7aa2f7;transform:translateY(-1px)}',
    '#theme-switcher-menu{position:absolute;bottom:52px;right:0;background:#131826;border:1px solid #2a3245;border-radius:8px;padding:.35rem;min-width:150px;box-shadow:0 8px 28px rgba(0,0,0,.55)}',
    '#theme-switcher-menu[hidden]{display:none}',
    '#theme-switcher-menu button{display:block;width:100%;text-align:left;background:transparent;border:none;color:#8a93a8;padding:.45rem .7rem;border-radius:5px;cursor:pointer;font-size:.85rem;text-transform:capitalize;transition:background .1s,color .1s;font-family:inherit}',
    '#theme-switcher-menu button:hover{background:#252d40;color:#eef1f7}',
    '#theme-switcher-menu button.active{background:#252d40;color:#7aa2f7;font-weight:600}',
    '#theme-switcher-menu button.active::before{content:"● "}'
  ].join('');

  function injectSwitcherStyles() {
    if (document.getElementById('theme-switcher-styles')) return;
    var style = document.createElement('style');
    style.id = 'theme-switcher-styles';
    style.textContent = SWITCHER_CSS;
    (document.head || document.documentElement).appendChild(style);
  }
  injectSwitcherStyles();

  var params = new URLSearchParams(window.location.search);
  var urlTheme = params.get('theme');
  var stored = null;
  try { stored = localStorage.getItem(STORAGE_KEY); } catch (e) {}

  var initial = THEMES.indexOf(urlTheme) >= 0 ? urlTheme
              : THEMES.indexOf(stored) >= 0 ? stored
              : 'tokyo';
  function setStylesheetEnabled(enabled) {
    var link = document.getElementById('theme-local-css');
    if (link) link.disabled = !enabled;
  }

  document.documentElement.setAttribute('data-theme', initial);
  setStylesheetEnabled(initial !== 'original');

  if (urlTheme && THEMES.indexOf(urlTheme) >= 0) {
    try { localStorage.setItem(STORAGE_KEY, urlTheme); } catch (e) {}
  }

  function applyTheme(name) {
    document.documentElement.setAttribute('data-theme', name);
    setStylesheetEnabled(name !== 'original');
    try { localStorage.setItem(STORAGE_KEY, name); } catch (e) {}
    var btns = document.querySelectorAll('#theme-switcher-menu [data-theme-pick]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('active', btns[i].getAttribute('data-theme-pick') === name);
    }
  }

  function renderSwitcher() {
    if (document.getElementById('theme-switcher')) return;
    var current = document.documentElement.getAttribute('data-theme') || 'tokyo';
    var wrap = document.createElement('div');
    wrap.id = 'theme-switcher';

    var btnHtml = '';
    for (var i = 0; i < THEMES.length; i++) {
      var t = THEMES[i];
      btnHtml += '<button data-theme-pick="' + t + '"' + (t === current ? ' class="active"' : '') + '>' + t + '</button>';
    }
    wrap.innerHTML =
      '<button id="theme-switcher-toggle" title="Switch theme" aria-label="Switch theme">🎨</button>' +
      '<div id="theme-switcher-menu" hidden>' + btnHtml + '</div>';

    document.body.appendChild(wrap);

    var toggle = wrap.querySelector('#theme-switcher-toggle');
    var menu = wrap.querySelector('#theme-switcher-menu');

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      menu.hidden = !menu.hidden;
    });

    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) menu.hidden = true;
    });

    var picks = wrap.querySelectorAll('[data-theme-pick]');
    for (var j = 0; j < picks.length; j++) {
      picks[j].addEventListener('click', function (ev) {
        applyTheme(ev.currentTarget.getAttribute('data-theme-pick'));
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderSwitcher);
  } else {
    renderSwitcher();
  }
})();
