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

    const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
    const [availableModels, setAvailableModels] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [imagePrompt, setImagePrompt] = useState('');
    const [imageGenResult, setImageGenResult] = useState('');
    const [loadingImage, setLoadingImage] = useState(false);

    // Fetch models on load
    useEffect(() => {
        fetch('/api/models')
            .then(res => res.json())
            .then(data => {
                if (data.models && data.models.length > 0) {
                    setAvailableModels(data.models);
                    // Set default to 2.0 Flash if available
                    const flash20 = data.models.find((m: any) => m.id === 'gemini-2.0-flash');
                    if (flash20) setSelectedModel(flash20.id);
                    else setSelectedModel(data.models[0].id);
                }
            })
            .catch(err => console.error('Failed to load models:', err));
    }, []);

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
            <h1>Vertex AI: Nano Banana, Imagen 4 & Veo 3.1</h1>

            <div className="grid">
                {/* Advanced Generation (Gemini) */}
                <div className="card">
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
                        {selectedModel && (
                            <p className="mt-1 text-xs text-blue-400">
                                ID: <code>{selectedModel}</code>
                            </p>
                        )}
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
                <div className="card">
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
                <div className="card">
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

            <footer>
                <p>Powered by Google Cloud Vertex AI & Google AI Studio.</p>
                <div className="mt-2 text-xs text-gray-600">
                    Check your API limits: <a href="https://aistudio.google.com/app/plan_and_billing" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Google AI Studio Quota Dashboard</a>
                </div>
            </footer>
        </div>
    );
}
