const elements = {
  flowType: document.getElementById('flowType'),
  eventName: document.getElementById('eventName'),
  eventDate: document.getElementById('eventDate'),
  speaker: document.getElementById('speaker'),
  managerEmail: document.getElementById('managerEmail'),
  templateUrl: document.getElementById('templateUrl'),
  templateFile: document.getElementById('templateFile'),
  previewZoom: document.getElementById('previewZoom'),
  nameX: document.getElementById('nameX'),
  nameY: document.getElementById('nameY'),
  nameSize: document.getElementById('nameSize'),
  nameAlign: document.getElementById('nameAlign'),
  metaY: document.getElementById('metaY'),
  metaSize: document.getElementById('metaSize'),
  csvFile: document.getElementById('csvFile'),
  generateBtn: document.getElementById('generateBtn'),
  copyBtn: document.getElementById('copyBtn'),
  openGmailDraftBtn: document.getElementById('openGmailDraftBtn'),
  downloadCsvBtn: document.getElementById('downloadCsvBtn'),
  resultBody: document.getElementById('resultBody'),
  previewCanvas: document.getElementById('previewCanvas'),
  previewInfo: document.getElementById('previewInfo'),
  prevStepBtn: document.getElementById('prevStepBtn'),
  nextStepBtn: document.getElementById('nextStepBtn'),
  stepSections: Array.from(document.querySelectorAll('.step'))
};

const previewContext = elements.previewCanvas.getContext('2d');

let csvRows = [];
let uploadedTemplateDataUrl = '';
let generatedRows = [];
let currentStep = 0;
let previewRenderRequest = 0;

bindEvents();
renderStep();

function bindEvents() {
  elements.templateFile.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    uploadedTemplateDataUrl = await fileToDataUrl(file);
    elements.templateUrl.value = '';
    await renderPreview();
  });

  elements.templateUrl.addEventListener('input', async () => {
    if (elements.templateUrl.value.trim()) {
      uploadedTemplateDataUrl = '';
      elements.templateFile.value = '';
    }
    await renderPreview();
  });

  [
    elements.nameX,
    elements.nameY,
    elements.nameSize,
    elements.nameAlign,
    elements.metaY,
    elements.metaSize,
    elements.previewZoom,
    elements.eventName,
    elements.eventDate,
    elements.speaker
  ].forEach((input) => {
    input.addEventListener('input', () => {
      renderPreview();
    });
  });

  elements.csvFile.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    csvRows = parseCsv(text);
    alert(`${csvRows.length} katılımcı satırı okundu.`);
  });

  elements.generateBtn.addEventListener('click', () => {
    const eventPayload = getEventPayload();
    if (!eventPayload.valid) {
      alert(eventPayload.message);
      return;
    }

    if (!csvRows.length) {
      alert('Önce CSV yükleyin.');
      return;
    }

    const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
    const templatePrep = prepareTemplateReference(eventPayload.templateSource);
    if (!templatePrep.ok) {
      alert(templatePrep.message);
      return;
    }

    generatedRows = [];
    let partial = false;

    for (const row of csvRows) {
      const certificateId = crypto.randomUUID();
      const verifyCode = generateVerifyCode();

      const tokenPayload = {
        certificate_id: certificateId,
        verify_code: verifyCode,
        issued_at: new Date().toISOString(),
        participant: {
          full_name: row.full_name,
          email: row.email
        },
        event: {
          name: eventPayload.eventName,
          date: eventPayload.eventDate,
          speaker: eventPayload.speaker,
          manager_email: eventPayload.managerEmail
        },
        template: {
          source_ref: templatePrep.ref,
          layout: eventPayload.layout
        }
      };

      const saveResult = saveCertificatePayload(certificateId, tokenPayload);
      if (!saveResult.ok) {
        partial = true;
        break;
      }

      const link = `${baseUrl}certificate.html?id=${encodeURIComponent(certificateId)}`;

      generatedRows.push({
        ...row,
        certificate_id: certificateId,
        verify_code: verifyCode,
        status: 'Hazır',
        certificate_created_at: new Date().toISOString(),
        email_sent_at: '',
        email_status: 'pending',
        link
      });
    }

    if (!generatedRows.length) {
      alert('Link üretilemedi. Şablon dosyası çok büyük olabilir. Daha küçük boyutta JPG/PNG deneyin.');
      return;
    }

    if (partial) {
      alert(`Depolama limiti nedeniyle kısmi üretim yapıldı. ${generatedRows.length}/${csvRows.length} katılımcı için link oluşturuldu.`);
    }

    renderRows(generatedRows);
    currentStep = 4;
    renderStep();
  });

  elements.copyBtn.addEventListener('click', async () => {
    if (!generatedRows.length) {
      alert('Önce link üretin.');
      return;
    }

    const text = generatedRows
      .map((item) => `${item.full_name},${item.email},${item.link}`)
      .join('\n');

    await navigator.clipboard.writeText(text);
    alert('Katılımcı link listesi panoya kopyalandı.');
  });

  elements.nextStepBtn.addEventListener('click', async () => {
    const validation = validateCurrentStep();
    if (!validation.valid) {
      alert(validation.message);
      return;
    }

    currentStep = Math.min(4, currentStep + 1);
    renderStep();
    if (currentStep === 2) {
      await renderPreview();
    }
  });

  elements.prevStepBtn.addEventListener('click', () => {
    currentStep = Math.max(0, currentStep - 1);
    renderStep();
  });

  if (elements.downloadCsvBtn) {
    elements.downloadCsvBtn.addEventListener('click', () => {
      downloadUpdatedCsv();
    });
  }

  if (elements.openGmailDraftBtn) {
    elements.openGmailDraftBtn.addEventListener('click', async () => {
      await openGmailDraft();
    });
  }

  elements.resultBody.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;
    if (!target.classList.contains('single-send-btn')) return;

    const certificateId = target.dataset.certificateId;
    if (!certificateId) return;

    const row = generatedRows.find((item) => item.certificate_id === certificateId);
    if (!row) return;

    await openSingleGmailDraft(row);
  });
}

