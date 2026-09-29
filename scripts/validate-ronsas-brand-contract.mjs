import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root=process.cwd();
const contractPath=resolve(root,"apps/ronsas/shared/resonance-brand-contract.json");
const requestedApp=process.argv.includes("--app")
  ? process.argv[process.argv.indexOf("--app")+1]
  : null;
const failures=[];

if(!existsSync(contractPath)){
  failures.push("missing canonical RONSAS brand contract: apps/ronsas/shared/resonance-brand-contract.json");
}else{
  try{
    const raw=readFileSync(contractPath,"utf8");
    const contract=JSON.parse(raw);
    const expectedFonts=["Inter Tight","Inter","Instrument Serif","JetBrains Mono"];
    const requiredAccents=[
      "career-compass","creative-studio","epublisher","lyricsync-studio",
      "scene-song-spark","sovereign-forge","syncvision","youtube-optimizer"
    ];

    if(contract.schema!=="datanest.ronsas.brand-contract.v1") failures.push("brand contract schema mismatch");
    if(contract.operator!=="Resonance Sole Proprietorship") failures.push("brand contract operator mismatch");
    if(contract.businessBrand!=="Resonance App Development") failures.push("brand contract business brand mismatch");
    if(contract.platform!=="Resonance DataNest") failures.push("brand contract platform mismatch");
    if(contract.governanceLabel!=="RSGP Governed") failures.push("brand contract governance label mismatch");
    if(contract.governanceRoute!=="/governance") failures.push("brand contract governance route mismatch");
    if(contract.legalRoute!=="/legal") failures.push("brand contract legal route mismatch");
    if(contract.promotionState?.mode!=="free-promotion"||contract.promotionState?.paidCheckoutActive!==false){
      failures.push("brand contract must preserve free promotion with paid checkout disabled");
    }
    if(JSON.stringify(contract.fonts)!==JSON.stringify(expectedFonts)) failures.push("brand contract canonical fonts mismatch");
    for(const key of ["canvas","chrome","work","workSoft","elevated"]){
      if(typeof contract.surfaceTokens?.[key]!=="string") failures.push(`brand contract missing surface token: ${key}`);
    }
    for(const key of ["success","warning","danger","info"]){
      if(typeof contract.semanticTokens?.[key]!=="string") failures.push(`brand contract missing semantic token: ${key}`);
    }
    for(const app of requiredAccents){
      if(typeof contract.appAccents?.[app]!=="string") failures.push(`brand contract missing application accent: ${app}`);
    }
    if(/RSGP\s+(?:means|stands for|is short for)/i.test(raw)) failures.push("brand contract invents an RSGP expansion");

    if(requestedApp){
      if(!requiredAccents.includes(requestedApp)){
        failures.push(`unknown RONSAS app requested for brand validation: ${requestedApp}`);
      }else{
        const adapterCandidates=[
          resolve(root,`apps/ronsas/${requestedApp}/src/resonance-datanest-adapter.css`),
          resolve(root,`apps/ronsas/${requestedApp}/resonance-datanest-adapter.css`)
        ];
        if(!adapterCandidates.some(existsSync)){
          console.log(`RONSAS brand adapter not migrated yet: ${requestedApp}`);
        }else if(requestedApp==="creative-studio"){
          const appRoot=resolve(root,"apps/ronsas/creative-studio");
          const sources={
            main:readFileSync(resolve(appRoot,"src/main.tsx"),"utf8"),
            footer:readFileSync(resolve(appRoot,"src/components/brand/ResonanceFooter.tsx"),"utf8"),
            terms:readFileSync(resolve(appRoot,"src/pages/Terms.tsx"),"utf8"),
            privacy:readFileSync(resolve(appRoot,"src/pages/Privacy.tsx"),"utf8"),
            adapter:readFileSync(resolve(appRoot,"src/resonance-datanest-adapter.css"),"utf8"),
          };
          const pkg=JSON.parse(readFileSync(resolve(appRoot,"package.json"),"utf8"));
          const lock=JSON.parse(readFileSync(resolve(appRoot,"package-lock.json"),"utf8"));
          for(const dependency of ["@fontsource-variable/inter-tight","@fontsource-variable/inter","@fontsource/instrument-serif","@fontsource-variable/jetbrains-mono"]){
            if(pkg.dependencies?.[dependency]!=="5.3.0") failures.push(`creative-studio font dependency mismatch: ${dependency}`);
            if(lock.packages?.[""]?.dependencies?.[dependency]!=="5.3.0") failures.push(`creative-studio lock root missing font dependency: ${dependency}`);
            if(lock.packages?.["node_modules/"+dependency]?.version!=="5.3.0") failures.push(`creative-studio lock entry missing font package: ${dependency}`);
          }
          for(const token of ["Resonance Sole Proprietorship","Resonance App Development","Resonance DataNest","RSGP Governed","/legal","/governance","free promotion"]){
            if(!sources.footer.includes(token)) failures.push(`creative-studio footer missing token: ${token}`);
          }
          if(/checkout/i.test(sources.footer)) failures.push("creative-studio footer must not expose checkout language");
          if(/new Date\s*\(|toLocaleDateString\s*\(/.test(sources.terms+sources.privacy)) failures.push("creative-studio legal pages must not manufacture current effective dates");
          if(!sources.terms.includes("Review required")||!sources.privacy.includes("Review required")) failures.push("creative-studio legal pages must remain review-gated");
          if(/industry-standard encryption|not retained beyond the generation session/i.test(sources.privacy)) failures.push("creative-studio privacy page contains unsupported guarantees");
          for(const token of ["@media (prefers-color-scheme: light)","@media (prefers-contrast: more)","@media (prefers-reduced-motion: reduce)","--dn-app-accent","font-family"]){
            if(!sources.adapter.includes(token)) failures.push(`creative-studio adapter missing token: ${token}`);
          }
          if(!sources.main.includes("@fontsource-variable/inter-tight")||!sources.main.includes("./resonance-datanest-adapter.css")) failures.push("creative-studio main entry does not load canonical fonts and adapter");
        }
      }
    }
  }catch(error){
    failures.push(`invalid RONSAS brand contract: ${error.message}`);
  }
}

if(failures.length){
  console.error("RONSAS brand contract validation failed:");
  for(const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("RONSAS canonical brand contract validation passed.");
