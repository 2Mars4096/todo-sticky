// Product navigation carries no workspace identifiers, credentials, or private records.
const products = [
  ['mynit', 'Mynit', 18340, '/'],
  ['dockit', 'Dockit', 18341, '/'],
  ['shiprite', 'Shiprite', 8765, '/'],
  ['zilo', 'Zilo', 18343, '/'],
  ['zethea', 'Zethea', 18344, '/study/'],
];

const languages = {
  en: ['Switch app', 'Close', 'Current app', 'Could not open {0}.'],
  de: ['App wechseln', 'Schließen', 'Aktuelle App', '{0} konnte nicht geöffnet werden.'],
  es: ['Cambiar de aplicación', 'Cerrar', 'Aplicación actual', 'No se pudo abrir {0}.'],
  fr: ['Changer d’application', 'Fermer', 'Application actuelle', 'Impossible d’ouvrir {0}.'],
  it: ['Cambia app', 'Chiudi', 'App attuale', 'Impossibile aprire {0}.'],
  ja: ['アプリを切り替える', '閉じる', '現在のアプリ', '{0}を開けませんでした。'],
  ko: ['앱 전환', '닫기', '현재 앱', '{0}을(를) 열 수 없습니다.'],
  pt: ['Mudar de aplicativo', 'Fechar', 'Aplicativo atual', 'Não foi possível abrir {0}.'],
  yue: ['切換應用程式', '關閉', '目前應用程式', '開唔到 {0}。'],
  zh: ['切换应用', '关闭', '当前应用', '无法打开 {0}。'],
  'zh-hant': ['切換應用程式', '關閉', '目前應用程式', '無法開啟 {0}。'],
};

function destination(slug, port, path) {
  const preview = location.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(location.hostname)
    && products.some(([, , localPort]) => String(localPort) === location.port)
    && !/ShipriteNative|ZiloNative|Electron/i.test(navigator.userAgent);
  return preview ? 'http://127.0.0.1:' + port + path : 'https://' + slug + '.pipedreams.work/';
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  return node;
}

