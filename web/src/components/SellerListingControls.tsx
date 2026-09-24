"use client";

import { ChangeEvent, DragEvent, useRef } from "react";
import { Camera, ImagePlus, Sparkles, Trash2 } from "lucide-react";
import { useLang } from "@/lib/i18n";

export function ProductPhotoUpload({ image, enhancing, onSelect, onEnhance, onRemove }: {
  image: string;
  enhancing: boolean;
  onSelect: (file?: File) => void;
  onEnhance: () => void;
  onRemove: () => void;
}) {
  const { t } = useLang();
  const input = useRef<HTMLInputElement>(null);
  const accept = (event: ChangeEvent<HTMLInputElement>) => onSelect(event.target.files?.[0]);
  const drop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    onSelect(event.dataTransfer.files?.[0]);
  };
  return <div className="listing-photo-section">
    <strong className="listing-section-label">{t("photoLabel")}</strong>
    <label className={"photo-dropzone " + (image ? "has-photo" : "")} style={image ? {height:"auto",minHeight:"168px",overflow:"visible"} : undefined} onDragOver={(event)=>event.preventDefault()} onDrop={drop}>
      <input ref={input} className="photo-file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={accept}/>
      {image
        ? <img src={image} alt={t("photoAlt")} style={{width:"100%",height:"100%",objectFit:"contain",display:"block"}}/>
        : <span className="photo-prompt"><Camera size={26}/><strong>{t("photoChoose")}</strong><small>{t("photoFormats")}</small></span>
      }
      {!image && <span className="photo-hover"><ImagePlus size={17}/> {t("photoBrowse")}</span>}
    </label>
    {image && <div className="photo-toolbar">
      <span>{t("photoReady")}</span>
      <div>
        <button type="button" className="button soft" onClick={onEnhance} disabled={enhancing}>
          <Sparkles size={14}/>{enhancing ? t("photoEnhancing") : t("photoEnhance")}
        </button>
        <button type="button" className="button outline" onClick={onRemove}>
          <Trash2 size={14}/>{t("photoRemove")}
        </button>
      </div>
      <small>{t("photoNote")}</small>
    </div>}
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
  const { t } = useLang();
  const money = (value: string) => value ? "₹" + Number(value).toLocaleString("en-IN") : "—";
  return <aside className="fair-price-column">
    <section className="fair-price-panel">
      <div className="fair-price-title"><h2>{t("priceGuideTitle")}</h2><Sparkles size={17}/></div>
      <div className={"suggested-price-card " + (range ? "has-range" : "")}>
        <span>{t("suggestedRange")}</span>
        {range
          ? <><strong>₹{range.low.toLocaleString("en-IN")} – ₹{range.high.toLocaleString("en-IN")}</strong><small>{t("perPieceAdjust")}</small></>
          : <strong className="price-empty">{t("addYourCosts")}</strong>
        }
        <p>{t("priceHonour")}</p>
      </div>
      <dl className="price-breakdown">
        <div><dt>{t("materialsCost")}</dt><dd>{money(cost)}</dd></div>
        <div><dt>{t("timeFairly")}</dt><dd>{hours ? hours + " hrs" : "—"}</dd></div>
        <div><dt>{t("experiencePremium")}</dt><dd>{experience ? experience + " yrs" : "—"}</dd></div>
        <div><dt>{t("marketRange")}</dt><dd>{t("variesByCraft")}</dd></div>
      </dl>
      <div className="price-guide-note">
        <strong>{t("guideNote")}</strong>
        <p>{t("guideNoteBody")}</p>
      </div>
      <label className="field final-price-field">
        <span>{t("finalPriceLabel")}</span>
        <input
          required type="number" min="1" value={price}
          onChange={(event) => setPrice(event.target.value)}
          placeholder={range ? "e.g. ₹" + range.low.toLocaleString("en-IN") : t("finalPricePlaceholder")}
        />
      </label>
      {range && <button className="button soft use-suggested-price" type="button" onClick={() => setPrice(String(range.low))}>{t("useSuggested")}</button>}
      <small className="price-formula-note">{t("formulaNote")}</small>
    </section>
    <section className="seller-story-card">
      <strong>{t("storyTitle")}</strong>
      <p>{t("storyBody")}</p>
    </section>
  </aside>;
}
