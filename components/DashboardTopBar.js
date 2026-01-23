"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";

export default function DashboardTopBar({ title = "Code4Community", onNavigation, showNavLinks = true }) {
  const router = useRouter();
  const pathname = usePathname();

  const navLinks = [
    { label: "HOME", path: "/" },
    { label: "ABOUT US", path: "/about" },
    { label: "SERVICES", path: "/services" },
    { label: "CONTACT", path: "/contact" },
  ];

  return (
    <>
      <header className={`bg-background border-b border-border px-6 py-4 relative z-40 ${pathname === '/' ? 'mb-0' : 'mb-6'}`}>
        <div className="container mx-auto">
          <div className="flex items-center justify-between">
            {/* Logo and Title on Left */}
            <div className="flex items-center space-x-3">
              <Image
                src="/spartan.png"
                alt="Code4Community Logo"
                width={40}
                height={40}
                className="w-10 h-10"
              />
              <div className="flex flex-col">
                <button
                  onClick={() => router.push("/")}
                  className="text-xl font-semibold text-foreground hover:text-primary transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded text-left"
                  title="Go to Home"
                >
                  {title}
                </button>
                <p className="text-xs text-muted-foreground">
                  YOUR PARTNER IN SOFTWARE SOLUTIONS
                </p>
              </div>
            </div>
            
            {/* Navigation Links on Right */}
            {showNavLinks && (
              <nav className="flex items-center space-x-6">
                {navLinks.map((link) => {
                  const isActive = pathname === link.path;
                  return (
                    <button
                      key={link.path}
                      onClick={() => router.push(link.path)}
                      className={`text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded ${
                        isActive
                          ? "text-primary"
                          : "text-foreground hover:text-primary"
                      }`}
                    >
                      {link.label}
                    </button>
                  );
                })}
                {/* Lock Icon for Contact */}
                <svg 
                  className="w-4 h-4 text-muted-foreground" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </nav>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
