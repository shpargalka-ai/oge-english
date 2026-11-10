/* ОГЭ English — база промптов: карточки, фильтры, поиск, избранное.
   Карточки (PromptCards) используются ещё и на странице «Мои промпты». */
(function () {
  'use strict';

  var App = window.App;
  var F = window.FIELDS;
  var PROMPTS = window.PROMPTS || [];

  /* ---------- Карточка промпта ---------- */

  function placeholderHint(key) {
    var ph = F.placeholders[key];
    return ph ? ph.hint : key;
  }

  // Текст для копирования: {{тема}} → [впиши: тему, правило или задание]
  function copyText(p) {
    return p.template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, function (_, key) {
      return '[впиши: ' + placeholderHint(key) + ']';
    });
  }

  function templateHtml(p) {
    return p.template.split(/\{\{\s*([^}]+?)\s*\}\}/).map(function (part, i) {
      if (i % 2 === 0) return App.escape(part);
      return '<span class="ph">' + App.escape(placeholderHint(part)) + '</span>';
    }).join('');
  }

  function render(p) {
    var fav = App.favs.has(p.id);
    var tags = '<span class="tag tag-accent">' + App.escape(p.section) + '</span>' +
      '<span class="tag">' + App.escape(p.help) + '</span>' +
      (p.duration ? '<span class="tag">' + App.icon('clock') + p.duration + ' мин</span>' : '');
    var tips = (p.tips || []).map(function (t) { return '<li>' + App.escape(t) + '</li>'; }).join('');
    var ex = p.example || {};

    return '<article class="card prompt-card" id="p-' + App.escape(p.id) + '" data-id="' + App.escape(p.id) + '" aria-labelledby="t-' + App.escape(p.id) + '">' +
      '<div class="prompt-card-top">' + App.genreBadge(p.section) + '<div class="tags">' + tags + '</div></div>' +
      '<h3 id="t-' + App.escape(p.id) + '">' + App.escape(p.title) + '</h3>' +
      '<p class="summary">' + App.escape(p.summary) + '</p>' +
      '<details><summary>Текст промпта</summary><pre class="prompt-text">' + templateHtml(p) + '</pre></details>' +
      (tips ? '<p class="tips-title">Что дописать и как пользоваться</p><ul class="tips">' + tips + '</ul>' : '') +
      (ex.before ? '<details><summary>Пример: было → стало</summary><div class="example-grid">' +
        '<p><b>Было</b>' + App.escape(ex.before) + '</p>' +
        '<p><b>Стало</b>' + App.escape(ex.after) + '</p>' +
        '<p><b>Что получается</b>' + App.escape(ex.result) + '</p></div></details>' : '') +
      '<div class="btn-row">' +
        '<button type="button" class="btn btn-primary btn-sm" data-action="copy">' + App.icon('copy') + 'Скопировать</button>' +
        '<a class="btn btn-outline btn-sm" href="constructor.html?id=' + encodeURIComponent(p.id) + '">' + App.icon('wand') + 'Открыть в конструкторе</a>' +
        '<button type="button" class="btn btn-outline btn-sm" data-action="fav" aria-pressed="' + fav + '">' + App.icon('star') + '<span>' + (fav ? 'В избранном' : 'В избранное') + '</span></button>' +
        '<button type="button" class="icon-btn" data-action="print" aria-label="Распечатать карточку «' + App.escape(p.title) + '»" title="Распечатать">' + App.icon('print') + '</button>' +
      '</div>' +
    '</article>';
  }

  function find(id) {
    for (var i = 0; i < PROMPTS.length; i++) if (PROMPTS[i].id === id) return PROMPTS[i];
    return null;
  }

  function printCard(card) {
    document.body.classList.add('print-one');
    card.classList.add('is-printing');
    var cleanup = function () {
      document.body.classList.remove('print-one');
      card.classList.remove('is-printing');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
    setTimeout(cleanup, 1000);
  }

  // Обработка кнопок внутри контейнера с карточками. onFavChange — необязательный колбэк.
  function bind(container, onFavChange) {
    container.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      var card = btn.closest('.prompt-card');
      var p = card && find(card.getAttribute('data-id'));
      if (!p) return;
      var action = btn.getAttribute('data-action');
      if (action === 'copy') {
        App.copy(copyText(p), 'Скопировано. Допиши места в [скобках]');
      } else if (action === 'fav') {
        var on = App.favs.toggle(p.id);
        btn.setAttribute('aria-pressed', on);
        btn.querySelector('span').textContent = on ? 'В избранном' : 'В избранное';
        App.toast(on ? 'Добавлено в избранное' : 'Убрано из избранного', 'star');
        if (onFavChange) onFavChange(p, on);
      } else if (action === 'print') {
        printCard(card);
      }
    });
  }

  window.PromptCards = { render: render, bind: bind, copyText: copyText, find: find };

  /* ---------- Страница базы промптов ---------- */

  var list = document.getElementById('prompt-list');
  var filtersForm = document.getElementById('filters');
  if (!list || !filtersForm) return;

  var el = {
    q: document.getElementById('q'),
    section: document.getElementById('f-section'),
    help: document.getElementById('f-help'),
    time: document.getElementById('f-time'),
    fav: document.getElementById('f-fav'),
    count: document.getElementById('results-count'),
    empty: document.getElementById('empty'),
    emptyText: document.getElementById('empty-text')
  };

  var TIMES = [
    { value: 'short', label: 'До 15 минут', test: function (d) { return d <= 15; } },
    { value: 'mid', label: '20–30 минут', test: function (d) { return d >= 20 && d <= 30; } },
    { value: 'long', label: 'Больше 30 минут', test: function (d) { return d > 30; } }
  ];

  function options(select, placeholder, items) {
    select.innerHTML = '<option value="">' + App.escape(placeholder) + '</option>' + items.map(function (it) {
      var v = typeof it === 'object' ? it.value : it;
      var l = typeof it === 'object' ? it.label : it;
      return '<option value="' + App.escape(v) + '">' + App.escape(l) + '</option>';
    }).join('');
  }

  function unique(field, preferredOrder) {
    var seen = {}, result = [];
    (preferredOrder || []).forEach(function (v) {
      if (PROMPTS.some(function (p) { return p[field] === v; }) && !seen[v]) { seen[v] = 1; result.push(v); }
    });
    PROMPTS.forEach(function (p) {
      if (!seen[p[field]]) { seen[p[field]] = 1; result.push(p[field]); }
    });
    return result;
  }

  options(el.section, 'Все разделы', unique('section', F.sections.map(function (s) { return s.id; })));
  options(el.help, 'Любая помощь', unique('help', F.help.map(function (h) { return h.id; })));
  options(el.time, 'Любое время', TIMES);

  function norm(s) {
    return String(s || '').toLowerCase().replace(/ё/g, 'е');
  }

  // Строка для поиска по каждой карточке — считаем один раз
  var haystack = {};
  PROMPTS.forEach(function (p) {
    haystack[p.id] = norm([p.title, p.summary, p.section, p.help, (p.tips || []).join(' '), p.template].join(' '));
  });

  function matches(p) {
    if (el.section.value && p.section !== el.section.value) return false;
    if (el.help.value && p.help !== el.help.value) return false;
    if (el.time.value && p.duration) {
      var t = TIMES.filter(function (x) { return x.value === el.time.value; })[0];
      if (t && !t.test(p.duration)) return false;
    }
    if (el.fav.checked && !App.favs.has(p.id)) return false;
    var q = norm(el.q.value).trim();
    if (q) {
      var words = q.split(/\s+/);
      for (var i = 0; i < words.length; i++) if (haystack[p.id].indexOf(words[i]) === -1) return false;
    }
    return true;
  }

  function anyFilter() {
    return !!(el.q.value.trim() || el.section.value || el.help.value || el.time.value || el.fav.checked);
  }

  function apply() {
    var found = PROMPTS.filter(matches);
    list.innerHTML = found.map(render).join('');
    var n = found.length;
    el.count.textContent = 'Найдено ' + n + ' ' + App.plural(n, 'промпт', 'промпта', 'промптов');
    el.empty.hidden = n !== 0;
    if (n === 0) {
      el.emptyText.textContent = el.fav.checked && !App.favs.list().length
        ? 'В избранном пока пусто. Нажми «В избранное» на любой карточке — и она появится здесь.'
        : 'Попробуй убрать один из фильтров — или собери свой промпт в конструкторе.';
    }
    document.getElementById('reset-filters').hidden = !anyFilter();
  }

  function reset() {
    filtersForm.reset();
    apply();
    el.q.focus();
  }

  filtersForm.addEventListener('input', apply);
  filtersForm.addEventListener('change', apply);
  document.getElementById('reset-filters').addEventListener('click', reset);
  document.getElementById('empty-reset').addEventListener('click', reset);
  bind(list, function () { if (el.fav.checked) apply(); });

  if (App.qs('fav') === '1') el.fav.checked = true;
  // prompts.html?section=… — переход из полосы разделов на главной
  var sectionParam = App.qs('section');
  if (sectionParam) el.section.value = sectionParam;
  apply();
  if (location.hash) {
    var target = document.getElementById(location.hash.slice(1));
    if (target) target.scrollIntoView();
  }
})();
