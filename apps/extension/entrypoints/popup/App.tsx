import { useEffect, useState } from "react";
import { getSession } from "../../lib/storage";
import { LoginForm } from "./LoginForm";
import { Dashboard } from "./Dashboard";

export function App() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    getSession().then((session) => setLoggedIn(session !== null));
  }, []);

  if (loggedIn === null) return <p className="muted">Loading…</p>;

  return loggedIn ? (
    <Dashboard onLoggedOut={() => setLoggedIn(false)} />
  ) : (
    <LoginForm onLoggedIn={() => setLoggedIn(true)} />
  );
}
