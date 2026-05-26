"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardTopBar from "@/components/DashboardTopBar";
import MathLabSidebar from "@/components/MathLabSidebar";
import MathLabLoginPrompt from "@/components/MathLabLoginPrompt";
import LoadingSpinner from "@/components/LoadingSpinner";
import SchedulerManageView from "@/components/mathlab/SchedulerManageView";
import { useAuth } from "@/utils/AuthContext";
import { isAdminUser, isTeacherOrAdmin, isTutorOrHigher } from "@/utils/authorization";

function canManageScheduler(userData, email) {
  if (!userData) return false;
  return (
    isTeacherOrAdmin(userData.role) ||
    isTutorOrHigher(userData.role, userData.mathLabRole) ||
    isAdminUser(userData.role, email)
  );
}

function ManagePageContent() {
  const router = useRouter();
  const { user, userData, loading } = useAuth();
  const allowed = user && userData && canManageScheduler(userData, user.email);

  useEffect(() => {
    if (!loading && user && userData && !allowed) {
      router.replace("/mathlab/scheduler");
    }
  }, [loading, user, userData, allowed, router]);

  if (!loading && !user) {
    return (
      <MathLabLoginPrompt
        redirectTo="/mathlab/scheduler/manage"
        title="Sign in to manage slots"
        description="Teachers and Math Lab tutors can create availability and set capacity limits."
      />
    );
  }

  if (loading || (user && !userData)) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!allowed) return null;

  return <SchedulerManageView />;
}

export default function MathLabSchedulerManagePage() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardTopBar title="BRHS Math Lab" showNavLinks={false} />
      <Suspense fallback={null}>
        <MathLabSidebar />
      </Suspense>
      <div className="ml-0 md:ml-16 px-4 py-8 pb-20 md:pb-8 bg-[#fafafa] min-h-screen">
        <Suspense
          fallback={
            <div className="min-h-[40vh] flex items-center justify-center">
              <LoadingSpinner />
            </div>
          }
        >
          <ManagePageContent />
        </Suspense>
      </div>
    </div>
  );
}
