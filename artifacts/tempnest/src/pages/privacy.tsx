import { PublicLayout } from "@/components/layout/public-layout";
import { BackButton } from "@/components/back-button";
import { ScrollReveal } from "@/components/scroll-reveal";

export default function Privacy() {
  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <BackButton fallback="/" className="mb-6" />
        <ScrollReveal>
          <h1 className="text-4xl font-bold mb-6">Privacy Policy</h1>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <p className="text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-3">1. Introduction</h2>
            <p>
              TempNest (“we”, “us”, or “our”) provides temporary email services.
              This Privacy Policy explains how we collect, use, disclose, and
              safeguard your information when you use our website and services.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-3">2. Information We Collect</h2>
            <p>
              When you create an account, we may collect your email address and
              display name. For all users, we process temporary email messages
              and metadata necessary to deliver the service.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-3">3. How We Use Your Information</h2>
            <p>
              We use the information we collect to operate, maintain, and improve
              TempNest, to provide customer support, and to communicate with you
              about your account.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-3">4. Data Retention</h2>
            <p>
              Temporary emails and related data are automatically deleted after
              their expiration period. Account information is retained until you
              delete your account or we terminate the service.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-3">5. Security</h2>
            <p>
              We implement reasonable security measures to protect your information.
              However, no method of transmission over the internet is 100% secure.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-3">6. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, please contact us
              through the support channels on our website.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </PublicLayout>
  );
}
