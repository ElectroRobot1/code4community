"use client";
import DashboardTopBar from "../../components/DashboardTopBar";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardTopBar 
        title="Privacy Policy" 
        showNavLinks={false}
      />
      
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="prose prose-gray max-w-none">
          <h1 className="text-4xl font-bold text-foreground mb-8">Privacy Policy</h1>
          
          <div className="text-sm text-muted-foreground mb-8">
            Last updated: {new Date().toLocaleDateString()}
          </div>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                BRHS Utilities (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our web platform operated by the Code4Community Club of Broad Run High School.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-foreground mb-3">2.1 Account Information</h3>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>When you sign in with Google, we collect:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Email address:</strong> From your Google account, used for authentication and communication</li>
                  <li><strong>Display name:</strong> Your Google account name for the platform</li>
                  <li><strong>Role:</strong> Student, teacher, or admin designation (assigned based on your school email)</li>
                  <li><strong>Math Lab role:</strong> Student or tutor designation for the tutoring system</li>
                  <li><strong>Profile photo URL:</strong> Your Google profile picture (if available)</li>
                  <li><strong>Account creation and update timestamps:</strong> For account management</li>
                </ul>
              </div>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">2.2 Authentication Data</h3>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>We use Firebase Authentication with Google Sign-In which collects:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Google account information (name, email, profile picture)</li>
                  <li>Email verification status from Google</li>
                  <li>Authentication tokens and session data</li>
                  <li>Device and browser information for security</li>
                  <li>Google account permissions and access tokens</li>
                </ul>
              </div>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">2.3 Math Lab Tutoring Data</h3>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>When using the Math Lab tutoring system, we collect:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Tutoring requests:</strong> Course selection, description, and timestamps</li>
                  <li><strong>Session data:</strong> Tutor-student matches, session duration, start/end times</li>
                  <li><strong>Completed sessions:</strong> Historical data of completed tutoring sessions</li>
                  <li><strong>User interactions:</strong> Actions taken within the tutoring system</li>
                </ul>
              </div>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">2.4 Technical Data</h3>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>We automatically collect certain technical information:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>IP address and location data</li>
                  <li>Browser type and version</li>
                  <li>Device information</li>
                  <li>Usage patterns and performance metrics</li>
                  <li>Error logs and debugging information</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">3. How We Use Your Information</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>We use the collected information to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide and maintain the Service</li>
                  <li>Authenticate users and manage accounts</li>
                  <li>Match students with tutors in the Math Lab system</li>
                  <li>Track tutoring session history and performance</li>
                  <li>Send important notifications about the Service</li>
                  <li>Improve the Service and develop new features</li>
                  <li>Ensure security and prevent abuse</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">4. Data Storage and Security</h2>
              
              <h3 className="text-xl font-semibold text-foreground mb-3">4.1 Data Storage</h3>
              <p className="text-muted-foreground leading-relaxed">
                Your data is stored securely using Firebase Firestore, a cloud database service provided by Google. Data is encrypted in transit and at rest using industry-standard security measures.
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">4.2 Security Measures</h3>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <ul className="list-disc pl-6 space-y-2">
                  <li>Firebase security rules control access to your data</li>
                  <li>Email verification required for account activation</li>
                  <li>Role-based access controls limit data visibility</li>
                  <li>Regular security updates and monitoring</li>
                  <li>Secure authentication protocols</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">5. Third-Party Services</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>We use the following third-party services:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Firebase (Google):</strong> Authentication, database, and hosting services</li>
                  <li><strong>Google Sign-In:</strong> Primary authentication method for all users</li>
                  <li><strong>ReCaptcha:</strong> For bot protection and security</li>
                  <li><strong>Next.js/Vercel:</strong> Web application framework and hosting</li>
                </ul>
                <p>
                  These services have their own privacy policies. We encourage you to review them. We do not control these third-party services and are not responsible for their privacy practices.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">6. Data Sharing and Disclosure</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>We do not sell, trade, or otherwise transfer your personal information to third parties except:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>With your explicit consent</li>
                  <li>To comply with legal obligations</li>
                  <li>To protect our rights and safety</li>
                  <li>With trusted service providers who assist in operating our Service</li>
                  <li>In connection with a business transfer or acquisition</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">7. Your Rights and Choices</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>You have the following rights regarding your personal information:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Access:</strong> Request access to your personal data</li>
                  <li><strong>Correction:</strong> Update or correct your account information</li>
                  <li><strong>Deletion:</strong> Request deletion of your account and data (contact admin)</li>
                  <li><strong>Portability:</strong> Request a copy of your data</li>
                  <li><strong>Withdrawal:</strong> Withdraw consent for data processing</li>
                </ul>
                <p>
                  To exercise these rights, please contact us at brhsc4c@gmail.com. We will respond to your request within a reasonable timeframe.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">8. Data Retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                We retain your personal information for as long as necessary to provide the Service and fulfill the purposes outlined in this Privacy Policy. Account data is retained until you request deletion or the account is terminated. Tutoring session history may be retained for educational and administrative purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">9. Children&apos;s Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our Service is designed for educational use by students, teachers, and staff of Broad Run High School. We do not knowingly collect personal information from children under 13 without parental consent. If you believe we have collected information from a child under 13, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">10. Changes to This Privacy Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date. You are advised to review this Privacy Policy periodically for any changes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">11. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about this Privacy Policy or our privacy practices, please contact us at:
              </p>
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <p className="text-muted-foreground">
                  <strong>Email:</strong> brhsc4c@gmail.com<br />
                  <strong>Organization:</strong> Code4Community Club, Broad Run High School<br />
                  <strong>Address:</strong> Broad Run High School, Ashburn, VA
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
