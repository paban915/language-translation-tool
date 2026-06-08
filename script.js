const API_KEY = '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';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

let translatedText = '';
let isTranslating = false;

document.getElementById('inputText').addEventListener('input', () => {
  const len = document.getElementById('inputText').value.length;
  document.getElementById('charCount').textContent = len + ' / 5000';
});

document.getElementById('inputText').addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('translateBtn').click();
  }
});

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

document.getElementById('swapBtn').addEventListener('click', () => {
  const src = document.getElementById('srcLang');
  const tgt = document.getElementById('tgtLang');
  if (src.value === 'auto') return;
  const srcVal = src.value;
  const tgtVal = tgt.value;
  src.value = tgtVal;
  tgt.value = srcVal;
  document.getElementById('inputText').value = translatedText || '';
  document.getElementById('outputText').innerHTML = '<span class="placeholder">Translation appears here</span>';
  translatedText = '';
  document.getElementById('outCount').textContent = '';
  const len = document.getElementById('inputText').value.length;
  document.getElementById('charCount').textContent = len + ' / 5000';
});

document.getElementById('copyBtn').addEventListener('click', () => {
  if (!translatedText) return;
  navigator.clipboard.writeText(translatedText).then(() => {
    const btn = document.getElementById('copyBtn');
    btn.innerHTML = '<i class="ti ti-check" style="color:#10b981;"></i>';
    setTimeout(() => { btn.innerHTML = '<i class="ti ti-copy"></i>'; }, 1500);
  });
});

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
    let response, attempts = 0;
    while (attempts < 3) {
      response = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2048,
          temperature: 0.3
        })
      });

      if (response.status === 429) {
        attempts++;
        await new Promise(r => setTimeout(r, attempts * 2000));
        continue;
      }
      break;
    }

    if (!response.ok) throw new Error('API error ' + response.status);

    const data = await response.json();
    let result = data.choices[0].message.content.trim();

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
