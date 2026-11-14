export type BBox = [west: number, south: number, east: number, north: number];
export type IndicatorKey = "temperature" | "vegetation" | "atmosphere" | "water";

export interface TrendRecord {
  date: string;
  value: number;
  temp_c?: number;
}

export const INDICATOR_INFO: Record<IndicatorKey, {
  name: string;
  title: string;
  measure: string;
  unit: string;
  dataset: string;
}> = {
  temperature: {
    name: "Temperature",
    title: "Land surface temperature",
    measure: "Land surface temperature",
    unit: "°C",
    dataset: "NASA MODIS MOD11A2 v6.1",
  },
  vegetation: {
    name: "Vegetation",
    title: "Vegetation index",
    measure: "Normalized Difference Vegetation Index",
    unit: "NDVI",
    dataset: "NASA MODIS MOD13Q1 v6.1",
  },
  atmosphere: {
    name: "Atmosphere",
    title: "Aerosol optical thickness",
    measure: "Aerosol optical thickness",
    unit: "unitless",
    dataset: "ESA Sentinel-2 L2A",
  },
  water: {
    name: "Water systems",
    title: "Water index",
    measure: "Normalized Difference Water Index",
    unit: "NDWI",
    dataset: "ESA Sentinel-2 L2A",
  },
};