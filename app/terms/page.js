"use client";
import DashboardTopBar from "../../components/DashboardTopBar";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardTopBar 
        title="Terms of Service" 
        showNavLinks={false}
      />
      
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="prose prose-gray max-w-none">
          <h1 className="text-4xl font-bold text-foreground mb-8">Terms of Service</h1>
          
          <div className="text-sm text-muted-foreground mb-8">
            Last updated: {new Date().toLocaleDateString()}
          </div>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing and using BRHS Utilities ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">2. Description of Service</h2>
              <p className="text-muted-foreground leading-relaxed">
                BRHS Utilities is a web platform operated by the Code4Community Club of Broad Run High School. The Service provides educational applications including the Math Lab tutoring system, which facilitates connections between students seeking tutoring assistance and qualified tutors.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">3. User Accounts</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>
                  To access certain features of the Service, you must create an account. You agree to:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide accurate, current, and complete information during registration</li>
                  <li>Maintain and update your account information to keep it accurate and current</li>
                  <li>Maintain the security of your password and account</li>
                  <li>Accept responsibility for all activities under your account</li>
                  <li>Notify us immediately of any unauthorized use of your account</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">4. Authentication Requirements</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>
                  The Service requires email verification for account activation. You must:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Use a valid email address</li>
                  <li>Complete email verification before accessing certain features</li>
                  <li>Use Google Authentication or email/password authentication as provided</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">5. Acceptable Use</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>You agree not to use the Service to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Violate any applicable laws or regulations</li>
                  <li>Transmit any harmful, threatening, abusive, or harassing content</li>
                  <li>Impersonate any person or entity or misrepresent your affiliation</li>
                  <li>Interfere with or disrupt the Service or servers</li>
                  <li>Attempt to gain unauthorized access to any part of the Service</li>
                  <li>Use the Service for any commercial purpose without permission</li>
                  <li>Submit false or misleading tutoring requests</li>
                  <li>Engage in any behavior that disrupts the educational environment</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">6. Math Lab Tutoring System</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>
                  The Math Lab feature connects students with tutors for educational assistance. Users agree to:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Use the tutoring system only for legitimate educational purposes</li>
                  <li>Provide accurate course information when requesting tutoring</li>
                  <li>Respect tutors and students during tutoring sessions</li>
                  <li>Not abuse the matching system or create false requests</li>
                  <li>Follow all school policies and codes of conduct during tutoring sessions</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">7. Intellectual Property</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service and its original content, features, and functionality are owned by BRHS Utilities and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">8. Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service, to understand our practices.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">9. Disclaimer of Warranties</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service is provided on an "AS IS" and "AS AVAILABLE" basis. BRHS Utilities expressly disclaims all warranties of any kind, whether express or implied, including but not limited to the implied warranties of merchantability, fitness for a particular purpose, and non-infringement.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">10. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                In no event shall BRHS Utilities, its officers, directors, employees, or agents be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your use of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">11. Termination</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever, including without limitation if you breach the Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">12. Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">13. Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms shall be interpreted and governed by the laws of the Commonwealth of Virginia, without regard to its conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">14. Contact Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about these Terms of Service, please contact us at brhsc4c@gmail.com.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
