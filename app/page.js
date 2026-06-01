import { AppPageLayout } from "@/components/common/AppPageLayout";
import HomeHero from "@/components/home/HomeHero";
import HomePageSections from "@/components/home/HomePageSections";

export const metadata = {
  title: "Code4Community | Home",
};

export const dynamic = "force-static";

export default function Home() {
  return (
    <AppPageLayout>
      <HomeHero />
      <HomePageSections />
    </AppPageLayout>
  );
}
