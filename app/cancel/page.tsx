import Link from 'next/link';

export default function CancelPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-red-50">
      <div className="bg-white shadow-lg rounded-lg p-10 flex flex-col items-center">
        <svg className="w-16 h-16 text-red-500 mb-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 9l-6 6m0-6l6 6" />
        </svg>
        <h1 className="text-3xl font-bold text-red-700 mb-2">Payment Cancelled</h1>
        <p className="text-slate-700 mb-6">Your payment was not completed. You can try again or return to the pricing page.</p>
        <Link href="/pricing" className="btn btn-secondary mb-2">Back to Pricing</Link>
        <Link href="/" className="btn btn-outline">Try Again</Link>
      </div>
    </div>
  );
} 