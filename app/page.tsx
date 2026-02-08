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

    type AppMode = 'ai-studio-discovery' | 'ai-studio-presets' | 'vertex-ai';
    const [appMode, setAppMode] = useState<AppMode>('ai-studio-discovery');

    // Restore missing states for functionality stability
    const [vertexPrompt, setVertexPrompt] = useState('');
    const [vertexSelectedModel, setVertexSelectedModel] = useState('gemini-1.5-pro');
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
                    const enrichedModels = data.models.map((m: any) => ({
                        ...m,
                        displayNameWithType: `[${m.type.toUpperCase()}] ${m.displayName || m.id}`
                    }));
                    setAvailableModels(enrichedModels);

                    const flash15 = enrichedModels.find((m: any) => m.id === 'gemini-1.5-flash');
                    if (flash15) setSelectedModel(flash15.id);
                    else setSelectedModel(enrichedModels[0].id);
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

            if (data.video) {
                setVideoResult(data.video);
            } else if (data.videoUrl) {
                setVideoResult(data.videoUrl);
            } else {
                setVideoResult(data.text || "Video request accepted.");
            }
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
                <h1 className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-600">
                    Advanced AI Discovery Hub
                </h1>
                <div className="flex gap-4">
                    <a href="https://aistudio.google.com/app/plan" target="_blank" rel="noreferrer" className="text-[10px] text-gray-500 hover:text-blue-400 transition-colors border border-gray-800 rounded-px px-2 py-1">
                        Monitor Quotas
                    </a>
                </div>
            </header>

            {appMode === 'ai-studio-discovery' && (
                <div className="flex flex-col gap-8 max-w-5xl mx-auto">
                    {/* Advanced Generation (Gemini) - FULL WIDTH */}
                    <div className="card shadow-blue w-full">
                        <div className="flex justify-between items-center mb-4">
                            <h2>Advanced Generation (Discovery)</h2>
                            <span className="bg-blue-950/40 text-blue-300 text-[10px] px-2 py-1 rounded-full border border-blue-800/50 uppercase tracking-wider font-bold">Auto Mode</span>
                        </div>

                        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-1">
                                <label className="block text-sm font-bold mb-2 text-blue-300">Model Selector:</label>
                                <select
                                    value={selectedModel}
                                    onChange={(e) => setSelectedModel(e.target.value)}
                                    className="w-full p-4 bg-gray-900 border border-gray-800 rounded-2xl text-white text-sm cursor-pointer focus:border-blue-500 transition-all appearance-none"
                                >
                                    {availableModels.length === 0 && <option>Loading models...</option>}
                                    {Object.keys(groupedModels).sort().map(family => (
                                        <optgroup key={family} label={family}>
                                            {groupedModels[family].map((model: any) => (
                                                <option key={model.id} value={model.id}>
                                                    {model.displayNameWithType || model.displayName || model.id}
                                                </option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                            </div>
                            <div className="col-span-1">
                                <label className="block text-sm font-bold mb-2 text-gray-400">Search Filter:</label>
                                <input
                                    type="text"
                                    placeholder="Find model (e.g., flash, image)..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full p-4 bg-gray-900/50 border border-gray-800 rounded-2xl text-white text-sm focus:border-blue-500 transition-all outline-none"
                                />
                            </div>
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

                    {/* Veo 3.1 - MOVED TO BOTTOM */}
                    <div className="card shadow-gray w-full bg-black/40 border border-gray-800 mt-8">
                        <div className="flex justify-between items-center mb-4">
                            <h2>Veo 3.1 (Video Studio)</h2>
                            <span className="bg-indigo-950/40 text-indigo-300 text-[10px] px-2 py-1 rounded-full border border-indigo-800/50 uppercase tracking-wider font-bold">Experimental</span>
                        </div>
                        <p className="text-sm text-gray-400 mb-6 leading-relaxed">High-fidelity motion & video synthesis via Vertex Video Intelligence.</p>

                        <label htmlFor="video-prompt" className="block text-sm font-bold mb-2 text-indigo-300">Video Script / Scene Description:</label>
                        <textarea
                            id="video-prompt"
                            value={videoPrompt}
                            onChange={(e) => setVideoPrompt(e.target.value)}
                            placeholder="A high-speed drone shot through a futuristic cyber-city at neon midnight..."
                            className="w-full h-32 p-4 bg-gray-900/50 border border-gray-800 rounded-2xl text-gray-200 text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none resize-none mb-6"
                        />
                        <button
                            onClick={generateVideo}
                            disabled={!videoPrompt || loadingVideo}
                            className="w-full py-4 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 text-white font-bold rounded-2xl transition-all shadow-indigo-lg active:scale-[0.98]"
                        >
                            {loadingVideo ? 'Orchestrating Motion...' : 'Animate Scene'}
                        </button>

                        {videoResult && (
                            <div className="result mt-6 p-4 bg-gray-950 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden">
                                {videoResult.startsWith('data:video') || videoResult.startsWith('http') || videoResult.endsWith('.mp4') ? (
                                    <div className="relative group">
                                        <video
                                            src={videoResult}
                                            controls
                                            autoPlay
                                            loop
                                            className="w-full rounded-xl border border-gray-700 shadow-indigo-lg"
                                        />
                                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-[10px] px-2 py-1 rounded text-gray-300 font-bold uppercase tracking-widest">Veo 3.1 Output</div>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-gray-900/50 rounded-xl border border-gray-800">
                                        <pre className="text-[10px] text-gray-500 whitespace-pre-wrap">{videoResult}</pre>
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
