import { ListCard } from '@components/desktop/list-card'

export interface Lab {
  id: string
  name: string
  description: string
  url: string
}

const LABS: Lab[] = [
  {
    id: 'rsc-llm-edge',
    name: 'RSC LLM on the Edge',
    description:
      'Streaming LLM responses with React Server Components at the edge',
    url: 'https://rsc-llm-on-the-edge.vercel.app/',
  },
  {
    id: 'pip-playground',
    name: 'v0 PIP Playground',
    description: 'Picture-in-picture mode playground',
    url: 'https://v0-pip-playground.vercel.app/',
  },
  {
    id: 'storybook-creator',
    name: 'AI Storybook Creator',
    description: "Generate illustrated children's ABC books with AI",
    url: 'https://v0-ai-story-book-creator.vercel.app/',
  },
  {
    id: 'gitkv',
    name: 'GitKV',
    description: 'A key-value store backed by a git repository',
    url: 'https://github.com/MaxLeiter/gitkv',
  },
  {
    id: 'talksabouttech',
    name: 'talksabout.tech',
    description: 'Talks I like from around the web',
    url: 'https://talksabout.tech/',
  },
]

export function LabsContent() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-mono font-bold mb-8 text-[var(--fg)]">labs/</h1>

      <ul className="space-y-2">
        {LABS.map((lab) => (
          <ListCard
            key={lab.id}
            href={lab.url}
            title={lab.name}
            description={lab.description}
            external
            icon={false}
          />
        ))}
      </ul>
    </div>
  )
}
