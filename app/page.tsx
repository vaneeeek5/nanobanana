'use client';

import { useState, useEffect } from 'react';

export default function Home() {
    const [textPrompt, setTextPrompt] = useState('');
    const [videoPrompt, setVideoPrompt] = useState('');
    const [textResult, setTextResult] = useState('');
    const [imageResult, setImageResult] = useState('');
    const [videoResult, setVideoResult] = useState('');
    const [loadingText, setLoadingText] = useState(false);
    const [loadingVideo, setLoadingVideo] = useState(false);

    const [selectedModel, setSelectedModel] = useState('gemini-1.5-flash');
    const [availableModels, setAvailableModels] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [imagePrompt, setImagePrompt] = useState('');
    const [imageGenResult, setImageGenResult] = useState('');
    const [loadingImage, setLoadingImage] = useState(false);

    // Tri-Mode State
    type AppMode = 'ai-studio-discovery' | 'ai-studio-presets' | 'vertex-ai';
    const [appMode, setAppMode] = useState<AppMode>('ai-studio-discovery');

    const PRESET_MODELS = [
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Next-Gen)', description: 'Fastest reasoning model' },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Most Capable)', description: 'Best for complex logic' },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Efficient)', description: 'Balanced speed and quality' }
    ];

    const VERTEX_PRESET_MODELS = [
        { id: 'gemini-3-pro-image-preview', name: 'Gemini 3 Pro (Preview)', description: 'Next-gen multimodal preview' },
        { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Cloud)', description: 'Cloud-native performance' },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Production reasoning' }
    ];

    const [vertexPrompt, setVertexPrompt] = useState('');
    const [vertexSelectedModel, setVertexSelectedModel] = useState('gemini-1.5-pro');
    const [presetSelectedModel, setPresetSelectedModel] = useState('gemini-1.5-pro');
    const [vertexImageBase64, setVertexImageBase64] = useState<string | null>(null);
    const [vertexResult, setVertexResult] = useState<string | null>(null);
    const [vertexLoading, setVertexLoading] = useState(false);
    const [vertexCooldown, setVertexCooldown] = useState(0);

    // Fetch models on load
    useEffect(() => {
        fetch('/api/models')
            .then(res => res.json())
            .then(data => {
                if (data.models && data.models.length > 0) {
                    setAvailableModels(data.models);
                    // Set default to Flash 1.5 if available (best quota), otherwise 2.0
                    const flash15 = data.models.find((m: any) => m.id === 'gemini-1.5-flash');
                    const flash20 = data.models.find((m: any) => m.id === 'gemini-2.0-flash');
                    if (flash15) setSelectedModel(flash15.id);
                    else if (flash20) setSelectedModel(flash20.id);
                    else setSelectedModel(data.models[0].id);
                }
            })
            .catch(err => console.error('Failed to load models:', err));
    }, []);

    // Cooldown Timer Effect
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (vertexCooldown > 0) {
            timer = setInterval(() => {
                setVertexCooldown(prev => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [vertexCooldown]);

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const base64 = await fileToBase64(e.target.files[0]);
            setVertexImageBase64(base64);
        } else {
            setVertexImageBase64(null);
        }
    };

    const generateVertex = async () => {
        if (vertexCooldown > 0) return;
        setVertexLoading(true);
        setVertexResult(null);
        try {
            const res = await fetch('/api/vertex', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: vertexPrompt,
                    imageBase64: vertexImageBase64,
                    modelId: vertexSelectedModel
                }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            if (data.image) setVertexResult(data.image);
            else if (data.text) setVertexResult(data.text);

            // Start 60s cooldown
            setVertexCooldown(60);
        } catch (err: any) {
            alert(`Vertex Error: ${err.message}`);
        } finally {
            setVertexLoading(false);
        }
    };

    const filteredModels = availableModels.filter((model: any) =>
        model.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        model.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const groupedModels = filteredModels
        .filter((m: any) => m.type === 'text') // Only text/multimodal models for Gemini card
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
                    throw new Error("Quota exceeded (429). Please wait a moment and try again.");
                }
                throw new Error(errorMessage);
            }

            if (data.image) {
                setImageResult(data.image);
            }
            setTextResult(data.text);

            if (data.note) {
                setTextResult(prev => `[NOTE: ${data.note}]\n\n${prev}`);
            }
        } catch (err: any) {
            setTextResult(`❌ ${err.message}`);
        } finally {
            setLoadingText(false);
        }
    };

    const generateVideo = async () => {
        setLoadingVideo(true);
        setVideoResult('');
        try {
            const res = await fetch('/api/veo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: videoPrompt }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setVideoResult(JSON.stringify(data, null, 2));
        } catch (err: any) {
            setVideoResult(`Error: ${err.message}`);
        } finally {
            setLoadingVideo(false);
        }
    };

    const generateImagen = async () => {
        setLoadingImage(true);
        setImageGenResult('');
        try {
            const res = await fetch('/api/imagen', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: imagePrompt }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setImageGenResult(data.image);
        } catch (err: any) {
            alert(`Imagen Error: ${err.message}`);
        } finally {
            setLoadingImage(false);
        }
    };

    return (
        <div className="container">
            <header className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-gray-800 pb-4 gap-4">
                <h1>AI Multi-Mode Hub</h1>
                <div className="mode-switch flex bg-gray-950/50 p-1.5 rounded-2xl border border-gray-800 backdrop-blur-xl">
                    <button
                        onClick={() => setAppMode('ai-studio-discovery')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${appMode === 'ai-studio-discovery' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        AI Studio (Auto)
                    </button>
                    <button
                        onClick={() => setAppMode('ai-studio-presets')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${appMode === 'ai-studio-presets' ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        AI Studio (Presets)
                    </button>
                    <button
                        onClick={() => setAppMode('vertex-ai')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${appMode === 'vertex-ai' ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Vertex AI (Protected)
                    </button>
                </div>
            </header>

            {appMode === 'ai-studio-discovery' && (
                <div className="grid">
                    {/* Advanced Generation (Gemini) */}
                    <div className="card shadow-blue">
                        <div className="flex justify-between items-center mb-4">
                            <h2>Advanced (Auto)</h2>
                            <span className="bg-blue-950/40 text-blue-300 text-[10px] px-2 py-1 rounded-full border border-blue-800/50 uppercase tracking-wider font-bold">Discovery Mode</span>
                        </div>
                        <p className="text-sm text-gray-400 mb-4">Dynamic model discovery from AI Studio.</p>

                        <div className="mb-4">
                            <label className="block text-sm font-bold mb-2">Search & Select Model:</label>
                            <input
                                type="text"
                                placeholder="Filter models (e.g., flash, image)..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full p-2 mb-2 bg-gray-900 border border-gray-800 rounded-xl text-white text-sm"
                            />
                            <select
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                                className="w-full p-2 bg-gray-900 border border-gray-800 rounded-xl text-white text-sm"
                            >
                                {availableModels.length === 0 && <option>Loading models...</option>}
                                {Object.keys(groupedModels).sort().map(family => (
                                    <optgroup key={family} label={family}>
                                        {groupedModels[family].map((model: any) => (
                                            <option key={model.id} value={model.id}>
                                                {model.displayName}
                                            </option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        </div>

                        <label htmlFor="text-prompt">Prompt:</label>
                        <textarea
                            id="text-prompt"
                            value={textPrompt}
                            onChange={(e) => setTextPrompt(e.target.value)}
                            placeholder="Type for AI Studio Discovery..."
                            className="h-24"
                        />

                        <button
                            onClick={generateText}
                            disabled={!textPrompt || loadingText}
                            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 transition-colors shadow-blue-lg text-white"
                        >
                            {loadingText ? 'Processing...' : 'Generate Content'}
                        </button>

                        {(textResult || imageResult) && (
                            <div className="result mt-4 p-3 bg-black/40 rounded-xl border border-blue-900/30">
                                {imageResult && (
                                    <div className="mb-4 text-center">
                                        <img src={imageResult} alt="Generated" className="max-w-full rounded-xl shadow-2xl mx-auto border border-blue-500/50" />
                                    </div>
                                )}
                                {textResult && (
                                    <div className="whitespace-pre-wrap text-sm text-gray-300">
                                        {textResult}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Imagen 4 */}
                    <div className="card shadow-green">
                        <h2>Imagen 4</h2>
                        <p className="text-sm text-gray-400 mb-4">Dedicated high-quality image generation.</p>
                        <label htmlFor="image-prompt">Description:</label>
                        <textarea
                            id="image-prompt"
                            value={imagePrompt}
                            onChange={(e) => setImagePrompt(e.target.value)}
                            placeholder="E.g., A futuristic lab rendering..."
                            className="h-24"
                        />
                        <button
                            onClick={generateImagen}
                            disabled={!imagePrompt || loadingImage}
                            className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-800 transition-colors shadow-green-lg text-white"
                        >
                            {loadingImage ? 'Painting...' : 'Generate Image'}
                        </button>
                        {imageGenResult && (
                            <div className="result mt-4 p-3 bg-black/40 rounded-xl border border-green-900/30">
                                <img src={imageGenResult} alt="Result" className="max-w-full rounded-xl shadow-2xl mx-auto border border-green-500/50" />
                            </div>
                        )}
                    </div>

                    {/* Veo 3.1 */}
                    <div className="card shadow-gray">
                        <h2>Veo 3.1</h2>
                        <p className="text-sm text-gray-400 mb-4">Motion & Video synthesis.</p>
                        <label htmlFor="video-prompt">Scene:</label>
                        <textarea
                            id="video-prompt"
                            value={videoPrompt}
                            onChange={(e) => setVideoPrompt(e.target.value)}
                            placeholder="E.g., Sunset over a digital ocean..."
                        />
                        <button onClick={generateVideo} disabled={!videoPrompt || loadingVideo} className="bg-gray-700 hover:bg-gray-600 shadow-lg text-white">
                            {loadingVideo ? 'Starting...' : 'Generate Video'}
                        </button>
                        {videoResult && (
                            <div className="result">
                                <pre className="text-[10px] text-gray-500">{videoResult}</pre>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {appMode === 'ai-studio-presets' && (
                <div className="vertex-container max-w-2xl mx-auto">
                    <div className="card shadow-purple border-indigo-900/30 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <svg className="w-24 h-24 text-indigo-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" /></svg>
                        </div>
                        <div className="flex justify-between items-center mb-4">
                            <h2>AI Studio (Presets)</h2>
                            <span className="bg-indigo-900/40 text-indigo-300 text-[10px] px-2 py-1 rounded-full border border-indigo-800/50 uppercase tracking-wider font-bold">Fixed Models</span>
                        </div>
                        <p className="text-sm text-gray-400 mb-6">Optimized premium models for AI Studio backend.</p>

                        <div className="mb-6">
                            <label className="block text-sm font-bold mb-2 text-indigo-300">Target Architecture:</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {PRESET_MODELS.map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => setPresetSelectedModel(m.id)}
                                        className={`p-4 rounded-2xl border text-left transition-all duration-300 ${presetSelectedModel === m.id ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.2)]' : 'bg-gray-900/40 border-gray-800 text-gray-400 hover:border-gray-700'}`}
                                    >
                                        <div className="text-sm font-bold">{m.name}</div>
                                        <div className="text-[10px] opacity-60 mt-1 uppercase tracking-tighter">{m.description}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <label htmlFor="preset-prompt">Creative Prompt:</label>
                        <textarea
                            id="preset-prompt"
                            value={textPrompt}
                            onChange={(e) => setTextPrompt(e.target.value)}
                            placeholder="What do you want to create?"
                            className="h-32 mb-6 p-4 rounded-2xl bg-black/40 border-indigo-900/20 focus:border-indigo-500 transition-all"
                        />

                        <button
                            onClick={async () => {
                                setLoadingText(true);
                                try {
                                    const res = await fetch('/api/gemini', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ prompt: textPrompt, modelId: presetSelectedModel }),
                                    });
                                    const data = await res.json();
                                    if (data.image) setImageResult(data.image);
                                    setTextResult(data.text);
                                } catch (e: any) {
                                    setTextResult(`Error: ${e.message}`);
                                } finally {
                                    setLoadingText(false);
                                }
                            }}
                            disabled={!textPrompt || loadingText}
                            className={`w-full py-4 text-lg font-bold rounded-2xl transition-all ${loadingText ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-lg'}`}
                        >
                            {loadingText ? 'Processing...' : 'Run Analysis'}
                        </button>

                        {(textResult || imageResult) && (
                            <div className="result mt-8 p-4 bg-gray-950/80 rounded-2xl border border-indigo-800/20">
                                {imageResult && (
                                    <img src={imageResult} alt="Result" className="max-w-full rounded-2xl shadow-2xl mx-auto border-2 border-indigo-600 mb-4" />
                                )}
                                {textResult && (
                                    <div className="whitespace-pre-wrap text-sm text-gray-300 p-2">
                                        {textResult}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {appMode === 'vertex-ai' && (
                <div className="vertex-container max-w-2xl mx-auto">
                    <div className="card shadow-purple border-purple-900/30">
                        <div className="flex justify-between items-center mb-4">
                            <h2>Vertex AI (Mode 1)</h2>
                            <span className="bg-purple-900/40 text-purple-300 text-[10px] px-2 py-1 rounded-full border border-purple-800/50 uppercase tracking-wider font-bold">Quota Managed</span>
                        </div>
                        <p className="text-sm text-gray-400 mb-6">Strict 60s cooldown active to preserve Vertex credits.</p>

                        <div className="mb-6">
                            <label className="block text-sm font-bold mb-2 text-purple-300">Vertex Cloud Model:</label>
                            <select
                                value={vertexSelectedModel}
                                onChange={(e) => setVertexSelectedModel(e.target.value)}
                                className="w-full p-4 bg-gray-900/50 border border-purple-900/20 rounded-2xl text-white text-sm focus:border-purple-500 transition-all"
                            >
                                {VERTEX_PRESET_MODELS.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-bold mb-2">Reference Image:</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="w-full p-2 bg-gray-900/50 border border-gray-800 rounded-xl text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-purple-900/40 file:text-purple-300 hover:file:bg-purple-800/50"
                            />
                        </div>

                        <label htmlFor="vertex-prompt">Analysis Prompt:</label>
                        <textarea
                            id="vertex-prompt"
                            value={vertexPrompt}
                            onChange={(e) => setVertexPrompt(e.target.value)}
                            className="h-32 mb-6 p-4 rounded-2xl bg-black/40 border-purple-900/20 focus:border-purple-500"
                        />

                        <button
                            onClick={generateVertex}
                            disabled={!vertexPrompt || vertexLoading || vertexCooldown > 0}
                            className={`w-full py-4 text-lg font-bold rounded-2xl transition-all ${vertexCooldown > 0 ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-lg'}`}
                        >
                            {vertexLoading ? 'Processing...' : vertexCooldown > 0 ? `Wait ${vertexCooldown}s` : 'Call Cloud Vertex'}
                        </button>

                        {vertexResult && (
                            <div className="result mt-8 p-4 bg-gray-950/80 rounded-2xl border border-purple-800/20">
                                {vertexResult.startsWith('data:image') ? (
                                    <img src={vertexResult} alt="Vertex Result" className="max-w-full rounded-2xl shadow-2xl mx-auto border-2 border-purple-600" />
                                ) : (
                                    <div className="whitespace-pre-wrap text-sm text-gray-300 p-2">
                                        {vertexResult}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <footer>
                <p>Powered by Google Cloud Vertex AI & Google AI Studio.</p>
                <div className="mt-2 text-xs text-gray-600">
                    Check your API limits: <a href="https://aistudio.google.com/app/plan_and_billing" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Google AI Studio Quota Dashboard</a>
                </div>
            </footer>
        </div>
    );
}
