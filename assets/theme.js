/* ============================================================
   TBEAST theme — interactions
   AJAX cart, drawer, predictive search, qty steppers, toast
   ============================================================ */
(function () {
  'use strict';
  var money = window.Shopify && Shopify.formatMoney ? null : null;
  var fmt = (window.TBEAST && window.TBEAST.moneyFormat) || '${{amount}}';

  function formatMoney(cents) {
    var value = (cents / 100);
    var str = value.toFixed(value % 1 === 0 ? 0 : 2);
    return fmt.replace(/\{\{\s*amount[^}]*\}\}/, str);
  }

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ---------- toast ---------- */
  var toastEl, toastTimer;
  function toast(msg) {
    toastEl = toastEl || $('#tb-toast');
    if (!toastEl) return;
    $('.tb-toast__msg', toastEl).textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2400);
  }

  /* ---------- drawer ---------- */
  var drawer;
  function openCart() { drawer = drawer || $('#tb-cart-drawer'); if (drawer) { drawer.classList.add('is-open'); document.body.style.overflow = 'hidden'; } }
  function closeCart() { if (drawer) { drawer.classList.remove('is-open'); document.body.style.overflow = ''; } }

  /* ---------- search overlay ---------- */
  var search, searchInput, searchTimer;
  function openSearch() {
    search = search || $('#tb-search');
    if (!search) return;
    search.classList.add('is-open'); document.body.style.overflow = 'hidden';
    searchInput = searchInput || $('#tb-search-input');
    setTimeout(function () { if (searchInput) searchInput.focus(); }, 60);
  }
  function closeSearch() { if (search) { search.classList.remove('is-open'); document.body.style.overflow = ''; } }

  function renderResults(items, query) {
    var box = $('#tb-search-results');
    if (!box) return;
    if (!items.length) {
      box.innerHTML = '<div class="tb-search__empty">' + (box.dataset.empty || 'No results') + '</div>';
      return;
    }
    box.innerHTML = items.map(function (p) {
      var img = p.featured_image && p.featured_image.url
        ? '<img src="' + p.featured_image.url + '&width=96" alt="">'
        : (p.image ? '<img src="' + p.image + '&width=96" alt="">' : '<span class="tb-visual"><span class="tb-visual__orb"></span></span>');
      return '<a class="tb-search__result" href="' + p.url + '">' +
        '<span class="media">' + img + '</span>' +
        '<span class="info"><b>' + p.title + '</b><span>' + (p.vendor || '') + '</span></span>' +
        '<span class="price">' + (p.price != null ? formatMoney(p.price) : '') + '</span></a>';
    }).join('');
  }

  function predictiveSearch(q) {
    var box = $('#tb-search-results');
    if (!q) { if (box && box.dataset.defaultHtml) box.innerHTML = box.dataset.defaultHtml; return; }
    var url = '/search/suggest.json?q=' + encodeURIComponent(q) + '&resources[type]=product&resources[limit]=6&section_id=predictive-search';
    fetch('/search/suggest.json?q=' + encodeURIComponent(q) + '&resources[type]=product&resources[limit]=6')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var products = (data.resources && data.resources.results && data.resources.results.products) || [];
        renderResults(products, q);
      })
      .catch(function () {});
  }

  /* ---------- AJAX cart ---------- */
  function refreshCart() {
    return fetch('/cart.js').then(function (r) { return r.json(); }).then(function (cart) {
      updateCount(cart.item_count);
      renderDrawer(cart);
      return cart;
    }).catch(function () {});
  }

  function updateCount(n) {
    $all('[data-cart-count]').forEach(function (el) {
      el.textContent = n;
      el.style.display = n > 0 ? '' : 'none';
      el.classList.remove('is-bump'); void el.offsetWidth; el.classList.add('is-bump');
    });
  }

  function renderDrawer(cart) {
    var body = $('#tb-cart-body');
    var foot = $('#tb-cart-foot');
    if (!body) return;
    var FREE = parseInt(body.dataset.freeThreshold || '0', 10);
    var t = JSON.parse(body.dataset.strings || '{}');

    if (!cart.items.length) {
      body.innerHTML = '<div class="tb-empty"><div class="tb-empty__icon">' +
        '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 2 3 6v13a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>' +
        '</div><div style="font-size:15.5px;color:var(--muted)">' + (t.empty || 'Your cart is empty') + '</div>' +
        '<button class="tb-btn tb-btn--ghost" style="margin-top:20px" data-cart-close>' + (t.start || 'Start shopping') + '</button></div>';
      if (foot) foot.innerHTML = '';
      return;
    }

    body.innerHTML = cart.items.map(function (it) {
      var img = it.image ? '<img src="' + it.image.replace(/(\.[^.]*)$/, '_120x$1') + '" alt="">' : '<span class="tb-visual"><span class="tb-visual__orb"></span></span>';
      var variant = it.options_with_values && it.options_with_values.length && it.options_with_values[0].value !== 'Default Title'
        ? it.options_with_values.map(function (o) { return o.value; }).join(' · ') : '';
      return '<div class="tb-cart-line" data-key="' + it.key + '">' +
        '<span class="tb-cart-line__media">' + img + '</span>' +
        '<div style="flex:1;min-width:0">' +
          '<div class="tb-cart-line__top"><span class="tb-cart-line__name">' + it.product_title + '</span>' +
          '<button class="tb-remove" data-qty="0" data-key="' + it.key + '">&#10005;</button></div>' +
          '<div class="tb-cart-line__variant">' + variant + '</div>' +
          '<div class="tb-cart-line__bottom"><div class="tb-mini-step">' +
            '<button data-qty="' + (it.quantity - 1) + '" data-key="' + it.key + '">&minus;</button>' +
            '<span>' + it.quantity + '</span>' +
            '<button data-qty="' + (it.quantity + 1) + '" data-key="' + it.key + '">+</button>' +
          '</div><span style="font-family:var(--display);font-weight:600">' + formatMoney(it.final_line_price) + '</span></div>' +
        '</div></div>';
    }).join('');

    if (foot) {
      var remain = Math.max(0, FREE - cart.total_price);
      var pct = FREE ? Math.min(100, (cart.total_price / FREE) * 100) : 100;
      var shipMsg = remain > 0
        ? (t.add || 'Add __AMT__ for free shipping').replace(/__AMT__|\{amount\}/, formatMoney(remain))
        : (t.unlocked || 'You unlocked free shipping');
      foot.innerHTML =
        (FREE ? '<div class="tb-ship-bar"><div class="tb-ship-bar__fill" style="width:' + pct + '%"></div></div><div class="tb-ship-msg">' + shipMsg + '</div>' : '') +
        '<form class="tb-discount" id="tb-discount-form" data-checkout="/checkout" data-applied="' + (t.discount_applied || 'Code will apply at checkout') + '">' +
          '<input type="text" name="discount" class="tb-discount__input" placeholder="' + (t.discount_ph || 'Discount code') + '" autocomplete="off">' +
          '<button type="submit" class="tb-discount__btn">' + (t.discount_apply || 'Apply') + '</button>' +
        '</form>' +
        '<div class="tb-discount__note" id="tb-discount-note" hidden></div>' +
        '<div class="tb-sum"><span>' + (t.subtotal || 'Subtotal') + '</span><b>' + formatMoney(cart.total_price) + '</b></div>' +
        '<div class="tb-sum tb-sum--total"><span class="lbl">' + (t.total || 'Total') + '</span><span class="val">' + formatMoney(cart.total_price) + '</span></div>' +
        '<a href="/checkout" id="tb-checkout-btn" class="tb-btn tb-btn--primary tb-btn--block">' + (t.checkout || 'Checkout') + '</a>' +
        '<div class="tb-secure">' + (t.secure || 'Secure, encrypted payment') + '</div>';
    }
  }

  function addToCart(id, qty) {
    return fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ id: id, quantity: qty || 1 })
    }).then(function (r) { return r.json(); }).then(function (item) {
      return refreshCart().then(function () {
        openCart();
        toast((document.body.dataset.addedMsg || 'Added to cart'));
        return item;
      });
    });
  }

  function changeLine(key, qty) {
    return fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ id: key, quantity: qty })
    }).then(function (r) { return r.json(); }).then(function (cart) {
      updateCount(cart.item_count);
      renderDrawer(cart);
      return cart;
    });
  }

  /* ---------- delegated events ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-cart-open]'); if (t) { e.preventDefault(); refreshCart(); openCart(); return; }
    if (e.target.closest('[data-cart-close]')) { e.preventDefault(); closeCart(); return; }
    if (e.target.closest('[data-search-open]')) { e.preventDefault(); openSearch(); return; }
    if (e.target.closest('[data-search-close]')) { e.preventDefault(); closeSearch(); return; }

    var add = e.target.closest('[data-add-id]');
    if (add) { e.preventDefault(); add.classList.add('is-loading'); addToCart(add.dataset.addId, parseInt(add.dataset.addQty || '1', 10)).then(function () { add.classList.remove('is-loading'); }); return; }

    var line = e.target.closest('[data-key][data-qty]');
    if (line) { e.preventDefault(); changeLine(line.dataset.key, parseInt(line.dataset.qty, 10)); return; }

    var step = e.target.closest('[data-step]');
    if (step) {
      e.preventDefault();
      var input = $('#' + step.dataset.target);
      if (input) { var v = Math.max(1, (parseInt(input.value, 10) || 1) + (step.dataset.step === 'up' ? 1 : -1)); input.value = v; }
      return;
    }

    var tag = e.target.closest('[data-search-tag]');
    if (tag) { e.preventDefault(); if (searchInput) { searchInput.value = tag.dataset.searchTag; predictiveSearch(tag.dataset.searchTag); } return; }
  });

  /* product form submit (add to cart) */
  document.addEventListener('submit', function (e) {
    var disc = e.target.closest('#tb-discount-form');
    if (disc) {
      e.preventDefault();
      var input = disc.querySelector('[name="discount"]');
      var note = $('#tb-discount-note');
      var code = (input && input.value || '').trim();
      if (!code) { if (input) input.focus(); return; }
      var checkout = $('#tb-checkout-btn');
      var url = '/discount/' + encodeURIComponent(code) + '?redirect=' + encodeURIComponent('/checkout');
      if (checkout) checkout.setAttribute('href', url);
      if (note) {
        note.className = 'tb-discount__note tb-discount__note--ok';
        note.textContent = '✓ ' + (disc.dataset.applied || 'Code will apply at checkout') + ' (' + code.toUpperCase() + ')';
        note.hidden = false;
      }
      return;
    }
    var form = e.target.closest('form[data-product-form]');
    if (!form) return;
    e.preventDefault();
    var id = form.querySelector('[name="id"]').value;
    var qtyEl = form.querySelector('[name="quantity"]');
    addToCart(id, qtyEl ? parseInt(qtyEl.value, 10) : 1);
  });

  document.addEventListener('input', function (e) {
    if (e.target.id === 'tb-search-input') {
      clearTimeout(searchTimer);
      var q = e.target.value.trim();
      searchTimer = setTimeout(function () { predictiveSearch(q); }, 220);
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeSearch(); closeCart(); }
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); openSearch(); }
  });

  /* product page: variant + gallery + swatches */
  document.addEventListener('DOMContentLoaded', function () {
    refreshCart();

    // scroll reveal (stable IntersectionObserver — replaces experimental view() timeline)
    var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var revealEls = $all('.tb-reveal');
    function revealNow(el) { el.classList.add('is-in'); }
    if (prefersReduced || !('IntersectionObserver' in window)) {
      revealEls.forEach(revealNow);
    } else if (revealEls.length) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { revealNow(en.target); io.unobserve(en.target); }
        });
      }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
      revealEls.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < (window.innerHeight || 800) && r.bottom > 0) revealNow(el); // already on screen
        else io.observe(el);
      });
      // safety net: never let a section stay hidden
      setTimeout(function () { revealEls.forEach(revealNow); }, 2500);
    }

    // FAQ accordion — smooth open/close, opening one closes its siblings
    function faqClose(item) {
      if (!item.open) return;
      item.classList.remove('is-open');
      clearTimeout(item._ft);
      item._ft = setTimeout(function () { item.open = false; }, 430);
    }
    function faqOpen(item) {
      clearTimeout(item._ft);
      item.open = true;
      requestAnimationFrame(function () { requestAnimationFrame(function () { item.classList.add('is-open'); }); });
    }
    $all('.tb-faq__list').forEach(function (list) {
      list.addEventListener('click', function (e) {
        var sum = e.target.closest('.tb-faq__q');
        if (!sum) return;
        e.preventDefault();
        var item = sum.parentElement;
        var isOpen = item.classList.contains('is-open');
        $all('.tb-faq__item', list).forEach(function (d) { if (d !== item) faqClose(d); });
        if (isOpen) faqClose(item); else faqOpen(item);
      });
    });

    // video click-to-play
    $all('[data-video-player]').forEach(function (player) {
      var cover = player.querySelector('.tb-video__cover');
      if (!cover) return;
      cover.addEventListener('click', function () {
        var type = player.getAttribute('data-video-type');
        if (type === 'native') {
          var tpl = player.querySelector('[data-video-embed]');
          if (tpl) { player.innerHTML = tpl.innerHTML; var v = player.querySelector('video'); if (v) { try { v.play(); } catch (e) {} } }
        } else if (type === 'external') {
          var host = player.getAttribute('data-video-host');
          var id = player.getAttribute('data-video-id');
          var src = host === 'youtube'
            ? 'https://www.youtube.com/embed/' + id + '?autoplay=1&rel=0'
            : 'https://player.vimeo.com/video/' + id + '?autoplay=1';
          player.innerHTML = '<iframe class="tb-video__media" src="' + src + '" allow="autoplay; fullscreen; encrypted-media" allowfullscreen frameborder="0"></iframe>';
        }
      });
    });

    // spin-to-win popup
    (function () {
      var root = $('#tb-spin');
      if (!root) return;
      var KEY = 'tb_spin_until';
      var cooldownH = parseFloat(root.getAttribute('data-cooldown')) || 6;
      var delayS = parseFloat(root.getAttribute('data-delay')) || 30;
      var now = Date.now();
      var inEditor = !!(window.Shopify && window.Shopify.designMode);
      if (!inEditor) { try { var until = parseFloat(localStorage.getItem(KEY) || '0'); if (until && now < until) return; } catch (e) {} }

      var splitClean = function (a) { return (a || '').split('|~|').map(function (s) { return s.trim(); }); };
      var labels = splitClean(root.getAttribute('data-labels'));
      var colors = splitClean(root.getAttribute('data-colors'));
      var codes = splitClean(root.getAttribute('data-codes'));
      var segs = [];
      for (var i = 0; i < labels.length; i++) {
        if (!labels[i]) continue;
        segs.push({ label: labels[i], color: colors[i] || '#2a2018', code: codes[i] || '' });
      }
      if (segs.length < 2) return;

      var canvas = root.querySelector('[data-spin-canvas]');
      var ctx = canvas.getContext('2d');
      var btn = root.querySelector('[data-spin-btn]');
      var i18nSpin = root.getAttribute('data-i18n-spin') || 'SPIN';
      var i18nSpinning = root.getAttribute('data-i18n-spinning') || '…';
      var i18nCopied = root.getAttribute('data-i18n-copied') || 'Copied!';
      var i18nTry = root.getAttribute('data-i18n-tryagain') || 'Try again next time.';
      var N = segs.length, seg = (Math.PI * 2) / N, rot = 0, spinning = false, done = false;
      var SZ = 460, c = SZ / 2, R = SZ / 2 - 8;

      function lighten(hex) { return hex; }
      function draw() {
        ctx.clearRect(0, 0, SZ, SZ);
        ctx.save(); ctx.translate(c, c); ctx.rotate(rot);
        for (var i = 0; i < N; i++) {
          var a0 = i * seg, a1 = a0 + seg;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, a0, a1); ctx.closePath();
          ctx.fillStyle = segs[i].color || '#2a2018'; ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 2; ctx.stroke();
          ctx.save(); ctx.rotate(a0 + seg / 2); ctx.textAlign = 'right';
          ctx.fillStyle = '#fff'; ctx.font = '700 18px "Space Grotesk", sans-serif';
          ctx.fillText((segs[i].label || '').slice(0, 14), R - 20, 7); ctx.restore();
        }
        ctx.restore();
        ctx.beginPath(); ctx.arc(c, c, R, 0, 6.2832); ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 5; ctx.stroke();
      }

      function confetti(box) {
        var cols = ['#d9a23f', '#c86a3f', '#e0a85a', '#ffffff'];
        for (var i = 0; i < 26; i++) {
          var s = document.createElement('span');
          s.style.left = (Math.random() * 100) + '%';
          s.style.background = cols[i % cols.length];
          s.style.animationDelay = (Math.random() * 0.3) + 's';
          box.appendChild(s);
        }
      }

      function reveal(idx) {
        var s = segs[idx];
        var stage = root.querySelector('[data-spin-stage]');
        var win = root.querySelector('[data-spin-win]');
        stage.hidden = true; win.hidden = false;
        root.querySelector('[data-spin-prize]').textContent = s.label;
        if (s.code) {
          root.querySelector('[data-spin-code]').textContent = s.code.toUpperCase();
          confetti(root.querySelector('[data-spin-confetti]'));
        } else {
          root.querySelector('.tb-spin__codebox').style.display = 'none';
          root.querySelector('.tb-spin__congrats').textContent = '';
          root.querySelector('[data-spin-note]').textContent = i18nTry;
        }
      }

      function spin() {
        if (spinning || done) return;
        spinning = true; done = true; btn.disabled = true; btn.textContent = i18nSpinning;
        var idx = Math.floor(Math.random() * N);
        var turns = 5 + Math.floor(Math.random() * 3);
        var target = Math.PI * 2 * turns + (-Math.PI / 2 - (idx * seg + seg / 2));
        var start = rot, dur = 4400, t0 = performance.now();
        function ease(p) { return 1 - Math.pow(1 - p, 3); }
        function frame(t) {
          var p = Math.min((t - t0) / dur, 1);
          rot = start + (target - start) * ease(p); draw();
          if (p < 1) requestAnimationFrame(frame);
          else { spinning = false; setTimeout(function () { reveal(idx); }, 350); }
        }
        requestAnimationFrame(frame);
      }

      btn.addEventListener('click', spin);

      var copyBtn = root.querySelector('[data-spin-copy]');
      if (copyBtn) copyBtn.addEventListener('click', function () {
        var code = root.querySelector('[data-spin-code]').textContent;
        var fin = function () {
          copyBtn.textContent = i18nCopied; copyBtn.classList.add('is-copied');
          if (!inEditor) setTimeout(close, 2200);
        };
        if (navigator.clipboard) { navigator.clipboard.writeText(code).then(fin, fin); } else { fin(); }
      });

      function setCooldown() { try { localStorage.setItem(KEY, String(Date.now() + cooldownH * 3600 * 1000)); } catch (e) {} }
      function close() { root.classList.remove('is-open'); document.documentElement.style.overflow = ''; }
      $all('[data-spin-close]', root).forEach(function (el) { el.addEventListener('click', close); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && root.classList.contains('is-open')) close(); });

      draw();
      var openTimer = setTimeout(function () {
        if (window.Shopify && window.Shopify.designMode) return; // don't auto-pop in editor
        root.classList.add('is-open');
        setCooldown();
      }, delayS * 1000);
      // in theme editor, show immediately for preview
      if (window.Shopify && window.Shopify.designMode) { clearTimeout(openTimer); root.classList.add('is-open'); }
    })();

    // countdown timers
    $all('[data-countdown]').forEach(function (el) {
      var end = new Date((el.dataset.countdown || '').replace(/-/g, '/')).getTime();
      if (isNaN(end)) return;
      var dD = $('[data-d]', el), dH = $('[data-h]', el), dM = $('[data-m]', el), dS = $('[data-s]', el);
      function pad(n) { return (n < 10 ? '0' : '') + n; }
      function tick() {
        var diff = Math.max(0, end - Date.now());
        var s = Math.floor(diff / 1000);
        if (dD) dD.textContent = pad(Math.floor(s / 86400));
        if (dH) dH.textContent = pad(Math.floor((s % 86400) / 3600));
        if (dM) dM.textContent = pad(Math.floor((s % 3600) / 60));
        if (dS) dS.textContent = pad(s % 60);
        if (diff <= 0 && el._cd) clearInterval(el._cd);
      }
      tick(); el._cd = setInterval(tick, 1000);
    });

    var sbox = $('#tb-search-results');
    if (sbox) sbox.dataset.defaultHtml = sbox.innerHTML;

    // gallery thumbnail switch
    $all('[data-gallery]').forEach(function (gal) {
      var stageImg = $('[data-stage-img]', gal);
      $all('[data-thumb]', gal).forEach(function (th) {
        th.addEventListener('click', function () {
          $all('[data-thumb]', gal).forEach(function (x) { x.classList.remove('is-active'); });
          th.classList.add('is-active');
          var src = th.dataset.thumb;
          if (stageImg && src) stageImg.src = src;
        });
      });
    });

    // variant selection (radios) -> update hidden id + price
    $all('[data-variant-form]').forEach(function (form) {
      var data = {};
      try { data = JSON.parse($('[data-variant-json]', form).textContent); } catch (err) {}
      var idInput = form.querySelector('[name="id"]');
      function selected() {
        var picks = $all('[data-option]:checked', form).map(function (r) { return r.value; });
        return data.find(function (v) { return v.options.join('~~') === picks.join('~~'); });
      }
      form.addEventListener('change', function (e) {
        if (!e.target.matches('[data-option]')) return;
        var v = selected();
        if (!v) return;
        if (idInput) idInput.value = v.id;
        var priceNow = $('[data-price-now]', form.closest('[data-product]') || document);
        if (priceNow) priceNow.textContent = formatMoney(v.price);
        var label = $('[data-variant-label]', form);
        if (label) label.textContent = e.target.value;
      });
    });
  });

  window.TBEAST = window.TBEAST || {};
  window.TBEAST.addToCart = addToCart;
  window.TBEAST.refreshCart = refreshCart;

  // theme editor: reveal newly added sections immediately
  document.addEventListener('shopify:section:load', function (e) {
    $all('.tb-reveal', e.target).forEach(function (el) { el.classList.add('is-in'); });
  });
})();
