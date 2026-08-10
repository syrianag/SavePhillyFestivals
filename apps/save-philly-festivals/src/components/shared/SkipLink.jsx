/**
 * Keyboard skip link to the page's main landmark.
 *
 * Shared because every section shell needs one — public, admin, producer, and auth each own
 * their own chrome, and an accessibility affordance that only one of them implements is worse
 * than none at all, since keyboard users learn to expect it.
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-md bg-white px-4 py-2 font-ui font-bold text-black shadow-lg transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-black"
    >
      Skip to main content
    </a>
  );
}
