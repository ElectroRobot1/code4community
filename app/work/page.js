import Link from "next/link";
import { AppPageLayout } from "@/components/common/AppPageLayout";
import WorkProjectTile from "@/components/WorkProjectTile";
import WorkHashScroll from "@/components/work/WorkHashScroll";
import { WORK_PROJECTS } from "@/lib/workProjects";

export const metadata = {
  title: "Code4Community | Our Work",
};

export const dynamic = "force-static";

export default function WorkPage() {
  return (
    <AppPageLayout title="Code4Community | Our Work">
      <WorkHashScroll />
      <div className="flex-1 border-t border-border px-6 py-12 md:py-16">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-2">Our Work</h1>
          <p className="text-center text-muted-foreground text-sm md:text-base max-w-2xl mx-auto mb-10 md:mb-12">
            Student built tools for Broad Run and the community. This list grows as we ship new projects.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {WORK_PROJECTS.map((p) => (
              <WorkProjectTile
                key={p.id}
                id={p.id}
                title={p.title}
                description={p.description}
                available={p.available}
                linkHref={p.href ?? null}
                anchorId
              />
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-10 max-w-xl mx-auto">
            Want something built for your organization?{" "}
            <Link href="/contact" className="text-primary font-medium underline-offset-4 hover:underline">
              Get in touch
            </Link>
            .
          </p>
        </div>
      </div>
    </AppPageLayout>
  );
}