function validateCurrentStep() {
  if (currentStep === 0 && elements.flowType.value !== 'create') {
    return {
      valid: false,
      message: 'Bu gece yalnızca "Sertifika Oluştur" akışı aktif. Lütfen bu seçeneği seçin.'
    };
  }

  if (currentStep === 1) {
    const eventName = elements.eventName.value.trim();
    const eventDate = elements.eventDate.value;
    const speaker = elements.speaker.value.trim();
    const managerEmail = elements.managerEmail.value.trim();

    if (!eventName || !eventDate || !speaker || !managerEmail) {
      return {
        valid: false,
        message: 'Etkinlik bilgileri adımındaki tüm alanları doldurun.'
      };
    }
  }

  if (currentStep === 2) {
    const templateSource = elements.templateUrl.value.trim() || uploadedTemplateDataUrl;
    if (!templateSource) {
      return {
        valid: false,
        message: 'Şablon için link girin veya görsel dosya yükleyin.'
      };
    }
  }

  return { valid: true };
}

function renderStep() {
  elements.stepSections.forEach((section) => {
    const step = Number(section.dataset.step);
    section.classList.toggle('active', step === currentStep);
  });

  elements.prevStepBtn.style.visibility = currentStep === 0 ? 'hidden' : 'visible';
  elements.nextStepBtn.style.visibility = currentStep === 4 ? 'hidden' : 'visible';
}

async function renderPreview() {
  const templateSource = elements.templateUrl.value.trim() || uploadedTemplateDataUrl;
  if (!templateSource) {
    clearPreview('Şablon seçildiğinde görünecek');
    return;
  }

  const currentRequest = ++previewRenderRequest;

  try {
    const image = await loadImage(templateSource);
    if (currentRequest !== previewRenderRequest) return;

    const zoomPercent = clampNumber(Number(elements.previewZoom.value) || 100, 25, 200);
    const scale = zoomPercent / 100;

    const canvasWidth = Math.max(1, Math.round(image.width * scale));
    const canvasHeight = Math.max(1, Math.round(image.height * scale));

    elements.previewCanvas.width = canvasWidth;
    elements.previewCanvas.height = canvasHeight;

    previewContext.clearRect(0, 0, canvasWidth, canvasHeight);
    previewContext.drawImage(image, 0, 0, canvasWidth, canvasHeight);

    const layout = {
      nameX: Number(elements.nameX.value),
      nameY: Number(elements.nameY.value),
      nameSize: Number(elements.nameSize.value),
      nameAlign: elements.nameAlign.value,
      metaY: Number(elements.metaY.value),
      metaSize: Number(elements.metaSize.value)
    };

    const previewName = firstPreviewName();
    const eventLabel = `${(elements.eventName.value || 'Etkinlik Adı')} • ${(elements.eventDate.value || 'Tarih')} • ${(elements.speaker.value || 'Konuşmacı')}`;

    previewContext.fillStyle = '#111827';
    previewContext.textBaseline = 'middle';

    previewContext.font = `700 ${Math.max(8, layout.nameSize * scale)}px Arial`;
    previewContext.textAlign = layout.nameAlign;
    previewContext.fillText(previewName, layout.nameX * scale, layout.nameY * scale);

    previewContext.font = `400 ${Math.max(8, layout.metaSize * scale)}px Arial`;
    previewContext.textAlign = 'center';
    previewContext.fillText(eventLabel, canvasWidth / 2, layout.metaY * scale);

    elements.previewInfo.textContent = `Orijinal: ${image.width}x${image.height}px • Önizleme: %${zoomPercent} • Yazı boyutları gerçek piksel bazlı uygulanır`;
  } catch {
    if (currentRequest !== previewRenderRequest) return;
    clearPreview('Önizleme yüklenemedi. Link izni/CORS sorunu olabilir; dosya yükleme kullanın.');
  }
}

