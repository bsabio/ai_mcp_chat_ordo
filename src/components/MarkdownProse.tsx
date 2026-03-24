import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownProseProps {
  content: string;
  className?: string;
}

export function MarkdownProse({
  content,
  className = "library-prose",
}: MarkdownProseProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node: _node, ...props }) => <h1 {...props} />,
          h2: ({ node: _node, ...props }) => <h2 {...props} />,
          h3: ({ node: _node, ...props }) => <h3 {...props} />,
          p: ({ node: _node, ...props }) => <p {...props} />,
          a: ({ node: _node, ...props }) => <a {...props} />,
          ul: ({ node: _node, ...props }) => <ul {...props} />,
          ol: ({ node: _node, ...props }) => <ol {...props} />,
          li: ({ node: _node, ...props }) => <li {...props} />,
          blockquote: ({ node: _node, ...props }) => <blockquote {...props} />,
          hr: ({ node: _node, ...props }) => <hr {...props} />,
          img: ({ node: _node, alt, ...props }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={alt || ""} {...props} />
          ),
          pre: ({ node: _node, ...props }) => (
            <pre className="code-chrome" {...props} />
          ),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          code: ({ node: _node, inline, ...props }: any) =>
            inline ? <code {...props} /> : <code className="font-mono" {...props} />,
          table: ({ node: _node, ...props }) => (
            <div className="overflow-x-auto">
              <table {...props} />
            </div>
          ),
          th: ({ node: _node, ...props }) => <th {...props} />,
          td: ({ node: _node, ...props }) => <td {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}