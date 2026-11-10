/* ОГЭ English — конструктор промпта.
   Форма → состояние → шаблон с {{плейсхолдерами}} → живое превью.
   Незаполненные плейсхолдеры подсвечиваются жёлтым, в копии остаются в [квадратных скобках]. */
(function () {
  'use strict';

  var App = window.App;
  var F = window.FIELDS;
  var PROMPTS = window.PROMPTS || [];
  var LINKS = window.LINKS || { ai: [] };

  var form = document.getElementById('builder-form');
  var preview = document.getElementById('preview');
  var gapCounter = document.getElementById('gap-counter');
  var templateSelect = document.getElementById('template');

  var UNIVERSAL = 'universal';
  var DEFAULT_OUTPUTS = ['rule', 'examples', 'tasks', 'answers'];
  var DEFAULT_EXPLAIN = ['ru', 'hint'];

  /* ---------- Состояние ---------- */

  function defaultState() {
    return {
      template: UNIVERSAL,
      section: '',
      help: '',
      topic: '',
      level: '',
      duration: '',
      weeks: '',
      explain: DEFAULT_EXPLAIN.slice(),
      outputs: DEFAULT_OUTPUTS.slice(),
      text: ''
    };
  }

  var state = defaultState();

  function findPrompt(id) {
    for (var i = 0; i < PROMPTS.length; i++) if (PROMPTS[i].id === id) return PROMPTS[i];
    return null;
  }

  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  /* ---------- Построение формы из data.js ---------- */

  function chip(name, value, label) {
    return '<label class="chip"><input type="radio" name="' + name + '" value="' + App.escape(value) + '"><span>' + App.escape(label) + '</span></label>';
  }

  function check(name, value, label) {
    return '<label class="check"><input type="checkbox" name="' + name + '" value="' + App.escape(value) + '"><span>' + App.escape(label) + '</span></label>';
  }

  function buildForm() {
    var html = '<option value="' + UNIVERSAL + '">Универсальный — собирается из формы</option>';
    var groups = {}, order = [];
    PROMPTS.forEach(function (p) {
      if (!groups[p.section]) { groups[p.section] = []; order.push(p.section); }
      groups[p.section].push(p);
    });
    order.forEach(function (section) {
      html += '<optgroup label="' + App.escape(section) + '">';
      groups[section].forEach(function (p) {
        html += '<option value="' + App.escape(p.id) + '">' + App.escape(p.title) + '</option>';
      });
      html += '</optgroup>';
    });
    templateSelect.innerHTML = html;

    document.getElementById('section-chips').innerHTML = F.sections.map(function (s) { return chip('section', s.id, s.id); }).join('');
    document.getElementById('help-chips').innerHTML = F.help.map(function (h) { return chip('help', h.id, h.id); }).join('');
    document.getElementById('level-chips').innerHTML = F.levels.map(function (l) { return chip('level', l.id, l.id); }).join('');
    document.getElementById('duration-chips').innerHTML = F.durations.map(function (d) { return chip('duration', d, d); }).join('');
    document.getElementById('explain').innerHTML = F.explain.map(function (x) { return check('explain', x.id, x.label); }).join('');
    document.getElementById('outputs').innerHTML = F.outputs.map(function (o) { return check('outputs', o.id, o.label); }).join('');

    document.getElementById('ai-buttons').innerHTML = LINKS.ai.map(function (ai) {
      return '<a class="btn btn-outline" data-ai="' + App.escape(ai.id) + '" href="' + App.escape(ai.url) + '" target="_blank" rel="noopener noreferrer" title="' + App.escape(ai.note || '') + '">' +
        App.icon('external') + '<span class="visually-hidden">Открыть </span>' + App.escape(ai.name) + '<span class="visually-hidden"> (в новой вкладке)</span></a>';
    }).join('');

    document.getElementById('refine-list').innerHTML = F.refine.map(function (r, i) {
      return '<button type="button" class="btn" data-refine="' + i + '">' + App.icon('copy') + App.escape(r.label) + '</button>';
    }).join('');
  }

  /* ---------- Форма ⇄ состояние ---------- */

  function radioValue(name) {
    var el = form.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : '';
  }

  function checkedValues(name) {
    return Array.prototype.map.call(form.querySelectorAll('input[name="' + name + '"]:checked'), function (el) { return el.value; });
  }

  function readForm() {
    state.template = templateSelect.value;
    state.section = radioValue('section');
    state.help = radioValue('help');
    state.topic = form.topic.value;
    state.level = radioValue('level');
    state.duration = radioValue('duration');
    state.weeks = form.weeks.value;
    state.explain = checkedValues('explain');
    state.outputs = checkedValues('outputs');
    state.text = form.text.value;
  }

  function setRadio(name, value) {
    var inputs = form.querySelectorAll('input[name="' + name + '"]');
    for (var i = 0; i < inputs.length; i++) inputs[i].checked = String(inputs[i].value) === String(value);
  }

  function setChecks(name, values) {
    var inputs = form.querySelectorAll('input[name="' + name + '"]');
    for (var i = 0; i < inputs.length; i++) inputs[i].checked = values.indexOf(inputs[i].value) !== -1;
  }

  function writeForm() {
    templateSelect.value = findPrompt(state.template) ? state.template : UNIVERSAL;
    setRadio('section', state.section);
    setRadio('help', state.help);
    form.topic.value = state.topic;
    setRadio('level', state.level);
    setRadio('duration', state.duration);
    form.weeks.value = state.weeks;
    setChecks('explain', state.explain);
    setChecks('outputs', state.outputs);
    form.text.value = state.text;
  }

  /* ---------- Значения для плейсхолдеров ---------- */

  function upperFirst(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }

  function values() {
    var level = byId(F.levels, state.level);
    var explain = state.explain.map(function (id) { var x = byId(F.explain, id); return x ? x.text : ''; }).filter(Boolean);
    var outputs = state.outputs.map(function (id) { return byId(F.outputs, id); }).filter(Boolean);
    return {
      'раздел': state.section,
      'помощь': state.help ? state.help.toLowerCase() : '',
      'тема': state.topic.trim(),
      'уровень': level ? level.text : '',
      'время': state.duration,
      'недели': String(state.weeks).trim(),
      'объяснение': explain.join('; '),
      'формат': outputs.map(function (o, i) { return (i + 1) + '. ' + upperFirst(o.text) + '.'; }).join('\n'),
      'текст': state.text.trim()
    };
  }

  /* ---------- Универсальный шаблон ---------- */

  function universalTemplate() {
    var help = byId(F.help, state.help);
    var section = byId(F.sections, state.section);
    var L = [];
    L.push('Ты — опытный преподаватель английского языка и эксперт ОГЭ. Ты готовишь девятиклассников к экзамену: объясняешь просто, по делу и без снисходительности.');
    L.push('');
    L.push('Контекст:');
    L.push('— Раздел ОГЭ: {{раздел}}');
    L.push('— Тема или задание: {{тема}}');
    L.push('— Мой уровень: {{уровень}}');
    L.push('— Сколько у меня времени: {{время}} минут');
    L.push('— Как мне удобнее: {{объяснение}}');
    L.push('');
    L.push('Задача: ' + (help ? help.line : '{{помощь}}.'));
    if (section) L.push('Как устроено это на ОГЭ (по демоверсии ФИПИ): ' + section.note);
    L.push('');
    L.push('Ограничения:');
    L.push('— Опирайся на формат ОГЭ по английскому языку. Если в чём-то не уверен — прямо скажи, не выдумывай.');
    L.push('— Объяснения — по-русски, примеры и задания — на английском.');
    L.push('— Не выполняй задания за меня: сначала подсказка, правильные ответы — только в самом конце.');
    L.push('— Всё должно укладываться в {{время}} минут занятий.');
    if (state.section.indexOf('Аудирование') === 0) {
      L.push('— Ты не можешь включить аудио, поэтому тексты для прослушивания дай отдельным блоком после вопросов: я прочитаю их вслух или включу озвучку.');
    }
    L.push('');
    L.push('Формат ответа — по порядку:');
    L.push('{{формат}}');
    if (state.text.trim() || state.help === 'Проверить мой ответ' || state.help === 'Разобрать ошибки') {
      L.push('');
      L.push('Мой текст (мои ответы):');
      L.push('«{{текст}}»');
    }
    L.push('');
    L.push('Критерии качества:');
    L.push('— Каждое правило проиллюстрировано примером.');
    L.push('— Задания похожи на настоящие задания ОГЭ по формату и сложности.');
    L.push('— В конце — что повторить в следующий раз.');
    L.push('');
    L.push('Если тебе не хватает информации — задай мне до 3 уточняющих вопросов, прежде чем отвечать.');
    return L.join('\n');
  }

  function currentTemplate() {
    var p = findPrompt(state.template);
    return p ? p.template : universalTemplate();
  }

  function templateKeys(tpl) {
    var keys = {};
    tpl.replace(/\{\{\s*([^}]+?)\s*\}\}/g, function (_, k) { keys[k] = true; return _; });
    return keys;
  }

  /* ---------- Сборка промпта ---------- */

  function hintFor(key) {
    var ph = F.placeholders[key];
    return 'здесь лучше дописать: ' + (ph ? ph.hint : key);
  }

  // Возвращает { html, text, missing: [ключи] }
  function assemble() {
    var vals = values();
    var parts = currentTemplate().split(/\{\{\s*([^}]+?)\s*\}\}/);
    var html = '', text = '', missing = [];
    for (var i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        html += App.escape(parts[i]);
        text += parts[i];
        continue;
      }
      var key = parts[i];
      var v = vals[key];
      if (v) {
        html += App.escape(v);
        text += v;
      } else {
        var hint = hintFor(key);
        html += '<mark class="gap" data-key="' + App.escape(key) + '" title="Нажми, чтобы заполнить">' + App.escape(hint) + '</mark>';
        text += '[' + hint + ']';
        if (missing.indexOf(key) === -1) missing.push(key);
      }
    }
    return { html: html.replace(/\n{3,}/g, '\n\n').trim(), text: text.replace(/\n{3,}/g, '\n\n').trim(), missing: missing };
  }

  var current = { text: '', missing: [] };

  function update(save) {
    readForm();
    var res = assemble();
    current = res;
    preview.innerHTML = res.html;

    var n = res.missing.length;
    gapCounter.className = n ? 'gap-counter' : 'gap-counter ok';
    gapCounter.textContent = n ? 'Не заполнено: ' + n : 'Всё заполнено';
    var jump = document.getElementById('jump-text');
    if (jump) jump.textContent = n ? 'Промпт готов · не заполнено ' + n : 'Промпт готов · всё заполнено';

    markUnused();
    document.querySelector('[data-print-title]').textContent = promptTitle();
    if (save !== false) App.store.set('draft', state);
  }

  // Поля, которых нет в выбранном шаблоне, приглушаем
  function markUnused() {
    var keys = templateKeys(currentTemplate());
    // В универсальном шаблоне раздел и «что нужно» влияют на текст, даже если не стоят плейсхолдером
    if (!findPrompt(state.template)) { keys['раздел'] = true; keys['помощь'] = true; keys['текст'] = true; keys['недели'] = true; }
    var fields = form.querySelectorAll('[data-key]');
    for (var i = 0; i < fields.length; i++) {
      fields[i].classList.toggle('field-unused', !keys[fields[i].getAttribute('data-key')]);
    }
  }

  function promptTitle() {
    var p = findPrompt(state.template);
    var base = p ? p.title : 'Свой промпт' + (state.help ? ': ' + state.help.toLowerCase() : '');
    var topic = state.topic.trim();
    return topic ? base + ' — ' + topic : base;
  }

  /* ---------- Выбор шаблона ---------- */

  function showTemplateInfo() {
    var p = findPrompt(state.template);
    var box = document.getElementById('template-info');
    if (!p) { box.hidden = true; return; }
    box.hidden = false;
    document.getElementById('template-summary').textContent = p.summary;
    document.getElementById('template-tips').innerHTML = (p.tips || []).map(function (t) {
      return '<li>' + App.escape(t) + '</li>';
    }).join('');
  }

  function applyTemplateDefaults(p) {
    if (!p) return;
    if (byId(F.sections, p.section)) state.section = p.section;
    if (byId(F.help, p.help)) state.help = p.help;
    if (p.duration && F.durations.indexOf(p.duration) !== -1) state.duration = String(p.duration);
  }

  function setUrlTemplate(id) {
    if (!window.history || !history.replaceState) return;
    try {
      history.replaceState(null, '', location.pathname + (id && id !== UNIVERSAL ? '?id=' + encodeURIComponent(id) : ''));
    } catch (e) { /* file:// в некоторых браузерах не даёт менять адрес */ }
  }

  /* ---------- Переход к полю по клику на жёлтую подсказку ---------- */

  var FOCUS_TARGETS = {
    'раздел': 'input[name="section"]',
    'помощь': 'input[name="help"]',
    'тема': '#topic',
    'уровень': 'input[name="level"]',
    'время': 'input[name="duration"]',
    'недели': '#weeks',
    'объяснение': 'input[name="explain"]',
    'формат': 'input[name="outputs"]',
    'текст': '#text'
  };

  function focusField(key) {
    var el = FOCUS_TARGETS[key] && form.querySelector(FOCUS_TARGETS[key]);
    if (!el) return;
    el.focus();
    var box = el.closest('.field') || el;
    if (box.scrollIntoView) box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ---------- Действия ---------- */

  function copyPrompt(message) {
    var msg = message || (current.missing.length ? 'Скопировано. Допиши в чате места в [скобках]' : 'Скопировано');
    return App.copy(current.text, msg);
  }

  function initActions() {
    document.getElementById('copy-btn').addEventListener('click', function () { copyPrompt(); });

    document.getElementById('ai-buttons').addEventListener('click', function (e) {
      var a = e.target.closest('[data-ai]');
      if (!a) return;
      App.store.set('lastAi', a.getAttribute('data-ai'));
      copyPrompt('Промпт скопирован — вставь его в чат');
    });

    document.getElementById('qr-btn').addEventListener('click', function () {
      App.showQR({
        title: 'Открыть нейросеть с телефона',
        choices: LINKS.ai,
        selected: App.store.get('lastAi', LINKS.ai[0] && LINKS.ai[0].id)
      });
    });

    document.getElementById('print-btn').addEventListener('click', function () { window.print(); });

    document.getElementById('save-btn').addEventListener('click', function () {
      var ok = App.saved.add({
        title: promptTitle(),
        text: current.text,
        meta: [state.section, state.help, state.duration ? state.duration + ' мин' : ''].filter(Boolean).join(' · ')
      });
      App.toast(ok ? 'Сохранено в «Мои промпты»' : 'Не получилось сохранить: браузер запрещает хранилище', ok ? 'save' : 'warn');
    });

    document.getElementById('refine-list').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-refine]');
      if (!btn) return;
      App.copy(F.refine[+btn.getAttribute('data-refine')].text, 'Скопировано — вставь в тот же чат с нейросетью');
    });

    document.getElementById('reset-form').addEventListener('click', function () {
      state = defaultState();
      writeForm();
      showTemplateInfo();
      setUrlTemplate(UNIVERSAL);
      update();
      App.toast('Форма очищена', 'reset');
    });

    preview.addEventListener('click', function (e) {
      var mark = e.target.closest('mark.gap');
      if (mark) focusField(mark.getAttribute('data-key'));
    });
  }

  /* ---------- Плашка «к промпту» на телефоне ---------- */

  function initJumpBar() {
    var bar = document.getElementById('jump-bar');
    var card = document.getElementById('preview-card');
    if (!bar || !card || !('IntersectionObserver' in window)) return;
    var formVisible = false, cardVisible = false;
    function sync() { bar.classList.toggle('show', formVisible && !cardVisible); }
    new IntersectionObserver(function (entries) { cardVisible = entries[0].isIntersecting; sync(); }).observe(card);
    new IntersectionObserver(function (entries) { formVisible = entries[0].isIntersecting; sync(); }).observe(form);
  }

  /* ---------- Запуск ---------- */

  function init() {
    buildForm();

    var draft = App.store.get('draft', null);
    if (draft && typeof draft === 'object') {
      var base = defaultState();
      for (var k in base) if (Object.prototype.hasOwnProperty.call(draft, k)) base[k] = draft[k];
      state = base;
      if (!Array.isArray(state.explain)) state.explain = DEFAULT_EXPLAIN.slice();
      if (!Array.isArray(state.outputs)) state.outputs = DEFAULT_OUTPUTS.slice();
    }

    // ?id=... — открыть готовый промпт из базы
    var p = findPrompt(App.qs('id'));
    if (p) {
      state.template = p.id;
      applyTemplateDefaults(p);
    } else if (!findPrompt(state.template)) {
      state.template = UNIVERSAL;
    }

    // Недели до экзамена подтягиваем из «Плана подготовки», если там указана дата
    if (!state.weeks) {
      var examDate = App.store.get('examDate', '');
      if (examDate) {
        var days = Math.ceil((new Date(examDate + 'T09:00:00') - new Date()) / 86400000);
        if (days > 0) state.weeks = String(Math.max(1, Math.round(days / 7)));
      }
    }

    writeForm();
    showTemplateInfo();
    update(false);

    form.addEventListener('input', function () { update(); });
    form.addEventListener('change', function (e) {
      if (e.target === templateSelect) {
        readForm();
        applyTemplateDefaults(findPrompt(state.template));
        writeForm();
        showTemplateInfo();
        setUrlTemplate(state.template);
      }
      update();
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); });

    initActions();
    initJumpBar();
  }

  init();
})();
