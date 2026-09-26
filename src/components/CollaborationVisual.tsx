"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { getSupabase } from "@/lib/supabase";
import styles from "./CollaborationVisual.module.css";

type GovernedProduct = {
  id:string;
  name:string;
  full_name:string|null;
  lifecycle_status:string|null;
};

type ProductApplication = {
  id:string;
  product_id:string;
  name:string|null;
  status:string|null;
  sort_order:number;
};

const MAX_ORBIT_ITEMS=9;

function orbitPosition(index:number,total:number){
  const angle=((Math.PI*2*index)/Math.max(1,total))-(Math.PI/2);
  return {
    left:50+(Math.cos(angle)*37),
    top:50+(Math.sin(angle)*39)
  };
}

export default function CollaborationVisual({
  projectId,
  onOpenProducts
}:{
  projectId?:string;
  onOpenProducts?:()=>void;
}) {
  const [products,setProducts]=useState<GovernedProduct[]>([]);
  const [applications,setApplications]=useState<ProductApplication[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  useEffect(()=>{
    let active=true;
    if(!projectId){
      setLoading(false);
      setError("");
      setProducts([]);
      setApplications([]);
      return()=>{active=false;};
    }
    const supabase=getSupabase();
    if(!supabase){
      setError("Product catalog connection is unavailable.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    void Promise.all([
      supabase
        .from("products")
        .select("id,name,full_name,lifecycle_status")
        .eq("project_id",projectId)
        .order("name"),
      supabase
        .from("product_records")
        .select("id,product_id,name,status,sort_order")
        .eq("project_id",projectId)
        .eq("record_type","application")
        .order("sort_order",{ascending:true})
    ]).then(([productResult,applicationResult])=>{
      if(!active)return;
      const nextError=productResult.error||applicationResult.error;
      if(nextError){
        setError(nextError.message);
        setProducts([]);
        setApplications([]);
        return;
      }
      setProducts((productResult.data||[]) as GovernedProduct[]);
      setApplications((applicationResult.data||[]) as ProductApplication[]);
    }).catch(reason=>{
      if(!active)return;
      setError(reason instanceof Error?reason.message:"Product catalog sync failed.");
      setProducts([]);
      setApplications([]);
    }).finally(()=>{
      if(active)setLoading(false);
    });

    return()=>{active=false;};
  },[projectId]);

  const primary=products[0]||null;
  const orbitItems=useMemo(
    ()=>applications
      .filter(item=>item.name&&(!primary||item.product_id===primary.id))
      .slice(0,MAX_ORBIT_ITEMS),
    [applications,primary]
  );

  const ariaLabel=loading
    ?"Synchronizing the governed Resonance product catalog."
    :primary
      ?primary.name+" governed product portfolio with "+orbitItems.length+" applications: "+orbitItems.map(item=>item.name).join(", ")
      :"No governed Resonance products are currently loaded.";

  if(!projectId){
    return <div className="aiICoreStage" aria-label="AI and human collaboration visualization">
      <div className="coreOrbit orbitOuter" aria-hidden="true"/>
      <div className="coreOrbit orbitMiddle" aria-hidden="true"/>
      <div className="signalArc arcOne" aria-hidden="true"/>
      <div className="signalArc arcTwo" aria-hidden="true"/>
      <div className="coreNode humanCore">
        <small>I</small>
        <strong>Intent</strong>
        <span>Human direction</span>
      </div>
      <div className="coreBridge" aria-hidden="true"><i/><i/><i/><i/></div>
      <div className="coreNode aiCore">
        <small>AI</small>
        <strong>Amplify</strong>
        <span>Governed intelligence</span>
      </div>
      <div className="coreCenter" aria-hidden="true"><span>R</span></div>
      <span className="coreCaption">Traceable collaboration loop</span>
    </div>;
  }

  return <div className={"aiICoreStage "+styles.productsHeroVisual} aria-label={ariaLabel}>
    <div className={styles.portfolioOrbitShell} aria-hidden="true">
      <span className={styles.portfolioOrbitRing+" "+styles.portfolioRingOuter}/>
      <span className={styles.portfolioOrbitRing+" "+styles.portfolioRingInner}/>
      <span className={styles.portfolioSignalSweep}/>
      <span className={styles.portfolioSignalDot+" "+styles.dotOne}/>
      <span className={styles.portfolioSignalDot+" "+styles.dotTwo}/>
      <span className={styles.portfolioSignalDot+" "+styles.dotThree}/>
    </div>

    {orbitItems.map((item,index)=>{
      const position=orbitPosition(index,orbitItems.length);
      const slotStyle={left:position.left+"%",top:position.top+"%"} as CSSProperties;
      return <div className={styles.portfolioProductSlot} style={slotStyle} key={item.id} aria-hidden="true">
        <div className={styles.portfolioProductCard} style={{animationDelay:(index*-0.42)+"s"}}>
          <span>{String(index+1).padStart(2,"0")}</span>
          <b>{item.name}</b>
          <small>{item.status||"governed"}</small>
        </div>
      </div>;
    })}

    <div className={styles.portfolioCore+" "+(loading?styles.loading:"")}>
      <small>{loading?"SYNCING PRODUCTS":"GOVERNED PRODUCT"}</small>
      <strong>{primary?.name||(loading?"DataNest":"Products")}</strong>
      <span>{primary?.full_name||(error?"Catalog temporarily unavailable":"Resonance product catalog")}</span>
      <button type="button" onClick={onOpenProducts}>
        <span>{loading?"View Products":"Open Products"}</span><b aria-hidden="true">↗</b>
      </button>
    </div>

    <span className={styles.portfolioCaption}>
      {loading
        ?"Live catalog sync"
        :error
          ?"Catalog sync unavailable"
          :primary
            ?orbitItems.length+" live applications · "+(primary.lifecycle_status||"governed")
            :"No governed products imported yet"}
    </span>
  </div>;
}
