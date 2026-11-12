/* ОГЭ English — главная: цифры, разделы с прогрессом, напоминание об ошибках. */
(function () {
  'use strict';

  var App = window.App;
  var B = window.BANK;
  var box = document.getElementById('home-sections');
  if (!box) return;

  var st = App.results.stats();
  var left = App.daysLeft();
  document.getElementById('h-left').textContent = left === null ? '—' : Math.max(left, 0);
  document.getElementById('h-left-label').textContent = left === null ? 'дней до экзамена — укажи дату в плане' : App.plural(Math.max(left, 0), 'день', 'дня', 'дней') + ' до экзамена';
  document.getElementById('h-solved').textContent = st.solved;
  document.getElementById('h-pct').textContent = st.solved ? st.pct + '%' : '—';
  document.getElementById('h-streak').textContent = App.streak();

  box.innerHTML = B.sections.filter(function (s) { return s.id !== 'all'; }).map(function (s) {
    var x = App.results.stats(s.id);
    return '<a class="card sec-tile" href="solve.html?s=' + s.id + '">' +
      '<span class="sec-tile-top">' + App.genreBadge(s.title) + '<span class="sec-tile-count">' + s.count + ' в банке</span></span>' +
      '<span class="sec-tile-title">' + App.escape(s.title) + '</span>' +
      '<span class="muted sec-tile-tasks">' + App.escape(s.tasks) + (s.theory ? ' · правила + задания' : '') + '</span>' +
      '<span class="progress" aria-hidden="true"><span class="progress-bar" style="width:' + x.pct + '%"></span></span>' +
      '<span class="sec-tile-line">' + (x.solved ? 'Решено ' + x.solved + ' · верно ' + x.pct + '%' : 'Ещё не начато') + '</span>' +
    '</a>';
  }).join('');

  var errors = App.results.errors().length;
  var errBox = document.getElementById('home-errors');
  if (errors) {
    errBox.hidden = false;
    document.getElementById('home-errors-text').textContent = errors + ' ' + App.plural(errors, 'задание ждёт', 'задания ждут', 'заданий ждут') + ' разбора ошибок.';
  }
})();
