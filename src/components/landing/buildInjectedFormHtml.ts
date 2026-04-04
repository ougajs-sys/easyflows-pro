/**
 * Generates a self-contained HTML order form as a POPUP MODAL + floating CTA button.
 * Mobile-first: form fits entirely on screen without scrolling.
 * Desktop: centered modal card.
 */
export function buildInjectedFormHtml(opts: {
  productId: string;
  productName: string;
  price: number;
  brandColor: string;
  webhookUrl: string;
}) {
  const { productId, productName, price, brandColor, webhookUrl } = opts;

  const formatPrice = (p: number) =>
    new Intl.NumberFormat("fr-FR").format(p) + " FCFA";

  return `
<!-- Injected order form — POPUP MODAL mobile-first -->
<style>
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
  @keyframes slideUpDesktop{from{opacity:0;transform:translate(-50%,-48%)}to{opacity:1;transform:translate(-50%,-50%)}}

  #__order_cta_btn {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9998;
    background: ${brandColor};
    color: #fff;
    border: none;
    border-radius: 50px;
    padding: 14px 32px;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.25);
    font-family: system-ui, -apple-system, sans-serif;
    white-space: nowrap;
    animation: fadeIn 0.5s ease;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  #__order_cta_btn:hover { transform: translateX(-50%) scale(1.04); box-shadow: 0 6px 28px rgba(0,0,0,0.3); }
  #__order_cta_btn:active { transform: translateX(-50%) scale(0.97); }

  #__order_modal_overlay {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(0,0,0,0.5);
    animation: fadeIn 0.2s ease;
  }
  #__order_modal_overlay.active { display: flex; }

  /* MOBILE: full bottom sheet */
  #__order_modal_card {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 10000;
    background: #fff;
    border-radius: 20px 20px 0 0;
    padding: 20px 16px 24px;
    max-height: 100dvh;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    animation: slideUp 0.3s ease;
    font-family: system-ui, -apple-system, sans-serif;
  }

  /* DESKTOP: centered card */
  @media (min-width: 641px) {
    #__order_modal_card {
      position: fixed;
      bottom: auto;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      right: auto;
      max-width: 440px;
      width: 90%;
      border-radius: 16px;
      padding: 28px 24px;
      max-height: 90vh;
      animation: slideUpDesktop 0.3s ease;
    }
  }

  #__order_modal_card .__close_btn {
    position: absolute;
    top: 12px;
    right: 14px;
    background: #f3f4f6;
    border: none;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    font-size: 18px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6b7280;
    line-height: 1;
  }
  #__order_modal_card .__close_btn:hover { background: #e5e7eb; }

  #__order_modal_card input,
  #__order_modal_card textarea,
  #__order_modal_card select {
    width: 100%;
    box-sizing: border-box;
    padding: 10px 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 16px;
    outline: none;
    transition: border-color 0.15s;
    font-family: inherit;
    background: #fff;
    -webkit-appearance: none;
  }
  #__order_modal_card input:focus,
  #__order_modal_card textarea:focus,
  #__order_modal_card select:focus { border-color: ${brandColor}; }

  #__order_modal_card label {
    display: block;
    font-size: 0.78rem;
    font-weight: 600;
    color: #374151;
    margin-bottom: 4px;
  }

  #__order_modal_card .__field { margin-bottom: 10px; }

  @media (max-width: 640px) {
    #__order_modal_card .__field { margin-bottom: 8px; }
    #__order_modal_card input,
    #__order_modal_card select { padding: 9px 10px; }
    #__order_modal_card textarea { min-height: 36px; }
  }

  #__wa_float {
    position: fixed;
    bottom: 80px;
    right: 16px;
    z-index: 9990;
    width: 56px;
    height: 56px;
    background: #25D366;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    animation: pulse 2s infinite;
    text-decoration: none;
  }
  @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
</style>

<!-- Floating CTA button -->
<button id="__order_cta_btn" onclick="document.getElementById('__order_modal_overlay').classList.add('active');document.body.style.overflow='hidden';">
  <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
  Commander — ${formatPrice(price)}
</button>

<!-- Modal overlay -->
<div id="__order_modal_overlay" onclick="if(event.target===this){this.classList.remove('active');document.body.style.overflow='';}">
  <div id="__order_modal_card">
    <button class="__close_btn" onclick="document.getElementById('__order_modal_overlay').classList.remove('active');document.body.style.overflow='';">✕</button>

    <h2 style="font-size:1.05rem;font-weight:700;margin:0 0 2px;color:#111827;">Commander maintenant</h2>
    <p style="color:#6b7280;font-size:0.8rem;margin:0 0 14px;">${productName} — ${formatPrice(price)} / unité</p>

    <form id="__landing_order_form">
      <div class="__field">
        <label>Nom complet *</label>
        <input name="full_name" required placeholder="Votre nom" />
      </div>
      <div class="__field">
        <label>Téléphone *</label>
        <input name="phone" type="tel" required placeholder="07 XX XX XX XX" />
      </div>
      <div style="display:flex;gap:10px;">
        <div class="__field" style="flex:1;">
          <label>Quantité *</label>
          <input name="quantity" type="number" min="1" value="1" required />
        </div>
        <div class="__field" style="flex:2;">
          <label>Adresse de livraison *</label>
          <input name="delivery_address" required placeholder="Quartier, ville..." />
        </div>
      </div>
      <div class="__field">
        <label>Notes (optionnel)</label>
        <textarea name="notes" rows="1" placeholder="Instructions spéciales..." style="resize:none;"></textarea>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:10px;">
        <span style="font-weight:500;color:#374151;font-size:0.875rem;">Total</span>
        <span id="__total_value" style="font-size:1.05rem;font-weight:700;color:${brandColor};">${formatPrice(price)}</span>
      </div>

      <div id="__form_error" style="display:none;background:#fef2f2;color:#dc2626;padding:8px;border-radius:8px;font-size:0.8rem;margin-bottom:8px;"></div>

      <button type="submit" id="__submit_btn" style="width:100%;padding:12px;background:${brandColor};color:#fff;font-size:0.95rem;font-weight:600;border:none;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;min-height:48px;">
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        Commander — ${formatPrice(price)}
      </button>
    </form>
  </div>
</div>

<script>
(function(){
  var PRICE = ${price};
  var PRODUCT_ID = "${productId}";
  var PRODUCT_NAME = "${productName.replace(/"/g, '\\"')}";
  var WEBHOOK_URL = "${webhookUrl}";

  var form = document.getElementById('__landing_order_form');
  var qtyInput = form.querySelector('[name="quantity"]');
  var totalEl = document.getElementById('__total_value');
  var submitBtn = document.getElementById('__submit_btn');
  var errorEl = document.getElementById('__form_error');
  var ctaBtn = document.getElementById('__order_cta_btn');

  function fmt(n){ return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'; }

  qtyInput.addEventListener('input', function(){
    var q = Math.max(1, parseInt(this.value) || 1);
    var t = q * PRICE;
    totalEl.textContent = fmt(t);
    submitBtn.innerHTML = '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> Commander — ' + fmt(t);
    ctaBtn.innerHTML = '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> Commander — ' + fmt(t);
  });

  form.addEventListener('submit', function(e){
    e.preventDefault();
    errorEl.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span style="display:inline-block;width:18px;height:18px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite;"></span> Traitement...';

    var fd = new FormData(form);
    var qty = Math.max(1, parseInt(fd.get('quantity')) || 1);
    var total = qty * PRICE;

    fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: fd.get('full_name'),
        client_phone: fd.get('phone'),
        product_id: PRODUCT_ID,
        product_name: PRODUCT_NAME,
        quantity: qty,
        unit_price: PRICE,
        total_amount: total,
        delivery_address: fd.get('delivery_address'),
        notes: fd.get('notes') || '',
        source: 'landing_page'
      })
    })
    .then(function(r){ if(!r.ok) throw new Error('Erreur serveur'); return r.json(); })
    .then(function(result){
      var orderId = (result.order && result.order.id) || result.order_id || result.id || '';
      document.getElementById('__order_modal_overlay').classList.remove('active');
      document.body.style.overflow = '';
      window.parent.postMessage({ type: 'order-success', orderId: orderId, total: total }, '*');
    })
    .catch(function(err){
      errorEl.textContent = err.message || 'Une erreur est survenue';
      errorEl.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> Commander — ' + fmt(total);
    });
  });
})();
</script>

<!-- Interception script: hijack existing template forms -->
<script>
(function(){
  var PRODUCT_ID = "${productId}";
  var PRODUCT_NAME = "${productName.replace(/"/g, '\\"')}";
  var PRICE = ${price};
  var WEBHOOK_URL = "${webhookUrl}";

  function fmt(n){ return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'; }

  var templateForm = document.getElementById('orderForm')
    || document.querySelector('.modal form')
    || document.querySelector('[data-order-form]');

  if (!templateForm) return;

  // Hide our injected CTA if template has its own form
  var ctaBtn = document.getElementById('__order_cta_btn');
  if (ctaBtn) ctaBtn.style.display = 'none';
  var injectedOverlay = document.getElementById('__order_modal_overlay');
  if (injectedOverlay) injectedOverlay.style.display = 'none';

  templateForm.addEventListener('submit', function(e){
    e.preventDefault();
    e.stopImmediatePropagation();

    var fd = new FormData(templateForm);
    var submitBtn = templateForm.querySelector('button[type="submit"]') || templateForm.querySelector('input[type="submit"]') || templateForm.querySelector('button:last-of-type');
    var originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';

    var clientName = fd.get('full_name') || fd.get('client_name') || fd.get('name') || fd.get('nom') || '';
    var phone = fd.get('phone') || fd.get('telephone') || fd.get('tel') || '';
    var address = fd.get('delivery_address') || fd.get('address') || fd.get('adresse') || fd.get('ville') || '';
    var notes = fd.get('notes') || fd.get('note') || fd.get('message') || '';
    var qtyRaw = fd.get('quantity') || fd.get('quantite') || fd.get('qty') || '1';
    var qty = Math.max(1, parseInt(qtyRaw) || 1);

    var modalProductName = fd.get('product_name') || fd.get('produit') || '';
    var finalProductName = modalProductName || PRODUCT_NAME;

    var modalPrice = fd.get('price') || fd.get('prix') || '';
    var unitPrice = modalPrice ? parseFloat(String(modalPrice).replace(/[^0-9.,]/g,'').replace(',','.')) || PRICE : PRICE;
    var total = qty * unitPrice;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span style="display:inline-block;width:18px;height:18px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite;"></span> Traitement...';
    }

    fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: clientName,
        client_phone: phone,
        product_id: PRODUCT_ID,
        product_name: finalProductName,
        quantity: qty,
        unit_price: unitPrice,
        total_amount: total,
        delivery_address: address,
        notes: notes,
        source: 'landing_page'
      })
    })
    .then(function(r){ if(!r.ok) throw new Error('Erreur serveur'); return r.json(); })
    .then(function(result){
      var orderId = (result.order && result.order.id) || result.order_id || result.id || '';
      var modal = templateForm.closest('.modal') || templateForm.closest('[id*="modal"]') || templateForm.closest('[class*="modal"]');
      if (modal) modal.style.display = 'none';
      var overlay = document.querySelector('.modal-overlay') || document.querySelector('[class*="overlay"]');
      if (overlay) overlay.style.display = 'none';
      window.parent.postMessage({ type: 'order-success', orderId: orderId, total: total }, '*');
    })
    .catch(function(err){
      alert(err.message || 'Une erreur est survenue. Veuillez réessayer.');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
      }
    });
  }, true);
})();
</script>
`;
}
