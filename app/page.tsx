'use client';

import { useState, useRef } from 'react';

export default function Home() {
    // --- APP STATE ---
    type StudioMode = 'image' | 'video';
    const [studioMode, setStudioMode] = useState<StudioMode>('image');

    // --- IMAGE STUDIO STATE ---
    type ImageModel = 'fast' | 'pro';
    const [imageModel, setImageModel] = useState<ImageModel>('pro');
    const [imagePrompt, setImagePrompt] = useState('');
    const [referenceImages, setReferenceImages] = useState<string[]>([]);
    const [imageResult, setImageResult] = useState<string | null>(null);
    const [imageLoading, setImageLoading] = useState(false);

    // --- VIDEO STUDIO STATE ---
    type VideoMode = 'text' | 'image' | 'interpolation';
    const [videoMode, setVideoMode] = useState<VideoMode>('text');
    const [videoPrompt, setVideoPrompt] = useState('');
    const [videoInputImage, setVideoInputImage] = useState<string | null>(null);
    const [videoStartFrame, setVideoStartFrame] = useState<string | null>(null);
    const [videoEndFrame, setVideoEndFrame] = useState<string | null>(null);
    const [videoResult, setVideoResult] = useState<string | null>(null);
    const [videoLoading, setVideoLoading] = useState(false);

    // --- HELPER FUNCTIONS ---
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    // --- IMAGE HANDLERS ---
    const handleRefImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const remaining = 3 - referenceImages.length;
            const newBase64s = await Promise.all(files.slice(0, remaining).map(fileToBase64));
            setReferenceImages(prev => [...prev, ...newBase64s]);
        }
    };

    const generateImage = async () => {
        setImageLoading(true);
        setImageResult(null);
        try {
            const res = await fetch('/api/imagen', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: imagePrompt,
                    mode: imageModel,
                    referenceImages: referenceImages
                }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setImageResult(data.image);
        } catch (e: any) {
            alert('Image Gen Error: ' + e.message);
        } finally {
            setImageLoading(false);
        }
    };

    // --- VIDEO HANDLERS ---
    const handleVideoImageUpload = async (setter: (val: string | null) => void, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const base64 = await fileToBase64(e.target.files[0]);
            setter(base64);
        }
    };

    const generateVideo = async () => {
        setVideoLoading(true);
        setVideoResult(null);
        try {
            const payload: any = {
                prompt: videoPrompt,
                mode: videoMode
            };

            if (videoMode === 'image') {
                payload.image = videoInputImage;
            } else if (videoMode === 'interpolation') {
                payload.startFrame = videoStartFrame;
                payload.endFrame = videoEndFrame;
            }

            const res = await fetch('/api/veo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            if (data.video) setVideoResult(data.video);
            else if (data.videoUrl) setVideoResult(data.videoUrl);
            else alert('Generation complete, but no video returned. Check logs.');

        } catch (e: any) {
            alert('Video Gen Error: ' + e.message);
        } finally {
            setVideoLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white selection:bg-purple-500/30 font-sans p-6 md:p-12">
            <div className="max-w-7xl mx-auto">

                {/* HEADER */}
                <header className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-400">
                            GEMINI STUDIO
                        </h1>
                        <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-bold mt-2">
                            Advanced Generative Laboratory
                        </p>
                    </div>

                    <div className="flex bg-white/5 p-1 rounded-full border border-white/10 backdrop-blur-md">
                        <button
                            onClick={() => setStudioMode('image')}
                            className={`px-8 py-3 rounded-full text-sm font-black uppercase tracking-wider transition-all duration-300 ${studioMode === 'image' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg scale-105' : 'text-gray-400 hover:text-white'}`}
                        >
                            Nano Banana
                        </button>
                        <button
                            onClick={() => setStudioMode('video')}
                            className={`px-8 py-3 rounded-full text-sm font-black uppercase tracking-wider transition-all duration-300 ${studioMode === 'video' ? 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white shadow-lg scale-105' : 'text-gray-400 hover:text-white'}`}
                        >
                            Veo Cinema
                        </button>
                    </div>
                </header>

                {/* --- IMAGE STUDIO --- */}
                {studioMode === 'image' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        {/* CONTROLS */}
                        <div className="space-y-8">
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-sm">
                                <label className="text-[10px] items-center gap-2 flex font-black text-purple-400 uppercase tracking-widest mb-4">
                                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                                    Model Architecture
                                </label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setImageModel('fast')}
                                        className={`p-4 rounded-2xl border text-left transition-all ${imageModel === 'fast' ? 'bg-purple-500/20 border-purple-500 text-white ring-1 ring-purple-500/50' : 'bg-black/20 border-white/5 text-gray-500 hover:border-white/20'}`}
                                    >
                                        <div className="text-sm font-bold">Nano Banana</div>
                                        <div className="text-[10px] opacity-60">High-Speed Engine</div>
                                    </button>
                                    <button
                                        onClick={() => setImageModel('pro')}
                                        className={`p-4 rounded-2xl border text-left transition-all ${imageModel === 'pro' ? 'bg-purple-500/20 border-purple-500 text-white ring-1 ring-purple-500/50' : 'bg-black/20 border-white/5 text-gray-500 hover:border-white/20'}`}
                                    >
                                        <div className="text-sm font-bold">Nano Banana PRO</div>
                                        <div className="text-[10px] opacity-60">High-Fidelity Imagen 3</div>
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-sm">
                                <label className="text-[10px] items-center gap-2 flex font-black text-blue-400 uppercase tracking-widest mb-4">
                                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                    Prompt Engineering
                                </label>
                                <textarea
                                    value={imagePrompt}
                                    onChange={e => setImagePrompt(e.target.value)}
                                    placeholder="Describe your vision in detail..."
                                    className="w-full h-40 bg-black/40 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all resize-none placeholder:text-gray-700"
                                />
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <label className="text-[10px] items-center gap-2 flex font-black text-pink-400 uppercase tracking-widest">
                                        <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                                        References ({referenceImages.length}/3)
                                    </label>
                                    {referenceImages.length > 0 && (
                                        <button onClick={() => setReferenceImages([])} className="text-[10px] text-red-400 hover:text-white uppercase transition-colors">Clear</button>
                                    )}
                                </div>

                                <div className="flex gap-4 overflow-x-auto pb-2">
                                    {referenceImages.map((img, i) => (
                                        <div key={i} className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-white/10 group">
                                            <img src={img} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    ))}
                                    {referenceImages.length < 3 && (
                                        <label className="flex-shrink-0 w-20 h-20 rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer hover:border-white/30 hover:bg-white/5 transition-all text-gray-600 hover:text-white">
                                            <span className="text-2xl">+</span>
                                            <input type="file" accept="image/*" multiple onChange={handleRefImageUpload} className="hidden" />
                                        </label>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={generateImage}
                                disabled={imageLoading || !imagePrompt}
                                className="w-full py-5 rounded-2xl bg-white text-black font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 transition-all shadow-xl shadow-purple-900/20"
                            >
                                {imageLoading ? 'Synthesizing...' : 'Generate Art'}
                            </button>
                        </div>

                        {/* PREVIEW */}
                        <div className="bg-black/40 border border-white/10 rounded-3xl p-2 min-h-[500px] flex items-center justify-center relative overflow-hidden group">
                            {imageResult ? (
                                <img src={imageResult} className="w-full h-full object-contain rounded-2xl shadow-2xl" />
                            ) : (
                                <div className="text-center opacity-30">
                                    <div className="text-6xl mb-4">🎨</div>
                                    <div className="text-xs font-black uppercase tracking-widest">Canvas Empty</div>
                                </div>
                            )}
                            {/* Texture overlay */}
                            <div className="absolute inset-0 bg-noise opacity-10 pointer-events-none"></div>
                        </div>
                    </div>
                )}


                {/* --- VIDEO STUDIO --- */}
                {studioMode === 'video' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        {/* CONTROLS */}
                        <div className="space-y-8">
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-2 backdrop-blur-sm flex">
                                {(['text', 'image', 'interpolation'] as const).map(m => (
                                    <button
                                        key={m}
                                        onClick={() => setVideoMode(m)}
                                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-wider rounded-2xl transition-all ${videoMode === m ? 'bg-yellow-500 text-black shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-sm space-y-6">
                                {/* DYNAMIC INPUTS BASED ON MODE */}
                                {videoMode === 'image' && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">Source Image</label>
                                        <div className="flex gap-4">
                                            {videoInputImage ? (
                                                <div className="w-32 h-20 rounded-xl overflow-hidden border border-white/10 relative">
                                                    <img src={videoInputImage} className="w-full h-full object-cover" />
                                                    <button onClick={() => setVideoInputImage(null)} className="absolute inset-0 bg-black/50 text-white opacity-0 hover:opacity-100 flex items-center justify-center text-xs">Remove</button>
                                                </div>
                                            ) : (
                                                <label className="w-full h-20 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center cursor-pointer hover:border-yellow-500/50 hover:bg-yellow-500/10 transition-all text-xs font-bold text-gray-500 uppercase">
                                                    Upload Reference
                                                    <input type="file" accept="image/*" onChange={(e) => handleVideoImageUpload(setVideoInputImage, e)} className="hidden" />
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {videoMode === 'interpolation' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-green-400 uppercase tracking-widest">Start Frame</label>
                                            {videoStartFrame ? (
                                                <div className="w-full h-20 rounded-xl overflow-hidden border border-white/10 relative">
                                                    <img src={videoStartFrame} className="w-full h-full object-cover" />
                                                    <button onClick={() => setVideoStartFrame(null)} className="absolute inset-0 bg-black/50 text-white opacity-0 hover:opacity-100 flex items-center justify-center text-xs">Remove</button>
                                                </div>
                                            ) : (
                                                <label className="w-full h-20 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center cursor-pointer hover:border-green-500/50 hover:bg-green-500/10 transition-all text-xs font-bold text-gray-500">Upload Start<input type="file" accept="image/*" onChange={(e) => handleVideoImageUpload(setVideoStartFrame, e)} className="hidden" /></label>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-red-400 uppercase tracking-widest">End Frame</label>
                                            {videoEndFrame ? (
                                                <div className="w-full h-20 rounded-xl overflow-hidden border border-white/10 relative">
                                                    <img src={videoEndFrame} className="w-full h-full object-cover" />
                                                    <button onClick={() => setVideoEndFrame(null)} className="absolute inset-0 bg-black/50 text-white opacity-0 hover:opacity-100 flex items-center justify-center text-xs">Remove</button>
                                                </div>
                                            ) : (
                                                <label className="w-full h-20 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center cursor-pointer hover:border-red-500/50 hover:bg-red-500/10 transition-all text-xs font-bold text-gray-500">Upload End<input type="file" accept="image/*" onChange={(e) => handleVideoImageUpload(setVideoEndFrame, e)} className="hidden" /></label>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Cinematic Prompt</label>
                                    <textarea
                                        value={videoPrompt}
                                        onChange={e => setVideoPrompt(e.target.value)}
                                        placeholder="Camera movement, lighting, action..."
                                        className="w-full h-32 bg-black/40 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all resize-none placeholder:text-gray-700"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={generateVideo}
                                disabled={videoLoading || (!videoPrompt && videoMode === 'text')}
                                className="w-full py-5 rounded-2xl bg-white text-black font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 transition-all shadow-xl shadow-yellow-900/20"
                            >
                                {videoLoading ? 'Rendering Cinema...' : 'Generate Video'}
                            </button>
                        </div>

                        {/* PREVIEW */}
                        <div className="bg-black/40 border border-white/10 rounded-3xl p-2 min-h-[500px] flex items-center justify-center relative overflow-hidden group">
                            {videoResult ? (
                                videoResult.startsWith('http') ? (
                                    <a href={videoResult} target="_blank" className="text-yellow-500 underline text-lg font-bold">Download Rendered Video</a>
                                ) : (
                                    <video src={videoResult} controls autoPlay loop className="w-full h-full object-contain rounded-2xl shadow-2xl" />
                                )
                            ) : (
                                <div className="text-center opacity-30">
                                    <div className="text-6xl mb-4">🎬</div>
                                    <div className="text-xs font-black uppercase tracking-widest">No Footage</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
