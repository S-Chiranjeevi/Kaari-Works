"use client";

import { ChangeEvent, DragEvent, useRef } from "react";
import { Camera, ImagePlus, Sparkles, Trash2 } from "lucide-react";

export function ProductPhotoUpload({ image, enhancing, onSelect, onEnhance, onRemove }: {
  image: string;
  enhancing: boolean;
  onSelect: (file?: File) => void;
  onEnhance: () => void;
  onRemove: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const accept = (event: ChangeEvent<HTMLInputElement>) => onSelect(event.target.files?.[0]);
  const drop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    onSelect(event.dataTransfer.files?.[0]);
  };
  return <div className="listing-photo-section">
    <strong className="listing-section-label">A photo of your creation</strong>
    <label className={"photo-dropzone " + (image ? "has-photo" : "")} onDragOver={(event)=>event.preventDefault()} onDrop={drop}>
      <input ref={input} className="photo-file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={accept}/>
      {image ? <img src={image} alt="Product photo preview"/> : <span className="photo-prompt"><Camera size={26}/><strong>Choose a photo to get started</strong><small>JPG, PNG or WebP · up to 1 MB</small></span>}
      {!image&&<span className="photo-hover"><ImagePlus size={17}/> Browse or drop a photo here</span>}
    </label>
    {image&&<div className="photo-toolbar"><span>Photo ready · review its details before publishing</span><div><button type="button" className="button soft" onClick={onEnhance} disabled={enhancing}><Sparkles size={14}/>{enhancing?"Enhancing…":"Enhance with AI"}</button><button type="button" className="button outline" onClick={onRemove}><Trash2 size={14}/>Remove</button></div><small>AI edits can change details. Compare with the original to ensure it still accurately shows your work.</small></div>}
  </div>;
}

export function FairPriceGuide({ range, cost, hours, experience, price, setPrice }: {
  range: {low:number;high:number}|null;
  cost: string;
  hours: string;
  experience: string;
  price: string;
  setPrice: (value:string)=>void;
}) {
  const money=(value:string)=>value?"₹"+Number(value).toLocaleString("en-IN"):"—";
  return <aside className="fair-price-column"><section className="fair-price-panel"><div className="fair-price-title"><h2>Your fair-price guide</h2><Sparkles size={17}/></div>
    <div className={"suggested-price-card " + (range?"has-range":"")}><span>Suggested price range</span>{range?<><strong>₹{range.low.toLocaleString("en-IN")} – ₹{range.high.toLocaleString("en-IN")}</strong><small>per piece · adjust for your materials, buyer and order size</small></>:<strong className="price-empty">Add your costs</strong>}<p>Your price should honour your time and skill. Add a making cost and hours to get a starting suggestion.</p></div>
    <dl className="price-breakdown"><div><dt>Materials &amp; making cost</dt><dd>{money(cost)}</dd></div><div><dt>Your time, valued fairly</dt><dd>{hours?hours+" hrs":"—"}</dd></div><div><dt>Craft &amp; experience premium</dt><dd>{experience?experience+" yrs":"—"}</dd></div><div><dt>Comparable market range</dt><dd>Varies by craft</dd></div></dl>
    <div className="price-guide-note"><strong>ⓘ A guide, not a fixed price</strong><p>This starting estimate reflects the details you share. You always choose the final price for your work.</p></div>
    <label className="field final-price-field"><span>Your final price (₹)</span><input required type="number" min="1" value={price} onChange={(event)=>setPrice(event.target.value)} placeholder={range?"e.g. ₹"+range.low.toLocaleString("en-IN"):"You decide what feels fair"}/></label>
    {range&&<button className="button soft use-suggested-price" type="button" onClick={()=>setPrice(String(range.low))}>Use suggested starting price</button>}
    <small className="price-formula-note">Estimate based on cost, making time, experience, overhead and margin—not a live market quote.</small>
  </section><section className="seller-story-card"><strong>✦ Your story matters</strong><p>Share your materials, techniques and the people behind your craft with potential buyers.</p></section></aside>;
}
