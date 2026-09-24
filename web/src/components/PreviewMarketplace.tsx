"use client";

import { useMemo, useState } from "react";
import { ArrowRight, HeartHandshake, Leaf, Search, ShieldCheck } from "lucide-react";
import BuyerEstimateChat from "@/components/BuyerEstimateChat";
import { FairPriceGuide, ProductPhotoUpload } from "@/components/SellerListingControls";

const categories = ["All crafts", "Textiles", "Pottery & ceramics", "Woodwork", "Jewellery", "Home decor", "Baskets", "Paintings"];
const products = [
  { name: "Madhubani Story Panel", category: "Paintings", seller: "Sita Devi · Madhubani, Bihar", price: 1200, minimum: 10, icon: "🎨", color: "#f5e2cf", description: "Hand-painted folk art on handmade paper, each panel tells a story." },
  { name: "Handwoven Market Basket", category: "Baskets", seller: "Lakshmi Self Help Group · Kerala", price: 850, minimum: 25, icon: "🧺", color: "#eee1c9", description: "Durable natural-fibre basket woven by a women-led artisan collective." },
  { name: "Blue Pottery Serving Bowl", category: "Pottery & ceramics", seller: "Imran Khan · Jaipur, Rajasthan", price: 1450, minimum: 8, icon: "🏺", color: "#dce9ef", description: "Traditional blue pottery with a hand-painted floral glaze." },
  { name: "Ajrakh Cotton Table Runner", category: "Textiles", seller: "Razia Khatri · Kutch, Gujarat", price: 980, minimum: 20, icon: "🧵", color: "#ead9d5", description: "Naturally dyed cotton, block printed with heritage Ajrakh motifs." },
  { name: "Carved Teak Desk Tray", category: "Woodwork", seller: "Ravi Kumar · Saharanpur, UP", price: 1750, minimum: 12, icon: "🪵", color: "#ead7bd", description: "A practical desk organiser with hand-carved floral detailing." },
  { name: "Terracotta Leaf Earrings", category: "Jewellery", seller: "Meena Crafts · Khurja, UP", price: 420, minimum: 30, icon: "💍", color: "#f2d7d1", description: "Lightweight clay earrings finished by hand with natural pigments." },
];

