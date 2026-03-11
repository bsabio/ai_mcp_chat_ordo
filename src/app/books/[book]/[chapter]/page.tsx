import { getBooks, getChapterFull, getBookSummaries } from "@/lib/book-library";
import { ResourceNotFoundError } from "@/core/entities/errors";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export async function generateStaticParams() {
  const summaries = await getBookSummaries();
  const params: { book: string; chapter: string }[] = [];
  for (const summary of summaries) {
    for (const chapterSlug of summary.chapterSlugs) {
      params.push({ book: summary.slug, chapter: chapterSlug });
    }
  }
  return params;
}

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ book: string; chapter: string }>;
}) {
  const resolvedParams = await params;
  let content: string;
  try {
    const result = await getChapterFull(
      resolvedParams.book,
      resolvedParams.chapter,
    );
    if (!result) {
      notFound();
    }
    content = result.content;
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      notFound();
    }
    throw error;
  }

  return (
    <article className="transition-all duration-300">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node: _node, ...props }) => (
            <h1
              className="text-4xl sm:text-5xl font-bold mb-8 mt-8 tracking-tight"
              {...props}
            />
          ),
          h2: ({ node: _node, ...props }) => (
            <h2
              className="text-2xl sm:text-3xl font-bold mb-4 mt-12 border-b border-theme border-color-theme pb-2"
              {...props}
            />
          ),
          h3: ({ node: _node, ...props }) => (
            <h3
              className="text-xl sm:text-2xl font-bold mb-4 mt-8"
              {...props}
            />
          ),
          p: ({ node: _node, ...props }) => (
            <p className="mb-6 leading-relaxed opacity-90 text-lg" {...props} />
          ),
          a: ({ node: _node, ...props }) => (
            <a
              className="text-accent-theme underline hover:opacity-80 transition-opacity font-medium"
              {...props}
            />
          ),
          ul: ({ node: _node, ...props }) => (
            <ul
              className="list-disc pl-6 mb-6 opacity-90 text-lg flex flex-col gap-2"
              {...props}
            />
          ),
          ol: ({ node: _node, ...props }) => (
            <ol
              className="list-decimal pl-6 mb-6 opacity-90 text-lg flex flex-col gap-2"
              {...props}
            />
          ),
          li: ({ node: _node, ...props }) => <li className="" {...props} />,
          blockquote: ({ node: _node, ...props }) => (
            <blockquote
              className="border-l-4 border-accent-theme pl-6 italic opacity-80 my-8 text-xl"
              {...props}
            />
          ),
           
          img: ({ node: _node, alt, ...props }) => (
            <img
              alt={alt || ""}
              className="rounded-theme shadow-theme my-10 max-w-full border-theme border-color-theme"
              {...props}
            />
          ),
          pre: ({ node: _node, ...props }) => (
            <pre
              className="code-chrome p-6 rounded-theme overflow-x-auto mb-8 text-sm shadow-theme font-mono border-theme border-color-theme"
              {...props}
            />
          ),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          code: ({ node: _node, inline, ...props }: any) =>
            inline ? (
              <code
                className="bg-[var(--surface-muted)] px-1.5 py-0.5 rounded-theme text-sm border-theme border-color-theme font-mono"
                {...props}
              />
            ) : (
              <code className="font-mono" {...props} />
            ),
          table: ({ node: _node, ...props }) => (
            <div className="overflow-x-auto mb-8">
              <table className="w-full text-sm border-collapse" {...props} />
            </div>
          ),
          th: ({ node: _node, ...props }) => (
            <th
              className="border border-theme border-color-theme px-4 py-2 text-left font-bold bg-[var(--surface-muted)]"
              {...props}
            />
          ),
          td: ({ node: _node, ...props }) => (
            <td
              className="border border-theme border-color-theme px-4 py-2"
              {...props}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
