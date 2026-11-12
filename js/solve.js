/* ОГЭ English — «Решаем задания»: банк ФИПИ внутри страницы, бланк, таймер, счётчик слов.
   Задания показываются с сайта ФИПИ во фрейме, сайт их не копирует. */
(function () {
  'use strict';

  var App = window.App;
  var B = window.BANK;

  var frame = document.getElementById('bank-frame');
  if (!frame) return;

  var saved = App.store.get('solve', { section: 'listen', pages: {}, tabs: {} });
  var state = {
    section: App.bankSection(App.qs('s')) ? App.qs('s') : (App.bankSection(saved.section) ? saved.section : 'listen'),
    pages: saved.pages || {},
    tabs: saved.tabs || {},   // { gram: 'theory' | 'tasks', write: … } — для разделов с правилами
    qid: App.normCode(App.qs('qid'))
  };
  if (App.qs('tab') === 'tasks' || App.qs('tab') === 'theory') state.tabs[state.section] = App.qs('tab');

  var el = {
    chips: document.getElementById('section-chips'),
    tip: document.getElementById('section-tip'),
    pageText: document.getElementById('page-text'),
    prev: document.getElementById('page-prev'),
    next: document.getElementById('page-next'),
    pageInput: document.getElementById('page-input'),
    newTab: document.getElementById('open-new-tab'),
    modeNote: document.getElementById('mode-note'),
    findCode: document.getElementById('find-code'),
    markCode: document.getElementById('mark-code'),
    markNote: document.getElementById('mark-note'),
    today: document.getElementById('today-list'),
    todayEmpty: document.getElementById('today-empty'),
    words: document.getElementById('words'),
    wordsDetails: document.getElementById('words-details')
  };

  function section() { return App.bankSection(state.section); }
  function pages() { var s = section(); return Math.max(1, Math.ceil(s.count / B.pageSize)); }
  function page() { return Math.min(state.pages[state.section] || 0, pages() - 1); }

  function persist() {
    App.store.set('solve', { section: state.section, pages: state.pages, tabs: state.tabs });
  }

  /* ---------- Вкладки «Правила / Задания ФИПИ» (грамматика и письмо) ---------- */

  var tabsBox = document.getElementById('bank-tabs');
  var tabTheory = document.getElementById('tab-theory');
  var tabTasks = document.getElementById('tab-tasks');
  var theoryPanel = document.getElementById('theory-panel');
  var tasksPanel = document.getElementById('tasks-panel');

  // Правила показываем первыми, пока не перешли к заданиям; задание по коду — всегда задания
  function currentTab() {
    if (!section().theory || state.qid) return 'tasks';
    return state.tabs[state.section] === 'tasks' ? 'tasks' : 'theory';
  }

  function renderTabs() {
    var has = !!section().theory;
    var tab = currentTab();
    tabsBox.hidden = !has;
    theoryPanel.hidden = tab !== 'theory';
    tasksPanel.hidden = tab !== 'tasks';
    tabTheory.setAttribute('aria-selected', tab === 'theory');
    tabTasks.setAttribute('aria-selected', tab === 'tasks');
    tabTheory.tabIndex = tab === 'theory' ? 0 : -1;
    tabTasks.tabIndex = tab === 'tasks' ? 0 : -1;
    var blocks = theoryPanel.querySelectorAll('[data-theory]');
    for (var i = 0; i < blocks.length; i++) blocks[i].hidden = blocks[i].getAttribute('data-theory') !== state.section;
  }

  function setTab(tab, focus) {
    state.tabs[state.section] = tab;
    if (tab === 'theory') state.qid = '';
    persist();
    load();
    if (focus) (tab === 'theory' ? tabTheory : tabTasks).focus();
  }

  tabTheory.addEventListener('click', function () { setTab('theory'); });
  tabTasks.addEventListener('click', function () { setTab('tasks'); });
  [tabTheory, tabTasks].forEach(function (t) {
    t.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        setTab(currentTab() === 'theory' ? 'tasks' : 'theory', true);
      }
    });
  });

  theoryPanel.addEventListener('click', function (e) {
    if (e.target.closest('[data-goto-tasks]')) {
      setTab('tasks');
      document.getElementById('bank-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
      App.toast('Удачи! Под каждым заданием есть кнопка «Ответить»', 'pencil');
      return;
    }
    if (e.target.closest('[data-print-theory]')) {
      document.body.classList.add('print-theory');
      var done = function () {
        document.body.classList.remove('print-theory');
        window.removeEventListener('afterprint', done);
      };
      window.addEventListener('afterprint', done);
      window.print();
      setTimeout(done, 1000);
    }
  });

  /* ---------- Разделы ---------- */

  el.chips.innerHTML = B.sections.map(function (s) {
    return '<label class="chip"><input type="radio" name="section" value="' + s.id + '"><span>' +
      App.escape(s.title) + ' <small class="chip-count">' + s.count + '</small></span></label>';
  }).join('');

  el.chips.addEventListener('change', function (e) {
    if (e.target.name !== 'section') return;
    state.section = e.target.value;
    state.qid = '';
    persist();
    load();
    applySectionTools();
  });

  /* ---------- Загрузка банка во фрейм ---------- */

  function load() {
    var s = section();
    var url;
    if (state.qid) {
      url = App.taskUrl(state.qid);
      el.modeNote.hidden = false;
      el.modeNote.querySelector('[data-code]').textContent = state.qid;
      el.pageText.textContent = 'Задание ' + state.qid;
    } else {
      url = App.bankUrl(s.id, page());
      el.modeNote.hidden = true;
      el.pageText.textContent = 'Страница ' + (page() + 1) + ' из ' + pages();
    }
    renderTabs();
    // Банк грузим только когда открыта вкладка с заданиями — и не перезагружаем без нужды
    if (!tasksPanel.hidden && frame.getAttribute('src') !== url) frame.src = url;
    frame.title = 'Открытый банк заданий ФИПИ: ' + (state.qid ? 'задание ' + state.qid : s.title + ', страница ' + (page() + 1));
    el.newTab.href = url;
    el.prev.disabled = !!state.qid || page() === 0;
    el.next.disabled = !!state.qid || page() >= pages() - 1;
    el.pageInput.max = pages();
    el.pageInput.value = state.qid ? '' : page() + 1;
    el.tip.textContent = s.tip;
    var radios = el.chips.querySelectorAll('input');
    for (var i = 0; i < radios.length; i++) radios[i].checked = radios[i].value === state.section;
  }

  function goPage(n) {
    state.qid = '';
    state.pages[state.section] = Math.max(0, Math.min(n, pages() - 1));
    persist();
    load();
    document.getElementById('bank-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  el.prev.addEventListener('click', function () { goPage(page() - 1); });
  el.next.addEventListener('click', function () { goPage(page() + 1); });
  document.getElementById('page-go').addEventListener('click', function () {
    var n = parseInt(el.pageInput.value, 10);
    if (n >= 1) goPage(n - 1);
  });
  el.pageInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); document.getElementById('page-go').click(); }
  });

  document.getElementById('back-to-section').addEventListener('click', function () {
    state.qid = '';
    state.tabs[state.section] = 'tasks';
    persist();
    load();
  });

  function openCode(code) {
    var c = App.normCode(code);
    if (!c) { App.toast('Код задания — 6 символов, например 42BF66', 'warn'); return false; }
    state.qid = c;
    load();
    document.getElementById('bank-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
  }

  document.getElementById('find-form').addEventListener('submit', function (e) {
    e.preventDefault();
    if (openCode(el.findCode.value)) el.findCode.value = '';
  });

  /* ---------- Бланк: отметить результат ---------- */

  function mark(ok) {
    var c = App.normCode(el.markCode.value);
    if (!c) {
      App.toast('Впиши код задания из банка — 6 символов, например 42BF66', 'warn');
      el.markCode.focus();
      return;
    }
    App.results.add({ code: c, section: state.section, ok: ok, note: el.markNote.value.trim() });
    el.markCode.value = '';
    el.markNote.value = '';
    el.markCode.focus();
    App.toast(ok ? 'Верно! Задание ' + c + ' засчитано' : 'Задание ' + c + ' — в работу над ошибками', ok ? 'check' : 'pencil');
    renderToday();
  }

  document.getElementById('mark-ok').addEventListener('click', function () { mark(true); });
  document.getElementById('mark-bad').addEventListener('click', function () { mark(false); });
  el.markCode.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); mark(true); }
  });

  function renderToday() {
    var today = App.dayKey(new Date());
    var list = App.results.list().filter(function (r) { return App.dayKey(new Date(r.ts)) === today; }).reverse();
    el.todayEmpty.hidden = list.length > 0;
    document.getElementById('today-stat').textContent = list.length
      ? 'Сегодня: ' + list.length + ' · верно ' + list.filter(function (r) { return r.ok; }).length
      : '';
    el.today.innerHTML = list.slice(0, 12).map(function (r) {
      return '<li class="today-item ' + (r.ok ? 'is-ok' : 'is-bad') + '">' +
        '<span class="today-mark" aria-hidden="true">' + App.icon(r.ok ? 'check' : 'close') + '</span>' +
        '<span class="today-code">' + App.escape(r.code) + '<span class="visually-hidden">' + (r.ok ? ', верно' : ', ошибка') + '</span></span>' +
        '<button type="button" class="link-btn" data-open="' + App.escape(r.code) + '">Открыть</button>' +
        '<button type="button" class="link-btn" data-del="' + r.ts + '" aria-label="Удалить отметку ' + App.escape(r.code) + '">' + App.icon('trash') + '</button>' +
        '</li>';
    }).join('');
  }

  el.today.addEventListener('click', function (e) {
    var open = e.target.closest('[data-open]');
    if (open) { openCode(open.getAttribute('data-open')); return; }
    var del = e.target.closest('[data-del]');
    if (del) {
      var ts = +del.getAttribute('data-del');
      App.results.save(App.results.list().filter(function (r) { return r.ts !== ts; }));
      renderToday();
      App.toast('Отметка удалена', 'trash');
    }
  });

  /* ---------- Таймер ---------- */

  var timer = { total: 0, left: 0, id: null };
  var tDisplay = document.getElementById('timer-display');
  var tStart = document.getElementById('timer-start');

  function fmt(sec) {
    var m = Math.floor(sec / 60), s = sec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function renderTimer() {
    tDisplay.textContent = fmt(timer.left);
    tStart.querySelector('span').textContent = timer.id ? 'Пауза' : (timer.left && timer.left < timer.total ? 'Дальше' : 'Старт');
    tDisplay.classList.toggle('is-low', timer.id !== null && timer.left <= 10);
  }

  function beep() {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      var ctx = new Ctx();
      [0, 0.3, 0.6].forEach(function (t) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = 880;
        g.gain.value = 0.15;
        o.connect(g); g.connect(ctx.destination);
        o.start(ctx.currentTime + t);
        o.stop(ctx.currentTime + t + 0.18);
      });
    } catch (e) { /* без звука */ }
  }

  function stop() { clearInterval(timer.id); timer.id = null; }

  function setTimer(sec) {
    stop();
    timer.total = timer.left = sec;
    renderTimer();
  }

  tStart.addEventListener('click', function () {
    if (timer.id) { stop(); renderTimer(); return; }
    if (!timer.left) timer.left = timer.total;
    if (!timer.left) return;
    timer.id = setInterval(function () {
      timer.left--;
      if (timer.left <= 0) {
        timer.left = 0;
        stop();
        beep();
        App.toast('Время вышло!', 'clock');
      }
      renderTimer();
    }, 1000);
    renderTimer();
  });

  document.getElementById('timer-reset').addEventListener('click', function () { setTimer(timer.total); });

  document.getElementById('timer-presets').addEventListener('change', function (e) {
    if (e.target.name === 'timer') setTimer(+e.target.value);
  });

  /* ---------- Счётчик слов для письма (правила ФИПИ) ---------- */

  function countWords(text) {
    // Слова разделяются пробелами; I've, pop-singer, 2027, UK считаются одним словом
    return text.trim().split(/\s+/).filter(function (t) { return /[0-9A-Za-zА-Яа-яЁё]/.test(t); }).length;
  }

  el.words.addEventListener('input', function () {
    var n = countWords(el.words.value);
    var msg;
    if (!n) msg = 'Вставь или напиши письмо — посчитаю слова.';
    else if (n < 90) msg = 'Меньше 90 слов — на экзамене за такое письмо 0 баллов. Нужно 100–120.';
    else if (n < 100) msg = 'Чуть-чуть не хватает: нужно 100–120 слов.';
    else if (n <= 120) msg = 'Отлично, объём в норме: 100–120 слов.';
    else if (n <= 132) msg = 'Больше 120 слов, но в пределах допуска. Лучше сократить.';
    else msg = 'Больше 132 слов — проверят только первые 120. Сократи письмо.';
    document.getElementById('words-count').textContent = n + ' ' + App.plural(n, 'слово', 'слова', 'слов');
    var m = document.getElementById('words-msg');
    m.textContent = msg;
    m.className = 'words-msg ' + (n >= 100 && n <= 120 ? 'is-ok' : n ? 'is-warn' : '');
  });

  /* ---------- Инструменты под раздел ---------- */

  function applySectionTools() {
    var s = section();
    if (s.id === 'write') el.wordsDetails.open = true;
    // Пресет таймера по разделу: говорение — 2 минуты, остальное — время раздела на экзамене
    var preset = s.id === 'speak' ? 120 : (s.minutes || 30) * 60;
    var radio = document.querySelector('#timer-presets input[value="' + preset + '"]');
    if (radio && !timer.id) { radio.checked = true; setTimer(preset); }
  }

  /* ---------- Запуск ---------- */

  load();
  applySectionTools();
  if (!timer.total) setTimer(1800);
  renderToday();
  el.words.dispatchEvent(new Event('input'));
})();
