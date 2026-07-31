import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="px-6 py-6 sm:px-10">
        <Link
          href="/"
          className="font-serif text-lg tracking-tight text-ink"
        >
          Signoff
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-6 pb-16 pt-4 sm:items-center sm:pt-0">
        {children}
      </main>
    </div>
  );
}
