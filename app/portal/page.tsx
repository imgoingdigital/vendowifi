import React from 'react';

export default function PortalPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-2xl font-semibold text-center">Vendo WiFi Portal</h1>
        <form action="/api/vouchers/redeem" method="post" className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Voucher Code</label>
            <input name="code" required className="w-full rounded border px-3 py-2" placeholder="ENTER CODE" />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white rounded px-3 py-2 font-medium">Redeem</button>
        </form>
        <p className="text-xs text-center text-gray-500">Your browsing session will start after successful redemption.</p>
      </div>
    </main>
  );
}
