import type { ReactNode } from 'react';
import { SITE } from '../config/site';
import { useApp } from './context';
import { assetUrl } from './data';

export function Shell({ children }: { children: ReactNode }) {
  const { openSettings } = useApp();
  return (
    <>
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>
        דילוג לתוכן
      </a>
      <nav className="topnav" aria-label="ניווט ראשי">
        <a className="brand" href="#/">
          <img src={assetUrl('icons/icon.svg')} alt="" />
          {SITE.name}
        </a>
        <span className="spacer" />
        <a className="btn small help-link" href="#/help">❓ איך משחקים</a>
        <a className="btn small ghost" href="#/catalog">קטלוג</a>
        <a className="btn small ghost" href="#/history">היסטוריה</a>
        <a className="btn small ghost" href="#/instructor">למדריך</a>
        <a className="btn small ghost" href="#/about">אודות</a>
        <button type="button" className="btn small" onClick={() => openSettings(true)} aria-haspopup="dialog">
          ⚙ הגדרות
        </button>
      </nav>
      <main id="main" className="page" tabIndex={-1}>
        {children}
      </main>
      <footer className="footer">
        <div className="footer-credit" data-testid="footer-credit">{SITE.creditLine}</div>
        {SITE.disclaimer}.
      </footer>
    </>
  );
}
