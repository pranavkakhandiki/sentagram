import { Icon } from './Icon';

export function Header({ onMenu, onHelp }: { onMenu: () => void; onHelp: () => void }) {
  return (
    <header className="site-header">
      <a className="wordmark" href="#main" aria-label="Sentagram home">
        Senta<span className="wordmark-tile">g</span>ram<span className="brand-period">.</span>
      </a>
      <nav className="header-actions" aria-label="Game navigation">
        <button className="icon-button help-button" onClick={onHelp} aria-label="How to play">
          <Icon name="help" size={21} />
        </button>
        <button
          className="collection-button"
          onClick={onMenu}
          aria-label="Open puzzle collection"
          aria-haspopup="dialog"
        >
          <Icon name="grid" size={19} />
        </button>
      </nav>
    </header>
  );
}
