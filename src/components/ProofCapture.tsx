import React, { useEffect, useRef, useState } from 'react';

export interface ProofMedia { signature?: string; photo?: string; }
interface Props { onChange: (media: ProofMedia) => void; }

const SIGNATURE_LIMIT = 60000;
const PHOTO_LIMIT = 70000;

/** Handwritten signature pad plus optional photo, kept small enough for the API's request limit. */
export const ProofCapture: React.FC<Props> = ({ onChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const media = useRef<ProofMedia>({});
  const [hasSignature, setHasSignature] = useState(false);
  const [photoPreview, setPhotoPreview] = useState('');
  const [error, setError] = useState('');

  const emit = (patch: ProofMedia) => { media.current = { ...media.current, ...patch }; onChange(media.current); };

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0f172a';
  }, []);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!; const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * (canvas.width / rect.width), y: (event.clientY - rect.top) * (canvas.height / rect.height) };
  };
  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d'); if (!ctx) return;
    event.currentTarget.setPointerCapture(event.pointerId); drawing.current = true;
    const { x, y } = point(event); ctx.beginPath(); ctx.moveTo(x, y);
  };
  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d'); if (!ctx) return;
    const { x, y } = point(event); ctx.lineTo(x, y); ctx.stroke();
  };
  const end = () => {
    if (!drawing.current) return; drawing.current = false; setError('');
    const data = canvasRef.current!.toDataURL('image/png');
    if (data.length > SIGNATURE_LIMIT) { setError('The signature is too detailed. Clear it and sign again more simply.'); emit({ signature: undefined }); return; }
    setHasSignature(true); emit({ signature: data });
  };
  const clear = () => {
    const canvas = canvasRef.current; const ctx = canvas?.getContext('2d'); if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height); setHasSignature(false); setError(''); emit({ signature: undefined });
  };

  const choosePhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return; setError('');
    if (!file.type.startsWith('image/')) { setError('Choose an image file.'); return; }
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, 480 / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas'); canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      let quality = 0.6; let data = canvas.toDataURL('image/jpeg', quality);
      while (data.length > PHOTO_LIMIT && quality > 0.2) { quality -= 0.1; data = canvas.toDataURL('image/jpeg', quality); }
      if (data.length > PHOTO_LIMIT) { setError('That photo is too large to attach. Try a closer, simpler photo.'); return; }
      setPhotoPreview(data); emit({ photo: data });
    };
    img.onerror = () => { URL.revokeObjectURL(url); setError('That image could not be read.'); };
    img.src = url;
  };
  const removePhoto = () => { setPhotoPreview(''); emit({ photo: undefined }); };

  return <div className="space-y-3">
    <div>
      <div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-700" id="sig-label">Recipient signature (optional)</span><button type="button" onClick={clear} disabled={!hasSignature} className="min-h-8 rounded border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 disabled:opacity-40">Clear</button></div>
      <canvas ref={canvasRef} width={400} height={150} aria-labelledby="sig-label" role="img" onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} className="mt-1 h-[150px] w-full touch-none rounded-lg border border-slate-300 bg-white" />
    </div>
    <div>
      <label className="block text-xs font-semibold text-slate-700">Delivery photo (optional)<input type="file" accept="image/*" capture="environment" onChange={choosePhoto} className="mt-1 block w-full text-xs" /></label>
      {photoPreview && <div className="mt-2 flex items-center gap-3"><img src={photoPreview} alt="Delivery photo preview" className="h-16 w-16 rounded-lg object-cover" /><button type="button" onClick={removePhoto} className="min-h-8 rounded border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700">Remove photo</button></div>}
    </div>
    {error && <p role="alert" className="text-xs font-semibold text-rose-700">{error}</p>}
  </div>;
};