class AppMenu extends HTMLElement {
  connectedCallback() {
    if (this.firstElementChild) { this.watchLanguage?.(); return; }
    const current = this.getAttribute('product');
    const trigger = element('button', 'pd-switch');
    trigger.type = 'button';
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.append(element('span', 'pd-grid'));
    const panel = element('dialog', 'pd-picker');
    const heading = element('h2', 'pd-title', 'pipedreams');
    const close = element('button', 'pd-close');
    const closeIcon = element('span', 'pd-glyph pd-glyph-clear');
    closeIcon.setAttribute('aria-hidden', 'true');
    close.append(closeIcon);
    close.type = 'button';
    const top = element('div', 'pd-top');
    top.append(heading, close);
    const list = element('ul', 'pd-products');
    let currentLabel, failedProduct;
    for (const [slug, name, port, path] of products) {
      const active = slug === current;
      const row = element('li', 'pd-row');
      const item = element(active ? 'span' : 'a', 'pd-product');
      const mark = element('span', 'pd-icon pd-icon-' + slug);
      mark.setAttribute('aria-hidden', 'true');
      item.append(mark, element('span', 'pd-name', name));
      if (active) {
        item.setAttribute('aria-current', 'true');
        currentLabel = element('span', 'pd-current');
        item.append(currentLabel);
      } else {
        item.href = destination(slug, port, path);
        item.target = '_blank';
        item.rel = 'noopener noreferrer';
        item.addEventListener('click', event => {
          if (!this.dispatchEvent(new CustomEvent('pipedreams-open-app', {
            bubbles: true, cancelable: true, detail: {url: item.href, opened: dismiss, failed: () => { failedProduct = name; localize(); }},
          }))) event.preventDefault();
          else dismiss();
        });
      }
      row.append(item);
      list.append(row);
    }
    function localize() {
      const locale = document.documentElement.lang.toLowerCase();
      const tag = locale.startsWith('zh-') && /-(?:hant|hk|mo|tw)(?:-|$)/.test(locale) ? 'zh-hant' : locale;
      const [label, dismissLabel, currentText, failed] = languages[tag] || languages[tag.split('-')[0]] || languages.en;
      if (failedProduct) status.textContent = failed.replace('{0}', failedProduct);
      trigger.title = label;
      trigger.setAttribute('aria-label', label);
      panel.setAttribute('aria-label', label);
      close.setAttribute('aria-label', dismissLabel);
      if (currentLabel) currentLabel.textContent = currentText;
    }
    // Older WebKit lacks showModal's top layer, inert background and Tab containment.
    let restoreFallback;
    const host = this;
    function openFallback() {
      const layer = element('div', 'pd-layer');
      const obscured = Array.from(document.body.children).map(node => ({
        node, hidden: node.getAttribute('aria-hidden'), inert: node.hasAttribute('inert'),
      }));
      layer.append(panel);
      document.body.append(layer);
      panel.setAttribute('open', '');
      const first = () => panel.querySelector('button, a[href]');
      first().focus();
      for (const {node} of obscured) {
        node.setAttribute('inert', '');
        node.setAttribute('aria-hidden', 'true');
      }
      const guard = event => {
        if (!panel.contains(event.target)) first().focus();
      };
      document.addEventListener('focusin', guard, true);
      layer.addEventListener('click', event => { if (event.target === layer) dismiss(); });
      restoreFallback = () => {
        document.removeEventListener('focusin', guard, true);
        for (const {node, hidden, inert} of obscured) {
          if (!inert) node.removeAttribute('inert');
          if (hidden === null) node.removeAttribute('aria-hidden');
          else node.setAttribute('aria-hidden', hidden);
        }
        panel.removeAttribute('open');
        host.append(panel);
        layer.remove();
        restoreFallback = undefined;
      };
    }
    function dismiss() {
      if (restoreFallback) restoreFallback();
      else if (panel.open) panel.close();
      trigger.setAttribute('aria-expanded', 'false');
      trigger.focus();
    }
    const status = element('p', 'pd-error');
    status.setAttribute('role', 'alert');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.append(top, list, status);
    this.closePicker = dismiss;
    this.append(trigger, panel);
    const observer = new MutationObserver(localize);
    this.watchLanguage = () => {localize(); observer.observe(document.documentElement, {attributes:true, attributeFilter:['lang']});};
    this.stopWatchingLanguage = () => observer.disconnect();
    this.watchLanguage();
    trigger.addEventListener('pointerdown', () => trigger.toggleAttribute('data-pd-press', true));
    trigger.addEventListener('keydown', () => trigger.removeAttribute('data-pd-press'));
    trigger.addEventListener('click', event => {
      panel.toggleAttribute('data-pd-pointer', event.detail > 0 && trigger.hasAttribute('data-pd-press'));
      localize();
      failedProduct = undefined; status.textContent = '';
      if (typeof panel.showModal === 'function') panel.showModal();
      else openFallback();
      trigger.setAttribute('aria-expanded', 'true');
      list.querySelector('a')?.focus();
    });
    close.addEventListener('click', dismiss);
    panel.addEventListener('cancel', event => { event.preventDefault(); dismiss(); });
    panel.addEventListener('keydown', event => {
      if (restoreFallback && event.key === 'Tab') {
        const items = panel.querySelectorAll('button:not([disabled]), a[href]');
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first.focus();
        }
      }
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); dismiss(); }
    });
    panel.addEventListener('click', event => {
      if (event.target !== panel) return;
      const bounds = panel.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right ||
          event.clientY < bounds.top || event.clientY > bounds.bottom) dismiss();
    });
  }
  disconnectedCallback() {
    this.stopWatchingLanguage?.();
    this.closePicker?.();
  }
}

if (!customElements.get('pipedreams-app-menu')) customElements.define('pipedreams-app-menu', AppMenu);
