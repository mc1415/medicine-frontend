document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('barcode-input');
  const generateBtn = document.getElementById('generate-barcode');
  const barcodeSvg = document.getElementById('barcode');
  const container = document.getElementById('barcode-container');
  const printBtn = document.getElementById('print-barcode');

  generateBtn.addEventListener('click', () => {
    const value = input.value.trim();
    if (!value) return;
    JsBarcode(barcodeSvg, value, {
      format: 'code128',
      width: 2,
      height: 40,
      displayValue: true
    });
    container.style.display = 'inline-block';
    printBtn.style.display = 'inline-block';
  });

  printBtn.addEventListener('click', () => {
    window.print();
  });
});
