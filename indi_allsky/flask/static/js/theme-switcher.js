(function () {
  var THEMES = ['tokyo', 'nord', 'dracula', 'catppuccin'];
  var STORAGE_KEY = 'indiTheme';

  var params = new URLSearchParams(window.location.search);
  var urlTheme = params.get('theme');
  var stored = null;
  try { stored = localStorage.getItem(STORAGE_KEY); } catch (e) {}

  var initial = THEMES.indexOf(urlTheme) >= 0 ? urlTheme
              : THEMES.indexOf(stored) >= 0 ? stored
              : 'tokyo';
  document.documentElement.setAttribute('data-theme', initial);

  if (urlTheme && THEMES.indexOf(urlTheme) >= 0) {
    try { localStorage.setItem(STORAGE_KEY, urlTheme); } catch (e) {}
  }

  function applyTheme(name) {
    document.documentElement.setAttribute('data-theme', name);
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
