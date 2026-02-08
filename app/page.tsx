'use client';

import { useState, useRef, useEffect } from 'react';

// --- ICONS ---
const IconImage = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const IconVideo = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
const IconSparkles = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>;
const IconUpload = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>;

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

    // --- HANDLERS ---
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
            alert('Studio Error: ' + e.message);
        } finally {
            setImageLoading(false);
        }
    };

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

            if (videoMode === 'image') payload.image = videoInputImage;
            else if (videoMode === 'interpolation') {
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
            alert('Studio Error: ' + e.message);
        } finally {
            setVideoLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#0a0a0b] text-zinc-100 font-sans selection:bg-white/20">

            {/* TOP NAVIGATION */}
            <header className="border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-5 h-5 bg-white rounded-md flex items-center justify-center">
                            <div className="w-2 h-2 bg-black rounded-full"></div>
                        </div>
                        <span className="font-semibold text-sm tracking-tight text-zinc-300">Gemini Studio</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/5 text-zinc-500 border border-white/5">PRO</span>
                    </div>

                    <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/5">
                        <button
                            onClick={() => setStudioMode('image')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${studioMode === 'image' ? 'bg-[#151516] text-white shadow-sm ring-1 ring-white/10' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <IconImage />
                            Nano Banana
                        </button>
                        <button
                            onClick={() => setStudioMode('video')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${studioMode === 'video' ? 'bg-[#151516] text-white shadow-sm ring-1 ring-white/10' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <IconVideo />
                            Veo
                        </button>
                    </div>

                    <div className="w-20"></div> {/* Spacer for balance */}
                </div>
            </header>

            <main className="flex-1 max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8">

                {/* --- LEFT PANEL: CONTROLS --- */}
                <div className="flex flex-col gap-6 animate-in slide-in-from-left-4 duration-500 ease-out">

                    {/* MODE SELECTOR (SUB-TABS) */}
                    <div className="space-y-4">
                        <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Configuration</label>

                        {studioMode === 'image' ? (
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => setImageModel('fast')} className={`p-3 rounded-lg border text-left transition-all ${imageModel === 'fast' ? 'bg-zinc-900 border-zinc-700 text-white' : 'border-zinc-800 text-zinc-500 hover:bg-zinc-900/50'}`}>
                                    <div className="text-xs font-medium mb-0.5">Nano Banana</div>
                                    <div className="text-[10px] opacity-60">Gemini 2.5 Flash</div>
                                </button>
                                <button onClick={() => setImageModel('pro')} className={`p-3 rounded-lg border text-left transition-all ${imageModel === 'pro' ? 'bg-zinc-900 border-zinc-700 text-white' : 'border-zinc-800 text-zinc-500 hover:bg-zinc-900/50'}`}>
                                    <div className="text-xs font-medium mb-0.5">Nano Banana PRO</div>
                                    <div className="text-[10px] opacity-60">Gemini 3 Pro Image</div>
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1 bg-zinc-900/30 p-1 rounded-lg border border-white/5">
                                {(['text', 'image', 'interpolation'] as const).map(m => (
                                    <button
                                        key={m}
                                        onClick={() => setVideoMode(m)}
                                        className={`px-3 py-2 text-xs font-medium rounded-md text-left transition-all ${videoMode === m ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    >
                                        {m === 'text' && 'Text to Video'}
                                        {m === 'image' && 'Image to Video'}
                                        {m === 'interpolation' && 'Frame Interpolation'}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* PROMPT AREA */}
                    <div className="space-y-3 flex-1 flex flex-col">
                        <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider flex justify-between">
                            Prompt
                            <span className="text-zinc-600">REQUIRED</span>
                        </label>
                        <textarea
                            value={studioMode === 'image' ? imagePrompt : videoPrompt}
                            onChange={e => studioMode === 'image' ? setImagePrompt(e.target.value) : setVideoPrompt(e.target.value)}
                            placeholder={studioMode === 'image' ? "Describe the image you want to generate..." : "Describe the camera movement, subject, and lighting..."}
                            className="w-full flex-1 min-h-[160px] bg-[#121214] border border-white/10 rounded-xl p-4 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 transition-all resize-none shadow-inner"
                        />
                    </div>

                    {/* ATTACHMENTS */}
                    <div className="space-y-3">
                        <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider flex justify-between">
                            Context Inputs
                            <span className="text-zinc-600">{studioMode === 'image' ? `${referenceImages.length}/3` : 'OPTIONAL'}</span>
                        </label>

                        {studioMode === 'image' && (
                            <div className="grid grid-cols-4 gap-2">
                                {referenceImages.map((img, i) => (
                                    <div key={i} className="aspect-square rounded-lg overflow-hidden border border-white/10 relative group">
                                        <img src={img} className="w-full h-full object-cover" />
                                        <button onClick={() => setReferenceImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-xs">✕</button>
                                    </div>
                                ))}
                                {referenceImages.length < 3 && (
                                    <label className="aspect-square rounded-lg border border-dashed border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/50 transition-all flex flex-col items-center justify-center cursor-pointer text-zinc-600 hover:text-zinc-400">
                                        <IconUpload />
                                        <input type="file" accept="image/*" multiple onChange={handleRefImageUpload} className="hidden" />
                                    </label>
                                )}
                            </div>
                        )}

                        {studioMode === 'video' && videoMode !== 'text' && (
                            <div className="space-y-2">
                                {videoMode === 'image' && (
                                    <div className="border border-dashed border-zinc-800 rounded-lg p-2 hover:bg-zinc-900/30 transition-all text-center">
                                        {videoInputImage ? (
                                            <div className="relative group">
                                                <img src={videoInputImage} className="h-32 w-full object-cover rounded-md" />
                                                <button onClick={() => setVideoInputImage(null)} className="absolute top-2 right-2 bg-black/80 p-1 rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                                            </div>
                                        ) : (
                                            <label className="cursor-pointer block py-8 text-zinc-600 text-xs hover:text-zinc-400">
                                                Upload Source Image
                                                <input type="file" accept="image/*" onChange={(e) => handleVideoImageUpload(setVideoInputImage, e)} className="hidden" />
                                            </label>
                                        )}
                                    </div>
                                )}
                                {videoMode === 'interpolation' && (
                                    <div className="grid grid-cols-2 gap-2">
                                        {/* Start Frame */}
                                        <div className="border border-dashed border-zinc-800 rounded-lg p-1 hover:bg-zinc-900/30 transition-all min-h-[100px] flex items-center justify-center">
                                            {videoStartFrame ? (
                                                <div className="relative w-full h-full group">
                                                    <img src={videoStartFrame} className="w-full h-full object-cover rounded" />
                                                    <button onClick={() => setVideoStartFrame(null)} className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 text-xs">✕</button>
                                                </div>
                                            ) : (
                                                <label className="cursor-pointer text-center w-full py-4">
                                                    <span className="text-[10px] block text-zinc-500 font-bold mb-1">START</span>
                                                    <IconUpload />
                                                    <input type="file" accept="image/*" onChange={(e) => handleVideoImageUpload(setVideoStartFrame, e)} className="hidden" />
                                                </label>
                                            )}
                                        </div>
                                        {/* End Frame */}
                                        <div className="border border-dashed border-zinc-800 rounded-lg p-1 hover:bg-zinc-900/30 transition-all min-h-[100px] flex items-center justify-center">
                                            {videoEndFrame ? (
                                                <div className="relative w-full h-full group">
                                                    <img src={videoEndFrame} className="w-full h-full object-cover rounded" />
                                                    <button onClick={() => setVideoEndFrame(null)} className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 text-xs">✕</button>
                                                </div>
                                            ) : (
                                                <label className="cursor-pointer text-center w-full py-4">
                                                    <span className="text-[10px] block text-zinc-500 font-bold mb-1">END</span>
                                                    <IconUpload />
                                                    <input type="file" accept="image/*" onChange={(e) => handleVideoImageUpload(setVideoEndFrame, e)} className="hidden" />
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={studioMode === 'image' ? generateImage : generateVideo}
                        disabled={studioMode === 'image' ? (imageLoading || !imagePrompt) : (videoLoading || (!videoPrompt && videoMode === 'text'))}
                        className="w-full py-4 bg-white text-black text-sm font-semibold rounded-lg hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                    >
                        {imageLoading || videoLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></span>
                                Processing
                            </span>
                        ) : (
                            <span className="flex items-center justify-center gap-2">
                                <IconSparkles />
                                Generate Output
                            </span>
                        )}
                    </button>
                </div>


                {/* --- RIGHT PANEL: PREVIEW --- */}
                <div className="flex flex-col gap-4 animate-in slide-in-from-right-4 duration-500 ease-out delay-75">
                    <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Output Canvas</label>
                    <div className="flex-1 bg-[#0f0f10] border border-white/5 rounded-2xl flex items-center justify-center overflow-hidden relative shadow-2xl min-h-[600px]">

                        {/* Empty State */}
                        {!imageResult && !videoResult && !imageLoading && !videoLoading && (
                            <div className="text-center space-y-4 max-w-xs opacity-40">
                                <div className="w-16 h-16 bg-white/5 rounded-2xl mx-auto flex items-center justify-center border border-white/5">
                                    {studioMode === 'image' ? <IconImage /> : <IconVideo />}
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-zinc-300">Ready to Create</p>
                                    <p className="text-xs text-zinc-600">Configure your parameters on the left to begin generation.</p>
                                </div>
                            </div>
                        )}

                        {/* Loading State Overlay (Optional, though button has loader) */}

                        {/* Results */}
                        {studioMode === 'image' && imageResult && (
                            <img src={imageResult} alt="Generated" className="max-w-full max-h-full object-contain shadow-2xl rounded-lg animate-in fade-in zoom-in-95 duration-500" />
                        )}

                        {studioMode === 'video' && videoResult && (
                            videoResult.startsWith('http') ? (
                                <div className="text-center space-y-4">
                                    <div className="text-6xl">🎉</div>
                                    <a href={videoResult} target="_blank" className="px-6 py-3 bg-white text-black font-medium rounded-full text-sm hover:scale-105 transition-transform">Download Video</a>
                                </div>
                            ) : (
                                <video src={videoResult} controls autoPlay loop className="max-w-full max-h-full rounded-lg shadow-2xl" />
                            )
                        )}

                    </div>
                </div>

            </main>
        </div>
    );
}
