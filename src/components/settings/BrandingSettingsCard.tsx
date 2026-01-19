import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Palette, Upload, X, Loader2, Sun, Moon, Info, RefreshCw, Trash2 } from 'lucide-react';
import { useBrandingSettings, COLOR_PRESETS, applyThemeColors, clearBrandingCache } from '@/hooks/useBrandingSettings';
import { ColorPicker } from './ColorPicker';
import { SidebarPreview } from './SidebarPreview';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';

export function BrandingSettingsCard() {
  const queryClient = useQueryClient();
  const { settings, isLoading, updateSettings, isUpdating, isFetching } = useBrandingSettings();
  
  // Local state for preview
  const [localAppName, setLocalAppName] = useState('');
  const [localAppSubtitle, setLocalAppSubtitle] = useState('');
  const [localLogoUrl, setLocalLogoUrl] = useState<string | null>(null);
  const [localLogoUrlDark, setLocalLogoUrlDark] = useState<string | null>(null);
  const [localPrimaryColor, setLocalPrimaryColor] = useState('');
  const [localPrimaryColorDark, setLocalPrimaryColorDark] = useState('');
  const [customHex, setCustomHex] = useState('');
  const [isUploadingLight, setIsUploadingLight] = useState(false);
  const [isUploadingDark, setIsUploadingDark] = useState(false);
  const [previewTheme, setPreviewTheme] = useState<'light' | 'dark'>('light');

  // Sync local state with fetched settings
  useEffect(() => {
    if (!isLoading) {
      setLocalAppName(settings.appName);
      setLocalAppSubtitle(settings.appSubtitle);
      setLocalLogoUrl(settings.logoUrl);
      setLocalLogoUrlDark(settings.logoUrlDark);
      setLocalPrimaryColor(settings.primaryColor);
      setLocalPrimaryColorDark(settings.primaryColorDark);
      
      // Set custom hex if not a preset
      const matchingPreset = COLOR_PRESETS.find(p => p.hsl === settings.primaryColor);
      if (!matchingPreset) {
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

  const uploadLogo = useCallback(async (file: File, type: 'light' | 'dark') => {
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

    const setUploading = type === 'light' ? setIsUploadingLight : setIsUploadingDark;
    const setLogoUrl = type === 'light' ? setLocalLogoUrl : setLocalLogoUrlDark;

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${type}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('branding')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('branding')
        .getPublicUrl(fileName);

      setLogoUrl(publicUrl);
      toast.success(`Logo ${type === 'light' ? 'clara' : 'escura'} enviada com sucesso!`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar logo');
    } finally {
      setUploading(false);
    }
  }, []);

  const onDropLight = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) uploadLogo(file, 'light');
  }, [uploadLogo]);

  const onDropDark = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) uploadLogo(file, 'dark');
  }, [uploadLogo]);

  const dropzoneLight = useDropzone({
    onDrop: onDropLight,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.svg', '.webp'] },
    maxFiles: 1,
    disabled: isUploadingLight,
  });

  const dropzoneDark = useDropzone({
    onDrop: onDropDark,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.svg', '.webp'] },
    maxFiles: 1,
    disabled: isUploadingDark,
  });

  const handleRemoveLogoLight = () => {
    setLocalLogoUrl(null);
  };

  const handleRemoveLogoDark = () => {
    setLocalLogoUrlDark(null);
  };

  const handleSave = () => {
    updateSettings({
      appName: localAppName,
      appSubtitle: localAppSubtitle,
      logoUrl: localLogoUrl,
      logoUrlDark: localLogoUrlDark,
      primaryColor: localPrimaryColor,
      primaryColorDark: localPrimaryColorDark,
    });
  };

  const hasChanges = 
    localAppName !== settings.appName ||
    localAppSubtitle !== settings.appSubtitle ||
    localLogoUrl !== settings.logoUrl ||
    localLogoUrlDark !== settings.logoUrlDark ||
    localPrimaryColor !== settings.primaryColor;

  // Get current preview logo based on theme
  const currentPreviewLogo = previewTheme === 'dark' 
    ? (localLogoUrlDark || localLogoUrl)
    : localLogoUrl;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const renderLogoUpload = (
    type: 'light' | 'dark',
    logoUrl: string | null,
    dropzone: ReturnType<typeof useDropzone>,
    isUploading: boolean,
    onRemove: () => void
  ) => {
    const { getRootProps, getInputProps, isDragActive } = dropzone;
    const Icon = type === 'light' ? Sun : Moon;
    const label = type === 'light' ? 'Tema Claro' : 'Tema Escuro';

    return (
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Icon className="h-4 w-4" />
          {label}
        </div>
        {logoUrl ? (
          <div className="relative">
            <div className={`
              relative h-24 rounded-lg border overflow-hidden flex items-center justify-center
              ${type === 'dark' ? 'bg-slate-800' : 'bg-white'}
            `}>
              <img 
                src={logoUrl} 
                alt={`Logo ${label}`}
                className="max-h-20 max-w-full object-contain p-2"
              />
              <button
                type="button"
                onClick={onRemove}
                className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full shadow hover:bg-destructive/90 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : (
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-4 text-center cursor-pointer h-24
              transition-colors flex flex-col items-center justify-center
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
              ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
              ${type === 'dark' ? 'bg-slate-800/50' : ''}
            `}
          >
            <input {...getInputProps()} />
            {isUploading ? (
              <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
            ) : (
              <Upload className="w-6 h-6 text-muted-foreground mb-1" />
            )}
            <p className="text-xs text-muted-foreground">
              {isDragActive ? 'Solte aqui...' : 'Arraste ou clique'}
            </p>
          </div>
        )}
      </div>
    );
  };

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
                  placeholder="Primia - Analytics"
                />
              </div>

              {/* App Subtitle */}
              <div className="space-y-2">
                <Label htmlFor="appSubtitle">Subtítulo</Label>
                <Input
                  id="appSubtitle"
                  value={localAppSubtitle}
                  onChange={(e) => setLocalAppSubtitle(e.target.value)}
                  placeholder="Gestão de Leads e Vendas"
                />
              </div>

              {/* Logo Upload - Dual */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label>Logo</Label>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[250px]">
                      <p>Envie logos diferentes para cada tema. Se apenas uma for enviada, ela será usada em ambos os temas.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {renderLogoUpload('light', localLogoUrl, dropzoneLight, isUploadingLight, handleRemoveLogoLight)}
                  {renderLogoUpload('dark', localLogoUrlDark, dropzoneDark, isUploadingDark, handleRemoveLogoDark)}
                </div>

                <p className="text-xs text-muted-foreground">
                  PNG, JPG, SVG ou WEBP (máx. 2MB cada)
                </p>
              </div>

              {/* Color Picker */}
              <ColorPicker
                value={localPrimaryColor}
                onChange={handleColorChange}
                customHex={customHex}
                onCustomHexChange={setCustomHex}
              />

              {/* Save Button */}
              <div className="flex flex-wrap items-center gap-3 pt-4">
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
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    clearBrandingCache();
                    queryClient.invalidateQueries({ queryKey: ['branding-settings'] });
                    toast.success('Cache limpo! Recarregando configurações...');
                  }}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Limpar Cache
                </Button>
                
                {hasChanges && (
                  <span className="text-sm text-muted-foreground">
                    Você tem alterações não salvas
                  </span>
                )}
              </div>
              
              {/* Sync Status Indicator */}
              <div className="flex items-center gap-2 pt-2">
                {isFetching ? (
                  <Badge variant="secondary" className="gap-1.5 text-xs">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Sincronizando...
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1.5 text-xs text-muted-foreground">
                    <RefreshCw className="w-3 h-3" />
                    Sincronizado
                  </Badge>
                )}
              </div>
            </div>

            {/* Preview Column */}
            <div className="lg:pl-6 lg:border-l">
              <div className="sticky top-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Preview do Sidebar</Label>
                  <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                    <button
                      type="button"
                      onClick={() => setPreviewTheme('light')}
                      className={`p-1.5 rounded transition-colors ${
                        previewTheme === 'light' 
                          ? 'bg-background shadow-sm' 
                          : 'hover:bg-background/50'
                      }`}
                      title="Preview tema claro"
                    >
                      <Sun className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTheme('dark')}
                      className={`p-1.5 rounded transition-colors ${
                        previewTheme === 'dark' 
                          ? 'bg-background shadow-sm' 
                          : 'hover:bg-background/50'
                      }`}
                      title="Preview tema escuro"
                    >
                      <Moon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <SidebarPreview
                  appName={localAppName}
                  appSubtitle={localAppSubtitle}
                  logoUrl={localLogoUrl}
                  logoUrlDark={localLogoUrlDark}
                  primaryColor={localPrimaryColor}
                  previewTheme={previewTheme}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
