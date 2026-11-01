import Link from "next/link";
import { Scissors } from "lucide-react";

export default function PublicNav() {
  return (
    <header className="public-nav">
      <Link className="brand public-logo" href="/" aria-label="Drape home">
        <Scissors size={23} />drape<span>✳</span>
      </Link>
      <nav aria-label="Main navigation">
        <Link href="/demo">Try the demo</Link>
        <Link className="public-sign-in" href="/sign-in">Sign in ↗</Link>
      </nav>
    </header>
  );
}
