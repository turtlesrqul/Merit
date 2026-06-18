import {
  CollapsibleProjectDescription,
  CollapsibleText
} from "@/components/profile/collapsible-project-description";
import { ProjectImageCarousel } from "@/components/projects/project-image-carousel";
import { SkillTagsToggle } from "@/components/profile/skill-tags-toggle";
import { ActionIcon, iconControlClassName } from "@/components/ui/action-icon";
import type { ClaimablePassport } from "@/lib/db/claimable-passports";

type ClaimablePassportPreviewProps = {
  passport: ClaimablePassport;
  compact?: boolean;
  showContactEmail?: boolean;
};

type ClaimableProject = ClaimablePassport["projects"][number];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-SG", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function initialsForName(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function statusLabel(status: ClaimablePassport["status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getClaimableProjectImages(project: ClaimableProject) {
  const urls = project.imageUrls.length > 0 ? project.imageUrls : project.imageUrl ? [project.imageUrl] : [];
  return urls.map((url, index) => ({
    label: `Image ${index + 1}`,
    url
  }));
}

function ClaimableArchiveItem({
  project
}: {
  project: ClaimableProject;
}) {
  const imageUrl = project.imageUrls[0] ?? project.imageUrl;
  const artifactUrl = project.artifactUrls[0] ?? project.artifactUrl;

  return (
    <article className="group">
      <div className="block">
        <div className="relative aspect-[16/10] overflow-hidden bg-[#e5ded1]">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={`${project.title} preview`}
              className="h-full w-full object-cover"
              src={imageUrl}
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[#7b705f]">
              Preview coming soon
            </div>
          )}
          {project.category ? (
            <span className="absolute bottom-3 left-3 bg-[#fbf8f0] px-2.5 py-1 text-xs text-[#16130f]">
              {project.category}
            </span>
          ) : null}
        </div>
        <div className="mt-4 space-y-1">
          <h3 className="font-serif text-xl leading-tight text-[#16130f]">{project.title}</h3>
          <p className="line-clamp-2 text-sm leading-6 text-[#7b705f]">{project.hook}</p>
          {artifactUrl ? (
            <a
              className="inline-flex text-sm text-[#16130f] underline underline-offset-4"
              href={artifactUrl}
              rel="noreferrer"
              target="_blank"
            >
              Open work
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function ClaimablePassportPreview({
  compact = false,
  passport,
  showContactEmail = false
}: ClaimablePassportPreviewProps) {
  const cvLink = passport.resumeUrl ? { label: "Open Resume", href: passport.resumeUrl } : null;
  const portfolioLinks = [
    passport.portfolioUrl ? { label: "Open Portfolio", href: passport.portfolioUrl } : null,
    passport.linkedinUrl ? { label: "Open LinkedIn", href: passport.linkedinUrl } : null,
    passport.githubUrl ? { label: "Open GitHub", href: passport.githubUrl } : null
  ].filter((link): link is { label: string; href: string } => Boolean(link));
  const featuredProject = passport.projects[0] ?? null;
  const archiveProjects = passport.projects.slice(1);
  const featuredTitle =
    featuredProject?.title || passport.featuredWork?.title || "Featured work";
  const featuredHook =
    featuredProject?.hook || passport.featuredWork?.description || "Project preview";
  const featuredDescription =
    featuredProject?.description ||
    passport.featuredWork?.description ||
    "No project description has been added yet.";
  const featuredImages = featuredProject ? getClaimableProjectImages(featuredProject) : [];
  const featuredArtifactUrl = featuredProject?.artifactUrls[0] ?? featuredProject?.artifactUrl ?? null;
  const skillList = Array.from(
    new Set([
      ...passport.skills,
      ...passport.projects.flatMap((project) => project.skills)
    ])
  );

  return (
    <article className={compact ? "space-y-8" : "editorial-container pt-12"}>
      <div className="grid gap-6 border-b border-[#d7cebd] pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="space-y-5">
          <div className="flex h-20 w-20 items-center justify-center bg-[#dfd6c6] font-serif text-2xl text-[#7b705f]">
            {initialsForName(passport.fullName)}
          </div>
          <div className="max-w-4xl space-y-4">
            <h1 className="font-serif text-3xl leading-[1.06] text-[#16130f] sm:text-4xl lg:text-5xl">
              {passport.fullName}
            </h1>
            {passport.headline ? (
              <p className="max-w-3xl text-base leading-7 text-[#7b705f]">{passport.headline}</p>
            ) : null}
            <div className="space-y-2 pt-2 text-sm uppercase tracking-[0.12em] text-[#7b705f]">
              <p>Claimable Passport</p>
              <p className={passport.status === "expired" ? "text-red-700" : "text-[#d8aa14]"}>
                {statusLabel(passport.status)}
                {passport.status !== "claimed" ? ` / Expires ${formatDate(passport.claimExpiresAt)}` : ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className={compact ? "pt-8" : "pt-12"}>
        <p className="label-caps mb-5">Featured work</p>
        {featuredProject || passport.featuredWork ? (
          <article className="space-y-5">
            <div className="overflow-hidden">
              {featuredImages.length > 0 ? (
                <ProjectImageCarousel images={featuredImages} title={featuredTitle} />
              ) : (
                <div className="flex min-h-60 items-center justify-center bg-[#e5ded1] text-[#7b705f]">
                  Preview coming soon
                </div>
              )}
            </div>
            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
              <div className="max-w-3xl space-y-3">
                <h2 className="font-serif text-2xl leading-tight text-[#16130f]">{featuredTitle}</h2>
                <CollapsibleText
                  className="text-[#7b705f]"
                  collapsedClassName="line-clamp-2"
                  description={featuredHook}
                  threshold={140}
                />
                <CollapsibleProjectDescription description={featuredDescription} />
              </div>
              {featuredArtifactUrl ? (
                <a
                  aria-label="View featured work"
                  className={iconControlClassName()}
                  href={featuredArtifactUrl}
                  rel="noreferrer"
                  target="_blank"
                  title="View featured work"
                >
                  <ActionIcon name="eye" />
                </a>
              ) : null}
            </div>
          </article>
        ) : (
          <div className="border border-dashed border-[#d7cebd] px-8 py-10 text-center text-[#7b705f]">
            No public projects yet.
          </div>
        )}
      </div>

      {archiveProjects.length > 0 ? (
        <details className="group pt-12">
          <summary className="mb-5 flex cursor-pointer list-none items-center justify-between border-b border-[#d7cebd] pb-4">
            <p className="label-caps">Selected works</p>
            <span className="flex items-center gap-2 text-sm text-[#7b705f]">
              {archiveProjects.length} more
              <span className={iconControlClassName({ className: "h-8 w-8 transition-transform group-open:rotate-180", variant: "ghost" })}>
                <ActionIcon name="chevron-down" />
              </span>
            </span>
          </summary>
          <div className="grid gap-x-8 gap-y-10 md:grid-cols-2">
            {archiveProjects.map((project) => (
              <ClaimableArchiveItem
                key={`${passport.passportId}-${project.title}`}
                project={project}
              />
            ))}
          </div>
        </details>
      ) : null}

      <div className="grid gap-8 border-t border-[#d7cebd] pt-12 md:grid-cols-[1fr_1fr]">
        <section className="space-y-4">
          <p className="label-caps">About</p>
          {passport.bio ? (
            <CollapsibleText
              className="max-w-xl text-[#7b705f]"
              collapsedClassName="line-clamp-4"
              description={passport.bio}
              threshold={220}
            />
          ) : (
            <p className="max-w-xl text-base leading-7 text-[#7b705f]">
              No biography has been added yet.
            </p>
          )}
          {cvLink ? (
            <a
              className="inline-flex text-sm text-[#16130f] underline underline-offset-4"
              href={cvLink.href}
              rel="noreferrer"
              target="_blank"
            >
              {cvLink.label}
            </a>
          ) : null}
        </section>

        <section className="space-y-6">
          {skillList.length > 0 ? (
            <div className="space-y-4">
              <p className="label-caps">Capabilities</p>
              <SkillTagsToggle limit={8} skills={skillList} />
            </div>
          ) : null}
          {portfolioLinks.length > 0 ? (
            <div className="space-y-4">
              <p className="label-caps">Links</p>
              <div className="flex flex-wrap gap-3">
                {portfolioLinks.map((link) => (
                  <a
                    className="inline-flex text-sm text-[#16130f] underline underline-offset-4"
                    href={link.href}
                    key={link.href}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          ) : null}
          {showContactEmail && passport.email ? (
            <div className="space-y-2">
              <p className="label-caps">Contact</p>
              <a className="text-sm text-[#16130f] underline underline-offset-4" href={`mailto:${passport.email}`}>
                {passport.email}
              </a>
            </div>
          ) : null}
        </section>
      </div>
    </article>
  );
}