function clearPreview(message) {
  elements.previewCanvas.width = 1;
  elements.previewCanvas.height = 1;
  previewContext.clearRect(0, 0, 1, 1);
  elements.previewInfo.textContent = message;
}

function firstPreviewName() {
  if (csvRows.length && csvRows[0]?.full_name) {
    return csvRows[0].full_name;
  }
  return 'Örnek Katılımcı';
}

function getEventPayload() {
  const eventName = elements.eventName.value.trim();
  const eventDate = elements.eventDate.value;
  const speaker = elements.speaker.value.trim();
  const managerEmail = elements.managerEmail.value.trim();
  const templateUrl = elements.templateUrl.value.trim();

  const templateSource = templateUrl || uploadedTemplateDataUrl;
  if (!eventName || !eventDate || !speaker || !managerEmail || !templateSource) {
    return {
      valid: false,
      message: 'Etkinlik alanları ve şablon (link veya dosya) zorunludur.'
    };
  }

  return {
    valid: true,
    eventName,
    eventDate,
    speaker,
    managerEmail,
    templateSource,
    layout: {
      nameX: Number(elements.nameX.value),
      nameY: Number(elements.nameY.value),
      nameSize: Number(elements.nameSize.value),
      nameAlign: elements.nameAlign.value,
      metaY: Number(elements.metaY.value),
      metaSize: Number(elements.metaSize.value)
    }
  };
}

function renderRows(rows) {
  elements.resultBody.innerHTML = '';

  rows.forEach((row) => {
    const tr = document.createElement('tr');
    const mailDate = row.email_sent_at
      ? new Date(row.email_sent_at).toLocaleString('tr-TR')
      : '-';

    tr.innerHTML = `
      <td>${escapeHtml(row.full_name)}</td>
      <td>${escapeHtml(row.email)}</td>
      <td>${row.status}</td>
      <td>${row.email_status}</td>
      <td>${mailDate}</td>
      <td><a href="${row.link}" target="_blank" rel="noreferrer">Sertifika Linki</a></td>
      <td><button type="button" class="secondary single-send-btn" data-certificate-id="${row.certificate_id}">Tekli Gönder</button></td>
    `;

    elements.resultBody.appendChild(tr);
  });
}

