const I18N_STORAGE_KEY = 'talk-timer.lang';

class I18n {
  constructor() {
    this.messages = {};
    this.current = 'ja';
    this.listeners = new Set();
  }

  async load(url) {
    if (Object.keys(this.messages).length) return;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error('Failed to load translations');
    }
    this.messages = await res.json();
    const stored = localStorage.getItem(I18N_STORAGE_KEY);
    if (stored && this.messages[stored]) {
      this.current = stored;
    }
    document.documentElement.lang = this.current;
  }

  onChange(cb) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  setLanguage(lang) {
    if (!this.messages[lang]) return;
    this.current = lang;
    localStorage.setItem(I18N_STORAGE_KEY, lang);
    document.documentElement.lang = lang;
    this.applyTranslations();
    this.listeners.forEach((cb) => cb(lang));
  }

  toggleLanguage() {
    const next = this.current === 'ja' ? 'en' : 'ja';
    this.setLanguage(next);
  }

  t(key, replacements) {
    const langMessages = this.messages[this.current] || {};
    let template = langMessages[key] ?? key;
    if (replacements) {
      Object.entries(replacements).forEach(([k, value]) => {
        const regex = new RegExp(`\\{${k}\\}`, 'g');
        template = template.replace(regex, value);
      });
    }
    if (replacements && replacements.count !== undefined && template.includes('{s}')) {
      const plural = replacements.count === 1 ? '' : 's';
      template = template.replace('{s}', plural);
    }
    return template;
  }

  applyTranslations(root = document) {
    const elements = root.querySelectorAll('[data-i18n]');
    elements.forEach((el) => {
      const key = el.dataset.i18n;
      if (!key) return;
      const text = this.t(key);
      el.textContent = text;
    });
  }
}

export const i18n = new I18n();

export async function initI18n() {
  await i18n.load('assets/i18n.json');
  i18n.applyTranslations();
  updateLanguageToggle();
}

export function updateLanguageToggle() {
  const btn = document.getElementById('langToggle');
  if (!btn) return;
  btn.textContent = i18n.current === 'ja' ? 'EN' : '日本語';
  btn.setAttribute('aria-label', i18n.current === 'ja' ? 'Switch to English' : '日本語に切り替え');
}

// Immediately set up listener for toggle button once DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('langToggle');
    if (btn) {
      btn.addEventListener('click', () => {
        i18n.toggleLanguage();
        updateLanguageToggle();
      });
    }
  });
} else {
  const btn = document.getElementById('langToggle');
  if (btn) {
    btn.addEventListener('click', () => {
      i18n.toggleLanguage();
      updateLanguageToggle();
    });
  }
}

