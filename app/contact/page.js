"use client";
import { useEffect } from "react";
import DashboardTopBar from "../../components/DashboardTopBar";
import Footer from "../../components/Footer";

export default function Contact() {
  useEffect(() => {
    document.title = "Code4Community | Contact";
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
            Get in Touch
          </h1>
          <p className="text-base md:text-lg leading-relaxed max-w-3xl mx-auto text-white">
            We'd love to hear from you. Reach out to us for inquiries, partnerships, or any questions about our services.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 py-16 px-6">
        <div className="max-w-4xl mx-auto space-y-12">
          
          {/* Contact Information */}
          <section>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
              Contact Information
            </h2>
            <div className="bg-background border border-border rounded-lg p-8">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Email
                  </h3>
                  <a 
                    href="mailto:brhsc4c@gmail.com" 
                    className="text-primary hover:underline text-lg"
                  >
                    brhsc4c@gmail.com
                  </a>
                </div>
                
                <div className="pt-4 border-t border-border">
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    Business Hours
                  </h3>
                  <p className="text-muted-foreground">
                    We typically respond to inquiries within 1-2 business days. 
                    For urgent matters, please indicate so in your email subject line.
                  </p>
                </div>

                <div className="pt-4 border-t border-border">
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    What We Can Help With
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Custom software development projects</li>
                    <li>Partnership opportunities</li>
                    <li>Technical consultations</li>
                    <li>General inquiries about our services</li>
                    <li>Support and feedback</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Additional Information */}
          <section>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
              Why Choose Us
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-background border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  Experienced Team
                </h3>
                <p className="text-muted-foreground">
                  Our team brings years of combined experience in software development, 
                  ensuring high-quality solutions for your business needs.
                </p>
              </div>
              
              <div className="bg-background border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  Privacy-Focused
                </h3>
                <p className="text-muted-foreground">
                  We prioritize your data security and privacy in all our solutions, 
                  building trust through transparent practices.
                </p>
              </div>
              
              <div className="bg-background border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  Custom Solutions
                </h3>
                <p className="text-muted-foreground">
                  Every business is unique. We work closely with you to develop 
                  tailored software solutions that fit your specific requirements.
                </p>
              </div>
              
              <div className="bg-background border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  Reliable Support
                </h3>
                <p className="text-muted-foreground">
                  We're committed to providing ongoing support and maintenance 
                  to ensure your software continues to meet your needs.
                </p>
              </div>
            </div>
          </section>

        </div>
      </div>

      <Footer />
    </div>
  );
}
