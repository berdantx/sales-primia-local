 import { motion } from 'framer-motion';
 import { Quote } from 'lucide-react';
 
 const testimonials = [
   {
     name: 'Carlos Silva',
     role: 'Infoprodutor',
     company: 'Mentoria Digital',
     quote: 'Finalmente consigo acompanhar minhas vendas de todas as plataformas em um só lugar. Economizo horas toda semana.',
     avatar: null,
   },
   {
     name: 'Ana Costa',
     role: 'Gestora de Tráfego',
     company: 'Agência Scale',
     quote: 'Os relatórios de leads são incríveis. Consigo mostrar para meus clientes exatamente de onde vem cada conversão.',
     avatar: null,
   },
   {
     name: 'Pedro Santos',
     role: 'Co-produtor',
     company: 'Expert em Finanças',
     quote: 'A visão de metas diárias mudou completamente como eu acompanho meus lançamentos. Recomendo demais!',
     avatar: null,
   },
 ];
 
 export function TestimonialsSection() {
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
             O que nossos <span className="text-primary">clientes dizem</span>
           </h2>
           <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
             Infoprodutores e gestores de tráfego que já usam o Launch Pocket.
           </p>
         </motion.div>
 
         <div className="grid md:grid-cols-3 gap-6">
           {testimonials.map((testimonial, index) => (
             <motion.div
               key={testimonial.name}
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ duration: 0.5, delay: index * 0.1 }}
               className="bg-card border border-border rounded-xl p-6"
             >
               <Quote className="w-8 h-8 text-primary/30 mb-4" />
               <p className="text-foreground mb-6 leading-relaxed">
                 "{testimonial.quote}"
               </p>
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                   <span className="text-sm font-medium text-primary">
                     {testimonial.name.split(' ').map(n => n[0]).join('')}
                   </span>
                 </div>
                 <div>
                   <div className="font-medium text-foreground">{testimonial.name}</div>
                   <div className="text-sm text-muted-foreground">
                     {testimonial.role} · {testimonial.company}
                   </div>
                 </div>
               </div>
             </motion.div>
           ))}
         </div>
       </div>
     </section>
   );
 }