export default function AccountPage() {
  return (
    <div className="min-h-screen flex items-start justify-center p-6">
      <div className="w-full max-w-md rounded border bg-white dark:bg-neutral-900 p-6 shadow-sm space-y-4">
        <h1 className="text-lg font-semibold">Account</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Account management UI not yet implemented. Pending integration with Stack client hooks (e.g. update email, password, multi-factor). For now, sign out and sign back in to test auth.</p>
      </div>
    </div>
  );
}
