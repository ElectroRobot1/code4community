"use client";

import { Suspense } from "react";
import DashboardTopBar from "@/components/DashboardTopBar";
import MathLabSidebar from "@/components/MathLabSidebar";
import LoadingSpinner from "@/components/LoadingSpinner";
import SchedulerStudentView from "@/components/mathlab/SchedulerStudentView";
import { useAuth } from "@/utils/AuthContext";

function SchedulerPageContent() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return <SchedulerStudentView />;
}

export default function MathLabSchedulerPage() {
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
          <SchedulerPageContent />
        </Suspense>
      </div>
    </div>
  );
}
