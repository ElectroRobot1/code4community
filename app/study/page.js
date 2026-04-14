"use client";

import { useLayoutEffect, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/utils/AuthContext";
import StudyQuiz from "@/components/study/StudyQuiz";
import { AppPageLayout, ContainerMain } from "@/components/common/AppPageLayout";
import FullPageLoading from "@/components/common/FullPageLoading";

export default function StudyPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useLayoutEffect(() => {
    document.title = "Code4Community | Studying";
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!user.emailVerified) {
      router.replace("/verify-email");
    }
  }, [user, authLoading, router]);

  if (authLoading || !user || !user.emailVerified) {
    return <FullPageLoading />;
  }

  return (
    <AppPageLayout>
      <ContainerMain className="py-4 md:py-6">
        <div className="max-w-6xl mx-auto w-full min-w-0 space-y-6">
          <StudyQuiz user={user} />
        </div>
      </ContainerMain>
    </AppPageLayout>
  );
}
