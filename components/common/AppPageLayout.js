"use client";

import DashboardTopBar from "@/components/DashboardTopBar";
import Footer from "@/components/Footer";

export function AppPageLayout({
  children,
  title = "Code4Community",
  showNavLinks = true,
  showFooter = true,
  className = "",
}) {
  const classes = ["min-h-screen", "bg-background", "flex", "flex-col", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <DashboardTopBar title={title} showNavLinks={showNavLinks} />
      {children}
      {showFooter ? <Footer /> : null}
    </div>
  );
}

export function CenteredMain({ children, className = "" }) {
  const classes = ["flex-1", "flex", "items-center", "justify-center", "px-6", className]
    .filter(Boolean)
    .join(" ");

  return <div className={classes}>{children}</div>;
}

export function ContainerMain({ children, className = "" }) {
  const classes = ["flex-1", "container", "mx-auto", "px-6", className]
    .filter(Boolean)
    .join(" ");

  return <div className={classes}>{children}</div>;
}
