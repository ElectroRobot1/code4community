"use client";
import { useEffect } from "react";
import Image from "next/image";
import DashboardTopBar from "../../components/DashboardTopBar";
import Footer from "../../components/Footer";

export default function AboutUs() {
  useEffect(() => {
    document.title = "Code4Community | About Us";
  }, []);
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardTopBar 
        title="Code4Community" 
        showNavLinks={true}
      />

      {/* Hero Section */}
      <div className="bg-[#0066CC] text-white py-16 md:py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            About Us
          </h1>
          <p className="text-base md:text-lg leading-relaxed max-w-3xl mx-auto text-white">
            Learn more about Code4Community and our commitment to providing 
            businesses with powerful, privacy-focused software solutions.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 py-16 px-6">
        <div className="max-w-4xl mx-auto space-y-12">
          
          {/* Meet the Team Section */}
          <section>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
              Meet the Team
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {/* Team Member 1 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-32 h-32 rounded-full bg-muted mb-4 flex items-center justify-center overflow-hidden">
                  <Image
                    src="/shail.jpg"
                    alt="Shail Shah"
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-1">
                  Shail Shah
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  President & Head Developer
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                Possess over 5 years of experience in the software industry. Experienced programmer, software architect with leadership skills and entrepreneurial drive started Code4Community in 2023.
                </p>
              </div>

              {/* Team Member 2 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-32 h-32 rounded-full bg-muted mb-4 flex items-center justify-center overflow-hidden">
                  <Image
                    src="/pranav.jpg"
                    alt="Pranav Natarajan"
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-1">
                  Pranav Natarajan
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Co-President & Head of Outreach
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                Possess over 3 years of experience in the product engineering industry. He collaborates with clients, plans and executes technical efforts aimed at software development, mediating between various departments, involving them in work, and coordinating activities.
                </p>
              </div>

              {/* Team Member 3 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-32 h-32 rounded-full bg-muted mb-4 flex items-center justify-center overflow-hidden">
                  <Image
                    src="/aryan.jpg"
                    alt="Aryan Kothari"
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-1">
                  Aryan Kothari
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Vice President & Developer
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                Possess over 2 years of experience in the software industry. As a vice president and developer, he works on the development of software solutions contracted by a company. 
                </p>
              </div>
            </div>
          </section>

          {/* Contact Section */}
          <section>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Get in Touch
            </h2>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              Have questions, suggestions, or feedback? We'd love to hear from you. 
              Visit our <a href="/contact" className="text-primary hover:underline">Contact</a> page 
              to reach out.
            </p>
          </section>

        </div>
      </div>

      <Footer />
    </div>
  );
}
