'use client';

import { useState, useEffect } from 'react';

// --- ICONS (Lucide-style simple SVGs) ---
const IconImage = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>;
const IconVideo = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z" /><rect width="14" height="12" x="2" y="6" rx="2" ry="2" /></svg>;
const IconSparkles = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /><path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" /></svg>;
const IconUpload = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>;
const IconX = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>;
const IconZap = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>;
const IconStar = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;

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
        <div className="flex h-screen w-full bg-[#09090b] text-zinc-100 overflow-hidden font-sans selection:bg-white/10">

            {/* SIDEBAR */}
            <aside className="w-[320px] flex-shrink-0 flex flex-col border-r border-[#27272a] bg-[#09090b] overflow-y-auto">

                {/* Header / Brand */}
                <div className="p-4 border-b border-[#27272a] flex items-center gap-3">
                    <div className="w-8 h-8 bg-white text-black rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                        <IconSparkles />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold tracking-tight text-white">Gemini Studio</h1>
                        <p className="text-[10px] text-zinc-500 font-medium">Vertex AI Laboratory</p>
                    </div>
                </div>

                {/* Main Controls Container */}
                <div className="p-4 flex flex-col gap-6">

                    {/* Studio Mode Switcher */}
                    <div className="bg-[#18181b] p-1 rounded-lg flex border border-[#27272a]">
                        <button
                            onClick={() => setStudioMode('image')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-all ${studioMode === 'image' ? 'bg-[#27272a] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <IconImage />
                            Image
                        </button>
                        <button
                            onClick={() => setStudioMode('video')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-all ${studioMode === 'video' ? 'bg-[#27272a] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <IconVideo />
                            Video
                        </button>
                    </div>

                    {/* DYNAMIC CONFIGURATION */}
                    <div className="flex flex-col gap-4">

                        {studioMode === 'image' && (
                            <div className="flex flex-col gap-3">
                                <label className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">Model</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => setImageModel('fast')} className={`p-3 rounded-lg border text-left transition-all relative overflow-hidden group ${imageModel === 'fast' ? 'bg-[#18181b] border-white/20' : 'border-[#27272a] hover:bg-[#18181b] text-zinc-500'}`}>
                                        <div className="flex items-center gap-2 mb-1 text-xs font-semibold text-zinc-200"><IconZap /> Fast</div>
                                        <div className="text-[10px] text-zinc-500 leading-tight">Gemini 2.5</div>
                                    </button>
                                    <button onClick={() => setImageModel('pro')} className={`p-3 rounded-lg border text-left transition-all relative overflow-hidden group ${imageModel === 'pro' ? 'bg-[#18181b] border-white/20' : 'border-[#27272a] hover:bg-[#18181b] text-zinc-500'}`}>
                                        <div className="flex items-center gap-2 mb-1 text-xs font-semibold text-zinc-200"><IconStar /> Pro</div>
                                        <div className="text-[10px] text-zinc-500 leading-tight">Gemini 3.0</div>
                                    </button>
                                </div>
                            </div>
                        )}

                        {studioMode === 'video' && (
                            <div className="flex flex-col gap-3">
                                <label className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">Mode</label>
                                <div className="flex flex-col gap-1">
                                    {['text', 'image', 'interpolation'].map(m => (
                                        <button
                                            key={m}
                                            onClick={() => setVideoMode(m as any)}
                                            className={`px-3 py-2 text-xs text-left rounded-md border transition-all ${videoMode === m ? 'bg-[#18181b] border-white/10 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                                        >
                                            {m === 'text' && 'Text to Video'}
                                            {m === 'image' && 'Image to Video'}
                                            {m === 'interpolation' && 'Frame Interpolation'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* PROMPT INPUT */}
                        <div className="flex flex-col gap-3">
                            <label className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">Prompt</label>
                            <textarea
                                value={studioMode === 'image' ? imagePrompt : videoPrompt}
                                onChange={e => studioMode === 'image' ? setImagePrompt(e.target.value) : setVideoPrompt(e.target.value)}
                                placeholder="Describe your vision..."
                                className="w-full h-32 bg-[#18181b] border border-[#27272a] rounded-lg p-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500/50 transition-colors resize-none leading-relaxed"
                            />
                        </div>

                        {/* UPLOAD / CONTEXT */}
                        <div className="flex flex-col gap-3">
                            <div className="flex justify-between items-end">
                                <label className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">References</label>
                                <span className="text-[10px] text-zinc-600 font-mono">{studioMode === 'image' ? `${referenceImages.length}/3` : 'OPTIONAL'}</span>
                            </div>

                            {/* Image Studio Uploads */}
                            {studioMode === 'image' && (
                                <div className="grid grid-cols-3 gap-2">
                                    {referenceImages.map((img, i) => (
                                        <div key={i} className="aspect-square rounded-md bg-[#18181b] border border-[#27272a] relative group overflow-hidden">
                                            <img src={img} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                            <button onClick={() => setReferenceImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-0.5 right-0.5 bg-black/50 p-0.5 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                                <IconX />
                                            </button>
                                        </div>
                                    ))}
                                    {referenceImages.length < 3 && (
                                        <label className="aspect-square rounded-md border border-dashed border-[#27272a] hover:border-zinc-500 hover:bg-[#18181b] flex flex-col items-center justify-center cursor-pointer transition-all text-zinc-600 hover:text-zinc-400 gap-1">
                                            <IconUpload />
                                            <input type="file" multiple accept="image/*" className="hidden" onChange={handleRefImageUpload} />
                                        </label>
                                    )}
                                </div>
                            )}

                            {/* Video Studio Uploads */}
                            {studioMode === 'video' && videoMode !== 'text' && (
                                <div className="space-y-2">
                                    {videoMode === 'image' && !videoInputImage && (
                                        <label className="w-full h-20 border border-dashed border-[#27272a] rounded-lg flex items-center justify-center cursor-pointer hover:bg-[#18181b] hover:border-zinc-500 text-zinc-600 hover:text-zinc-400">
                                            <span className="text-[10px] font-medium">Upload Source</span>
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleVideoImageUpload(setVideoInputImage, e)} />
                                        </label>
                                    )}
                                    {videoInputImage && (
                                        <div className="relative rounded-lg overflow-hidden border border-[#27272a] group">
                                            <img src={videoInputImage} className="w-full h-32 object-cover" />
                                            <button onClick={() => setVideoInputImage(null)} className="absolute top-2 right-2 bg-black/50 p-1 rounded text-white opacity-0 group-hover:opacity-100"><IconX /></button>
                                        </div>
                                    )}

                                    {videoMode === 'interpolation' && (
                                        <div className="flex gap-2">
                                            <label className="flex-1 h-16 border border-dashed border-[#27272a] rounded-lg flex items-center justify-center cursor-pointer hover:bg-[#18181b] hover:border-zinc-500 text-zinc-600 hover:text-zinc-400 relative overflow-hidden">
                                                {videoStartFrame ? <img src={videoStartFrame} className="w-full h-full object-cover" /> : <span className="text-[10px]">Start</span>}
                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleVideoImageUpload(setVideoStartFrame, e)} />
                                            </label>
                                            <label className="flex-1 h-16 border border-dashed border-[#27272a] rounded-lg flex items-center justify-center cursor-pointer hover:bg-[#18181b] hover:border-zinc-500 text-zinc-600 hover:text-zinc-400 relative overflow-hidden">
                                                {videoEndFrame ? <img src={videoEndFrame} className="w-full h-full object-cover" /> : <span className="text-[10px]">End</span>}
                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleVideoImageUpload(setVideoEndFrame, e)} />
                                            </label>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                    </div>
                </div>

                {/* Footer Action */}
                <div className="mt-auto p-4 border-t border-[#27272a]">
                    <button
                        onClick={studioMode === 'image' ? generateImage : generateVideo}
                        disabled={studioMode === 'image' ? (imageLoading || !imagePrompt) : (videoLoading || (!videoPrompt && videoMode === 'text'))}
                        className="w-full py-3 bg-white text-black font-semibold text-xs rounded-lg hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {imageLoading || videoLoading ? 'Processing...' : 'Generate Asset'}
                    </button>
                </div>
            </aside>

            {/* MAIN CANVAS */}
            <main className="flex-1 bg-[#09090b] flex items-center justify-center p-8 overflow-hidden relative">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/5 via-[#09090b] to-[#09090b] opacity-50 pointer-events-none"></div>

                <div className="relative max-w-4xl w-full aspect-video flex items-center justify-center rounded-2xl border border-[#27272a] bg-[#0c0c0e] shadow-2xl overflow-hidden">

                    {/* Placeholder */}
                    {!imageResult && !videoResult && !imageLoading && !videoLoading && (
                        <div className="flex flex-col items-center gap-4 opacity-20">
                            <div className="w-16 h-16 bg-[#18181b] rounded-2xl flex items-center justify-center">
                                <IconSparkles />
                            </div>
                            <p className="text-sm font-medium text-zinc-500">Canvas Empty</p>
                        </div>
                    )}

                    {/* Loader */}
                    {(imageLoading || videoLoading) && (
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                            <p className="text-xs text-zinc-400 tracking-widest uppercase animate-pulse">Synthesizing...</p>
                        </div>
                    )}

                    {/* Image Result */}
                    {studioMode === 'image' && imageResult && (
                        <img src={imageResult} className="w-full h-full object-contain" alt="Generated" />
                    )}

                    {/* Video Result */}
                    {studioMode === 'video' && videoResult && (
                        videoResult.startsWith('http') ? (
                            <a href={videoResult} target="_blank" className="px-6 py-3 bg-white text-black text-sm font-medium rounded-full hover:scale-105 transition-transform">Download Video</a>
                        ) : (
                            <video src={videoResult} controls autoPlay loop className="w-full h-full object-contain" />
                        )
                    )}

                </div>
            </main>

        </div>
    );
}
