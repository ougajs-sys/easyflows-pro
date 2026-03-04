/**
 * Generates a self-contained HTML order form + script to be appended
 * inside an iframe's srcdoc.  The form submits via fetch to the
 * webhook-orders edge function and notifies the parent window on success
 * via postMessage.
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
<!-- Injected order form -->
<div id="order-form" style="padding:3rem 1rem;background:#f9fafb;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:1rem;box-shadow:0 4px 24px rgba(0,0,0,0.08);padding:2rem;">
    <h2 style="font-size:1.25rem;font-weight:700;margin:0 0 0.25rem;display:flex;align-items:center;gap:0.5rem;">
      <svg width="20" height="20" fill="none" stroke="${brandColor}" stroke-width="2" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
      Commander maintenant
    </h2>
    <p style="color:#6b7280;font-size:0.875rem;margin:0 0 1.5rem;">${productName} — ${formatPrice(price)} / unité</p>

    <form id="__landing_order_form" style="display:flex;flex-direction:column;gap:1rem;">
      <div>
        <label style="display:block;font-size:0.8rem;font-weight:500;color:#374151;margin-bottom:0.25rem;">Nom complet *</label>
        <input name="full_name" required placeholder="Votre nom" style="width:100%;box-sizing:border-box;padding:0.65rem 0.75rem;border:1px solid #d1d5db;border-radius:0.5rem;font-size:0.9rem;outline:none;" onfocus="this.style.borderColor='${brandColor}'" onblur="this.style.borderColor='#d1d5db'" />
      </div>
      <div>
        <label style="display:block;font-size:0.8rem;font-weight:500;color:#374151;margin-bottom:0.25rem;">Téléphone *</label>
        <input name="phone" required placeholder="07 XX XX XX XX" style="width:100%;box-sizing:border-box;padding:0.65rem 0.75rem;border:1px solid #d1d5db;border-radius:0.5rem;font-size:0.9rem;outline:none;" onfocus="this.style.borderColor='${brandColor}'" onblur="this.style.borderColor='#d1d5db'" />
      </div>
      <div>
        <label style="display:block;font-size:0.8rem;font-weight:500;color:#374151;margin-bottom:0.25rem;">Quantité *</label>
        <input name="quantity" type="number" min="1" value="1" required style="width:100%;box-sizing:border-box;padding:0.65rem 0.75rem;border:1px solid #d1d5db;border-radius:0.5rem;font-size:0.9rem;outline:none;" onfocus="this.style.borderColor='${brandColor}'" onblur="this.style.borderColor='#d1d5db'" />
      </div>
      <div>
        <label style="display:block;font-size:0.8rem;font-weight:500;color:#374151;margin-bottom:0.25rem;">Adresse de livraison *</label>
        <input name="delivery_address" required placeholder="Quartier, ville..." style="width:100%;box-sizing:border-box;padding:0.65rem 0.75rem;border:1px solid #d1d5db;border-radius:0.5rem;font-size:0.9rem;outline:none;" onfocus="this.style.borderColor='${brandColor}'" onblur="this.style.borderColor='#d1d5db'" />
      </div>
      <div>
        <label style="display:block;font-size:0.8rem;font-weight:500;color:#374151;margin-bottom:0.25rem;">Notes (optionnel)</label>
        <textarea name="notes" rows="2" placeholder="Instructions spéciales..." style="width:100%;box-sizing:border-box;padding:0.65rem 0.75rem;border:1px solid #d1d5db;border-radius:0.5rem;font-size:0.9rem;outline:none;resize:none;" onfocus="this.style.borderColor='${brandColor}'" onblur="this.style.borderColor='#d1d5db'"></textarea>
      </div>

      <div id="__total_row" style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem 1rem;background:#f9fafb;border:1px solid #e5e7eb;border-radius:0.5rem;">
        <span style="font-weight:500;color:#374151;">Total</span>
        <span id="__total_value" style="font-size:1.1rem;font-weight:700;color:${brandColor};">${formatPrice(price)}</span>
      </div>

      <div id="__form_error" style="display:none;background:#fef2f2;color:#dc2626;padding:0.75rem;border-radius:0.5rem;font-size:0.875rem;"></div>

      <button type="submit" id="__submit_btn" style="width:100%;padding:0.85rem;background:${brandColor};color:#fff;font-size:1rem;font-weight:600;border:none;border-radius:0.75rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:0.5rem;">
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
  var BRAND = "${brandColor}";

  var form = document.getElementById('__landing_order_form');
  var qtyInput = form.querySelector('[name="quantity"]');
  var totalEl = document.getElementById('__total_value');
  var submitBtn = document.getElementById('__submit_btn');
  var errorEl = document.getElementById('__form_error');

  function fmt(n){ return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'; }

  qtyInput.addEventListener('input', function(){
    var q = Math.max(1, parseInt(this.value) || 1);
    var t = q * PRICE;
    totalEl.textContent = fmt(t);
    submitBtn.innerHTML = '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> Commander — ' + fmt(t);
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

  // Try to find existing template form (common IDs/selectors)
  var templateForm = document.getElementById('orderForm')
    || document.querySelector('.modal form')
    || document.querySelector('[data-order-form]');

  if (!templateForm) return; // No template form found, fallback form stays visible

  // Hide the injected fallback form
  var injected = document.getElementById('order-form');
  if (injected) injected.style.display = 'none';

  // Intercept submit on capture phase to beat original handlers
  templateForm.addEventListener('submit', function(e){
    e.preventDefault();
    e.stopImmediatePropagation();

    var fd = new FormData(templateForm);
    var submitBtn = templateForm.querySelector('button[type="submit"]') || templateForm.querySelector('input[type="submit"]') || templateForm.querySelector('button:last-of-type');
    var originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';

    // Extract fields with common name variations
    var clientName = fd.get('full_name') || fd.get('client_name') || fd.get('name') || fd.get('nom') || '';
    var phone = fd.get('phone') || fd.get('telephone') || fd.get('tel') || '';
    var address = fd.get('delivery_address') || fd.get('address') || fd.get('adresse') || fd.get('ville') || '';
    var notes = fd.get('notes') || fd.get('note') || fd.get('message') || '';
    var qtyRaw = fd.get('quantity') || fd.get('quantite') || fd.get('qty') || '1';
    var qty = Math.max(1, parseInt(qtyRaw) || 1);

    // Try to get product name from modal title or hidden field
    var modalProductName = fd.get('product_name') || fd.get('produit') || '';
    var finalProductName = modalProductName || PRODUCT_NAME;

    // Try to extract price from modal (some templates pass it)
    var modalPrice = fd.get('price') || fd.get('prix') || '';
    var unitPrice = modalPrice ? parseFloat(String(modalPrice).replace(/[^0-9.,]/g,'').replace(',','.')) || PRICE : PRICE;
    var total = qty * unitPrice;

    // Loading state
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
      // Try to close the modal
      var modal = templateForm.closest('.modal') || templateForm.closest('[id*="modal"]') || templateForm.closest('[class*="modal"]');
      if (modal) modal.style.display = 'none';
      var overlay = document.querySelector('.modal-overlay') || document.querySelector('[class*="overlay"]');
      if (overlay) overlay.style.display = 'none';
      // Notify parent for thank-you page + pixel
      window.parent.postMessage({ type: 'order-success', orderId: orderId, total: total }, '*');
    })
    .catch(function(err){
      alert(err.message || 'Une erreur est survenue. Veuillez réessayer.');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
      }
    });
  }, true); // capture phase
})();
</script>
<style>@keyframes spin{to{transform:rotate(360deg)}}</style>
`;
}
