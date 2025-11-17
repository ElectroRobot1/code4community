"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "./AuthContext";
import { isAdminUser, isTutorOrHigher } from "@/utils/authorization";

export default function MathLabSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user, userData } = useAuth();

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-collapse on mobile
  useEffect(() => {
    if (isMobile) {
      setIsCollapsed(true);
    }
  }, [isMobile]);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Check if user is admin
  const isAdmin = userData && user && isAdminUser(userData.role, user.email);
  
  // Check if user is a tutor (including admins)
  const isTutor = userData && user && isTutorOrHigher(userData.role, userData.mathLabRole);

  const navigationItems = [
    {
      id: "mathlab",
      label: isTutor ? "Tutor Dashboard" : "Math Lab",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      href: "/mathlab",
      isActive: pathname === "/mathlab"
    },
    {
      id: "history",
      label: "Session History",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      href: "/mathlab/history",
      isActive: pathname === "/mathlab/history"
    }
  ];

  // Add admin navigation if user is admin
  if (isAdmin) {
    navigationItems.push({
      id: "admin",
      label: "Admin Dashboard",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      href: "/admin",
      isActive: pathname === "/admin"
    });
  }

  // On mobile, render a bottom navigation bar instead
  if (isMobile) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-40 md:hidden">
        <div className="flex">
          {navigationItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`flex-1 flex flex-col items-center py-3 px-2 transition-colors ${
                item.isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="w-5 h-5 mb-1">
                {item.icon}
              </div>
              <span className="text-xs font-medium truncate">
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Sidebar */}
      <div className={`fixed left-0 top-20 h-[calc(100vh-5rem)] bg-background border-r border-border z-30 transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}>
        {/* Toggle Button */}
        <div className="p-4 border-b border-border">
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-accent transition-colors"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg 
              className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${
                isCollapsed ? 'rotate-0' : 'rotate-180'
              }`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-2 space-y-1">
          {navigationItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center p-3 rounded-lg transition-all duration-200 group ${
                item.isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <div className="flex-shrink-0">
                {item.icon}
              </div>
              {!isCollapsed && (
                <span className="ml-3 text-sm font-medium truncate">
                  {item.label}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Bottom Section - Future expansion */}
        {!isCollapsed && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
            <div className="text-xs text-muted-foreground text-center">
              More features coming soon
            </div>
          </div>
        )}
      </div>

      {/* Backdrop for mobile when expanded */}
      {!isCollapsed && isMobile && (
        <div 
          className="fixed inset-0 bg-black/50 z-20"
          onClick={() => setIsCollapsed(true)}
        />
      )}
    </>
  );
}
