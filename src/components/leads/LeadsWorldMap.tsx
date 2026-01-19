import { useMemo, useState, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Globe, Info } from 'lucide-react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from 'react-simple-maps';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const geoUrl = 'https://unpkg.com/world-atlas@2/countries-110m.json';

interface LeadsWorldMapProps {
  byCountry: Record<string, number>;
  isLoading?: boolean;
  totalLeads: number;
  onCountryClick?: (country: string) => void;
}

// Map country names from geolocation API to TopoJSON names
const countryNameMapping: Record<string, string> = {
  'Brazil': 'Brazil',
  'Brasil': 'Brazil',
  'United States': 'United States of America',
  'USA': 'United States of America',
  'Estados Unidos': 'United States of America',
  'UK': 'United Kingdom',
  'Reino Unido': 'United Kingdom',
  'England': 'United Kingdom',
  'Portugal': 'Portugal',
  'Spain': 'Spain',
  'Espanha': 'Spain',
  'France': 'France',
  'França': 'France',
  'Germany': 'Germany',
  'Alemanha': 'Germany',
  'Italy': 'Italy',
  'Itália': 'Italy',
  'Argentina': 'Argentina',
  'Mexico': 'Mexico',
  'México': 'Mexico',
  'Canada': 'Canada',
  'Canadá': 'Canada',
  'Japan': 'Japan',
  'Japão': 'Japan',
  'China': 'China',
  'India': 'India',
  'Índia': 'India',
  'Australia': 'Australia',
  'Austrália': 'Australia',
  'Netherlands': 'Netherlands',
  'Holanda': 'Netherlands',
  'Belgium': 'Belgium',
  'Bélgica': 'Belgium',
  'Switzerland': 'Switzerland',
  'Suíça': 'Switzerland',
  'Austria': 'Austria',
  'Áustria': 'Austria',
  'Poland': 'Poland',
  'Polônia': 'Poland',
  'Russia': 'Russia',
  'Rússia': 'Russia',
  'Chile': 'Chile',
  'Colombia': 'Colombia',
  'Colômbia': 'Colombia',
  'Peru': 'Peru',
  'Venezuela': 'Venezuela',
  'Ecuador': 'Ecuador',
  'Equador': 'Ecuador',
  'Bolivia': 'Bolivia',
  'Bolívia': 'Bolivia',
  'Paraguay': 'Paraguay',
  'Paraguai': 'Paraguay',
  'Uruguay': 'Uruguay',
  'Uruguai': 'Uruguay',
  'Ireland': 'Ireland',
  'Irlanda': 'Ireland',
  'South Africa': 'South Africa',
  'África do Sul': 'South Africa',
  'New Zealand': 'New Zealand',
  'Nova Zelândia': 'New Zealand',
  'South Korea': 'South Korea',
  'Coreia do Sul': 'South Korea',
  'Norway': 'Norway',
  'Noruega': 'Norway',
  'Sweden': 'Sweden',
  'Suécia': 'Sweden',
  'Denmark': 'Denmark',
  'Dinamarca': 'Denmark',
  'Finland': 'Finland',
  'Finlândia': 'Finland',
};

const normalizeCountryName = (name: string): string => {
  return countryNameMapping[name] || name;
};

