import Link from "next/link"
import {HomeLayout} from "fumadocs-ui/layouts/home"
import {baseOptions} from "@/lib/layout.shared"
import {ArrowRight, LifeBuoy, Send, Users} from "lucide-react"
import type {ReactNode} from "react"

interface JourneyStepProps {
  title: string
  href: string
  description?: ReactNode
}

interface JourneyProps {
  title: string
  description: string
  steps: JourneyStepProps[]
}

const JOURNEYS: JourneyProps[] = [
  {
    title: "Smart contracts",
    description: "Build, debug, and deploy smart contracts on TON.",
    steps: [
      {title: "Acton toolchain", href: "https://ton-blockchain.github.io/acton/docs/welcome"},
      {title: "JetBrains IDE plugin", href: "/blockchain-basics/contract-dev/ide/jetbrains"},
      {title: "VS Code extension", href: "/blockchain-basics/contract-dev/ide/vscode"},
      {title: "TVM exit codes", href: "/blockchain-basics/tvm/exit-codes"},
      {title: "TVM instructions", href: "/blockchain-basics/tvm/instructions"},
    ],
  },
  {
    title: "Apps",
    description: "Everything one needs to build applications on TON.",
    steps: [
      {title: "Build applications with AppKit", href: "/applications/appkit/overview"},
      {title: "Integrate payments with TON Pay", href: "/applications/ton-pay/overview"},
      {title: "Integrate wallets with WalletKit", href: "/applications/walletkit/overview"},
      {title: "Access the blockchain via APIs", href: "/applications/api/overview"},
    ],
  },
  {
    title: "Nodes",
    description: "Run and manage TON blockchain nodes.",
    steps: [
      {title: "Nodes overview", href: "/blockchain-basics/nodes/overview"},
      {title: "Validator node", href: "/blockchain-basics/nodes/overview#validator-node"},
      {title: "C++ node setup", href: "/blockchain-basics/nodes/cpp/setup-mytonctrl"},
      {title: "Rust node setup", href: "/blockchain-basics/nodes/rust/quick-start"},
    ],
  },
]

function JourneyCard({title, description, steps}: JourneyProps) {
  return (
    <article className="rounded-2xl border border-fd-border bg-fd-card/40 px-6 pt-5 pb-4">
      <h3 className="mb-1 text-balance text-base sm:text-xl font-semibold tracking-tight text-fd-foreground">
        {title}
      </h3>
      <p className="text-pretty text-base text-fd-muted-foreground">{description}</p>
      <div className="mt-3 overflow-x-auto no-scrollbar">
        <div className="flex flex-row gap-4 py-1">
          {steps.map(step => (
            <Link
              key={step.href}
              href={step.href}
              className="group flex-none w-52 rounded-2xl border border-fd-border bg-fd-background/60 px-5 py-4 transition-colors hover:border-fd-primary"
            >
              <h4 className="text-sm font-semibold text-fd-foreground group-hover:text-fd-primary">
                {step.title}
              </h4>
              <span className="mt-3 inline-flex items-center gap-1 text-xs text-fd-muted-foreground group-hover:text-fd-primary">
                Continue <ArrowRight className="size-3" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </article>
  )
}

export default function Page() {
  return (
    <HomeLayout {...baseOptions()}>
      <main className="mx-auto w-full max-w-5xl px-6 pb-24">
        <section className="relative isolate py-8 sm:py-12 lg:py-16">
          <div aria-hidden className="absolute inset-x-0 -top-40 -z-10 overflow-hidden blur-3xl">
            <div
              style={{
                clipPath:
                  "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
              }}
              className="relative left-1/2 aspect-[1155/678] w-[36rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#0098EA] to-[#5CC4F7] opacity-25 sm:w-[72rem]"
            />
          </div>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <img
              src="/logo-ton-gray.svg"
              alt="TON logo"
              className="hidden lg:block h-32 w-auto mr-4 dark:invert-0"
            />
            <div className="max-w-2xl text-left">
              <h1 className="text-balance text-4xl sm:text-5xl font-semibold tracking-tight text-fd-foreground">
                TON documentation
              </h1>
              <p className="mt-6 text-pretty text-xl text-fd-muted-foreground">
                TON is a blockchain platform designed for scalable smart contracts, applications,
                and payments at consumer scale.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/overview/start-here"
                  className="inline-flex items-center gap-1 rounded-md bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground hover:bg-fd-primary/85"
                >
                  Start here <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/blockchain-basics/contract-dev/blueprint/first-smart-contract"
                  className="inline-flex items-center gap-1 rounded-md border border-fd-border px-4 py-2 text-sm font-medium text-fd-foreground hover:bg-fd-accent"
                >
                  Your first smart contract
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="journeys" tabIndex={-1} className="flex flex-col gap-4 focus:outline-none">
          <h2 className="text-balance text-xl sm:text-2xl font-semibold tracking-tight text-fd-foreground">
            Choose your path
          </h2>
          <div className="flex flex-col gap-4">
            {JOURNEYS.map(j => (
              <JourneyCard key={j.title} {...j} />
            ))}
          </div>
        </section>

        <section
          id="troubleshooting"
          tabIndex={-1}
          className="mt-12 flex flex-col gap-4 focus:outline-none"
        >
          <div>
            <h2 className="text-balance text-2xl font-semibold tracking-tight text-fd-foreground">
              Troubleshooting
            </h2>
            <p className="mt-2 text-fd-muted-foreground">
              Can&apos;t find what you need? Use <kbd>Ctrl + K</kbd> to search and ask AI, or{" "}
              <kbd>Ctrl + I</kbd> to open the assistant panel.
            </p>
          </div>
        </section>
      </main>
    </HomeLayout>
  )
}
