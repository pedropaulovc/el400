import { useEffect, useState } from 'react';

/** Browser fullscreen is deliberately user-initiated, just like Shopfloor Tablet. */
export function FullscreenControl() {
  const [active, setActive] = useState(document.fullscreenElement === document.documentElement);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const embedded = window.self !== window.top;
  const supported = typeof document.documentElement.requestFullscreen === 'function'
    && typeof document.exitFullscreen === 'function';
  const enabled = supported && document.fullscreenEnabled;

  useEffect(() => {
    const sync = () => { setActive(document.fullscreenElement === document.documentElement); };
    document.addEventListener('fullscreenchange', sync);
    return () => { document.removeEventListener('fullscreenchange', sync); };
  }, []);

  const toggle = async () => {
    setError('');
    setPending(true);
    try {
      // Invoke immediately in this click handler: fullscreen needs transient user activation.
      if (document.fullscreenElement === document.documentElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      setError(document.fullscreenElement === document.documentElement
        ? 'The browser could not exit fullscreen. Use Esc or your browser’s fullscreen controls.'
        : 'The browser did not allow fullscreen. Try again, or open EL400 in its own tab.');
    } finally {
      setPending(false);
    }
  };

  const unavailable = !supported
    ? 'Browser fullscreen is not supported here. Use your browser’s fullscreen controls.'
    : !enabled
      ? 'Fullscreen is blocked by this page’s permissions. Open EL400 in its own tab to try fullscreen.'
      : '';

  return (
    <section aria-label="Display controls" className="relative z-10 mx-auto mt-6 flex max-w-xl flex-col items-center gap-2 text-center text-sm text-[#5a5a50]">
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => { void toggle(); }}
          disabled={pending || (!enabled && !active)}
          aria-pressed={active}
          className="rounded border border-[#5a5a50] bg-[#e0e0d0] px-3 py-2 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-60"
        >
          {active ? 'Exit fullscreen' : 'Enter fullscreen'}
        </button>
        {(embedded || unavailable || error) && (
          <a
            href={window.location.href}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded px-3 py-2 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            Open EL400 in new tab
          </a>
        )}
      </div>
      <p role="status" aria-live="polite" className={error || unavailable ? '' : 'sr-only'}>
        {error || unavailable || (active ? 'Fullscreen active. Press Esc to exit.' : 'Fullscreen inactive.')}
      </p>
    </section>
  );
}
