export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form className="w-full max-w-sm space-y-4" method="post" action="/api/auth/login">
        <h1 className="text-xl font-semibold text-center">Admin Login</h1>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input name="email" type="email" required className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
            <input name="password" type="password" required className="w-full border rounded px-3 py-2" />
        </div>
        <button type="submit" className="w-full bg-blue-600 text-white rounded py-2">Login</button>
      </form>
    </main>
  );
}
