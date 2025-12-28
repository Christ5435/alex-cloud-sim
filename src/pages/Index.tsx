import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Cloud, HardDrive, Shield, Zap } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 cloud-gradient-subtle opacity-30" />
      
      <header className="relative z-10 border-b bg-card/80 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl cloud-gradient flex items-center justify-center">
              <Cloud className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">AlexCloudSim</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/auth">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Distributed Cloud Storage
            <br />
            <span className="text-primary">Simplified</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            AlexCloudSim simulates a professional distributed cloud storage system with 
            automatic replication, load balancing, and real-time monitoring.
          </p>
          <Link to="/auth">
            <Button size="lg" className="gap-2">
              <Cloud className="h-5 w-5" />
              Start Using AlexCloudSim
            </Button>
          </Link>
        </section>

        <section className="container mx-auto px-4 py-16">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: HardDrive, title: 'Distributed Storage', desc: 'Files replicated across multiple nodes for reliability.' },
              { icon: Shield, title: 'Secure & Private', desc: 'End-to-end encryption with role-based access control.' },
              { icon: Zap, title: 'Load Balanced', desc: 'Automatic load distribution across storage nodes.' },
            ].map((feature) => (
              <div key={feature.title} className="text-center p-6 rounded-xl bg-card border">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;