 import { useState } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { useToast } from '@/hooks/use-toast';
 
 interface InterestFormData {
   name: string;
   email: string;
   whatsapp: string;
   instagram: string;
 }
 
 export function useInterestForm() {
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [isSubmitted, setIsSubmitted] = useState(false);
   const { toast } = useToast();
 
   const getUtmParams = () => {
     const params = new URLSearchParams(window.location.search);
     return {
       utm_source: params.get('utm_source') || null,
       utm_medium: params.get('utm_medium') || null,
       utm_campaign: params.get('utm_campaign') || null,
     };
   };
 
   const submitForm = async (data: InterestFormData) => {
     setIsSubmitting(true);
     
     try {
       const utmParams = getUtmParams();
       
       const { error } = await supabase
         .from('interest_leads')
         .insert({
           name: data.name.trim(),
           email: data.email.trim().toLowerCase(),
           whatsapp: data.whatsapp.replace(/\D/g, ''),
           instagram: data.instagram.replace('@', '').trim(),
           ...utmParams,
         });
 
       if (error) {
         if (error.code === '23505') {
           toast({
             title: 'E-mail já cadastrado',
             description: 'Este e-mail já está em nossa lista de interessados.',
             variant: 'destructive',
           });
         } else {
           throw error;
         }
         return false;
       }
 
       setIsSubmitted(true);
       toast({
         title: 'Cadastro realizado!',
         description: 'Entraremos em contato em breve.',
       });
       return true;
     } catch (error) {
       console.error('Error submitting form:', error);
       toast({
         title: 'Erro ao cadastrar',
         description: 'Tente novamente mais tarde.',
         variant: 'destructive',
       });
       return false;
     } finally {
       setIsSubmitting(false);
     }
   };
 
   return {
     submitForm,
     isSubmitting,
     isSubmitted,
     resetForm: () => setIsSubmitted(false),
   };
 }