async function openGmailDraft() {
  if (!generatedRows.length) {
    alert('Önce link üretin.');
    return;
  }

  const eventPayload = getEventPayload();
  if (!eventPayload.valid) {
    alert('Gmail taslağı için etkinlik bilgileri geçerli olmalı.');
    return;
  }

  try {
    const bccList = generatedRows
      .map((item) => item.email.trim())
      .filter((email) => isValidEmail(email));

    if (!bccList.length) {
      alert('Geçerli alıcı e-postası bulunamadı.');
      return;
    }

    const bccEmails = bccList.join(',');
    const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
    const accessLink = `${baseUrl}index.html`;

    const subject = `${eventPayload.eventName} Sertifika Bilgilendirmesi`;
    const body = [
      'Merhaba,',
      '',
      `${eventPayload.eventName} etkinliği için sertifika süreci başlamıştır.`,
      `Konuşmacı: ${eventPayload.speaker}`,
      `Tarih: ${eventPayload.eventDate}`,
      '',
      'Katılımcı linkine girerek e-posta adresinizi doğrulayıp sertifikanızı görüntüleyebilirsiniz:',
      accessLink,
      '',
      'Not: Bu duyuru mailidir. Sertifikanız yalnızca sistemde kayıtlı e-posta ile erişilebilir olacaktır.',
      '',
      'İyi günler dileriz.'
    ].join('\n');

    const gmailUrl =
      `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(eventPayload.managerEmail)}` +
      `&bcc=${encodeURIComponent(bccEmails)}` +
      `&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    if (gmailUrl.length > 1800) {
      await navigator.clipboard.writeText(bccEmails);
      const fallbackUrl =
        `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(eventPayload.managerEmail)}` +
        `&su=${encodeURIComponent(subject)}` +
        `&body=${encodeURIComponent(body + '\n\nBCC listesi panoya kopyalandı.')}`;

      window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
      alert('Alıcı listesi uzun olduğu için BCC adresleri panoya kopyalandı. Gmail taslağı açıldı, BCC alanına yapıştırın.');
      return;
    }

    window.open(gmailUrl, '_blank', 'noopener,noreferrer');

    const nowIso = new Date().toISOString();
    generatedRows = generatedRows.map((row) => ({
      ...row,
      email_status: 'draft_opened',
      email_sent_at: nowIso
    }));
    renderRows(generatedRows);
  } catch (error) {
    alert(`Gmail taslağı açılırken hata: ${error.message}`);
  }
}

async function openSingleGmailDraft(row) {
  const eventPayload = getEventPayload();
  if (!eventPayload.valid) {
    alert('Tekli gönderim için etkinlik bilgileri geçerli olmalı.');
    return;
  }

  const recipient = row.email.trim();
  if (!isValidEmail(recipient)) {
    alert('Katılımcı e-posta adresi geçerli değil.');
    return;
  }

  const subject = `${eventPayload.eventName} Sertifikanız Hazır`;
  const body = [
    `Merhaba ${row.full_name},`,
    '',
    `${eventPayload.eventName} etkinliği sertifikanız hazır.`,
    `Konuşmacı: ${eventPayload.speaker}`,
    `Tarih: ${eventPayload.eventDate}`,
    '',
    'Sertifikanızı görüntülemek/indirmek için link:',
    row.link,
    '',
    'İyi günler dileriz.'
  ].join('\n');

  const gmailUrl =
    `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipient)}` +
    `&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  window.open(gmailUrl, '_blank', 'noopener,noreferrer');

  const nowIso = new Date().toISOString();
  generatedRows = generatedRows.map((item) => {
    if (item.certificate_id !== row.certificate_id) return item;
    return {
      ...item,
      email_status: 'single_draft_opened',
      email_sent_at: nowIso
    };
  });

  renderRows(generatedRows);
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const fullNameIndex = headers.indexOf('full_name');
  const emailIndex = headers.indexOf('email');

  if (fullNameIndex === -1 || emailIndex === -1) {
    alert('CSV başlıkları full_name,email olmalı.');
    return [];
  }

  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    return {
      full_name: (cols[fullNameIndex] || '').trim(),
      email: (cols[emailIndex] || '').trim()
    };
  }).filter((item) => item.full_name && item.email);
}

function splitCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
}

function saveCertificatePayload(certificateId, payload) {
  try {
    localStorage.setItem(`cert_mvp_${certificateId}`, JSON.stringify(payload));
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

function prepareTemplateReference(templateSource) {
  if (/^https?:\/\//i.test(templateSource)) {
    return {
      ok: true,
      ref: {
        type: 'url',
        value: templateSource
      }
    };
  }

  try {
    clearPreviousGeneratedStorage();

    const templateKey = `cert_tpl_${Date.now()}`;
    localStorage.setItem(templateKey, templateSource);

    return {
      ok: true,
      ref: {
        type: 'storage',
        key: templateKey
      }
    };
  } catch {
    return {
      ok: false,
      message: 'Şablon görseli depolama sınırını aşıyor. Görseli küçültüp tekrar deneyin veya URL ile kullanın.'
    };
  }
}

function clearPreviousGeneratedStorage() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (key.startsWith('cert_mvp_') || key.startsWith('cert_tpl_')) {
      keys.push(key);
    }
  }

  keys.forEach((key) => {
    localStorage.removeItem(key);
  });
}

function generateVerifyCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'VRF-';
  for (let i = 0; i < 10; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
    if (i === 3 || i === 6) out += '-';
  }
  return out;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(input) {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function downloadUpdatedCsv() {
  if (!generatedRows.length) {
    alert('İndirilecek veri yok.');
    return;
  }

  const headers = [
    'full_name',
    'email',
    'certificate_id',
    'certificate_created_at',
    'email_sent_at',
    'email_status'
  ];

  const rows = generatedRows.map((row) => {
    return [
      row.full_name,
      row.email,
      row.certificate_id,
      row.certificate_created_at || '',
      row.email_sent_at || '',
      row.email_status || 'pending'
    ];
  });

  const csvContent = [
    headers.map((h) => `"${h}"`).join(','),
    ...rows.map((r) => r.map((cell) => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  const eventName = elements.eventName.value.replace(/[^a-z0-9]/gi, '').toLowerCase();
  link.download = `katilimcilar_${eventName}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
