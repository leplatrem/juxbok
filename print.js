window.addEventListener('load', setupPrint);

const NB_CARDS = 9;

async function setupPrint() {
  // Button to trigger browser print
  const printBtn = document.getElementById('btn-print');
  printBtn.addEventListener('click', () => window.print());

  // Add cards fields
  const form = document.getElementById('form-print');

  for (var i=0; i<NB_CARDS; i++) {
    const field = document.createElement('input');
    field.setAttribute('placeHolder', 'https://www.youtube.com/watch?v=');
    field.setAttribute('pattern', YOUTUBE_REGEXP.toString().slice(1, -1));
    field.addEventListener('keyup', () => refreshCard(field));

    const container = document.createElement('div');
    const preview = document.createElement('img');
    const qrcodeDiv = document.createElement('div');
    container.appendChild(field);
    container.appendChild(preview);
    container.appendChild(qrcodeDiv);
    form.appendChild(container);
  }

  // Load samples.
  const samples = [
    "https://www.youtube.com/watch?v=lxgDdNXe4KA",
    "https://youtu.be/o53sNZVcu-4",
    "https://www.youtube.com/watch?v=ibwbd70QYiw",
    "https://www.youtube.com/watch?v=Wg4FzviEb_s",
    "https://www.youtube.com/watch?v=ZnpsvoQ8p0o",
    "https://www.youtube.com/watch?v=hf0YbhqY-Ew",
    "https://www.youtube.com/watch?v=JWUPdiorPJc",
  ];
  const fields = form.querySelectorAll('input');
  samples.forEach((v, i) => {
    const field = fields[i];
    field.value = v;
    refreshCard(field);
  });
}

function refreshCard(field) {
  const container = field.parentNode;
  const preview = container.querySelector('img');
  const qrcodeDiv = container.querySelector('div');

  // Show preview and QR only if URL is valid (see regexp)
  if (!field.validity.valid) {
    container.className = '';
    preview.setAttribute('src', '');
    qrcodeDiv.innerHTML = '';
    return;
  }

  container.className = 'valid';
  const url = field.value;
  const id = YOUTUBE_REGEXP.exec(url)[3];
  preview.setAttribute('src', `https://img.youtube.com/vi/${id}/hqdefault.jpg`);

  // Create QR code from url as SVG
  const qr = qrcode(0, 'L');
  qr.addData(url);
  qr.make();
  qrcodeDiv.innerHTML = qr.createSvgTag(8 /* cellsize */);
}
