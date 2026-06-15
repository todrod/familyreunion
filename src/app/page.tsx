import LoginForm from "./login-form";

// Render fresh on every request instead of serving a long-cached static page.
// The login HTML references hashed JS bundles; a stale cached copy points at
// bundles that no longer exist after a deploy, leaving families unable to log
// in until a hard refresh. force-dynamic keeps the page (and its bundle refs)
// always current.
export const dynamic = "force-dynamic";

export default function Page() {
  return <LoginForm />;
}
