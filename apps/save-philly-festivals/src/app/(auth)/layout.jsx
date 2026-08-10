import { SkipLink } from "@/components/shared/SkipLink";

export const metadata = {
  title: "Login - Save Philly Festivals",
  description: "Admin login for Save Philly Festivals",
};

/**
 * Deliberately bare: the sign-in page carries no site navigation, so the only chrome it needs
 * is a main landmark and the skip link every section provides.
 */
export default function AuthLayout({ children }) {
  return (
    <>
      <SkipLink />
      <main id="main-content" tabIndex={-1}>{children}</main>
    </>
  );
}