export default function PreviewMarketplace() {
  const [category, setCategory] = useState("All crafts");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<"discover" | "sell">("discover");
  const [notice, setNotice] = useState("");
  const [productImage, setProductImage] = useState("");
  const [enhancing, setEnhancing] = useState(false);
  const [listing, setListing] = useState({name:"",category:"Textiles",description:"",cost:"",hours:"",experience:"",quantity:"",minimum:"",leadTime:"",price:""});
  const suggested = useMemo(() => {
    const cost=Number(listing.cost)||0, hours=Number(listing.hours)||0, experience=Number(listing.experience)||0;
    if (!cost && !hours) return null;
    const base=(cost+hours*75)*(1+Math.min(experience*0.025,0.2))*1.1;
    const low=Math.max(cost*1.15,Math.round(base*1.15/10)*10);
    return {low:Math.round(low),high:Math.max(Math.round(low)+50,Math.round(base*1.4/10)*10)};
  },[listing.cost,listing.hours,listing.experience]);
  const setListingField=(field:keyof typeof listing,value:string)=>setListing((old)=>({...old,[field]:value}));
  const uploadImage=(file?:File)=>{if(!file)return;if(!["image/jpeg","image/png","image/webp"].includes(file.type)){setNotice("Choose a JPG, PNG, or WebP image.");return;}if(file.size>1_000_000){setNotice("Choose an image smaller than 1 MB.");return;}const reader=new FileReader();reader.onload=()=>setProductImage(String(reader.result));reader.readAsDataURL(file);};
  const enhanceImage=async()=>{if(!productImage){setNotice("Upload a product image first.");return;}setEnhancing(true);try{const response=await fetch("/api/ai/enhance-image",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({image:productImage})});const data=await response.json();if(!response.ok)throw new Error(data.detail||"Could not enhance image.");setProductImage(data.image);setNotice("Image enhanced. Review it carefully before publishing.");}catch(error){setNotice(error instanceof Error?error.message:"Image enhancement failed.");}finally{setEnhancing(false);}};
  const shown = useMemo(() => products.filter((p) => (category === "All crafts" || p.category === category) && `${p.name} ${p.category} ${p.seller}`.toLowerCase().includes(search.toLowerCase())), [category, search]);
  return <div className="page-shell">
    <div style={{background:"#fff4d6",textAlign:"center",padding:"8px 14px",fontSize:12,color:"#72551c",fontWeight:700}}>Preview mode · Sample listings shown. Add your Clerk and database keys to enable accounts and live listings.</div>
    <header className="site-header"><a href="#top" className="brand"><span className="brand-mark">✿</span><span>Kaari<span className="brand-accent">Works</span></span></a><nav className="header-actions"><button className="nav-link" onClick={() => setActive("discover")}>Discover</button><button className="nav-link" onClick={() => setActive("sell")}>For artisans</button><button className="button outline" onClick={() => setNotice("Sign-in will be available after Clerk is configured.")}>Sign in</button><button className="button" onClick={() => setNotice("Account creation will be available after Clerk is configured.")}>Join Kaari</button></nav></header>
    {active === "discover" ? <>
      <section className="hero" id="top"><div className="hero-card"><div className="hero-copy"><div className="eyebrow">Crafted with care, traded with trust</div><h1>Tradition in<br/>your hands.</h1><p>Meet the artisans behind the work. Discover one-of-a-kind craft and connect directly for the bulk orders your business needs.</p><button className="button" onClick={() => document.getElementById("catalogue")?.scrollIntoView({behavior:"smooth"})}>Explore the collection <ArrowRight size={16}/></button></div><div className="hero-art" aria-hidden="true">🪡</div></div></section>
      <div className="trust-row"><div className="trust"><span className="trust-icon"><HeartHandshake size={20}/></span><span><strong>Direct artisan contact</strong><small>Talk to the maker, not a middleman</small></span></div><div className="trust"><span className="trust-icon"><ShieldCheck size={20}/></span><span><strong>Clear bulk terms</strong><small>Minimum orders and lead times upfront</small></span></div><div className="trust"><span className="trust-icon"><Leaf size={20}/></span><span><strong>Every piece has a story</strong><small>Support independent craft communities</small></span></div></div>
      <section className="section" id="catalogue"><div className="section-head"><div><h2>Find handmade goods</h2><p>Explore craft from independent makers across India.</p></div><label className="search"><Search size={17}/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search products, crafts, materials"/></label></div><div className="filters">{categories.map((item)=><button key={item} className={`filter ${category===item?"active":""}`} onClick={()=>setCategory(item)}>{item}</button>)}</div><div className="product-grid">{shown.map((product)=><article className="product-card" key={product.name}><div className="product-art" style={{background:product.color}}><span>{product.icon}</span><span className="category-label">{product.category}</span></div><div className="product-body"><h3>{product.name}</h3><div className="seller-name">Made by {product.seller}</div><p className="product-description">{product.description}</p><button className="button soft estimate-product-button" onClick={()=>window.dispatchEvent(new CustomEvent("kaari:estimate-product",{detail:{name:product.name,category:product.category,description:product.description,price_inr:product.price}}))}>Ask Kaari to estimate cost &amp; time</button><div className="product-foot"><div className="product-price">₹{product.price.toLocaleString("en-IN")}<small>per piece · min. {product.minimum} units</small></div><button className="button" onClick={()=>setNotice(`Direct seller enquiries will be enabled after setup. Contact ${product.seller.split(" · ")[0]} about ${product.name}.`)}>Contact seller</button></div></div></article>)}</div>{shown.length===0&&<div className="empty">No sample products match your search.</div>}</section>
    </> : <main className="seller-layout">
      <div className="seller-heading"><div className="eyebrow" style={{color:"#13866c"}}>Your craft, your story</div><h1>Create a product listing</h1><p>Share a little about your work. We’ll help you present it beautifully and price it fairly.</p></div>
      <form className="listing-workspace" onSubmit={(event)=>{event.preventDefault();setNotice("Preview only: add Clerk and database settings to publish this listing.")}}>
        <div className="listing-form-main"><section className="form-card">
          <ProductPhotoUpload image={productImage} enhancing={enhancing} onSelect={uploadImage} onEnhance={()=>void enhanceImage()} onRemove={()=>setProductImage("")}/>
          <div className="form-grid listing-details-grid">
            <label className="field"><span>What do you call it?</span><input required value={listing.name} onChange={(e)=>setListingField("name",e.target.value)} placeholder="e.g. Hand-painted Madhubani fish"/></label>
            <label className="field"><span>Craft category</span><select value={listing.category} onChange={(e)=>setListingField("category",e.target.value)}>{categories.slice(1).map((item)=><option key={item}>{item}</option>)}</select></label>
            <label className="field full"><span>Tell buyers about your creation</span><textarea required value={listing.description} onChange={(e)=>setListingField("description",e.target.value)} placeholder="What makes it special? What materials and techniques did you use?"/></label>
            <label className="field"><span>Hours spent making it</span><input type="number" min="0" step="0.5" value={listing.hours} onChange={(e)=>setListingField("hours",e.target.value)} placeholder="e.g. 8"/></label>
            <label className="field"><span>Years in your craft</span><input type="number" min="0" value={listing.experience} onChange={(e)=>setListingField("experience",e.target.value)} placeholder="e.g. 12"/></label>
            <label className="field"><span>Pieces available</span><input type="number" min="0" value={listing.quantity} onChange={(e)=>setListingField("quantity",e.target.value)} placeholder="e.g. 50"/></label>
            <label className="field"><span>Minimum bulk order</span><input required type="number" min="1" value={listing.minimum} onChange={(e)=>setListingField("minimum",e.target.value)} placeholder="e.g. 10"/></label>
            <label className="field"><span>Bulk order lead time</span><input value={listing.leadTime} onChange={(e)=>setListingField("leadTime",e.target.value)} placeholder="e.g. 2–3 weeks"/></label>
            <label className="field"><span>Your making cost (₹)</span><input type="number" min="0" value={listing.cost} onChange={(e)=>setListingField("cost",e.target.value)} placeholder="Materials + other costs"/></label>
          </div>
          <p className="form-note">Photo enhancement uses your new server-side Gemini key.</p>
          <button className="button" type="submit">Preview publish listing</button>
        </section></div>
        <FairPriceGuide range={suggested} cost={listing.cost} hours={listing.hours} experience={listing.experience} price={listing.price} setPrice={(value)=>setListingField("price",value)}/>
      </form>
    </main>}
    <footer className="footer">Kaari Works · Handmade, directly from artisans</footer><BuyerEstimateChat/>{notice&&<div className="notice" role="status"><button onClick={()=>setNotice("")} style={{marginLeft:12,color:"#bde4c7",background:"none",border:0}}>Dismiss</button>{notice}</div>}
  </div>;
}
