
export interface PrintConfig {
  metalness: number;
  roughness: number;
  metalRoughness: number;
  paperRoughness: number;
  inkGlossiness: number;
  exposure: number;
  // Added optional property for tone mapping exposure control
  toneMappingExposure?: number;
  backgroundColor: string;
  // Controls the visual thickness (bump) of the spot varnish
  varnishBump?: number;
}

export interface AnalysisResult {
  title: string;
  feedback: string[];
  score: number;
  isCompatible: boolean;
}

export enum TabView {
  UPLOAD = 'UPLOAD',
  SETTINGS = 'SETTINGS',
  ANALYSIS = 'ANALYSIS'
}
