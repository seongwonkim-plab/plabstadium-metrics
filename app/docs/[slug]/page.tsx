import { notFound } from "next/navigation"
import { promises as fs } from "node:fs"
import path from "node:path"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"

export const dynamic = "force-dynamic"
export const revalidate = 0

type Params = Promise<{ slug: string }>

const FILE_MAP: Record<string, { path: string; title: string }> = {
  readme: { path: "README.md", title: "README" },
  "task-history": { path: "docs/task_history.md", title: "작업 이력" },
}

const mdComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold mt-6 mb-4 pb-2 border-b border-neutral-200">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-bold mt-8 mb-3">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold mt-5 mb-2">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="my-3 text-sm leading-relaxed text-neutral-800">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="my-2 ml-5 list-disc space-y-1 text-sm">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 ml-5 list-decimal space-y-1 text-sm">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  code: ({ className, children }) => {
    const isBlock = /language-/.test(className ?? "")
    if (isBlock) return <code className={className}>{children}</code>
    return (
      <code className="rounded bg-neutral-100 px-1 py-0.5 text-[12px] font-mono text-neutral-800">
        {children}
      </code>
    )
  },
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded bg-neutral-900 p-3 text-[12px] leading-relaxed text-neutral-100">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-neutral-50">{children}</thead>,
  th: ({ children }) => (
    <th className="border border-neutral-200 px-2 py-1 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-neutral-200 px-2 py-1 align-top">{children}</td>
  ),
  a: ({ href, children }) => (
    <a href={href} className="text-blue-600 hover:underline">
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-4 border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-6 border-neutral-200" />,
  strong: ({ children }) => (
    <strong className="font-semibold text-neutral-900">{children}</strong>
  ),
}

export default async function DocPage({ params }: { params: Params }) {
  const { slug } = await params
  const meta = FILE_MAP[slug]
  if (!meta) notFound()

  const filePath = path.join(process.cwd(), meta.path)
  let content: string
  try {
    content = await fs.readFile(filePath, "utf8")
  } catch {
    notFound()
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-4 flex items-center justify-between text-xs text-neutral-500">
        <span>저장소 파일 · {meta.path}</span>
        <span>{meta.title}</span>
      </div>
      <article>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
          {content}
        </ReactMarkdown>
      </article>
    </div>
  )
}
