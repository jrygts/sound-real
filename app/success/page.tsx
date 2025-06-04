import Link from 'next/link';

export default function SuccessPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-green-50">
      <div className="bg-white shadow-lg rounded-lg p-10 flex flex-col items-center">
        <svg className="w-16 h-16 text-green-500 mb-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2l4 -4" />
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
        <h1 className="text-3xl font-bold text-green-700 mb-2">Payment Successful!</h1>
        <p className="text-slate-700 mb-6">Thank you for your purchase. Your payment has been processed successfully.</p>
        <Link href="/dashboard" className="btn btn-primary mb-2">Go to Dashboard</Link>
        {/* Optional: Add session verification here */}
      </div>
    </div>
  );
} 