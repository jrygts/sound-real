'use client'

import { useState } from 'react'
import config from "@/config";
import ButtonCheckout from "./ButtonCheckout";
import { useRouter } from "next/navigation";
import Link from 'next/link';

// <Pricing/> displays the pricing plans for your app
// It's your Stripe config in config.js.stripe.plans[] that will be used to display the plans
// <ButtonCheckout /> renders a button that will redirect the user to Stripe checkout called the /api/stripe/create-checkout API endpoint with the correct priceId

const Pricing = () => {
  const router = useRouter();
  const [isAnnual, setIsAnnual] = useState(false);

  const getPrice = (price: number) => {
    if (isAnnual) {
      return (price * 0.7).toFixed(2); // 30% discount for annual
    }
    return price.toFixed(2);
  };

  const getPeriod = () => {
    return isAnnual ? '/month' : '/month';
  };

  const getAnnualPrice = (price: number) => {
    return (price * 0.7 * 12).toFixed(2);
  };

  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-slate-600 mb-8">
            Choose the plan that fits your needs
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <span className={`text-sm ${!isAnnual ? 'text-slate-900 font-medium' : 'text-slate-600'}`}>
              Monthly
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-200"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  isAnnual ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm ${isAnnual ? 'text-slate-900 font-medium' : 'text-slate-600'}`}>
              Annual <span className="text-green-600">(Save 30%)</span>
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {config.stripe.plans.map((plan) => (
            <div
              key={plan.priceId}
              className={`bg-white rounded-xl p-8 ${
                plan.isFeatured
                  ? "ring-2 ring-blue-600 shadow-xl scale-105"
                  : "shadow-lg"
              }`}
            >
              {plan.isFeatured && (
                <div className="bg-blue-600 text-white text-sm font-medium py-1 px-3 rounded-full inline-block mb-4">
                  Most Popular
                </div>
              )}
              
              <h3 className="text-2xl font-bold text-slate-900 mb-2">
                {plan.name}
              </h3>
              
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-slate-900">
                    ${getPrice(plan.price)}
                  </span>
                  <span className="text-slate-600">{getPeriod()}</span>
                </div>
                {isAnnual && (
                  <p className="text-sm text-slate-600 mt-1">
                    Billed annually at ${getAnnualPrice(plan.price)}/year
                  </p>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-5 h-5 text-green-500 mt-0.5 shrink-0"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-slate-700">{feature.name}</span>
                  </li>
                ))}
              </ul>

              <ButtonCheckout 
                priceId={plan.priceId}
                className={`w-full py-3 rounded-lg font-medium transition ${
                  plan.isFeatured
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-slate-100 text-slate-900 hover:bg-slate-200"
                }`}
              >
                Subscribe Now
              </ButtonCheckout>
            </div>
          ))}
        </div>

        <div className="text-center mt-12 space-y-4">
          <p className="text-slate-600">
            By clicking the Subscribe button, you agree to our{' '}
            <Link href="/terms" className="text-blue-600 hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-blue-600 hover:underline">
              Privacy Policy
            </Link>
          </p>
          <p className="text-slate-600">
            Need more?{' '}
            <Link href="/contact" className="text-blue-600 hover:underline">
              Contact Us
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
