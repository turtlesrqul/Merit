import { Badge } from "@/components/ui/badge";
import type { ClaimablePassport } from "@/lib/db/claimable-passports";

type ClaimablePassportPreviewProps = {
  passport: ClaimablePassport;
  compact?: boolean;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-SG", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function ClaimablePassportPreview({ compact = false, passport }: ClaimablePassportPreviewProps) {
  const links = [
    passport.resumeUrl ? { label: "Resume", href: passport.resumeUrl } : null,
    passport.portfolioUrl ? { label: "Portfolio", href: passport.portfolioUrl } : null,
    passport.linkedinUrl ? { label: "LinkedIn", href: passport.linkedinUrl } : null,
    passport.githubUrl ? { label: "GitHub", href: passport.githubUrl } : null
  ].filter((link): link is { label: string; href: string } => Boolean(link));

  return (
    <article className={compact ? "space-y-5" : "editorial-container space-y-10 pt-12"}>
      <div className="grid gap-5 border-b border-[#d7cebd] pb-6 md:grid-cols-[1fr_auto] md:items-end">
        <div className="space-y-4">
          <p className="label-caps">Claimable Passport</p>
          <div className="space-y-3">
            <h1 className="font-serif text-3xl leading-tight text-[#16130f] md:text-5xl">
              {passport.fullName}
            </h1>
            {passport.headline ? (
              <p className="max-w-3xl text-base leading-7 text-[#7b705f]">{passport.headline}</p>
            ) : null}
          </div>
        </div>
        <div className="space-y-1 text-sm text-[#7b705f]">
          <p>Status: <span className="capitalize text-[#16130f]">{passport.status}</span></p>
          {passport.status !== "claimed" ? <p>Expires: {formatDate(passport.claimExpiresAt)}</p> : null}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-8">
          {passport.featuredWork ? (
            <section className="space-y-3">
              <p className="label-caps">Featured work</p>
              <h2 className="font-serif text-2xl text-[#16130f]">{passport.featuredWork.title}</h2>
              {passport.featuredWork.description ? (
                <p className="max-w-3xl text-base leading-7 text-[#4b4439]">{passport.featuredWork.description}</p>
              ) : null}
            </section>
          ) : null}

          {passport.projects.length > 0 ? (
            <section className="space-y-4">
              <p className="label-caps">Projects</p>
              <div className="grid gap-4 md:grid-cols-2">
                {passport.projects.map((project) => (
                  <article className="space-y-2 border border-[#d7cebd] bg-[#eee8dd] p-4" key={`${passport.passportId}-${project.title}`}>
                    {project.imageUrl ? (
                      <div className="overflow-hidden bg-[#e5ded1]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          alt={`${project.title} preview`}
                          className="h-48 w-full object-cover"
                          src={project.imageUrl}
                        />
                      </div>
                    ) : null}
                    <h3 className="font-serif text-xl text-[#16130f]">{project.title}</h3>
                    <p className="text-sm leading-6 text-[#7b705f]">{project.description}</p>
                    {project.skills.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {project.skills.map((skill) => (
                          <Badge key={`${passport.passportId}-${project.title}-${skill}`}>{skill}</Badge>
                        ))}
                      </div>
                    ) : null}
                    {project.artifactUrl ? (
                      <a className="text-sm text-[#16130f] underline underline-offset-4" href={project.artifactUrl} rel="noreferrer" target="_blank">
                        Open artifact
                      </a>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-6">
          <section className="space-y-3">
            <p className="label-caps">About</p>
            <p className="text-sm leading-6 text-[#7b705f]">
              {passport.bio || "No bio has been added yet."}
            </p>
          </section>

          {passport.skills.length > 0 ? (
            <section className="space-y-3">
              <p className="label-caps">Capabilities</p>
              <div className="flex flex-wrap gap-2">
                {passport.skills.map((skill) => (
                  <Badge key={`${passport.passportId}-${skill}`}>{skill}</Badge>
                ))}
              </div>
            </section>
          ) : null}

          {links.length > 0 ? (
            <section className="space-y-3">
              <p className="label-caps">Links</p>
              <div className="flex flex-wrap gap-3">
                {links.map((link) => (
                  <a className="text-sm text-[#16130f] underline underline-offset-4" href={link.href} key={link.href} rel="noreferrer" target="_blank">
                    {link.label}
                  </a>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </article>
  );
}
