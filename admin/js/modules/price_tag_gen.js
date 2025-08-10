document.addEventListener('DOMContentLoaded', async () => {
  await window.currencyInitializationPromise;

  const searchInput = document.getElementById('product-search');
  const resultsDiv = document.getElementById('product-results');
  const tagContainer = document.getElementById('price-tag');
  const priceEl = document.getElementById('tag-price');
  const nameEl = document.getElementById('tag-name');
  const printBtn = document.getElementById('print-tag');

  let productCache = [];
  try {
    productCache = await apiFetch('/products', {
      headers: { 'Range': '0-1999' }
    });
  } catch (err) {
    console.error('Failed to load products', err);
  }

  function renderResults() {
    const term = searchInput.value.toLowerCase();
    resultsDiv.innerHTML = '';
    if (!term) return;
    const filtered = productCache.filter(p =>
      p.name_en.toLowerCase().includes(term) ||
      (p.sku && p.sku.toLowerCase().includes(term))
    );
    filtered.slice(0, 10).forEach(p => {
      const div = document.createElement('div');
      div.className = 'result-item';
      div.textContent = `${p.name_en}${p.sku ? ' (' + p.sku + ')' : ''}`;
      div.addEventListener('click', () => selectProduct(p));
      resultsDiv.appendChild(div);
    });
  }

  function selectProduct(product) {
    resultsDiv.innerHTML = '';
    searchInput.value = '';
    tagContainer.style.display = 'inline-block';
    printBtn.style.display = 'inline-block';
    priceEl.textContent = formatPrice(product.selling_price, 'KHR');
    nameEl.textContent = product.name_en;
  }

  searchInput.addEventListener('input', renderResults);
  printBtn.addEventListener('click', () => window.print());
});
