let translatedText = '';
let isTranslating = false;

// Character counter
document.getElementById('inputText').addEventListener('input', () => {
  const len = document.getElementById('inputText').value.length;
  document.getElementById('charCount').textContent = len + ' / 5000';
});

// Ctrl+Enter to translate
document.getElementById('inputText').addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('translateBtn').click();
  }
});

// Clear button
document.getElementById('clearBtn').addEventListener('click', () => {
  document.getElementById('inputText').value = '';
  document.getElementById('outputText').innerHTML = '<span class="placeholder">Translation appears here</span>';
  document.getElementById('charCount').textContent = '0 / 5000';
  document.getElementById('outCount').textContent = '';
  document.getElementById('detectedBadge').textContent = '';
  document.getElementById('statusBar').textContent = '';
  document.getElementById('statusBar').className = 'status-bar';
  translatedText = '';
});

// Swap button
document.getElementById('swapBtn').addEventListener('click', () => {
  const src = document.getElementById('srcLang');
  const tgt = document.getElementById('tgtLang');
  if (src.value === 'auto') return;

  const srcVal = src.value;
  const tgtVal = tgt.value;
  const inputVal = document.getElementById('inputText').value;

  src.value = tgtVal;
  tgt.value = srcVal;

  document.getElementById('inputText').value = translatedText || '';
  document.getElementById('outputText').innerHTML = '<span class="placeholder">Translation appears here</span>';
  translatedText = '';
  document.getElementById('outCount').textContent = '';

  const len = document.getElementById('inputText').value.length;
  document.getElementById('charCount').textContent = len + ' / 5000';
});

// Copy button
document.getElementById('copyBtn').addEventListener('click', () => {
  if (!translatedText) return;
  navigator.clipboard.writeText(translatedText).then(() => {
    const btn = document.getElementById('copyBtn');
    btn.innerHTML = '<i class="ti ti-check" style="color:#10b981;"></i>';
    setTimeout(() => {
      btn.innerHTML = '<i class="ti ti-copy"></i>';
    }, 1500);
  });
});

// Text-to-speech
document.getElementById('speakSrcBtn').addEventListener('click', () => {
  const text = document.getElementById('inputText').value;
  if (!text) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
});

document.getElementById('speakTgtBtn').addEventListener('click', () => {
  if (!translatedText) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(translatedText));
});

// Translate button
document.getElementById('translateBtn').addEventListener('click', async () => {
  if (isTranslating) return;

  const inputText = document.getElementById('inputText').value.trim();
  if (!inputText) {
    showStatus('Please enter some text to translate.', 'error');
    return;
  }

  const srcLang = document.getElementById('srcLang').value;
  const tgtLang = document.getElementById('tgtLang').value;

  if (srcLang !== 'auto' && srcLang === tgtLang) {
    showStatus('Source and target languages are the same.', 'error');
    return;
  }

  isTranslating = true;
  const btn = document.getElementById('translateBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Translating...';
  document.getElementById('outputText').innerHTML = '<span class="placeholder">Translating...</span>';
  document.getElementById('detectedBadge').textContent = '';
  document.getElementById('statusBar').textContent = '';

  const srcInstruction = srcLang === 'auto'
    ? 'The source language is unknown — detect it automatically.'
    : `The source language is ${srcLang}.`;

  const prompt = `You are a professional translator. Translate the following text.

${srcInstruction}
Target language: ${tgtLang}

Rules:
- Return ONLY the translated text — no explanations, no extra text, no quotation marks, no labels.
- If auto-detecting the source language, prepend exactly one line: [DETECTED: LanguageName] then a newline then the translation.
- Preserve original formatting and line breaks.

Text to translate:
${inputText}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) throw new Error('API error ' + response.status);

    const data = await response.json();
    let result = (data.content || []).map(b => b.text || '').join('').trim();

    // Handle detected language
    let detected = '';
    if (srcLang === 'auto') {
      const match = result.match(/^\[DETECTED:\s*([^\]]+)\]/i);
      if (match) {
        detected = match[1].trim();
        result = result.replace(/^\[DETECTED:[^\]]+\]\s*/i, '').trim();
      }
    }

    translatedText = result;
    document.getElementById('outputText').textContent = result;
    document.getElementById('outCount').textContent = result.length + ' chars';

    if (detected) {
      document.getElementById('detectedBadge').innerHTML =
        `<span class="detect-badge">Detected: ${detected}</span>`;
    }

    showStatus('✓ Translation complete — Ctrl+Enter to translate again', 'success');

  } catch (err) {
    document.getElementById('outputText').innerHTML =
      '<span class="placeholder">Translation failed. Please try again.</span>';
    showStatus('Error: ' + (err.message || 'Something went wrong.'), 'error');
  } finally {
    isTranslating = false;
    btn.disabled = false;
    btn.innerHTML = '<i class="ti ti-language"></i> Translate';
  }
});

function showStatus(msg, type) {
  const el = document.getElementById('statusBar');
  el.textContent = msg;
  el.className = 'status-bar' + (type ? ' ' + type : '');
}