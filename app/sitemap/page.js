import Link from 'next/link';
import DashboardTopBar from '../../components/DashboardTopBar';

export default function SitemapPage() {
  const publicPages = [
    { path: '/', title: 'Home', description: 'Main landing page' },
    { path: '/welcome', title: 'Welcome', description: 'Welcome page for new users' },
    { path: '/login', title: 'Login', description: 'User login page' },
    { path: '/signup', title: 'Sign Up', description: 'User registration page' },
    { path: '/reset-password', title: 'Reset Password', description: 'Password reset page' },
  ];

  const protectedPages = [
    { path: '/mathlab', title: 'Math Lab', description: 'Tutoring request system' },
    { path: '/mathlab/history', title: 'Session History', description: 'View completed tutoring sessions' },
    { path: '/settings', title: 'Settings', description: 'User account settings' },
    { path: '/admin', title: 'Admin Panel', description: 'Administrative dashboard' },
  ];

  const utilityPages = [
    { path: '/verify-email', title: 'Email Verification', description: 'Verify email address' },
    { path: '/check-email', title: 'Check Email', description: 'Email verification status' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardTopBar />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Site Map</h1>
          <p className="text-gray-600 mb-8">
            Navigate through all available pages on BRHS Utilities
          </p>

          {/* Public Pages */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Public Pages</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {publicPages.map((page) => (
                <Link
                  key={page.path}
                  href={page.path}
                  className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <h3 className="font-medium text-gray-900">{page.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{page.description}</p>
                  <span className="text-xs text-blue-600 mt-2 inline-block">{page.path}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* Protected Pages */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Protected Pages</h2>
            <p className="text-sm text-gray-600 mb-4">
              These pages require user authentication
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {protectedPages.map((page) => (
                <Link
                  key={page.path}
                  href={page.path}
                  className="block p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
                >
                  <h3 className="font-medium text-gray-900">{page.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{page.description}</p>
                  <span className="text-xs text-green-600 mt-2 inline-block">{page.path}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* Utility Pages */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Utility Pages</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {utilityPages.map((page) => (
                <Link
                  key={page.path}
                  href={page.path}
                  className="block p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
                >
                  <h3 className="font-medium text-gray-900">{page.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{page.description}</p>
                  <span className="text-xs text-purple-600 mt-2 inline-block">{page.path}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* SEO Information */}
          <section className="mt-12 p-6 bg-gray-50 rounded-lg">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">SEO Information</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">XML Sitemap</h3>
                <p className="text-sm text-gray-600 mb-2">
                  For search engines and crawlers
                </p>
                <Link 
                  href="/sitemap.xml" 
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  /sitemap.xml
                </Link>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Robots.txt</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Instructions for web crawlers
                </p>
                <Link 
                  href="/robots.txt" 
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  /robots.txt
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
