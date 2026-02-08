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

    // Vertex AI Mode State
    const [appMode, setAppMode] = useState<'ai-studio' | 'vertex-ai'>('ai-studio');
    const [vertexPrompt, setVertexPrompt] = useState('');
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
                    imageBase64: vertexImageBase64
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
            <header className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
                <h1>AI Studio & Vertex AI Hub</h1>
                <div className="mode-switch flex bg-gray-900 p-1 rounded-lg border border-gray-700">
                    <button
                        onClick={() => setAppMode('ai-studio')}
                        className={`px-4 py-2 rounded-md text-sm transition-all ${appMode === 'ai-studio' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        Google AI Studio
                    </button>
                    <button
                        onClick={() => setAppMode('vertex-ai')}
                        className={`px-4 py-2 rounded-md text-sm transition-all ${appMode === 'vertex-ai' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        Vertex AI (Protected)
                    </button>
                </div>
            </header>

            {appMode === 'ai-studio' ? (
                <div className="grid">
                    {/* Advanced Generation (Gemini) */}
                    <div className="card shadow-blue">
                        <h2>Advanced Generation (Gemini)</h2>
                        <p className="text-sm text-gray-400 mb-4">Text, Vision, and Experimental Image Generation.</p>

                        <div className="mb-4">
                            <label className="block text-sm font-bold mb-2">Search & Select Model:</label>
                            <input
                                type="text"
                                placeholder="Filter models (e.g., flash, image)..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full p-2 mb-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                            />
                            <select
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                                className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
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
                            placeholder="E.g., Prepare a detailed recipe for a space-themed cocktail..."
                            className="h-24"
                        />

                        <button
                            onClick={generateText}
                            disabled={!textPrompt || loadingText}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 transition-colors"
                        >
                            {loadingText ? 'Processing...' : 'Generate Content'}
                        </button>

                        {(textResult || imageResult) && (
                            <div className="result mt-4 p-3 bg-black rounded border border-gray-800">
                                {imageResult && (
                                    <div className="mb-4 text-center">
                                        <img src={imageResult} alt="Generated" className="max-w-full rounded shadow-lg mx-auto border border-blue-500" />
                                        <p className="text-xs text-gray-500 mt-2">Generated Image</p>
                                    </div>
                                )}
                                {textResult && (
                                    <div className="whitespace-pre-wrap text-sm">
                                        <strong>Response:</strong>
                                        <p className="mt-2 text-gray-300">{textResult}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Imagen 4 (Image Generation) */}
                    <div className="card shadow-green">
                        <h2>Imagen 4 (High Quality)</h2>
                        <p className="text-sm text-gray-400 mb-4">Dedicated state-of-the-art image generation.</p>

                        <label htmlFor="image-prompt">Image Description:</label>
                        <textarea
                            id="image-prompt"
                            value={imagePrompt}
                            onChange={(e) => setImagePrompt(e.target.value)}
                            placeholder="E.g., A hyper-realistic space banana explorer..."
                            className="h-24"
                        />

                        <button
                            onClick={generateImagen}
                            disabled={!imagePrompt || loadingImage}
                            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-700 transition-colors"
                            style={{ background: 'linear-gradient(to right, #10b981, #059669)', color: '#fff' }}
                        >
                            {loadingImage ? 'Painting...' : 'Generate Image'}
                        </button>

                        {imageGenResult && (
                            <div className="result mt-4 p-3 bg-black rounded border border-gray-800">
                                <img src={imageGenResult} alt="Imagen Result" className="max-w-full rounded shadow-lg mx-auto border border-green-500" />
                                <p className="text-xs text-center text-gray-500 mt-2">Generated by Imagen 4</p>
                            </div>
                        )}
                    </div>

                    {/* Veo 3.1 (Video) */}
                    <div className="card shadow-gray">
                        <h2>Veo 3.1 Video Generation</h2>
                        <p className="text-sm text-gray-400 mb-4">Creates high-fidelity videos from text.</p>

                        <label htmlFor="video-prompt">Describe the video:</label>
                        <textarea
                            id="video-prompt"
                            value={videoPrompt}
                            onChange={(e) => setVideoPrompt(e.target.value)}
                            placeholder="E.g., A futuristic city with flying cars..."
                        />

                        <button onClick={generateVideo} disabled={!videoPrompt || loadingVideo}>
                            {loadingVideo ? 'Starting Generation...' : 'Generate Video'}
                        </button>

                        {videoResult && (
                            <div className="result">
                                <strong>API Output:</strong>
                                <pre>{videoResult}</pre>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* Vertex AI Mode UI */
                <div className="vertex-container max-w-2xl mx-auto">
                    <div className="card shadow-purple border-purple-900">
                        <div className="flex justify-between items-center mb-4">
                            <h2>Vertex AI Generation (Mode 1)</h2>
                            <span className="bg-purple-900 text-purple-200 text-xs px-2 py-1 rounded-full border border-purple-700">Protected Quota Mode</span>
                        </div>
                        <p className="text-sm text-gray-400 mb-6">Strict rate-limiting enabled (1 request per minute) to preserve Vertex AI quotas.</p>

                        <div className="mb-6">
                            <label className="block text-sm font-bold mb-2">Reference Image (Image-to-Image / Vision):</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="w-full p-2 bg-gray-900 border border-gray-800 rounded text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-900 file:text-purple-200 hover:file:bg-purple-800"
                            />
                            {vertexImageBase64 && (
                                <div className="mt-4 text-center">
                                    <img src={vertexImageBase64} alt="Preview" className="h-32 rounded-lg mx-auto border border-purple-500 opacity-60" />
                                </div>
                            )}
                        </div>

                        <label htmlFor="vertex-prompt">What should the AI generate/analyze?</label>
                        <textarea
                            id="vertex-prompt"
                            value={vertexPrompt}
                            onChange={(e) => setVertexPrompt(e.target.value)}
                            placeholder="E.g., Design a futuristic banana explorer based on this reference..."
                            className="h-32 mb-4"
                        />

                        <button
                            onClick={generateVertex}
                            disabled={!vertexPrompt || vertexLoading || vertexCooldown > 0}
                            className={`w-full py-4 text-lg font-bold rounded-xl transition-all ${vertexCooldown > 0 ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-lg'}`}
                        >
                            {vertexLoading ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Thinking...
                                </span>
                            ) : vertexCooldown > 0 ? (
                                `Cooldown: ${vertexCooldown}s`
                            ) : (
                                'Generate with Vertex AI'
                            )}
                        </button>

                        {vertexResult && (
                            <div className="result mt-8 p-4 bg-gray-950 rounded-2xl border border-purple-800">
                                {vertexResult.startsWith('data:image') ? (
                                    <img src={vertexResult} alt="Vertex Result" className="max-w-full rounded-xl shadow-2xl mx-auto border-2 border-purple-600" />
                                ) : (
                                    <div className="whitespace-pre-wrap text-sm text-gray-200 p-4 leading-relaxed">
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
