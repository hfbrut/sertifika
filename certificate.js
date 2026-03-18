const info = document.getElementById('info');
const canvas = document.getElementById('canvas');
const downloadBtn = document.getElementById('downloadBtn');
const ctx = canvas.getContext('2d');

let payload = null;

init().catch((error) => {
  info.textContent = `Hata: ${error.message}`;
});

downloadBtn.addEventListener('click', () => {
  if (!payload) return;
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/jpeg', 0.95);
  a.download = `${sanitize(payload.participant.full_name)}-sertifika.jpg`;
  a.click();
});

async function init() {
  const params = new URLSearchParams(window.location.search);
  const certificateId = params.get('id');
  const token = params.get('t');

  if (certificateId) {
    payload = loadPayloadFromStorage(certificateId);
  } else if (token) {
    payload = JSON.parse(fromBase64Url(token));
  } else {
    throw new Error('Link geçersiz. Sertifika bilgisi bulunamadı.');
  }

  if (!payload) {
    throw new Error('Bu sertifika verisi bu tarayıcıda bulunamadı. Lütfen linki oluşturan cihazdan açın veya yeniden link üretin.');
  }

  info.textContent = `${payload.participant.full_name} • ${payload.event.name} • ${payload.event.date}`;

  await renderCertificate(payload);
}

async function renderCertificate(data) {
  const image = await loadImage(data.template.source);
  canvas.width = image.width;
  canvas.height = image.height;

  ctx.drawImage(image, 0, 0);

  const { layout } = data.template;

  ctx.fillStyle = '#111827';
  ctx.textBaseline = 'middle';

  ctx.font = `700 ${layout.nameSize}px Arial`;
  ctx.textAlign = layout.nameAlign;
  ctx.fillText(data.participant.full_name, layout.nameX, layout.nameY);

  ctx.font = `400 ${layout.metaSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText(`${data.event.name} • ${data.event.date} • ${data.event.speaker}`, canvas.width / 2, layout.metaY);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Şablon görseli yüklenemedi. Link izinlerini kontrol edin.'));
    img.src = src;
  });
}

function fromBase64Url(value) {
  let base64 = value
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  while (base64.length % 4 !== 0) base64 += '=';

  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function sanitize(value) {
  return value
    .toLowerCase('tr-TR')
    .replaceAll(/[^a-z0-9çğıöşü\s-]/gi, '')
    .trim()
    .replaceAll(/\s+/g, '-');
}

function loadPayloadFromStorage(certificateId) {
  const raw = localStorage.getItem(`cert_mvp_${certificateId}`);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
