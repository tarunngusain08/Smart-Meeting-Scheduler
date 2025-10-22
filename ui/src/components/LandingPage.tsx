import { Button } from "./ui/button"
import { ArrowRight, Globe, Users, Zap } from "lucide-react"
import { cn } from "./ui/utils"

interface LandingPageProps {
  onSignIn: () => void;
}

export function LandingPage({ onSignIn }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 px-4 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img src="/images/gruve-logo.png" alt="Gruve Logo" className="h-8 w-auto" />
          </div>
          <Button 
            variant="outline" 
            className="rounded-full bg-slate-900 text-white hover:bg-slate-800 border-0 px-6"
            onClick={onSignIn}
          >
            Sign in with Microsoft Teams
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900">
              Smart scheduling made easy with AI
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Say goodbye to endless back-and-forth emails. Let AI find the perfect meeting times for everyone, across any timezone.
            </p>
          </div>

          <div className="space-y-4">
            <Button 
              className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg font-medium h-auto"
              onClick={onSignIn}
            >
              Sign in with Microsoft Teams
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <p className="text-sm text-slate-500">
              Secure enterprise SSO authentication
            </p>
          </div>
        </div>

        {/* Preview Image */}
        <div className="mt-16 max-w-5xl mx-auto px-4">
          <div className="aspect-[16/9] rounded-lg bg-slate-100 flex items-center justify-center">
            <div className="text-center">
              <Zap className="w-12 h-12 text-blue-600/40 mx-auto mb-3" />
              <p className="text-slate-400">Scheduling Interface Preview</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-card/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">Powerful Features</h2>
            <p className="text-lg text-muted-foreground">Everything you need for seamless scheduling</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-xl border border-border bg-background hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Cross-Timezone Intelligence</h3>
              <p className="text-muted-foreground">
                Automatically finds optimal meeting times across multiple time zones with AI precision.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-xl border border-border bg-background hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Lightning Fast</h3>
              <p className="text-muted-foreground">
                Schedule meetings in seconds instead of days. No more endless email chains.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-xl border border-border bg-background hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Team Collaboration</h3>
              <p className="text-muted-foreground">
                Coordinate seamlessly with multiple participants and team members.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">Trusted by teams worldwide</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8 rounded-xl border border-border bg-card/50">
              <div className="text-4xl font-bold text-primary mb-2">10×</div>
              <p className="text-muted-foreground">Faster Scheduling</p>
            </div>
            <div className="text-center p-8 rounded-xl border border-border bg-card/50">
              <div className="text-4xl font-bold text-primary mb-2">95%</div>
              <p className="text-muted-foreground">Time Saved</p>
            </div>
            <div className="text-center p-8 rounded-xl border border-border bg-card/50">
              <div className="text-4xl font-bold text-primary mb-2">24/7</div>
              <p className="text-muted-foreground">AI Scheduling</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">Ready to transform your scheduling?</h2>
          <p className="text-lg mb-8 opacity-90">
            Join teams worldwide using Gruve to save time and reduce scheduling friction.
          </p>
          <Button size="lg" variant="secondary" className="rounded-full px-8">
            Get Started Now
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center text-muted-foreground text-sm">
          <p>© 2025 Gruve Scheduler. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

