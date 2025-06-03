import React from "react";
import { getSEOTags } from "@/libs/seo";
import config from "@/config";

export const metadata = getSEOTags({
  title: 'Pricing Plans - AI Text Humanizer | SoundReal',
  description: 'Choose the perfect plan for your AI text humanization needs. Free tier available with premium features for power users. Bypass AI detectors with our affordable plans.',
  canonicalUrlRelative: '/pricing',
  keywords: [
    'ai humanizer pricing',
    'ai text humanizer plans',
    'bypass ai detector cost',
    'chatgpt humanizer price',
    'undetectable ai pricing',
    'ai humanization subscription',
    'turnitin bypass pricing'
  ],
  openGraph: {
    title: 'SoundReal Pricing - AI Text Humanizer Plans',
    description: 'Choose the perfect plan for your AI text humanization needs. Free tier available with premium features.',
    url: `https://${config.domainName}/pricing`,
  },
});

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 