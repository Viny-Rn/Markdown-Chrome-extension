// ── i18n System ────────────────────────────────────────────────────────────
const i18n = {
  currentLanguage: 'en',
  translations: {},

  async init() {
    // Load translations
    this.translations = {
      en: await this.loadLanguage('en'),
      fr: await this.loadLanguage('fr'),
      es: await this.loadLanguage('es')
    };

    // Get stored language preference or detect browser language
    const storage = {
      get: function(keys, callback) {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get(keys, callback);
        } else {
          const res = {};
          for (let k in keys) {
            const val = localStorage.getItem(k);
            res[k] = val !== null ? val : keys[k];
          }
          callback(res);
        }
      }
    };

    storage.get({ 'md-studio-language': 'en' }, (items) => {
      const saved = items['md-studio-language'];
      if (saved && this.translations[saved]) {
        this.currentLanguage = saved;
      } else {
        // Detect browser language
        const browserLang = navigator.language.split('-')[0];
        if (this.translations[browserLang]) {
          this.currentLanguage = browserLang;
        }
      }
      this.apply();
    });
  },

  async loadLanguage(lang) {
    try {
      const response = await fetch(`i18n/${lang}.json`);
      return await response.json();
    } catch (error) {
      console.error(`Failed to load language ${lang}:`, error);
      return {};
    }
  },

  t(key, defaultValue = '') {
    const translation = this.translations[this.currentLanguage]?.[key];
    return translation || defaultValue || key;
  },

  setLanguage(lang) {
    if (this.translations[lang]) {
      this.currentLanguage = lang;
      
      // Save preference
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ 'md-studio-language': lang });
      } else {
        localStorage.setItem('md-studio-language', lang);
      }

      this.apply();
    }
  },

  apply() {
    // Update all elements with data-i18n attributes
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = this.t(key);
    });

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      el.title = this.t(key);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = this.t(key);
    });
  },

  getAvailableLanguages() {
    return ['en', 'fr', 'es'];
  },

  getLanguageName(lang) {
    const names = {
      en: 'English',
      fr: 'Français',
      es: 'Español'
    };
    return names[lang] || lang;
  }
};
