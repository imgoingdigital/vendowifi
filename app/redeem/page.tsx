import VoucherRedeemForm from './VoucherRedeemForm';

export const metadata = {
  title: 'Redeem Voucher',
};

export default function RedeemPage() {
  return (
    <div className="py-12 px-4">
      <h1 className="text-2xl font-semibold text-center mb-6">Redeem Your Voucher</h1>
      <p className="text-center text-sm text-gray-600 dark:text-gray-300 mb-10 max-w-xl mx-auto">Enter the voucher code you purchased or received to activate your internet access. Optional: include your device MAC for logging.</p>
      <VoucherRedeemForm />
    </div>
  );
}
