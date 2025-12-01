
import React, { useState, useEffect } from 'react';
import PrintSimulator from './components/PrintSimulator';
import Controls from './components/Controls';
import { PrintConfig, TabView, AnalysisResult } from './types';
import { processTextureMaps } from './utils/textureUtils';
import { analyzePrintFeasibility } from './services/geminiService';
import { generateStandaloneHtml } from './utils/exportUtils';

const DEFAULT_CONFIG: PrintConfig = {
  metalness: 1.0,
  roughness: 0.2,
  metalRoughness: 0.2,
  paperRoughness: 1.0,
  inkGlossiness: 0.0,
  exposure: 1.0,
  toneMappingExposure: 0.9,
  backgroundColor: '#0d1117',
  varnishBump: 0.02
};

function App() {
  const [config, setConfig] = useState<PrintConfig>(DEFAULT_CONFIG);
  
  // File State
  const [cmykFile, setCmykFile] = useState<File | null>(null);
  const [whiteFile, setWhiteFile] = useState<File | null>(null);
  const [varnishFile, setVarnishFile] = useState<File | null>(null);
  
  // Texture URL State
  const [cmykUrl, setCmykUrl] = useState<string | null>(null);
  const [whiteUrl, setWhiteUrl] = useState<string | null>(null);
  const [varnishUrl, setVarnishUrl] = useState<string | null>(null);
  
  const [metalnessMapUrl, setMetalnessMapUrl] = useState<string | null>(null);
  const [roughnessMapUrl, setRoughnessMapUrl] = useState<string | null>(null);
  const [clearcoatMapUrl, setClearcoatMapUrl] = useState<string | null>(null); // New state for Varnish
  
  const [aspectRatio, setAspectRatio] = useState<number>(10 / 14);
  
  // UI State
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabView>(TabView.UPLOAD);
  const [isPaperPreview, setIsPaperPreview] = useState(false);
  
  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  // Enforce Paper Mode if no White Ink Mask is present
  useEffect(() => {
    if (!whiteUrl) {
      setIsPaperPreview(true);
    }
  }, [whiteUrl]);

  // Handle CMYK Upload
  const handleUploadCmyk = (file: File) => {
    setCmykFile(file);
    const url = URL.createObjectURL(file);
    setCmykUrl(url);
    setAnalysisResult(null);

    const img = new Image();
    img.onload = () => {
        if (img.height > 0) {
            setAspectRatio(img.width / img.height);
        }
    };
    img.src = url;
  };

  // Common Processing Logic
  const processTextures = async (wUrl: string | null, vUrl: string | null) => {
      // If no white ink and no varnish, we don't need generated maps
      if (!wUrl && !vUrl) {
          setMetalnessMapUrl(null);
          setRoughnessMapUrl(null);
          setClearcoatMapUrl(null);
          return;
      }

      setIsProcessing(true);
      try {
        const { metalnessMap, roughnessMap, clearcoatMap } = await processTextureMaps(
            wUrl, 
            vUrl,
            config.metalRoughness, 
            config.paperRoughness
        );
        setMetalnessMapUrl(metalnessMap);
        setRoughnessMapUrl(roughnessMap);
        setClearcoatMapUrl(clearcoatMap);
      } catch (e) {
        console.error("Failed to process textures", e);
      } finally {
        setIsProcessing(false);
      }
  };

  // Handle White Upload
  const handleUploadWhite = async (file: File) => {
    setWhiteFile(file);
    const url = URL.createObjectURL(file);
    setWhiteUrl(url);
    // Process with existing varnish url if any
    await processTextures(url, varnishUrl);
  };

  // Handle Varnish Upload
  const handleUploadVarnish = async (file: File) => {
      setVarnishFile(file);
      const url = URL.createObjectURL(file);
      setVarnishUrl(url);
      // Process with existing white url if any
      await processTextures(whiteUrl, url);
  };

  // Effect: Debounced regeneration for textures only (Roughness calc)
  useEffect(() => {
    // We only need to regenerate maps if there is at least a White Mask or a Varnish Mask
    if (!whiteUrl && !varnishUrl) return;

    const timer = setTimeout(async () => {
        await processTextures(whiteUrl, varnishUrl);
    }, 1000);

    return () => clearTimeout(timer);
  }, [config.paperRoughness, config.metalRoughness, whiteUrl, varnishUrl]);

  // Handle Export to HTML
  const handleExport = async () => {
    if (!cmykUrl) return;
    setIsExporting(true);
    try {
      const htmlContent = await generateStandaloneHtml(
        cmykUrl, 
        metalnessMapUrl, 
        roughnessMapUrl,
        clearcoatMapUrl,
        config,
        aspectRatio,
        isPaperPreview
      );
      
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `metal-print-${new Date().getTime()}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (e) {
      console.error("Export failed", e);
      alert("Не удалось экспортировать сцену.");
    } finally {
      setIsExporting(false);
    }
  };

  // Handle AI Analysis
  const handleAnalyze = async () => {
    if (!cmykFile) return;

    setIsAnalyzing(true);
    try {
        const cmykBase64 = await fileToBase64(cmykFile);
        const whiteBase64 = whiteFile 
            ? await fileToBase64(whiteFile) 
            : cmykBase64; 

        const result = await analyzePrintFeasibility(cmykBase64, whiteBase64);
        setAnalysisResult(result);
    } catch (e) {
        console.error("Analysis failed", e);
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleResetConfig = () => {
    setConfig(DEFAULT_CONFIG);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
    });
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-black overflow-hidden">
      {/* 3D Viewport */}
      <div className="flex-1 h-[60vh] md:h-full relative order-2 md:order-1">
        <PrintSimulator 
            cmykUrl={cmykUrl}
            metalnessMapUrl={metalnessMapUrl}
            roughnessMapUrl={roughnessMapUrl}
            clearcoatMapUrl={clearcoatMapUrl}
            config={config}
            aspectRatio={aspectRatio}
            exposure={config.exposure} // Pass directly, no deferral
            isPaperPreview={isPaperPreview}
        />
      </div>

      {/* Sidebar Controls */}
      <div className="h-[40vh] md:h-full w-full md:w-96 shrink-0 order-1 md:order-2 z-10">
        <Controls
            config={config}
            setConfig={setConfig}
            onUploadCmyk={handleUploadCmyk}
            onUploadWhite={handleUploadWhite}
            onUploadVarnish={handleUploadVarnish}
            isProcessing={isProcessing}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onAnalyze={handleAnalyze}
            isAnalyzing={isAnalyzing}
            analysisResult={analysisResult}
            cmykFileName={cmykFile?.name || null}
            whiteFileName={whiteFile?.name || null}
            varnishFileName={varnishFile?.name || null}
            onExport={handleExport}
            isExporting={isExporting}
            isPaperPreview={isPaperPreview}
            setIsPaperPreview={setIsPaperPreview}
            onReset={handleResetConfig}
        />
      </div>
    </div>
  );
}

export default App;
