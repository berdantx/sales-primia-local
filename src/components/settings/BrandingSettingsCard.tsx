import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Palette, Upload, X, Loader2 } from 'lucide-react';
import { useBrandingSettings, COLOR_PRESETS, applyThemeColors, resetThemeColors } from '@/hooks/useBrandingSettings';
import { ColorPicker } from './ColorPicker';
import { SidebarPreview } from './SidebarPreview';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';

export function BrandingSettingsCard() {
  const { settings, isLoading, updateSettings, isUpdating } = useBrandingSettings();
  
  // Local state for preview
  const [localAppName, setLocalAppName] = useState('');
  const [localAppSubtitle, setLocalAppSubtitle] = useState('');
  const [localLogoUrl, setLocalLogoUrl] = useState<string | null>(null);
  const [localPrimaryColor, setLocalPrimaryColor] = useState('');
  const [localPrimaryColorDark, setLocalPrimaryColorDark] = useState('');
  const [customHex, setCustomHex] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Sync local state with fetched settings
  useEffect(() => {
    if (!isLoading) {
      setLocalAppName(settings.appName);
      setLocalAppSubtitle(settings.appSubtitle);
      setLocalLogoUrl(settings.logoUrl);
      setLocalPrimaryColor(settings.primaryColor);
      setLocalPrimaryColorDark(settings.primaryColorDark);
      
      // Set custom hex if not a preset
      const matchingPreset = COLOR_PRESETS.find(p => p.hsl === settings.primaryColor);
      if (!matchingPreset) {
        // Try to find hex for current color (approximate)
        setCustomHex('');
      }
    }
  }, [settings, isLoading]);

  // Apply preview colors in real-time
  useEffect(() => {
    if (localPrimaryColor) {
      applyThemeColors(localPrimaryColor, localPrimaryColorDark);
    }
    
    return () => {
      // Reset to saved colors on unmount
      if (settings.primaryColor) {
        applyThemeColors(settings.primaryColor, settings.primaryColorDark);
      }
    };
  }, [localPrimaryColor, localPrimaryColorDark]);

  const handleColorChange = (hsl: string, hslDark: string) => {
    setLocalPrimaryColor(hsl);
    setLocalPrimaryColorDark(hslDark);
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, envie apenas imagens');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB');
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('branding')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('branding')
        .getPublicUrl(fileName);

      setLocalLogoUrl(publicUrl);
      toast.success('Logo enviado com sucesso!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar logo');
    } finally {
      setIsUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.svg', '.webp'] },
    maxFiles: 1,
    disabled: isUploading,
  });

  const handleRemoveLogo = () => {
    setLocalLogoUrl(null);
  };

  const handleSave = () => {
    updateSettings({
      appName: localAppName,
      appSubtitle: localAppSubtitle,
      logoUrl: localLogoUrl,
      primaryColor: localPrimaryColor,
      primaryColorDark: localPrimaryColorDark,
    });
  };

  const hasChanges = 
    localAppName !== settings.appName ||
    localAppSubtitle !== settings.appSubtitle ||
    localLogoUrl !== settings.logoUrl ||
    localPrimaryColor !== settings.primaryColor;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Branding & Tema
          </CardTitle>
          <CardDescription>
            Personalize o nome, logo e cores da aplicação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
            {/* Form Column */}
            <div className="space-y-6">
              {/* App Name */}
              <div className="space-y-2">
                <Label htmlFor="appName">Nome da Aplicação</Label>
                <Input
                  id="appName"
                  value={localAppName}
                  onChange={(e) => setLocalAppName(e.target.value)}
                  placeholder="Sales Analytics"
                />
              </div>

              {/* App Subtitle */}
              <div className="space-y-2">
                <Label htmlFor="appSubtitle">Subtítulo</Label>
                <Input
                  id="appSubtitle"
                  value={localAppSubtitle}
                  onChange={(e) => setLocalAppSubtitle(e.target.value)}
                  placeholder="Análise de Vendas"
                />
              </div>

              {/* Logo Upload */}
              <div className="space-y-2">
                <Label>Logo</Label>
                {localLogoUrl ? (
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 rounded-lg border overflow-hidden bg-muted">
                      <img 
                        src={localLogoUrl} 
                        alt="Logo" 
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="absolute -top-1 -right-1 p-1 bg-destructive text-destructive-foreground rounded-full shadow"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Clique no X para remover
                    </p>
                  </div>
                ) : (
                  <div
                    {...getRootProps()}
                    className={`
                      border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                      transition-colors
                      ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
                      ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <input {...getInputProps()} />
                    {isUploading ? (
                      <Loader2 className="w-8 h-8 mx-auto text-muted-foreground animate-spin" />
                    ) : (
                      <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    )}
                    <p className="text-sm text-muted-foreground">
                      {isDragActive ? 'Solte aqui...' : 'Arraste uma imagem ou clique para selecionar'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG, SVG ou WEBP (máx. 2MB)
                    </p>
                  </div>
                )}
              </div>

              {/* Color Picker */}
              <ColorPicker
                value={localPrimaryColor}
                onChange={handleColorChange}
                customHex={customHex}
                onCustomHexChange={setCustomHex}
              />

              {/* Save Button */}
              <div className="flex items-center gap-4 pt-4">
                <Button 
                  onClick={handleSave} 
                  disabled={isUpdating || !hasChanges}
                  className="min-w-[140px]"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Alterações'
                  )}
                </Button>
                {hasChanges && (
                  <span className="text-sm text-muted-foreground">
                    Você tem alterações não salvas
                  </span>
                )}
              </div>
            </div>

            {/* Preview Column */}
            <div className="lg:pl-6 lg:border-l">
              <div className="sticky top-4">
                <Label className="text-sm mb-3 block">Preview do Sidebar</Label>
                <SidebarPreview
                  appName={localAppName}
                  appSubtitle={localAppSubtitle}
                  logoUrl={localLogoUrl}
                  primaryColor={localPrimaryColor}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
