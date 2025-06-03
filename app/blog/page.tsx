import { categories, articles } from "./_assets/content";
import CardArticle from "./_assets/components/CardArticle";
import CardCategory from "./_assets/components/CardCategory";
import config from "@/config";
import { getSEOTags } from "@/libs/seo";

export const metadata = getSEOTags({
  title: `${config.appName} Blog | AI Detection & Humanization Tips`,
  description:
    "Learn the latest strategies for humanizing AI text, bypassing AI detectors, and creating natural-sounding content. Expert tips on making ChatGPT and AI writing undetectable.",
  canonicalUrlRelative: "/blog",
  keywords: [
    'ai detection tips',
    'humanize ai text guide',
    'bypass ai detector tutorial',
    'chatgpt humanization blog',
    'ai writing tips',
    'undetectable ai content',
    'turnitin bypass guide'
  ],
  openGraph: {
    title: `${config.appName} Blog - AI Detection & Humanization Tips`,
    description: 'Expert guides on humanizing AI text and bypassing AI detectors',
    url: `https://${config.domainName}/blog`,
  },
});

export default async function Blog() {
  const articlesToDisplay = articles
    .sort(
      (a, b) =>
        new Date(b.publishedAt).valueOf() - new Date(a.publishedAt).valueOf()
    )
    .slice(0, 6);
  return (
    <>
      <section className="text-center max-w-xl mx-auto mt-12 mb-24 md:mb-32">
        <h1 className="font-extrabold text-3xl lg:text-5xl tracking-tight mb-6">
          The {config.appName} Blog
        </h1>
        <p className="text-lg opacity-80 leading-relaxed">
          Learn how to humanize AI text, bypass AI detectors, and create natural-sounding content that passes all detection tools.
        </p>
      </section>

      <section className="grid lg:grid-cols-2 mb-24 md:mb-32 gap-8">
        {articlesToDisplay.map((article, i) => (
          <CardArticle
            article={article}
            key={article.slug}
            isImagePriority={i <= 2}
          />
        ))}
      </section>

      <section>
        <p className="font-bold text-2xl lg:text-4xl tracking-tight text-center mb-8 md:mb-12">
          Browse articles by category
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((category) => (
            <CardCategory key={category.slug} category={category} tag="div" />
          ))}
        </div>
      </section>
    </>
  );
}
