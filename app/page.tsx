import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

export default function RootPage() {
  return (
    <AppShell>
      <section className="editorial-container flex min-h-[72vh] flex-col justify-center py-12 text-center">
        <p className="label-caps mx-auto mb-7">Portfolio for builders</p>
        <h1 className="mx-auto max-w-4xl font-serif text-4xl leading-[1.03] text-[#16130f] sm:text-5xl">
          Your work deserves more than a resume.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#7b705f]">
          Build a portfolio that shows what you have actually made, then share one link with anyone who needs to see it.
        </p>
        <div className="mt-8 flex justify-center">
          <Link href="/home">
            <Button className="min-w-64">Explore Merit</Button>
          </Link>
        </div>
      </section>

      <section className="border-y border-[#d7cebd] bg-[#eee8dd] py-12">
        <div className="editorial-container grid gap-8 text-center md:grid-cols-3">
          {[
            ["Build", "Capture the projects, prototypes, decks, and systems that show how you think."],
            ["Publish", "Turn scattered proof into a calm public portfolio that is easy to browse."],
            ["Share", "Send one link to recruiters, collaborators, clients, and teams."]
          ].map(([title, body]) => (
            <div className="space-y-4" key={title}>
              <h2 className="font-serif text-2xl text-[#16130f]">{title}</h2>
              <p className="mx-auto max-w-xs text-sm leading-6 text-[#7b705f]">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="editorial-container grid gap-8 py-14 md:grid-cols-2">
        <div>
          <p className="label-caps mb-6">Why Merit</p>
          <h2 className="font-serif text-3xl leading-tight text-[#16130f]">
            Proof carries more weight when it is easy to inspect.
          </h2>
        </div>
        <div className="grid gap-8 text-lg leading-8 text-[#7b705f]">
          <p>
            Merit puts built work first: project images, case studies, artifacts, links, and outcomes. Claims become browsable evidence.
          </p>
          <p>
            The experience is designed for students, independent builders, and early-career talent who need a polished public home for their strongest work.
          </p>
        </div>
      </section>
    </AppShell>
  );
}