// Memoized Geography component for performance
const MemoizedGeography = memo(({ 
  geo, 
  leadsCount, 
  maxLeads, 
  onMouseEnter, 
  onMouseLeave,
  onClick,
  isSelected 
}: {
  geo: any;
  leadsCount: number;
  maxLeads: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
  isSelected: boolean;
}) => {
  const getCountryColor = () => {
    if (leadsCount === 0) return 'hsl(var(--muted))';
    
    const intensity = Math.min(leadsCount / maxLeads, 1);
    const hue = 217; // Primary blue
    const saturation = 70 + intensity * 20;
    const lightness = 75 - intensity * 40;
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  return (
    <Geography
      geography={geo}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      style={{
        default: {
          fill: isSelected ? 'hsl(var(--primary))' : getCountryColor(),
          stroke: 'hsl(var(--border))',
          strokeWidth: 0.5,
          outline: 'none',
        },
        hover: {
          fill: 'hsl(var(--primary))',
          stroke: 'hsl(var(--border))',
          strokeWidth: 0.8,
          outline: 'none',
          cursor: leadsCount > 0 ? 'pointer' : 'default',
        },
        pressed: {
          fill: 'hsl(var(--primary))',
          outline: 'none',
        },
      }}
    />
  );
});

MemoizedGeography.displayName = 'MemoizedGeography';

export function LeadsWorldMap({ 
  byCountry, 
  isLoading,
  totalLeads,
  onCountryClick 
}: LeadsWorldMapProps) {
  const [tooltipContent, setTooltipContent] = useState<{ country: string; leads: number } | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [position, setPosition] = useState({ coordinates: [0, 20] as [number, number], zoom: 1 });

  // Normalize country data and find max
  const { normalizedData, maxLeads, countriesWithLeads } = useMemo(() => {
    const normalized: Record<string, number> = {};
    let max = 0;
    
    Object.entries(byCountry).forEach(([country, count]) => {
      if (country === 'Desconhecido' || country === 'Local/Private') return;
      const normalizedName = normalizeCountryName(country);
      normalized[normalizedName] = (normalized[normalizedName] || 0) + count;
      if (normalized[normalizedName] > max) {
        max = normalized[normalizedName];
      }
    });
    
    return { 
      normalizedData: normalized, 
      maxLeads: max,
      countriesWithLeads: Object.keys(normalized).length
    };
  }, [byCountry]);

  const handleZoomIn = () => {
    if (position.zoom < 4) {
      setPosition(pos => ({ ...pos, zoom: pos.zoom * 1.5 }));
    }
  };

  const handleZoomOut = () => {
    if (position.zoom > 0.5) {
      setPosition(pos => ({ ...pos, zoom: pos.zoom / 1.5 }));
    }
  };

  const handleMoveEnd = (position: { coordinates: [number, number]; zoom: number }) => {
    setPosition(position);
  };

  const handleCountryClick = (countryName: string) => {
    const leadsCount = normalizedData[countryName] || 0;
    if (leadsCount > 0 && onCountryClick) {
      // Find original country name for filter
      const originalName = Object.entries(byCountry).find(([key]) => {
        return normalizeCountryName(key) === countryName;
      })?.[0];
      
      if (originalName) {
        setSelectedCountry(selectedCountry === countryName ? null : countryName);
        onCountryClick(selectedCountry === countryName ? 'all' : originalName);
      }
    }
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasData = countriesWithLeads > 0;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Mapa de Distribuição Global
          </CardTitle>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Clique em um país para filtrar os leads</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Use scroll ou botões para zoom
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div className="flex gap-1">
              <button
                onClick={handleZoomOut}
                className="p-1 rounded-md bg-muted hover:bg-muted/80 transition-colors text-sm font-bold w-6 h-6 flex items-center justify-center"
                aria-label="Zoom out"
              >
                −
              </button>
              <button
                onClick={handleZoomIn}
                className="p-1 rounded-md bg-muted hover:bg-muted/80 transition-colors text-sm font-bold w-6 h-6 flex items-center justify-center"
                aria-label="Zoom in"
              >
                +
              </button>
            </div>
          </div>
        </div>
        {hasData && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
            <span>{countriesWithLeads} países com leads</span>
            <div className="flex items-center gap-2">
              <span>Menos</span>
              <div className="flex h-3 rounded-sm overflow-hidden">
                <div className="w-4 bg-blue-200" />
                <div className="w-4 bg-blue-300" />
                <div className="w-4 bg-blue-400" />
                <div className="w-4 bg-blue-500" />
                <div className="w-4 bg-blue-600" />
              </div>
              <span>Mais</span>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="relative h-[350px] rounded-lg overflow-hidden bg-muted/30">
          {tooltipContent && (
            <div className="absolute top-2 left-2 z-10 px-3 py-2 bg-card border rounded-lg shadow-lg">
              <p className="font-medium text-sm">{tooltipContent.country}</p>
              <p className="text-xs text-muted-foreground">
                {tooltipContent.leads} {tooltipContent.leads === 1 ? 'lead' : 'leads'}
              </p>
            </div>
          )}
          
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{
              scale: 120,
              center: [0, 30],
            }}
            style={{ width: '100%', height: '100%' }}
          >
            <ZoomableGroup
              zoom={position.zoom}
              center={position.coordinates}
              onMoveEnd={handleMoveEnd}
              minZoom={0.5}
              maxZoom={4}
            >
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const countryName = geo.properties?.name || '';
                    const leadsCount = normalizedData[countryName] || 0;
                    
                    return (
                      <MemoizedGeography
                        key={geo.rsmKey}
                        geo={geo}
                        leadsCount={leadsCount}
                        maxLeads={maxLeads}
                        isSelected={selectedCountry === countryName}
                        onMouseEnter={() => {
                          if (leadsCount > 0) {
                            setTooltipContent({ country: countryName, leads: leadsCount });
                          }
                        }}
                        onMouseLeave={() => setTooltipContent(null)}
                        onClick={() => handleCountryClick(countryName)}
                      />
                    );
                  })
                }
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>
          
          {selectedCountry && (
            <button
              onClick={() => {
                setSelectedCountry(null);
                onCountryClick?.('all');
              }}
              className="absolute bottom-2 right-2 px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded-md hover:bg-primary/90 transition-colors"
            >
              Limpar filtro: {selectedCountry}
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
