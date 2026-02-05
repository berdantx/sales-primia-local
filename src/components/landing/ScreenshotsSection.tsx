 import { motion } from 'framer-motion';
 import { Monitor, BarChart3, PieChart } from 'lucide-react';
 
 const screens = [
   {
     icon: Monitor,
     title: 'Dashboard Principal',
     description: 'Visão geral de todas as vendas e métricas importantes',
     gradient: 'from-blue-500/20 to-purple-500/20',
   },
   {
     icon: BarChart3,
     title: 'Análise de Vendas',
     description: 'Gráficos detalhados por período, produto e origem',
     gradient: 'from-green-500/20 to-emerald-500/20',
   },
   {
     icon: PieChart,
     title: 'Funil de Leads',
     description: 'Acompanhamento completo da jornada do cliente',
     gradient: 'from-orange-500/20 to-red-500/20',
   },
 ];
 
 export function ScreenshotsSection() {
   return (
     <section className="py-20 md:py-32 bg-background">
       <div className="container px-4">
         <motion.div
           initial={{ opacity: 0, y: 20 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
           transition={{ duration: 0.5 }}
           className="text-center mb-16"
         >
           <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
             Uma interface <span className="text-primary">intuitiva e poderosa</span>
           </h2>
           <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
             Desenvolvida para entregar as informações que você precisa de forma rápida e visual.
           </p>
         </motion.div>
 
         <div className="grid md:grid-cols-3 gap-8">
           {screens.map((screen, index) => {
             const Icon = screen.icon;
             return (
               <motion.div
                 key={screen.title}
                 initial={{ opacity: 0, y: 20 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 transition={{ duration: 0.5, delay: index * 0.1 }}
                 className="group"
               >
                 {/* Placeholder for screenshot */}
                 <div className={`aspect-[4/3] bg-gradient-to-br ${screen.gradient} rounded-xl border border-border mb-4 flex items-center justify-center overflow-hidden group-hover:border-primary/30 transition-colors`}>
                   <div className="w-full h-full bg-card/80 backdrop-blur-sm m-4 rounded-lg flex items-center justify-center">
                     <Icon className="w-16 h-16 text-primary/40" />
                   </div>
                 </div>
                 <h3 className="text-lg font-semibold text-foreground mb-1">
                   {screen.title}
                 </h3>
                 <p className="text-sm text-muted-foreground">
                   {screen.description}
                 </p>
               </motion.div>
             );
           })}
         </div>
 
         <motion.p
           initial={{ opacity: 0 }}
           whileInView={{ opacity: 1 }}
           viewport={{ once: true }}
           transition={{ delay: 0.5 }}
           className="text-center text-sm text-muted-foreground mt-8"
         >
           * Screenshots ilustrativos. O design pode variar conforme personalizações.
         </motion.p>
       </div>
     </section>
   );
 }