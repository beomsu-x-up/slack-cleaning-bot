import { Button, Card, Input } from '@xmoothie/ui'

function App() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(15,107,75,0.2),_transparent_34%),linear-gradient(180deg,_#fbfcf8_0%,_#eef3ea_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[linear-gradient(135deg,_rgba(20,38,29,0.08),_transparent_56%)]" />

      <div className="relative mx-auto flex max-w-6xl flex-col gap-6">
        <section className="grid gap-6 rounded-[32px] border border-black/5 bg-white/75 p-6 shadow-[0_24px_80px_rgba(17,43,29,0.12)] backdrop-blur md:grid-cols-[1.35fr_0.9fr] md:p-10">
          <div className="space-y-6">
            <div className="inline-flex items-center rounded-full border border-emerald-900/10 bg-emerald-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-emerald-900/70">
              Xmoothie UI Ready
            </div>
            <div className="space-y-4">
              <h1 className="max-w-xl text-4xl font-semibold tracking-[-0.04em] text-slate-950 md:text-6xl">
                Vite 앱에 `@xmoothie/ui` 디자인 시스템을 연결했습니다.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                Tailwind CSS v4와 Xmoothie 스타일시트를 전역으로 로드했고,
                컴포넌트는 `className`으로 조합 가능한 상태입니다.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                aria-label="Project name"
                placeholder="프로젝트 이름을 입력해보세요"
                className="h-12 rounded-2xl border-slate-200 bg-white/90"
              />
              <Button className="h-12 rounded-2xl px-6">
                컴포넌트 사용 시작
              </Button>
            </div>
          </div>

          <Card
            animated
            className="border-white/70 bg-[linear-gradient(180deg,_rgba(244,248,245,0.96),_rgba(232,239,235,0.92))] shadow-none"
          >
            <Card.Header>
              <Card.Title className="text-xl font-semibold text-slate-950">
                테마 오버라이드 예시
              </Card.Title>
              <Card.Description className="text-slate-600">
                `src/index.css`의 `:root`에서 브랜드 컬러를 재정의했습니다.
              </Card.Description>
            </Card.Header>
            <Card.Content className="space-y-3 text-sm text-slate-600">
              <div className="rounded-2xl border border-black/5 bg-white/80 p-4">
                <p className="font-medium text-slate-950">적용된 핵심 설정</p>
                <p className="mt-2">
                  `@tailwindcss/vite`, `@xmoothie/ui/styles.css`,
                  `tailwindcss`
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-emerald-950 p-4 text-emerald-50">
                  <p className="text-xs uppercase tracking-[0.22em] opacity-70">
                    Primary
                  </p>
                  <p className="mt-2 text-lg font-semibold">#0F6B4B</p>
                </div>
                <div className="rounded-2xl bg-emerald-100 p-4 text-emerald-950">
                  <p className="text-xs uppercase tracking-[0.22em] opacity-70">
                    Hover
                  </p>
                  <p className="mt-2 text-lg font-semibold">#16805A</p>
                </div>
              </div>
            </Card.Content>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: '설치 완료',
              description: '패키지와 peer dependency를 모두 연결했습니다.',
            },
            {
              title: 'Vite 플러그인',
              description: 'Tailwind v4는 PostCSS 대신 Vite 플러그인으로 동작합니다.',
            },
            {
              title: '전역 스타일',
              description: 'UI 스타일과 Tailwind import를 전역 CSS 최상단에 배치했습니다.',
            },
          ].map((item) => (
            <Card
              key={item.title}
              className="border-white/70 bg-white/80 shadow-[0_12px_40px_rgba(17,43,29,0.08)]"
            >
              <Card.Header>
                <Card.Title className="text-lg font-semibold text-slate-950">
                  {item.title}
                </Card.Title>
                <Card.Description className="leading-6 text-slate-600">
                  {item.description}
                </Card.Description>
              </Card.Header>
            </Card>
          ))}
        </section>
      </div>
    </main>
  )
}

export default App
