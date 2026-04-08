// Game engine removed — redirects to Coming Soon page.
// This file is kept only to avoid breaking the App.tsx import.
// App.tsx now imports GameComingSoonPage directly; this file is no longer referenced.
import { Navigate } from "../lib/router";
export default function GamePage() {
  return <Navigate to="/" replace />;
}
