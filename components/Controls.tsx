
import React, { useRef } from 'react';
import { Upload, Layers, Settings, Activity, AlertTriangle, CheckCircle, Download, FileText, Sparkles, RotateCcw, Droplets } from 'lucide-react';
import { PrintConfig, TabView, AnalysisResult } from '../types';

interface ControlsProps {
  config: PrintConfig;
  setConfig: React.Dispatch<React.SetStateAction<PrintConfig>>;
  onUploadCmyk: (file: File) => void;
  onUploadWhite: (file: File) => void;
  onUploadVarnish: (file: File) => void;
  isProcessing: boolean;
  activeTab: TabView;
  setActiveTab: (tab: TabView) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  analysisResult: AnalysisResult | null;
  cmykFileName: string | null;
  whiteFileName: string | null;
  varnishFileName: string | null;
  onExport: () => void;
  isExporting: boolean;
  isPaperPreview: boolean;
  setIsPaperPreview: (isPaper: boolean) => void;
  onReset: () => void;
}

const Controls: React.FC<ControlsProps> = ({
  config,
  setConfig,
  onUploadCmyk,
  onUploadWhite,
  onUploadVarnish,
  isProcessing,
  activeTab,
  setActiveTab,
  onAnalyze,
  isAnalyzing,
  analysisResult,
  cmykFileName,
  whiteFileName,
  varnishFileName,
  onExport,
  isExporting,
  isPaperPreview,
  setIsPaperPreview,
  onReset
}) => {
  const cmykInputRef = useRef<HTMLInputElement>(null);
  const whiteInputRef = useRef<HTMLInputElement>(null);
  const varnishInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'cmyk' | 'white' | 'varnish') => {
    if (e.target.files && e.target.files[0]) {
      if (type === 'cmyk') onUploadCmyk(e.target.files[0]);
      else if (type === 'white') onUploadWhite(e.target.files[0]);
      else onUploadVarnish(e.target.files[0]);
    }
  };

  const hasWhiteInk = !!whiteFileName;
  const hasVarnish = !!varnishFileName;

  return (
    <div className="h-full flex flex-col bg-gray-850 border-l border-gray-750 w-full max-w-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-750 flex items-center gap-2">
        <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold">M</div>
        <h1 className="font-bold text-lg tracking-tight">MetalPrint FX</h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-750">
        <button
          onClick={() => setActiveTab(TabView.UPLOAD)}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-800 transition ${activeTab === TabView.UPLOAD ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400'}`}
        >
          <Layers size={16} /> Слои
        </button>
        <button
          onClick={() => setActiveTab(TabView.SETTINGS)}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-800 transition ${activeTab === TabView.SETTINGS ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400'}`}
        >
          <Settings size={16} /> Настройки
        </button>
        <button
          onClick={() => setActiveTab(TabView.ANALYSIS)}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-800 transition ${activeTab === TabView.ANALYSIS ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400'}`}
        >
          <Activity size={16} /> AI Анализ
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* TAB: UPLOAD */}
        {activeTab === TabView.UPLOAD && (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Слой CMYK (Основа)</label>
              <div 
                onClick={() => cmykInputRef.current?.click()}
                className="border-2 border-dashed border-gray-700 hover:border-indigo-500 hover:bg-gray-800 rounded-lg p-6 flex flex-col items-center cursor-pointer transition group"
              >
                <Upload className="text-gray-500 group-hover:text-indigo-400 mb-2" />
                <span className="text-sm text-gray-300 font-medium">{cmykFileName || "Загрузить макет"}</span>
                <span className="text-xs text-gray-500 mt-1">PNG/JPG</span>
                <input 
                  type="file" 
                  ref={cmykInputRef} 
                  onChange={(e) => handleFileChange(e, 'cmyk')} 
                  className="hidden" 
                  accept="image/*"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Маска Белил</label>
              <div 
                onClick={() => whiteInputRef.current?.click()}
                className="border-2 border-dashed border-gray-700 hover:border-indigo-500 hover:bg-gray-800 rounded-lg p-6 flex flex-col items-center cursor-pointer transition group"
              >
                <div className="w-8 h-8 rounded-full border border-gray-500 bg-white mb-2 flex items-center justify-center">
                  <span className="text-black text-[10px] font-bold">W</span>
                </div>
                <span className="text-sm text-gray-300 font-medium">{whiteFileName || "Загрузить маску"}</span>
                <span className="text-xs text-gray-500 mt-1">Белый = Металл, Черный = Краска</span>
                <input 
                  type="file" 
                  ref={whiteInputRef} 
                  onChange={(e) => handleFileChange(e, 'white')} 
                  className="hidden" 
                  accept="image/*"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Выборочный лак (Varnish)</label>
              <div 
                onClick={() => varnishInputRef.current?.click()}
                className="border-2 border-dashed border-gray-700 hover:border-indigo-500 hover:bg-gray-800 rounded-lg p-6 flex flex-col items-center cursor-pointer transition group"
              >
                <Droplets className="text-gray-500 group-hover:text-indigo-400 mb-2" />
                <span className="text-sm text-gray-300 font-medium">{varnishFileName || "Загрузить лак"}</span>
                <span className="text-xs text-gray-500 mt-1">Необязательно. Черный = Лак</span>
                <input 
                  type="file" 
                  ref={varnishInputRef} 
                  onChange={(e) => handleFileChange(e, 'varnish')} 
                  className="hidden" 
                  accept="image/*"
                />
              </div>
            </div>

            {isProcessing && (
              <div className="text-center p-4 bg-gray-800 rounded animate-pulse">
                <span className="text-sm text-indigo-400">Обработка текстур...</span>
              </div>
            )}
          </div>
        )}

        {/* TAB: SETTINGS */}
        {activeTab === TabView.SETTINGS && (
          <div className="space-y-6">
            
            {/* Paper vs Metal Toggle */}
            <div className="bg-gray-800 p-1 rounded-lg flex border border-gray-700 relative">
              <button 
                onClick={() => hasWhiteInk && setIsPaperPreview(false)}
                disabled={!hasWhiteInk}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded transition ${
                    !hasWhiteInk 
                    ? 'text-gray-600 cursor-not-allowed' 
                    : !isPaperPreview 
                        ? 'bg-indigo-600 text-white shadow-lg' 
                        : 'text-gray-400 hover:text-white'
                }`}
              >
                <Sparkles size={14} /> MetPol
              </button>
              <button 
                onClick={() => setIsPaperPreview(true)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded transition ${isPaperPreview ? 'bg-gray-200 text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                <FileText size={14} /> Бумага
              </button>
            </div>
            {!hasWhiteInk && <div className="text-[10px] text-gray-500 text-center -mt-2">Требуется маска белил для режима MetPol</div>}

            {/* Camera Exposure Slider */}
             <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm text-gray-300">Экспозиция камеры</label>
                <span className="text-xs font-mono text-gray-500">{config.toneMappingExposure?.toFixed(2) || "0.90"}</span>
              </div>
              <input
                type="range"
                min="0"
                max="2" 
                step="0.05"
                value={config.toneMappingExposure || 0.9}
                onChange={(e) => setConfig({ ...config, toneMappingExposure: parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

             <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm text-gray-300">Яркость окружения (HDRI)</label>
                <span className="text-xs font-mono text-gray-500">{config.exposure.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="8" 
                step="0.1"
                value={config.exposure}
                onChange={(e) => setConfig({ ...config, exposure: parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            <hr className="border-gray-750" />
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Свойства поверхности</div>

            <div className={`space-y-4 transition-opacity ${isPaperPreview ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex justify-between items-center">
                <label className="text-sm text-gray-300">Шероховатость металла</label>
                <span className="text-xs font-mono text-gray-500">{config.metalRoughness.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={config.metalRoughness}
                onChange={(e) => setConfig({ ...config, metalRoughness: parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm text-gray-300">Шероховатость бумаги (Белил)</label>
                <span className="text-xs font-mono text-gray-500">{config.paperRoughness.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1.0"
                step="0.1"
                value={config.paperRoughness}
                onChange={(e) => setConfig({ ...config, paperRoughness: parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
            
            {hasVarnish && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                    <div className="flex justify-between items-center">
                        <label className="text-sm text-indigo-300">Толщина лака (Объём)</label>
                        <span className="text-xs font-mono text-gray-500">{config.varnishBump?.toFixed(2) || "0.02"}</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="0.2"
                        step="0.01"
                        value={config.varnishBump || 0.02}
                        onChange={(e) => setConfig({ ...config, varnishBump: parseFloat(e.target.value) })}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                </div>
            )}

            <hr className="border-gray-750" />

            <div className="space-y-4">
               <div className="flex justify-between items-center">
                 <label className="text-sm text-gray-300">Цвет фона</label>
               </div>
               <div className="flex gap-2 items-center">
                 <input
                   type="color"
                   value={config.backgroundColor}
                   onChange={(e) => setConfig({...config, backgroundColor: e.target.value})}
                   className="h-10 w-16 p-1 bg-gray-800 border border-gray-700 rounded cursor-pointer"
                 />
                 <span className="text-xs text-gray-500 font-mono">{config.backgroundColor}</span>
               </div>
            </div>

            <button
                onClick={onReset}
                className="w-full py-2 px-3 rounded bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-300 text-xs font-medium flex items-center justify-center gap-2 transition"
            >
                <RotateCcw size={14} />
                Сбросить настройки
            </button>

            <hr className="border-gray-750" />

            <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Экспорт</label>
                <button
                    onClick={onExport}
                    disabled={!cmykFileName || isExporting}
                    className={`w-full py-3 px-4 rounded-lg font-medium text-sm transition flex items-center justify-center gap-2 border ${
                        !cmykFileName
                        ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-800 border-gray-600 hover:bg-gray-750 hover:border-gray-500 text-white'
                    }`}
                >
                    {isExporting ? (
                        <span>Создание HTML...</span>
                    ) : (
                        <>
                            <Download size={16} />
                            Сохранить 3D сцену (HTML)
                        </>
                    )}
                </button>
            </div>
          </div>
        )}

        {/* TAB: ANALYSIS */}
        {activeTab === TabView.ANALYSIS && (
          <div className="space-y-6">
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <h3 className="text-sm font-semibold text-white mb-2">Предпечатная проверка</h3>
              <p className="text-xs text-gray-400 mb-4">
                Используйте Google Gemini для анализа макетов на наличие проблем печати на металлизированной бумаге.
              </p>
              
              <button
                onClick={onAnalyze}
                disabled={isAnalyzing || !cmykFileName}
                className={`w-full py-2 px-4 rounded font-medium text-sm transition flex items-center justify-center gap-2 ${
                  isAnalyzing || !cmykFileName
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                {isAnalyzing ? (
                  <>Обработка...</>
                ) : (
                  <>Запустить анализ</>
                )}
              </button>
            </div>

            {analysisResult && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white">{analysisResult.title}</h3>
                    <div className={`px-2 py-1 rounded text-xs font-bold ${analysisResult.isCompatible ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                        Оценка: {analysisResult.score}/100
                    </div>
                </div>
                
                <div className="space-y-2">
                    {analysisResult.feedback.map((item, idx) => (
                        <div key={idx} className="flex gap-2 items-start bg-gray-800 p-3 rounded text-sm text-gray-300">
                           {analysisResult.isCompatible ? <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="text-yellow-500 mt-0.5 shrink-0" />}
                           <span>{item}</span>
                        </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
      
      {/* Footer */}
      <div className="p-4 border-t border-gray-750 text-xs text-center text-gray-600">
        Разработано с React, Three.js и Gemini
      </div>
    </div>
  );
};

export default Controls;
