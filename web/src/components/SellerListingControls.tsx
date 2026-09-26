"use client";

import { ChangeEvent, DragEvent, useRef } from "react";
import { Camera, ImagePlus, Plus, Sparkles, Trash2, X } from "lucide-react";
import { useLang } from "@/lib/i18n";

export function ProductPhotoUpload({
  images = [],
  image = "",
  enhancing,
  onAddImages,
  onRemoveImage,
  onSelect,
  onEnhance,
  onRemove,
}: {
  images?: string[];
  image?: string;
  enhancing: boolean;
  onAddImages?: (files: FileList | File[]) => void;
  onRemoveImage?: (index: number) => void;
  onSelect?: (file?: File) => void;
  onEnhance?: (index?: number) => void;
  onRemove?: () => void;
}) {
  const { t } = useLang();
  const inputRef = useRef<HTMLInputElement>(null);

  // Combine image list
  const photoList = images.length > 0 ? images : image ? [image] : [];

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (onAddImages) {
      onAddImages(files);
    } else if (onSelect) {
      onSelect(files[0]);
    }
  };

  const accept = (event: ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files);
    if (event.target) event.target.value = "";
  };

  const drop = (event: DragEvent<HTMLLabelElement | HTMLDivElement>) => {
    event.preventDefault();
    handleFiles(event.dataTransfer.files);
  };

  return (
    <div className="listing-photo-section">
      <div className="photo-section-header">
        <div>
          <strong className="listing-section-label">{t("photoLabel")}</strong>
          <small className="photo-section-sub">
            Upload as many images as you want. Buyers can swipe through all photos!
          </small>
        </div>
        <button
          type="button"
          className="button soft upload-btn-accent"
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus size={15} /> Upload Images
        </button>
      </div>

      <input
        ref={inputRef}
        className="photo-file-input-hidden"
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        onChange={accept}
        style={{ display: "none" }}
      />

      {photoList.length === 0 ? (
        <label
          className="photo-dropzone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={drop}
        >
          <input
            className="photo-file-input"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={accept}
          />
          <span className="photo-prompt">
            <Camera size={32} />
            <strong>Upload product images</strong>
            <small>Select one or multiple photos (JPEG, PNG, WebP)</small>
          </span>
          <span className="photo-hover">
            <ImagePlus size={18} /> Click or drag to add photos
          </span>
        </label>
      ) : (
        <div className="photo-gallery-editor">
          <div className="photo-thumbs-grid">
            {photoList.map((imgUrl, idx) => (
              <div key={idx} className="photo-thumb-card">
                <img src={imgUrl} alt={`Product photo ${idx + 1}`} />
                <span className={`photo-thumb-badge ${idx === 0 ? "photo-thumb-badge--cover" : ""}`}>
                  {idx === 0 ? "Cover" : `#${idx + 1}`}
                </span>
                <button
                  type="button"
                  className="photo-thumb-delete"
                  title="Remove image"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onRemoveImage) onRemoveImage(idx);
                    else if (onRemove) onRemove();
                  }}
                >
                  <X size={13} />
                </button>
              </div>
            ))}

            {/* Add More card in the grid */}
            <button
              type="button"
              className="photo-add-more-box"
              onClick={() => inputRef.current?.click()}
              title="Add more photos"
            >
              <Plus size={22} />
              <span>Add Image</span>
            </button>
          </div>

          <div className="photo-toolbar">
            <span>
              <strong>{photoList.length}</strong> {photoList.length === 1 ? "photo" : "photos"} uploaded · First is cover
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                className="button soft"
                onClick={() => onEnhance && onEnhance(0)}
                disabled={enhancing}
                title="Enhance cover photo with AI"
              >
                <Sparkles size={14} />
                {enhancing ? t("photoEnhancing") : "Enhance Cover"}
              </button>
              <button
                type="button"
                className="button outline"
                onClick={() => {
                  if (onRemove) onRemove();
                  else if (onRemoveImage) {
                    for (let i = photoList.length - 1; i >= 0; i--) onRemoveImage(i);
                  }
                }}
              >
                <Trash2 size={14} /> Clear all
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
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
