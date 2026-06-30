export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-2xl font-bold mb-4">You&apos;re offline</h1>
      <p className="text-stone-400 mb-2">CONDUIT needs an internet connection to work.</p>
      <p className="text-stone-500 text-sm">Please check your connection and try again.</p>
    </div>
  );
}
