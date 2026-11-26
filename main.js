/* Secretaria IA · Grupo Loang — lógica de la landing
 *
 * CONFIGURACIÓN (editar solo este bloque):
 * - ENDPOINT_FORMULARIO / WEB3FORMS_KEY: Web3Forms. Las solicitudes llegan a
 *   angelagrondonalopez@gmail.com (cuenta Web3Forms de Angela, clave pública).
 * - TELEFONO: número de contacto en formato internacional, p. ej. '+34639792807'.
 *   Vacío = se muestra «pendiente» y el botón Llamar lleva al formulario.
 * - ADS_ID / ADS_CONV_FORM / ADS_CONV_TEL: IDs de Google Ads cuando estén listos.
 *   Mientras estén vacíos no se dispara ninguna conversión.
 */
(function () {
  'use strict';

  var ENDPOINT_FORMULARIO = 'https://api.web3forms.com/submit';
  var WEB3FORMS_KEY = 'c9c65a74-b6ad-419a-87b5-67832e9e779d';
  var TELEFONO = '+34639792807';
  var ADS_ID = '';
  var ADS_CONV_FORM = '';
  var ADS_CONV_TEL = '';

  function digits(x) {
    return String(x || '').replace(/\D/g, '');
  }
  function telValido(x) {
    var d = digits(x);
    return d.length >= 9 && d.length <= 15;
  }
  function formatTel(d) {
    if (d.length === 9) return d.slice(0, 3) + ' ' + d.slice(3, 6) + ' ' + d.slice(6);
    if (d.indexOf('34') === 0 && d.length === 11) return formatTel(d.slice(2));
    return d;
  }

  /* Teléfono visible y enlaces tel: (solo si hay número configurado) */
  (function setupPhone() {
    var d = digits(TELEFONO);
    var nodes = document.querySelectorAll('[data-tel]');
    var texts = document.querySelectorAll('[data-phone-text]');
    var labels = document.querySelectorAll('[data-phone-label]');
    if (d.length >= 9) {
      document.body.classList.add('has-phone');
      var href = 'tel:+34' + (d.indexOf('34') === 0 ? d.slice(2) : d);
      var pretty = formatTel(d.indexOf('34') === 0 ? d.slice(2) : d);
      nodes.forEach(function (a) { a.setAttribute('href', href); });
      texts.forEach(function (n) { n.textContent = pretty; });
      labels.forEach(function (n) { n.textContent = pretty; });
    } else {
      nodes.forEach(function (a) { a.setAttribute('href', '#form'); });
      texts.forEach(function (n) { n.textContent = '[pendiente]'; });
    }
  })();

  /* gclid + UTM para atribuir el lead a la campaña de Google Ads */
  (function captureAds() {
    var p = new URLSearchParams(location.search);
    var g = document.getElementById('f-gclid');
    if (g) g.value = p.get('gclid') || '';
    var u = [];
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(function (k) {
      if (p.get(k)) u.push(k + '=' + p.get(k));
    });
    var utm = document.getElementById('f-utm');
    if (utm) utm.value = u.join('&');
  })();

  /* Plan elegido desde las tarjetas de precio */
  document.querySelectorAll('[data-plan]').forEach(function (a) {
    a.addEventListener('click', function () {
      var f = document.getElementById('f-plan');
      if (f) f.value = a.getAttribute('data-plan') || '';
    });
  });

  function conv(label) {
    if (typeof gtag !== 'function') return;
    if (label === 'form' && ADS_CONV_FORM) gtag('event', 'conversion', { send_to: ADS_CONV_FORM });
    if (label === 'tel' && ADS_CONV_TEL) gtag('event', 'conversion', { send_to: ADS_CONV_TEL });
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('a[href^="tel:"]');
    if (el) conv('tel');
  });

  var form = document.getElementById('leadform');
  if (!form) return;

  var tel = form.elements['telefono'];
  if (tel) {
    tel.addEventListener('input', function () { tel.setCustomValidity(''); });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (tel) {
      tel.setCustomValidity(tel.value.trim() && !telValido(tel.value)
        ? 'Escribe un teléfono válido (al menos 9 dígitos).'
        : '');
    }
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    var btn = form.querySelector('button[type=submit]');
    var ok = document.getElementById('okmsg');
    var err = document.getElementById('errmsg');
    var txtBtn = btn.innerHTML;
    function hideMsgs() {
      [ok, err].forEach(function (n) { if (n) n.style.display = 'none'; });
    }
    function val(n) {
      var el = form.elements[n];
      return el ? String(el.value || '').trim() : '';
    }
    var landing = form.getAttribute('data-landing') || '99';
    var datos = {
      Nombre: val('nombre'),
      Telefono: val('telefono'),
      'Negocio o sector': val('sector'),
      Provincia: val('provincia'),
      Plan: val('plan') || 'No indicado',
      Landing: landing === '149' ? 'Secretaria IA + Google Ads 129 €' : 'Secretaria IA 129 €',
      'Acepta privacidad y llamada': form.elements['privacidad'] && form.elements['privacidad'].checked ? 'Sí' : 'No',
      GCLID: val('gclid') || '—',
      UTM: val('utm') || '—',
      Pagina: location.href,
      Fecha: new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }),
      access_key: WEB3FORMS_KEY,
      subject: 'Nueva solicitud Secretaria IA 129 €',
      from_name: 'Secretaria IA · Grupo Loang',
      _honey: val('_honey')
    };

    hideMsgs();
    var trampa = datos._honey;
    delete datos._honey;

    /* Honeypot relleno: no enviamos y mostramos el mismo mensaje de éxito. */
    if (trampa) {
      conv('form');
      if (ok) ok.style.display = 'block';
      form.reset();
      return;
    }

    btn.disabled = true;
    btn.innerHTML = 'Enviando… un momento';
    var lento = setTimeout(function () { btn.innerHTML = 'Enviando… puede tardar unos segundos'; }, 8000);

    var ctl = ('AbortController' in window) ? new AbortController() : null;
    var tm = setTimeout(function () { if (ctl) ctl.abort(); }, 60000);

    fetch(ENDPOINT_FORMULARIO, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(datos),
      signal: ctl ? ctl.signal : undefined
    }).then(function (r) {
      clearTimeout(tm);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json().then(function (data) { return data; }, function () { return {}; });
    }).then(function (data) {
      if (data && (data.success === false || data.success === 'false')) {
        throw new Error((data && data.message) || 'Web3Forms rejected');
      }
      clearTimeout(lento);
      conv('form');
      if (ok) ok.style.display = 'block';
      form.reset();
      var g = document.getElementById('f-gclid');
      var u = document.getElementById('f-utm');
      if (g || u) {
        var p = new URLSearchParams(location.search);
        if (g) g.value = p.get('gclid') || '';
        if (u) {
          var parts = [];
          ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(function (k) {
            if (p.get(k)) parts.push(k + '=' + p.get(k));
          });
          u.value = parts.join('&');
        }
      }
      btn.disabled = false;
      btn.innerHTML = txtBtn;
    }).catch(function (x) {
      if (window.console) console.warn('Envío del formulario no completado:', x && x.message);
      clearTimeout(lento);
      clearTimeout(tm);
      btn.disabled = false;
      btn.innerHTML = txtBtn;
      if (err) err.style.display = 'block';
    });
  });
})();

  /* Si falta el MP3, se oculta el reproductor y queda el botón de llamada */
  (function () {
    var audio = document.getElementById('audio-presentacion-player');
    if (!audio) return;
    audio.addEventListener('error', function () {
      audio.style.display = 'none';
    });
  })();

  /* «Escucha a Cristina»: baja a #demo y reproduce la presentación (gesto del usuario). */
  (function () {
    var demoAudio = document.getElementById('audio-demo-sofia');
    if (!demoAudio) return;
    demoAudio.addEventListener('error', function () {
      demoAudio.style.display = 'none';
    });
    document.querySelectorAll('[data-play-demo]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var target = document.getElementById('demo');
        if (target && target.scrollIntoView) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        var intro = document.getElementById('audio-presentacion-player');
        if (intro && !intro.paused) intro.pause();
        var play = demoAudio.play();
        if (play && play.catch) play.catch(function () {});
      });
    });
  })();
