 import { useRef } from 'react';
 import { Link } from 'react-router-dom';
 import { Rocket } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { HeroSection } from '@/components/landing/HeroSection';
 import { FeaturesSection } from '@/components/landing/FeaturesSection';
 import { ScreenshotsSection } from '@/components/landing/ScreenshotsSection';
 import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
 import { InterestForm } from '@/components/landing/InterestForm';
 
 export default function LandingPage() {
   const formRef = useRef<HTMLDivElement>(null);
 
   const scrollToForm = () => {
     formRef.current?.scrollIntoView({ behavior: 'smooth' });
   };
 
   return (
     <div className="min-h-screen bg-background">
       {/* Header */}
       <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
         <div className="container flex items-center justify-between h-16 px-4">
           <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
               <Rocket className="w-4 h-4 text-primary-foreground" />
             </div>
             <span className="font-bold text-lg text-foreground">Launch Pocket</span>
           </div>
           <div className="flex items-center gap-4">
             <Button variant="ghost" asChild className="hidden sm:flex">
               <Link to="/auth">Entrar</Link>
             </Button>
             <Button onClick={scrollToForm}>
               Tenho Interesse
             </Button>
           </div>
         </div>
       </header>
 
       {/* Main Content */}
       <main>
         <HeroSection onCtaClick={scrollToForm} />
         <FeaturesSection />
         <ScreenshotsSection />
         <TestimonialsSection />
 
         {/* Interest Form Section */}
         <section ref={formRef} id="interesse" className="py-20 md:py-32 bg-background">
           <div className="container px-4">
             <div className="text-center mb-12">
               <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                 Quer conhecer o <span className="text-primary">Launch Pocket</span>?
               </h2>
               <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                 Preencha o formulário abaixo e entraremos em contato para apresentar a plataforma.
               </p>
             </div>
             <InterestForm />
           </div>
         </section>
       </main>
 
       {/* Footer */}
       <footer className="py-8 border-t border-border bg-muted/30">
         <div className="container px-4">
           <div className="flex flex-col md:flex-row items-center justify-between gap-4">
             <div className="flex items-center gap-2">
               <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                 <Rocket className="w-3 h-3 text-primary-foreground" />
               </div>
               <span className="text-sm text-muted-foreground">
                 © 2025 Launch Pocket. Todos os direitos reservados.
               </span>
             </div>
             <div className="flex items-center gap-6 text-sm text-muted-foreground">
               <Link to="/auth" className="hover:text-foreground transition-colors">
                 Área do Cliente
               </Link>
             </div>
           </div>
         </div>
       </footer>
     </div>
   );
 }