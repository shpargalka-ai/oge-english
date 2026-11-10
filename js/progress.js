/* ОГЭ English — «Мой прогресс»: статистика по разделам, работа над ошибками, история, отчёт. */
(function () {
  'use strict';

  var App = window.App;
  var B = window.BANK;

  var root = document.getElementById('progress-root');
  if (!root) return;

  function sectionTitle(id) {
    var s = App.bankSection(id);
    return s ? s.title : 'Без раздела';
  }

  function fmtDate(ts) {
    try { return new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }); } catch (e) { return ''; }
  }

  function render() {
    var st = App.results.stats();
    var left = App.daysLeft();
    document.getElementById('st-solved').textContent = st.solved;
    document.getElementById('st-pct').textContent = st.solved ? st.pct + '%' : '—';
    document.getElementById('st-streak').textContent = App.streak();
    document.getElementById('st-left').textContent = left === null ? '—' : (left > 0 ? left : 0);
    document.getElementById('st-left-label').textContent = left === null ? 'дата экзамена не указана — впиши её в «Плане подготовки»' : App.plural(Math.max(left, 0), 'день', 'дня', 'дней') + ' до экзамена';

    // Разделы
    document.getElementById('sections').innerHTML = B.sections.filter(function (s) { return s.id !== 'all'; }).map(function (s) {
      var x = App.results.stats(s.id);
      return '<div class="card sec-card">' +
        '<div class="plan-section-head">' + App.genreBadge(s.title) +
          '<div><h3>' + App.escape(s.title) + '</h3><p class="muted">' + App.escape(s.tasks) + '</p></div>' +
          '<span class="plan-pct">' + (x.solved ? x.pct + '%' : '—') + '</span></div>' +
        '<div class="progress" role="progressbar" aria-label="Верных ответов: ' + App.escape(s.title) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + x.pct + '"><div class="progress-bar" style="width:' + x.pct + '%"></div></div>' +
        '<p class="sec-line">Решено: <b>' + x.solved + '</b> · верно: <b>' + x.ok + '</b></p>' +
        '<a class="btn btn-outline btn-sm" href="solve.html?s=' + s.id + '">' + App.icon('pencil') + 'Решать</a>' +
      '</div>';
    }).join('');

    // Работа над ошибками
    var errors = App.results.errors();
    document.getElementById('errors-count').textContent = errors.length;
    document.getElementById('errors-empty').hidden = errors.length > 0;
    document.getElementById('errors').innerHTML = errors.map(function (r) {
      return '<li class="card err-card">' +
        '<div class="err-top">' + App.genreBadge(sectionTitle(r.section)) +
          '<div><p class="err-code">' + App.escape(r.code) + '</p><p class="muted err-meta">' + App.escape(sectionTitle(r.section)) + ' · ' + fmtDate(r.ts) + '</p></div></div>' +
        (r.note ? '<p class="err-note">' + App.escape(r.note) + '</p>' : '') +
        '<div class="btn-row">' +
          '<a class="btn btn-primary btn-sm" href="solve.html?s=' + encodeURIComponent(r.section || 'all') + '&qid=' + encodeURIComponent(r.code) + '">' + App.icon('reset') + 'Решить снова</a>' +
          '<button type="button" class="btn btn-outline btn-sm" data-fix="' + App.escape(r.code) + '">' + App.icon('check') + 'Разобрались</button>' +
        '</div></li>';
    }).join('');

    // История
    var hist = App.results.list().slice().reverse().slice(0, 40);
    document.getElementById('history-empty').hidden = hist.length > 0;
    document.getElementById('history-wrap').hidden = hist.length === 0;
    document.getElementById('history').innerHTML = hist.map(function (r) {
      return '<tr><td data-label="Дата">' + fmtDate(r.ts) + '</td>' +
        '<td data-label="Код"><b>' + App.escape(r.code) + '</b></td>' +
        '<td data-label="Раздел">' + App.escape(sectionTitle(r.section)) + '</td>' +
        '<td data-label="Результат">' + (r.ok ? '<span class="res res-ok">Верно</span>' : '<span class="res res-bad">Ошибка' + (r.fixed ? ', разобрана' : '') + '</span>') + '</td>' +
        '<td data-label="Заметка">' + App.escape(r.note || '') + '</td>' +
        '<td data-label="Удалить"><button type="button" class="link-btn" data-del="' + r.ts + '" aria-label="Удалить запись ' + App.escape(r.code) + '">' + App.icon('trash') + '</button></td></tr>';
    }).join('');
  }

  root.addEventListener('click', function (e) {
    var fix = e.target.closest('[data-fix]');
    if (fix) {
      var code = fix.getAttribute('data-fix');
      var list = App.results.list();
      list.forEach(function (r) { if (r.code === code && !r.ok) r.fixed = true; });
      App.results.save(list);
      App.toast('Задание ' + code + ' убрано из работы над ошибками', 'check');
      render();
      return;
    }
    var del = e.target.closest('[data-del]');
    if (del) {
      var ts = +del.getAttribute('data-del');
      App.results.save(App.results.list().filter(function (r) { return r.ts !== ts; }));
      render();
    }
  });

  document.getElementById('export-btn').addEventListener('click', function () {
    var st = App.results.stats();
    var lines = ['ОГЭ English — отчёт о подготовке', 'Дата: ' + new Date().toLocaleDateString('ru-RU'), '',
      'Решено заданий: ' + st.solved + ', верно: ' + st.ok + ' (' + st.pct + '%)',
      'Дней подряд: ' + App.streak(), '', 'По разделам:'];
    B.sections.filter(function (s) { return s.id !== 'all'; }).forEach(function (s) {
      var x = App.results.stats(s.id);
      lines.push('— ' + s.title + ': решено ' + x.solved + ', верно ' + x.ok);
    });
    lines.push('', 'Работа над ошибками (коды заданий банка ФИПИ):');
    var errors = App.results.errors();
    if (!errors.length) lines.push('— нет');
    errors.forEach(function (r) { lines.push('— ' + r.code + ' (' + sectionTitle(r.section) + ')' + (r.note ? ': ' + r.note : '')); });
    lines.push('', 'История:');
    App.results.list().forEach(function (r) {
      lines.push(new Date(r.ts).toLocaleDateString('ru-RU') + ' · ' + r.code + ' · ' + sectionTitle(r.section) + ' · ' + (r.ok ? 'верно' : 'ошибка') + (r.note ? ' · ' + r.note : ''));
    });
    App.download('oge-english-otchet-' + App.dayKey(new Date()) + '.txt', lines.join('\n') + '\n');
    App.toast('Отчёт сохранён', 'download');
  });

  document.getElementById('reset-btn').addEventListener('click', function () {
    if (!window.confirm('Удалить все отметки о решённых заданиях? План подготовки и дата экзамена останутся.')) return;
    App.results.save([]);
    render();
    App.toast('Отметки удалены', 'trash');
  });

  render();
  window.addEventListener('storage', render);
})();
