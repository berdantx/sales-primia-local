 import { useForm } from 'react-hook-form';
 import { zodResolver } from '@hookform/resolvers/zod';
 import { z } from 'zod';
 import { motion } from 'framer-motion';
 import { Loader2, CheckCircle2, Rocket } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import {
   Form,
   FormControl,
   FormField,
   FormItem,
   FormLabel,
   FormMessage,
 } from '@/components/ui/form';
 import { useInterestForm } from '@/hooks/useInterestForm';
 
 const formSchema = z.object({
   name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100),
   email: z.string().email('E-mail inválido').max(255),
   whatsapp: z
     .string()
     .min(10, 'WhatsApp inválido')
     .max(15)
     .regex(/^[\d\s()+-]+$/, 'WhatsApp inválido'),
   instagram: z.string().min(1, 'Instagram é obrigatório').max(100),
 });
 
 type FormData = z.infer<typeof formSchema>;
 
 export function InterestForm() {
   const { submitForm, isSubmitting, isSubmitted } = useInterestForm();
 
   const form = useForm<FormData>({
     resolver: zodResolver(formSchema),
     defaultValues: {
       name: '',
       email: '',
       whatsapp: '',
       instagram: '',
     },
   });
 
   const formatWhatsApp = (value: string) => {
     const numbers = value.replace(/\D/g, '');
     if (numbers.length <= 2) return numbers;
     if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
     if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
     return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
   };
 
  const onSubmit = async (data: FormData) => {
    await submitForm({
      name: data.name,
      email: data.email,
      whatsapp: data.whatsapp,
      instagram: data.instagram,
    });
   };
 
   if (isSubmitted) {
     return (
       <motion.div
         initial={{ opacity: 0, scale: 0.9 }}
         animate={{ opacity: 1, scale: 1 }}
         className="bg-card border border-border rounded-2xl p-8 text-center max-w-md mx-auto"
       >
         <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
           <CheckCircle2 className="w-8 h-8 text-primary" />
         </div>
         <h3 className="text-2xl font-bold text-foreground mb-2">
           Cadastro realizado!
         </h3>
         <p className="text-muted-foreground">
           Obrigado pelo interesse! Em breve entraremos em contato para mostrar como o Launch Pocket pode transformar seus lançamentos.
         </p>
       </motion.div>
     );
   }
 
   return (
     <motion.div
       initial={{ opacity: 0, y: 20 }}
       whileInView={{ opacity: 1, y: 0 }}
       viewport={{ once: true }}
       transition={{ duration: 0.5 }}
       className="bg-card border border-border rounded-2xl p-6 md:p-8 max-w-md mx-auto"
     >
       <div className="flex items-center gap-3 mb-6">
         <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
           <Rocket className="w-5 h-5 text-primary" />
         </div>
         <div>
           <h3 className="text-xl font-bold text-foreground">Tenho Interesse</h3>
           <p className="text-sm text-muted-foreground">Preencha para conhecer o Launch Pocket</p>
         </div>
       </div>
 
       <Form {...form}>
         <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
           <FormField
             control={form.control}
             name="name"
             render={({ field }) => (
               <FormItem>
                 <FormLabel>Nome completo</FormLabel>
                 <FormControl>
                   <Input placeholder="Seu nome" {...field} />
                 </FormControl>
                 <FormMessage />
               </FormItem>
             )}
           />
 
           <FormField
             control={form.control}
             name="email"
             render={({ field }) => (
               <FormItem>
                 <FormLabel>E-mail</FormLabel>
                 <FormControl>
                   <Input type="email" placeholder="seu@email.com" {...field} />
                 </FormControl>
                 <FormMessage />
               </FormItem>
             )}
           />
 
           <FormField
             control={form.control}
             name="whatsapp"
             render={({ field }) => (
               <FormItem>
                 <FormLabel>WhatsApp</FormLabel>
                 <FormControl>
                   <Input
                     placeholder="(11) 99999-9999"
                     {...field}
                     onChange={(e) => field.onChange(formatWhatsApp(e.target.value))}
                   />
                 </FormControl>
                 <FormMessage />
               </FormItem>
             )}
           />
 
           <FormField
             control={form.control}
             name="instagram"
             render={({ field }) => (
               <FormItem>
                 <FormLabel>Instagram</FormLabel>
                 <FormControl>
                   <Input placeholder="@seuusuario" {...field} />
                 </FormControl>
                 <FormMessage />
               </FormItem>
             )}
           />
 
           <Button
             type="submit"
             className="w-full"
             size="lg"
             disabled={isSubmitting}
           >
             {isSubmitting ? (
               <>
                 <Loader2 className="w-4 h-4 animate-spin" />
                 Enviando...
               </>
             ) : (
               'Quero conhecer o Launch Pocket'
             )}
           </Button>
         </form>
       </Form>
     </motion.div>
   );
 }