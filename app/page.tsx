'use client';

import { useState, useEffect } from 'react';

export default function Home() {
    // State for Results
    const [textPrompt, setTextPrompt] = useState('');
    const [textResult, setTextResult] = useState('');
    const [imageResult, setImageResult] = useState('');
    const [loadingText, setLoadingText] = useState(false);

    // State for Model Selection
    const [selectedModel, setSelectedModel] = useState('gemini-1.5-flash');
    const [availableModels, setAvailableModels] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // State for App Mode
    type AppMode = 'discovery' | 'banana-pro';
    const [appMode, setAppMode] = useState<AppMode>('discovery');

    // Banana Pro State
    const [bananaPrompt, setBananaPrompt] = useState('');
    const [bananaSelectedModel, setBananaSelectedModel] = useState('gemini-3-pro-image-preview');
    const [bananaImages, setBananaImages] = useState<string[]>([]);
    const [bananaResult, setBananaResult] = useState<string | null>(null);
    const [bananaLoading, setBananaLoading] = useState(false);
    const [bananaCooldown, setBananaCooldown] = useState(0);

    const BANANA_PRESETS = [
        { id: 'gemini-3-pro-image-preview', name: 'Nano Banana Pro', description: 'Advanced image editing & generation' },
        { id: 'gemini-2.0-flash-exp', name: 'Nano Banana', description: 'Fast and creative generations' }
    ];

    // Fetch models on load
    useEffect(() => {
        fetch('/api/models')
            .then(res => res.json())
            .then(data => {
                if (data.models && data.models.length > 0) {
                    setAvailableModels(data.models);

                    const flash15 = data.models.find((m: any) => m.id === 'gemini-1.5-flash');
                    if (flash15) setSelectedModel(flash15.id);
                    else setSelectedModel(data.models[0].id);
                }
            })
            .catch(err => console.error('Failed to load models:', err));
    }, []);

    // Cooldown Timer Effect
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (bananaCooldown > 0) {
            timer = setInterval(() => {
                setBananaCooldown(prev => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [bananaCooldown]);

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleBananaFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const remainingUnits = 3 - bananaImages.length;
            const filesToProcess = files.slice(0, remainingUnits);

            const newImagesPromises = filesToProcess.map(file => fileToBase64(file));
            const newImages = await Promise.all(newImagesPromises);

            setBananaImages(prev => [...prev, ...newImages].slice(0, 3));
        }
    };

    const removeBananaImage = (index: number) => {
        setBananaImages(prev => prev.filter((_, i) => i !== index));
    };

    const generateBanana = async () => {
        if (bananaCooldown > 0) return;
        setBananaLoading(true);
        setBananaResult(null);
        try {
            const res = await fetch('/api/vertex', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: bananaPrompt,
                    images: bananaImages,
                    modelId: bananaSelectedModel
                }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            if (data.image) setBananaResult(data.image);
            else if (data.text) setBananaResult(data.text);

            setBananaCooldown(30); // 30s cooldown for Banana Pro
        } catch (err: any) {
            alert(`Vertex Error: ${err.message}`);
        } finally {
            setBananaLoading(false);
        }
    };

    const filteredModels = availableModels.filter((model: any) =>
        model.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        model.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const groupedModels = filteredModels
        .reduce((groups: any, model: any) => {
            const family = model.family || 'Other';
            if (!groups[family]) groups[family] = [];
            groups[family].push(model);
            return groups;
        }, {});

    const generateText = async () => {
        setLoadingText(true);
        setTextResult('');
        setImageResult('');
        try {
            const res = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: textPrompt,
                    modelId: selectedModel
                }),
            });
            const data = await res.json();
            if (data.error) {
                const errorMessage = data.error.message || JSON.stringify(data.error);
                if (data.error.code === 429) {
                    throw new Error("Quota exceeded (429). Please wait a moment.");
                }
                throw new Error(errorMessage);
            }

            if (data.image) setImageResult(data.image);
            setTextResult(data.text);
        } catch (err: any) {
            setTextResult(`❌ ${err.message}`);
        } finally {
            setLoadingText(false);
        }
    };



    return (
        <div className="container max-w-6xl">
            <header className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-white/10 pb-6 gap-6">
                <div className="flex flex-col">
                    <h1 className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 font-black tracking-tight mb-1">
                        Advanced AI Discovery Hub
                    </h1>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold opacity-60">Professional Laboratory x Nano Banana</p>
                </div>

                <div className="flex bg-gray-950/80 p-1 rounded-2xl border border-white/5 backdrop-blur-xl shadow-2xl">
                    <button
                        onClick={() => setAppMode('discovery')}
                        className={`px-6 py-2 rounded-xl text-xs font-bold transition-all duration-500 ${appMode === 'discovery' ? 'bg-blue-600 text-white shadow-blue-lg' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Discovery
                    </button>
                    <button
                        onClick={() => setAppMode('banana-pro')}
                        className={`px-6 py-2 rounded-xl text-xs font-bold transition-all duration-500 ${appMode === 'banana-pro' ? 'bg-purple-600 text-white shadow-purple-lg' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Banana Pro
                    </button>
                </div>

                <div className="hidden md:flex gap-4">
                    <a href="https://aistudio.google.com/app/plan" target="_blank" rel="noreferrer" className="text-[10px] text-gray-400 hover:text-blue-400 transition-colors border border-white/10 rounded-xl px-4 py-2 bg-white/5 backdrop-blur-md">
                        Monitor Quotas
                    </a>
                </div>
            </header>

            <main className="min-h-[70vh]">
                {appMode === 'discovery' && (
                    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {/* Discovery Card */}
                        <div className="card shadow-blue w-full bg-gray-900/40 backdrop-blur-3xl border-white/5">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-8 bg-blue-500 rounded-full shadow-blue"></div>
                                    <h2 className="text-2xl font-black text-white">Model Discovery</h2>
                                </div>
                                <span className="bg-blue-950/40 text-blue-300 text-[10px] px-3 py-1 rounded-full border border-blue-800/50 uppercase tracking-widest font-black">AI STUDIO ENGINE</span>
                            </div>

                            <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-1">Select Architecture</label>
                                    <div className="relative">
                                        <select
                                            value={selectedModel}
                                            onChange={(e) => setSelectedModel(e.target.value)}
                                            className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-white text-sm cursor-pointer focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none pr-10"
                                        >
                                            {availableModels.length === 0 && <option>Scanning models...</option>}
                                            {Object.keys(groupedModels).sort().map(family => (
                                                <optgroup key={family} label={family} className="bg-gray-900 text-gray-400 text-xs">
                                                    {groupedModels[family].map((model: any) => (
                                                        <option key={model.id} value={model.id} className="text-white bg-gray-900">
                                                            {model.displayName || model.id}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            ))}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-blue-500">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Live Filter</label>
                                    <input
                                        type="text"
                                        placeholder="Search across families..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-white text-sm focus:ring-2 focus:ring-blue-500/50 transition-all outline-none placeholder:text-gray-700"
                                    />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-1">Intelligence Prompt</label>
                                    <div className="relative group">
                                        <textarea
                                            id="text-prompt"
                                            value={textPrompt}
                                            onChange={(e) => setTextPrompt(e.target.value)}
                                            placeholder="What would you like to explore today?"
                                            className="w-full h-40 p-5 bg-black/60 border border-white/5 rounded-3xl text-gray-200 text-base focus:ring-2 focus:ring-blue-500/30 transition-all outline-none resize-none shadow-inner"
                                        />
                                        <div className="absolute bottom-4 right-4 text-[10px] text-gray-600 font-mono tracking-tighter opacity-0 group-focus-within:opacity-100 transition-opacity">UTF-8 AI STUDIO FEED</div>
                                    </div>
                                </div>

                                <button
                                    onClick={generateText}
                                    disabled={!textPrompt || loadingText}
                                    className="w-full py-5 bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 disabled:from-gray-800 disabled:to-gray-900 transition-all duration-300 shadow-blue-lg text-white font-black text-lg rounded-3xl transform active:scale-[0.98] uppercase tracking-widest"
                                >
                                    {loadingText ? (
                                        <span className="flex items-center justify-center gap-3">
                                            <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Synchronizing...
                                        </span>
                                    ) : 'Initialize Generation'}
                                </button>
                            </div>

                            {(textResult || imageResult) && (
                                <div className="result mt-8 p-6 bg-black/60 rounded-3xl border border-white/5 shadow-2xl animate-in zoom-in-95 duration-500">
                                    {imageResult && (
                                        <div className="mb-6 relative group overflow-hidden rounded-2xl border border-blue-500/30 shadow-blue-lg">
                                            <img src={imageResult} alt="Generated" className="w-full transition-transform duration-700 group-hover:scale-105" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                                <span className="text-[10px] text-blue-300 font-black tracking-widest">GEMINI IMAGE SYNTHESIS ENGINE</span>
                                            </div>
                                        </div>
                                    )}
                                    {textResult && (
                                        <div className="whitespace-pre-wrap text-base text-gray-200 leading-relaxed font-medium selection:bg-blue-500/30">
                                            {textResult}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {appMode === 'banana-pro' && (
                    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto">
                        <div className="card shadow-purple bg-gray-900/40 backdrop-blur-3xl border-white/5 relative overflow-hidden">
                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-600/10 blur-[100px] rounded-full pointer-events-none"></div>

                            <div className="flex justify-between items-center mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-8 bg-purple-500 rounded-full shadow-purple"></div>
                                    <h2 className="text-2xl font-black text-white">Nano Banana Pro</h2>
                                </div>
                                <span className="bg-purple-950/40 text-purple-300 text-[10px] px-3 py-1 rounded-full border border-purple-800/50 uppercase tracking-widest font-black">PREMIUM VERTEX ENGINE</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                                {BANANA_PRESETS.map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => setBananaSelectedModel(m.id)}
                                        className={`p-5 rounded-3xl border transition-all duration-500 text-left relative overflow-hidden group ${bananaSelectedModel === m.id ? 'bg-purple-600/20 border-purple-500/50 text-white shadow-purple-lg' : 'bg-black/20 border-white/5 text-gray-500 hover:border-white/20'}`}
                                    >
                                        <div className="relative z-10">
                                            <div className="text-sm font-black mb-1 flex items-center gap-2">
                                                {m.name}
                                                {bananaSelectedModel === m.id && <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse"></div>}
                                            </div>
                                            <div className="text-[9px] uppercase tracking-widest font-bold opacity-60 leading-tight">{m.description}</div>
                                        </div>
                                        {bananaSelectedModel === m.id && <div className="absolute bottom-0 right-0 p-2 opacity-20"><svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" /></svg></div>}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end px-1">
                                        <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Reference Components (Up to 3)</label>
                                        <span className="text-[9px] text-gray-600 font-mono">{bananaImages.length}/3 UNITS LOADED</span>
                                    </div>

                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                                        {bananaImages.map((img, idx) => (
                                            <div key={idx} className="relative aspect-square group rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                                                <img src={img} alt="Ref" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                <button
                                                    onClick={() => removeBananaImage(idx)}
                                                    className="absolute top-1 right-1 bg-black/60 backdrop-blur-md p-1 rounded-lg text-white hover:bg-red-500/80 transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        ))}
                                        {bananaImages.length < 3 && (
                                            <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-2xl bg-black/20 cursor-pointer hover:bg-black/40 hover:border-purple-500/30 transition-all group">
                                                <input type="file" accept="image/*" multiple onChange={handleBananaFileChange} className="hidden" />
                                                <svg className="w-6 h-6 text-gray-600 group-hover:text-purple-400 transition-colors mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                                <span className="text-[8px] text-gray-600 font-black uppercase tracking-tighter">Attach</span>
                                            </label>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest ml-1">Refinement Instructions</label>
                                    <textarea
                                        value={bananaPrompt}
                                        onChange={(e) => setBananaPrompt(e.target.value)}
                                        placeholder="E.g., Update the lighting to sunset ora or generate a similar scene with more greenery..."
                                        className="w-full h-32 p-5 bg-black/60 border border-white/5 rounded-3xl text-gray-200 text-sm focus:ring-2 focus:ring-purple-500/30 transition-all outline-none resize-none"
                                    />
                                </div>

                                <button
                                    onClick={generateBanana}
                                    disabled={!bananaPrompt || bananaLoading || bananaCooldown > 0}
                                    className={`w-full py-5 rounded-3xl font-black text-lg transition-all duration-500 transform active:scale-[0.98] uppercase tracking-widest ${bananaCooldown > 0 ? 'bg-gray-800 text-gray-500 border border-white/5' : 'bg-gradient-to-br from-purple-600 to-fuchsia-700 hover:from-purple-500 hover:to-fuchsia-600 text-white shadow-purple-lg'}`}
                                >
                                    {bananaLoading ? 'Integrating Intelligence...' : bananaCooldown > 0 ? `Thermal Cooldown ${bananaCooldown}s` : 'Call Cloud Banana'}
                                </button>
                            </div>

                            {bananaResult && (
                                <div className="result mt-8 p-6 bg-black/60 rounded-3xl border border-white/5 shadow-2xl animate-in zoom-in-95 duration-500">
                                    {bananaResult.startsWith('data:image') ? (
                                        <div className="relative group rounded-2xl overflow-hidden border border-purple-500/30 shadow-purple-lg">
                                            <img src={bananaResult} alt="Result" className="w-full transition-transform duration-700 group-hover:scale-105" />
                                            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-[9px] px-3 py-1 rounded-full text-purple-300 font-black uppercase tracking-widest">BANANA OUTPUT</div>
                                        </div>
                                    ) : (
                                        <div className="whitespace-pre-wrap text-sm text-gray-300 leading-relaxed font-medium">
                                            {bananaResult}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            <footer className="mt-16 pt-8 border-t border-white/5 text-center">
                <p className="text-gray-500 text-xs font-medium">Architected via Google Cloud Vertex AI & Google AI Studio</p>
                <div className="mt-3 flex justify-center gap-6">
                    <a href="https://aistudio.google.com/app/plan_and_billing" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:text-blue-400 font-black uppercase tracking-widest transition-colors">Quota Infrastructure</a>
                    <span className="w-1 h-1 bg-gray-800 rounded-full my-auto"></span>
                    <span className="text-[10px] text-gray-700 font-black uppercase tracking-widest">Nano Hub v3.5.0-PRO</span>
                </div>
            </footer>
        </div>
    );
}
