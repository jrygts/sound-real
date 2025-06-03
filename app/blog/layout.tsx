export default async function LayoutBlog({ children }: { children: any }) {
  return (
    <div className="max-w-6xl mx-auto p-8">
      {children}
    </div>
  );
}
