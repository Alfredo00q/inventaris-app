(function () {
  var el = document.getElementById('dash-data'); if (!el || !window.Chart) return;
  var data = JSON.parse(el.textContent), charts = [];
  var palette = ['#2563eb', '#0d9488', '#7c3aed', '#f59e0b', '#ec4899', '#64748b'];
  function css(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function draw() {
    charts.forEach(function (c) { c.destroy(); }); charts = [];
    var text = css('--muted'), grid = css('--line');
    Chart.defaults.font.family = "'Plus Jakarta Sans', system-ui, sans-serif"; Chart.defaults.color = text;
    charts.push(new Chart(document.getElementById('chartBulan'), {
      type: 'bar',
      data: { labels: data.months.map(function (m) { return m.label; }), datasets: [{ label: 'Peminjaman', data: data.months.map(function (m) { return m.n; }), backgroundColor: '#2563eb', borderRadius: 8, maxBarThickness: 42 }] },
      options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: grid } }, x: { grid: { display: false } } } },
    }));
    charts.push(new Chart(document.getElementById('chartKategori'), {
      type: 'doughnut',
      data: { labels: data.kategori.map(function (k) { return k.label; }), datasets: [{ data: data.kategori.map(function (k) { return k.n; }), backgroundColor: palette, borderWidth: 0 }] },
      options: { maintainAspectRatio: false, cutout: '66%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } } },
    }));
  }
  draw(); window.addEventListener('themechange', draw);
})();
