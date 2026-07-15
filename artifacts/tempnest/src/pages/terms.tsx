import { PublicLayout } from "@/components/layout/public-layout";
import { BackButton } from "@/components/back-button";
import { ScrollReveal } from "@/components/scroll-reveal";

export default function Terms() {
  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <BackButton fallback="/" className="mb-6" />
        <ScrollReveal>
          <h1 className="text-4xl font-bold mb-6">Terms of Service</h1>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <p className="text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using TempNest, you agree to be bound by these Terms
              of Service. If you do not agree to these terms, do not use the service.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-3">2. Description of Service</h2>
            <p>
              TempNest provides temporary email addresses and related tools for
              receiving, viewing, and managing disposable email messages.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-3">3. User Responsibilities</h2>
            <p>
              You agree to use TempNest only for lawful purposes. You may not use
              the service to send spam, abuse, harass, or violate any applicable laws.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-3">4. Accounts and Payments</h2>
            <p>
              Some features require an account or paid subscription. You are
              responsible for maintaining the confidentiality of your account credentials.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-3">5. Termination</h2>
            <p>
              We may suspend or terminate your access to TempNest at any time,
              with or without notice, for any violation of these terms.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-3">6. Limitation of Liability</h2>
            <p>
              TempNest is provided “as is” without warranties of any kind. We are
              not liable for any damages arising from your use of the service.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-3">7. Changes to Terms</h2>
            <p>
              We may update these Terms of Service from time to time. Continued use
              of the service after changes constitutes acceptance of the revised terms.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </PublicLayout>
  );
}
