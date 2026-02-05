 import { motion } from 'framer-motion';
 import {
   LayoutDashboard,
   Target,
   Users,
   Webhook,
   Smartphone,
   TrendingUp,
 } from 'lucide-react';
 
 const features = [
   {
     icon: LayoutDashboard,
     title: 'Dashboard Multi-Plataforma',
     description: 'Visualize vendas de Hotmart, TMB e Eduzz em um único lugar, com dados consolidados em tempo real.',
   },
   {
     icon: Target,
     title: 'Gestão de Metas',
     description: 'Defina metas de faturamento e acompanhe o progresso diário com projeções inteligentes.',
   },
   {
     icon: Users,
     title: 'Gestão de Leads',
     description: 'Acompanhe a origem dos seus leads, taxas de conversão por anúncio e performance de landing pages.',
   },
   {
     icon: Webhook,
     title: 'Webhooks e Automações',
     description: 'Receba dados em tempo real das plataformas via webhook, sem necessidade de importar planilhas.',
   },
   {
     icon: Smartphone,
     title: 'Acesso Mobile',
     description: 'Interface totalmente responsiva para acompanhar seu lançamento de qualquer dispositivo.',
   },
   {
     icon: TrendingUp,
     title: 'Relatórios Detalhados',
     description: 'Análises por produto, tipo de pagamento, código de afiliado e muito mais.',
   },
 ];
 
 const containerVariants = {
   hidden: { opacity: 0 },
   visible: {
     opacity: 1,
     transition: {
       staggerChildren: 0.1,
     },
   },
 };
 
 const itemVariants = {
   hidden: { opacity: 0, y: 20 },
   visible: { opacity: 1, y: 0 },
 };
 
 export function FeaturesSection() {
   return (
     <section className="py-20 md:py-32 bg-muted/30">
       <div className="container px-4">
         <motion.div
           initial={{ opacity: 0, y: 20 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
           transition={{ duration: 0.5 }}
           className="text-center mb-16"
         >
           <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
             Tudo que você precisa para{' '}
             <span className="text-primary">controlar seu lançamento</span>
           </h2>
           <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
             Funcionalidades pensadas para infoprodutores que querem ter visibilidade completa dos seus resultados.
           </p>
         </motion.div>
 
         <motion.div
           variants={containerVariants}
           initial="hidden"
           whileInView="visible"
           viewport={{ once: true }}
           className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
         >
           {features.map((feature) => {
             const Icon = feature.icon;
             return (
               <motion.div
                 key={feature.title}
                 variants={itemVariants}
                 className="bg-card border border-border rounded-xl p-6 hover:shadow-lg hover:border-primary/20 transition-all duration-300"
               >
                 <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                   <Icon className="w-6 h-6 text-primary" />
                 </div>
                 <h3 className="text-lg font-semibold text-foreground mb-2">
                   {feature.title}
                 </h3>
                 <p className="text-muted-foreground">
                   {feature.description}
                 </p>
               </motion.div>
             );
           })}
         </motion.div>
       </div>
     </section>
   );
 }