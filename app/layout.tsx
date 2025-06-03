import { ReactNode } from "react";
import { Inter } from "next/font/google";
import { Viewport } from "next";
import { getSEOTags } from "@/libs/seo";
import ClientLayout from "@/components/LayoutClient";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import config from "@/config";
import "./globals.css";

const font = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
	// Will use the primary color of your theme to show a nice theme color in the URL bar of supported browsers
	themeColor: config.colors.main,
	width: "device-width",
	initialScale: 1,
};

// Enhanced SEO tags for AI text humanization tool
export const metadata = getSEOTags({
	title: 'AI Text Humanizer - Make ChatGPT Text Undetectable | SoundReal',
	description: 'Transform AI-generated content into natural, human-sounding text that bypasses AI detectors. Free AI humanizer tool with instant results and 100% undetectable output.',
	canonicalUrlRelative: '/',
	keywords: [
		'ai humanizer',
		'make ai text human',
		'bypass ai detector',
		'chatgpt humanizer',
		'ai to human text',
		'undetectable ai',
		'ai content detector',
		'humanize chatgpt text',
		'turnitin bypass',
		'make chatgpt undetectable'
	],
	openGraph: {
		title: 'SoundReal - Make AI Text Sound Human',
		description: 'Transform AI content into natural human text that bypasses all AI detectors instantly',
		url: `https://${config.domainName}`,
	},
});

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html
			lang="en"
			data-theme={config.colors.theme}
			className={font.className}
		>
			<body>
				{/* ClientLayout contains all the client wrappers (Crisp chat support, toast messages, tooltips, etc.) */}
				<ClientLayout>
					<Navigation />
					<main className="min-h-screen">
						{children}
					</main>
					<Footer />
				</ClientLayout>
			</body>
		</html>
	);
}
