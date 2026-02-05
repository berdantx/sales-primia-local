 import { motion } from 'framer-motion';
 import { ArrowDown, Rocket } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 
 interface HeroSectionProps {
   onCtaClick: () => void;
 }
 
 export function HeroSection({ onCtaClick }: HeroSectionProps) {
   return (
     <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-background via-background to-muted/30">
       {/* Background decorative elements */}
       <div className="absolute inset-0 overflow-hidden">
         <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-primary/5 rounded-full blur-3xl" />
         <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-primary/3 rounded-full blur-3xl" />
       </div>
 
       <div className="container relative z-10 px-4 py-20 md:py-32">
         <div className="max-w-4xl mx-auto text-center">
           {/* Badge */}
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.5 }}
             className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-8"
           >
             <Rocket className="w-4 h-4 text-primary" />
             <span className="text-sm font-medium text-primary">Dashboard para lançamentos digitais</span>
           </motion.div>
 
           {/* Main Heading */}
           <motion.h1
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.5, delay: 0.1 }}
             className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6"
           >
             Tenha o controle do seu{' '}
             <span className="text-primary">lançamento</span>
             <br />
             no bolso
           </motion.h1>
 
           {/* Subtitle */}
           <motion.p
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.5, delay: 0.2 }}
             className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
           >
             Dashboard unificado para monitorar vendas de Hotmart, TMB e Eduzz em tempo real.
             Acompanhe metas, leads e resultados de qualquer lugar.
           </motion.p>
 
           {/* CTA Button */}
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.5, delay: 0.3 }}
             className="flex flex-col sm:flex-row gap-4 justify-center"
           >
             <Button size="lg" onClick={onCtaClick} className="text-lg px-8 py-6">
               Tenho Interesse
               <ArrowDown className="w-5 h-5 ml-2" />
             </Button>
             <Button size="lg" variant="outline" asChild className="text-lg px-8 py-6">
               <a href="/auth">Já sou cliente</a>
             </Button>
           </motion.div>
 
           {/* Stats */}
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.5, delay: 0.4 }}
             className="grid grid-cols-3 gap-8 max-w-lg mx-auto mt-16"
           >
             <div className="text-center">
               <div className="text-3xl md:text-4xl font-bold text-foreground">3</div>
               <div className="text-sm text-muted-foreground">Plataformas</div>
             </div>
             <div className="text-center">
               <div className="text-3xl md:text-4xl font-bold text-foreground">100%</div>
               <div className="text-sm text-muted-foreground">Mobile</div>
             </div>
             <div className="text-center">
               <div className="text-3xl md:text-4xl font-bold text-foreground">24/7</div>
               <div className="text-sm text-muted-foreground">Acesso</div>
             </div>
           </motion.div>
         </div>
       </div>
 
       {/* Scroll indicator */}
       <motion.div
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         transition={{ delay: 1, duration: 0.5 }}
         className="absolute bottom-8 left-1/2 -translate-x-1/2"
       >
         <motion.div
           animate={{ y: [0, 10, 0] }}
           transition={{ duration: 1.5, repeat: Infinity }}
           className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full flex items-start justify-center p-2"
         >
           <div className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full" />
         </motion.div>
       </motion.div>
     </section>
   );
 }