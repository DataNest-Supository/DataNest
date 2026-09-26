import { expect, test } from "@playwright/test";

const appPath = process.env.DATANEST_APP_PATH || "/";

test("Products runs Legal Eagle through the governed DataNest AI route", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read","clipboard-write"]);
  const projectId = "00000000-0000-4000-8000-000000000010";
  const userId = "00000000-0000-4000-8000-000000000001";
  const jobId = "00000000-0000-4000-8000-000000000020";
  let legalRequest:Record<string,unknown>={};

  await page.route("**/runtime-config.js", route => route.fulfill({
    contentType: "application/javascript",
    body: "window.__DATANEST_CONFIG__={supabaseUrl:'https://fixture.supabase.co',supabasePublishableKey:'fixture-key',authoritative:true}"
  }));

  await page.addInitScript(({userId}) => {
    const encode = (data: unknown) => btoa(JSON.stringify(data)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
    localStorage.setItem("sb-fixture-auth-token", JSON.stringify({
      access_token: `${encode({alg:"HS256",typ:"JWT"})}.${encode({sub:userId,exp:4102444800,role:"authenticated"})}.fixture`,
      refresh_token: "fixture",
      token_type: "bearer",
      expires_at: 4102444800,
      user:{id:userId,aud:"authenticated",role:"authenticated",email:"fixture@example.invalid"}
    }));
  }, {userId});

  await page.route("https://fixture.supabase.co/**", route => {
    const request=route.request();
    const path = new URL(request.url()).pathname;
    let body: unknown = [];

    if(path.endsWith("/functions/v1/datanest-ai-chat")){
      const requestBody=(request.postDataJSON()||{}) as Record<string,unknown>;
      if(requestBody.action==="chat"){
        legalRequest=requestBody;
        body={
          assistant:"I can organize this as a matter timeline. Treat the dates as user-supplied facts and have a qualified South African lawyer verify any legal deadline.",
          sessionId:"00000000-0000-4000-8000-000000000099",
          outputTraceId:"DN-AI-legal-fixture",
          providerMode:"external",
          providerLabel:"Fixture governed provider",
          productMode:"legal_eagle",
          jurisdiction:"South Africa · Gauteng",
          learningEligible:false
        };
      }else{
        body={
          sessionId:String(requestBody.sessionId||"00000000-0000-4000-8000-000000000099"),
          job:{id:jobId,project_id:projectId,job_number:7,title:"Legal matter",status:"READY"},
          events:[],
          certifiedMemory:[]
        };
      }
      return route.fulfill({contentType:"application/json",body:JSON.stringify(body)});
    }

    if (path.endsWith("/projects")) body = {id:projectId,slug:"resonance-datanest",name:"Fixture project",description:null,status:"ACTIVE",created_at:"2026-09-26T00:00:00Z"};
    if (path.endsWith("/products")) body = [{
      id:"24f2fa75-18b8-5b45-b624-b5dab381de9e",slug:"ronsas",name:"RONSAS",full_name:"Resonance Open Nova Application Suite",
      category:"sovereign application suite",lifecycle_status:"active development and integration",
      mission:"Unify the Resonance application estate under governed local-first operations.",operating_model:"governed",
      primary_runtime:"Windows local-first",commercial_mode:"free promotion / no billing until pricing is established",
      billing_enabled:false,as_of_date:"2026-09-26",metadata:{}
    }];
    if (path.endsWith("/product_records")) body = [
      {id:"00000000-0000-4000-8000-000000000301",product_id:"24f2fa75-18b8-5b45-b624-b5dab381de9e",record_type:"application",code:"APP-01",name:"RONSAS Hub",status:"active",sort_order:1,payload:{description:"Primary application hub"}},
      {id:"00000000-0000-4000-8000-000000000302",product_id:"24f2fa75-18b8-5b45-b624-b5dab381de9e",record_type:"risk",code:"RSK-01",name:"Runner capacity",status:"open",sort_order:2,payload:{description:"Runner capacity requires governed monitoring."}}
    ];
    if (path.endsWith("/project_members")) body = {project_id:projectId,user_id:userId,role:"viewer",status:"active"};
    if (path.endsWith("/get_project_dashboard_summary")) body = {total_jobs:1,active_jobs:1,running_jobs:0,blocked_jobs:0,available_capabilities:0,registered_capabilities:0};
    if (path.endsWith("/jobs")) body = [{id:jobId,job_number:7,title:"Legal matter",status:"READY",updated_at:"2026-09-26T06:00:00Z"}];

    return route.fulfill({contentType:"application/json",body:JSON.stringify(body)});
  });

  await page.goto(appPath+"?view=products&product=ronsas&recordType=risk&q=runner");

  await expect(page.getByRole("heading", {name:"Products that carry their architecture, evidence and decisions with them."})).toBeVisible();
  await expect(page.getByRole("heading",{name:"RONSAS",exact:true})).toBeVisible();
  await expect(page.getByText("Resonance Open Nova Sovereign Application Suite",{exact:true})).toBeVisible();
  await expect(page.getByLabel("Filter governed record type")).toHaveValue("risk");
  await expect(page.getByLabel("Search governed product records")).toHaveValue("runner");
  await expect(page.locator("details.catalogDetails")).toHaveAttribute("open","");
  await expect(page.getByText("Runner capacity",{exact:true})).toBeVisible();
  await expect(page).toHaveURL(/product=ronsas/);
  await expect(page).toHaveURL(/recordType=risk/);
  await expect(page).toHaveURL(/q=runner/);

  await page.getByRole("button",{name:"Copy view link",exact:true}).click();
  await expect(page.getByRole("status").filter({hasText:"View link copied."})).toBeVisible();
  await expect(page).toHaveURL(/product=ronsas/);
  await expect(page).toHaveURL(/recordType=risk/);
  await expect(page).toHaveURL(/q=runner/);

  await page.getByLabel("Search governed product records").fill("");
  await page.getByLabel("Filter governed record type").selectOption("all");
  await expect(page).toHaveURL(/product=ronsas/);

  await expect(page.getByRole("heading", {name:"Products that carry their architecture, evidence and decisions with them."})).toBeVisible();
  await expect(page.getByText("Product Concept Incubator", {exact:true})).toBeVisible();
  await expect(page.getByRole("heading", {name:"Assistance with a human at the centre."})).toBeHidden();
  await page.locator("details.conceptIncubator > summary").click();

  await expect(page.getByRole("heading", {name:"Assistance with a human at the centre."})).toBeVisible();
  await expect(page.getByRole("heading", {name:"Resonance Assistance"}).first()).toBeVisible();
  await expect(page.getByRole("heading", {name:"Legal Eagle", exact:true})).toBeVisible();
  await expect(page.getByText("Designed to assist—not represent.")).toBeVisible();
  await expect(page.getByText("INFORMATION · PREPARATION · HUMAN REVIEW")).toBeVisible();

  await expect(page.getByLabel("Legal Eagle matter")).toHaveValue(jobId);
  await page.getByLabel("Legal jurisdiction").fill("South Africa · Gauteng");
  await page.getByRole("button", {name:"Build a matter timeline"}).click();

  const message="On 12 September I received a notice. On 18 September I replied. Please organize these dates and flag what a lawyer should verify.";
  await page.getByLabel("Question, facts, clause or document excerpt").fill(message);
  await page.getByRole("button", {name:"Ask Legal Eagle"}).click();

  await expect(page.getByText(message,{exact:true})).toBeVisible();
  await expect(page.getByText(/I can organize this as a matter timeline/)).toBeVisible();
  await expect(page.getByRole("status").filter({hasText:/excluded from automatic project-wide learning/i})).toBeVisible();

  expect(legalRequest?.productMode).toBe("legal_eagle");
  expect(legalRequest?.jurisdiction).toBe("South Africa · Gauteng");
  expect(legalRequest?.legalTask).toBe("timeline");
  expect(legalRequest?.jobId).toBe(jobId);

  await page.setViewportSize({width:390,height:844});
  const overflowOffenders=await page.evaluate(() => {
    const viewportWidth=innerWidth;
    const isClipped=(element:Element)=>{
      let parent=element.parentElement;
      while(parent&&parent!==document.body){
        const overflowX=getComputedStyle(parent).overflowX;
        if(overflowX==="hidden"||overflowX==="auto"||overflowX==="scroll"||overflowX==="clip")return true;
        parent=parent.parentElement;
      }
      return false;
    };
    return Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .map(element=>{
        const rect=element.getBoundingClientRect();
        return {
          tag:element.tagName.toLowerCase(),
          className:element.className,
          text:(element.textContent||"").trim().replace(/\s+/g," ").slice(0,120),
          left:Math.round(rect.left),
          right:Math.round(rect.right),
          width:Math.round(rect.width)
        };
      })
      .filter(item=>item.right>viewportWidth+1||item.left< -1)
      .filter(item=>{
        const selector=item.className
          ? "."+String(item.className).trim().split(/\s+/).filter(Boolean).join(".")
          : item.tag;
        const element=document.querySelector(selector);
        return element ? !isClipped(element) : true;
      })
      .slice(0,12);
  });
  expect(
    overflowOffenders,
    "Mobile Products overflow offenders: "+JSON.stringify(overflowOffenders)
  ).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
