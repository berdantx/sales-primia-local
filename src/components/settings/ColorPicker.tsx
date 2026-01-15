import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { COLOR_PRESETS } from '@/hooks/useBrandingSettings';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface ColorPickerProps {
  value: string;
  onChange: (hsl: string, hslDark: string) => void;
  customHex: string;
  onCustomHexChange: (hex: string) => void;
}

// Convert hex to HSL
function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function ColorPicker({ value, onChange, customHex, onCustomHexChange }: ColorPickerProps) {
  const handlePresetClick = (preset: typeof COLOR_PRESETS[number]) => {
    onChange(preset.hsl, preset.hslDark);
  };

  const handleCustomHexChange = (hex: string) => {
    onCustomHexChange(hex);
    
    if (hex.length === 7 && hex.startsWith('#')) {
      const hsl = hexToHsl(hex);
      if (hsl) {
        const hslString = `${hsl.h} ${hsl.s}% ${hsl.l}%`;
        const hslDarkString = `${hsl.h} ${hsl.s}% ${Math.min(hsl.l + 5, 100)}%`;
        onChange(hslString, hslDarkString);
      }
    }
  };

  return (
    <div className="space-y-4">
      <Label>Cor Primária</Label>
      
      {/* Preset colors grid */}
      <div className="grid grid-cols-6 gap-2">
        {COLOR_PRESETS.map((preset) => {
          const isSelected = value === preset.hsl;
          return (
            <button
              key={preset.name}
              type="button"
              onClick={() => handlePresetClick(preset)}
              className={cn(
                "relative w-10 h-10 rounded-lg border-2 transition-all",
                isSelected 
                  ? "border-foreground scale-110 ring-2 ring-offset-2 ring-foreground/20" 
                  : "border-transparent hover:scale-105"
              )}
              style={{ backgroundColor: preset.hex }}
              title={preset.name}
            >
              {isSelected && (
                <Check className="absolute inset-0 m-auto h-5 w-5 text-white drop-shadow-md" />
              )}
            </button>
          );
        })}
      </div>

      {/* Preset names */}
      <div className="grid grid-cols-6 gap-2">
        {COLOR_PRESETS.map((preset) => (
          <span key={preset.name} className="text-xs text-center text-muted-foreground">
            {preset.name}
          </span>
        ))}
      </div>

      {/* Custom color input */}
      <div className="flex items-center gap-3 pt-2">
        <Label className="text-sm whitespace-nowrap">Cor personalizada:</Label>
        <div className="flex items-center gap-2 flex-1">
          <div
            className="w-8 h-8 rounded border"
            style={{ backgroundColor: customHex || '#0066FF' }}
          />
          <Input
            type="text"
            placeholder="#0066FF"
            value={customHex}
            onChange={(e) => handleCustomHexChange(e.target.value)}
            className="flex-1 font-mono text-sm"
            maxLength={7}
          />
        </div>
      </div>
    </div>
  );
}
