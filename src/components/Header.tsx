import { Icon } from './Icon';

export function Header({ devMode, onMenu, onHelp }: {
  devMode: boolean; onMenu: () => void; onHelp: () => void;
}) {
  return (
    <header className="site-header">
      <a className="wordmark" href="#main" aria-label="Sentagram home">Sentagram</a>
      <nav className="header-actions" aria-label="Game navigation">
        {devMode && <button className="collection-button" onClick={onMenu}
          aria-label="Open puzzle collection" aria-haspopup="dialog"><Icon name="grid" size={21} /></button>}
        <button className="icon-button help-button" onClick={onHelp} aria-label="How to play" aria-haspopup="dialog">
          <Icon name="help" size={24} />
        </button>
      </nav>
    </header>
  );
}
