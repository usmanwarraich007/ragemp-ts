/**
 * admin/clipboard.ts — Copies text to system clipboard via CEF browser.
 *
 * Uses browserManager.executeRaw() which calls browser.execute() on the
 * project's managed browser instance — the correct pattern in this codebase.
 */
import { browserManager } from '../browser/BrowserManager';

mp.events.add('admin:copyCoords', (text: string) => {
  const safe = text.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  // navigator.clipboard requires browser focus (fails when game has focus).
  // The textarea + execCommand trick works in CEF regardless of focus state.
  browserManager.executeRaw(`
    (function(){
      var el = document.createElement('textarea');
      el.value = '${safe}';
      el.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    })();
  `);
});

export {};
