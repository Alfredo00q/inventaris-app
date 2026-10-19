(function () {
  var d = document, root = d.documentElement;
  // tema gelap / terang
  var tb = d.getElementById('themeBtn');
  if (tb) tb.addEventListener('click', function () {
    var t = root.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-bs-theme', t); try { localStorage.setItem('theme', t); } catch (e) {}
    window.dispatchEvent(new Event('themechange'));
  });
  // menu samping (mobile)
  var sb = d.getElementById('sidebar'), scrim = d.getElementById('scrim'), mb = d.getElementById('menuBtn');
  function toggle(open) { sb.classList.toggle('open', open); scrim.classList.toggle('show', open); }
  if (mb) mb.addEventListener('click', function () { toggle(!sb.classList.contains('open')); });
  if (scrim) scrim.addEventListener('click', function () { toggle(false); });
  // konfirmasi sebelum hapus
  d.addEventListener('submit', function (e) { var m = e.target.getAttribute('data-confirm'); if (m && !confirm(m)) e.preventDefault(); });
  // filter otomatis
  d.querySelectorAll('[data-autosubmit]').forEach(function (el) { el.addEventListener('change', function () { el.form.submit(); }); });
  // modal form generik (tambah / ubah)
  d.querySelectorAll('.modal').forEach(function (modal) {
    modal.addEventListener('show.bs.modal', function (ev) {
      var b = ev.relatedTarget; if (!b) return; var form = modal.querySelector('form');
      if (b.dataset.action) form.setAttribute('action', b.dataset.action);
      var t = modal.querySelector('[data-role=title]'); if (t && b.dataset.title) t.textContent = b.dataset.title;
      var info = modal.querySelector('[data-role=info]'); if (info) info.textContent = b.dataset.info || '';
      if (b.dataset.values !== undefined) {
        var v = JSON.parse(b.dataset.values || '{}'); form.reset();
        Array.prototype.forEach.call(form.elements, function (el) {
          if (!el.name || el.name === '_csrf') return;
          if (el.type === 'checkbox') el.checked = !!v[el.name]; else el.value = v[el.name] == null ? '' : v[el.name];
        });
        var isNew = b.dataset.mode === 'new', isEdit = b.dataset.mode === 'edit';
        var u = form.querySelector('[data-new-only]'); if (u) { u.disabled = isEdit; u.required = isNew; }
        var pw = form.querySelector('[name=password]'); if (pw) pw.required = isNew;
        var h = form.querySelector('[data-role=pwhint]'); if (h) h.textContent = isEdit ? '(kosongkan jika tidak diganti)' : '';
      }
    });
  });
})();
