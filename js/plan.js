/* ОГЭ English — план подготовки: прогресс по разделам, дата экзамена, дни занятий.
   Всё хранится только в localStorage этого браузера. */
(function () {
  'use strict';

  var App = window.App;
  var PLAN = window.PLAN || [];
  var STATES = ['Не начато', 'Тренирую', 'Готово'];

  var listEl = document.getElementById('plan-list');
  if (!listEl) return;

  var progress = App.store.get('plan', {});   // { itemId: 0 | 1 | 2 }
  var days = App.store.get('days', []);       // ['2026-11-10', …]

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dayKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function todayKey() { return dayKey(new Date()); }

  /* ---------- Разделы и пункты ---------- */

  function sectionScore(sec) {
    var sum = 0;
    sec.items.forEach(function (it) { sum += (progress[it.id] || 0); });
    return Math.round(sum / (sec.items.length * 2) * 100);
  }

  function totalScore() {
    var sum = 0, max = 0;
    PLAN.forEach(function (sec) {
      sec.items.forEach(function (it) { sum += (progress[it.id] || 0); max += 2; });
    });
    return max ? Math.round(sum / max * 100) : 0;
  }

  function itemHtml(it) {
    var s = progress[it.id] || 0;
    return '<li><button type="button" class="plan-item" data-item="' + App.escape(it.id) + '" data-state="' + s + '" ' +
      'aria-label="' + App.escape(it.text) + ': ' + STATES[s] + '. Нажми, чтобы изменить">' +
      '<span class="plan-mark" aria-hidden="true">' + (s === 2 ? App.icon('check') : s === 1 ? App.icon('pencil') : '') + '</span>' +
      '<span class="plan-text">' + App.escape(it.text) + '</span>' +
      '<span class="plan-state" aria-hidden="true">' + STATES[s] + '</span></button></li>';
  }

  function render() {
    listEl.innerHTML = PLAN.map(function (sec) {
      var pct = sectionScore(sec);
      return '<section class="card plan-section" aria-labelledby="ps-' + sec.id + '">' +
        '<div class="plan-section-head">' + App.genreBadge(sec.title === 'Пробники' ? 'Весь экзамен' : sec.title) +
          '<div><h2 id="ps-' + sec.id + '">' + App.escape(sec.title) + '</h2><p class="muted">' + App.escape(sec.tasks) + '</p></div>' +
          '<span class="plan-pct">' + pct + '%</span></div>' +
        '<div class="progress" role="progressbar" aria-label="Прогресс: ' + App.escape(sec.title) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><div class="progress-bar" style="width:' + pct + '%"></div></div>' +
        '<ul class="plan-items">' + sec.items.map(itemHtml).join('') + '</ul>' +
      '</section>';
    }).join('');
    renderTotal();
  }

  function renderTotal() {
    var pct = totalScore();
    document.getElementById('total-pct').textContent = pct + '%';
    var bar = document.getElementById('total-bar');
    bar.style.width = pct + '%';
    bar.parentNode.setAttribute('aria-valuenow', pct);
    var done = 0, all = 0;
    PLAN.forEach(function (sec) { sec.items.forEach(function (it) { all++; if (progress[it.id] === 2) done++; }); });
    document.getElementById('total-text').textContent = 'Готово ' + done + ' из ' + all + ' ' + App.plural(all, 'пункта', 'пунктов', 'пунктов');
  }

  listEl.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-item]');
    if (!btn) return;
    var id = btn.getAttribute('data-item');
    var next = ((progress[id] || 0) + 1) % 3;
    progress[id] = next;
    App.store.set('plan', progress);
    // Перерисовываем раздел целиком, а фокус возвращаем на ту же кнопку
    render();
    var again = listEl.querySelector('[data-item="' + id + '"]');
    if (again) again.focus();
    if (next === 2) App.toast('Отлично! Пункт отмечен как готовый', 'check');
  });

  /* ---------- Дата экзамена ---------- */

  var dateInput = document.getElementById('exam-date');
  var countEl = document.getElementById('exam-count');
  var countNote = document.getElementById('exam-note');

  function renderCountdown() {
    var v = App.store.get('examDate', '');
    dateInput.value = v;
    if (!v) {
      countEl.textContent = '—';
      countNote.textContent = 'Укажи дату экзамена: расписание ОГЭ публикуют заранее, уточни его у учителя.';
      return;
    }
    var diff = Math.ceil((new Date(v + 'T09:00:00') - new Date()) / 86400000);
    if (diff > 0) {
      countEl.textContent = diff;
      countNote.textContent = App.plural(diff, 'день', 'дня', 'дней') + ' до экзамена · примерно ' + Math.max(1, Math.round(diff / 7)) + ' нед.';
    } else if (diff === 0) {
      countEl.textContent = '0';
      countNote.textContent = 'Экзамен сегодня. Удачи — ты готовилась!';
    } else {
      countEl.textContent = '✓';
      countNote.textContent = 'Дата экзамена прошла. Поменяй её, если нужно.';
    }
  }

  dateInput.addEventListener('change', function () {
    App.store.set('examDate', dateInput.value);
    renderCountdown();
  });

  /* ---------- Дни занятий и серия ---------- */

  var dayBtn = document.getElementById('day-btn');

  function streak() {
    var set = {};
    days.forEach(function (d) { set[d] = true; });
    var d = new Date();
    if (!set[dayKey(d)]) d.setDate(d.getDate() - 1); // серия не обрывается, пока не закончился сегодняшний день
    var n = 0;
    while (set[dayKey(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  function renderDays() {
    var today = days.indexOf(todayKey()) !== -1;
    var s = streak();
    document.getElementById('streak-num').textContent = s;
    document.getElementById('streak-text').textContent = App.plural(s, 'день', 'дня', 'дней') + ' подряд · всего занятий: ' + days.length;
    dayBtn.setAttribute('aria-pressed', today ? 'true' : 'false');
    dayBtn.querySelector('span').textContent = today ? 'Сегодня отмечено' : 'Отметить занятие сегодня';
  }

  dayBtn.addEventListener('click', function () {
    var k = todayKey();
    var i = days.indexOf(k);
    if (i === -1) {
      days.push(k);
      App.toast('Занятие засчитано. Так держать!', 'check');
    } else {
      days.splice(i, 1);
    }
    App.store.set('days', days);
    renderDays();
  });

  /* ---------- Сброс ---------- */

  document.getElementById('plan-reset').addEventListener('click', function () {
    if (!window.confirm('Сбросить все отметки в плане подготовки? Дата экзамена и дни занятий останутся.')) return;
    progress = {};
    App.store.set('plan', progress);
    render();
    App.toast('Отметки сброшены', 'reset');
  });

  render();
  renderCountdown();
  renderDays();
})();
