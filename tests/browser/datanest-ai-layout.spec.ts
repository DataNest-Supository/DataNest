import { expect, test } from "@playwright/test";

const appPath = process.env.DATANEST_APP_PATH || "/";

test("DataNest AI keeps the Hero above a centered live command console", async ({ page }) => {
  const projectId = "00000000-0000-4000-8000-000000000010";
  const userId = "00000000-0000-4000-8000-000000000001";
  const job = {
    id:"00000000-0000-4000-8000-000000000099",
    job_number:99,
    title:"AI Hero Layout Fixture",
    description:"Fixture Job used to protect the DataNest AI Hero-to-Command-Console layout.",
    priority:80,
    status:"RUNNING",
    required_capabilities:["chat"],
    acceptance:{},
    created_at:"2026-09-26T00:15:00Z",
    updated_at:"2026-09-26T00:20:00Z"
  };
  const secondJob = {
    ...job,
    id:"00000000-0000-4000-8000-000000000100",
    job_number:100,
    title:"Second AI Job Fixture",
    description:"Second fixture Job used to verify command drafts never leak across governed Job context.",
    priority:60,
    status:"READY",
    updated_at:"2026-09-26T00:10:00Z"
  };

  await page.setViewportSize({width:1440,height:1000});
  await page.route("**/runtime-config.js", route => route.fulfill({
    contentType:"application/javascript",
    body:"window.__DATANEST_CONFIG__={supabaseUrl:'https://fixture.supabase.co',supabasePublishableKey:'fixture-key',authoritative:true}"
  }));

  await page.addInitScript(({userId}) => {
    const encode = (data:unknown) => btoa(JSON.stringify(data)).replaceAll("+","-").replaceAll("/","_").replaceAll("=","");
    localStorage.setItem("sb-fixture-auth-token",JSON.stringify({
      access_token:`${encode({alg:"HS256",typ:"JWT"})}.${encode({sub:userId,exp:4102444800,role:"authenticated"})}.fixture`,
      refresh_token:"fixture",
      token_type:"bearer",
      expires_at:4102444800,
      user:{id:userId,aud:"authenticated",role:"authenticated",email:"fixture@example.invalid"}
    }));
  },{userId});

  await page.route("https://fixture.supabase.co/**", route => {
    const path=new URL(route.request().url()).pathname;
    let body:unknown=[];

    if(path.endsWith("/projects")) body={id:projectId,slug:"resonance-datanest",name:"Fixture project",description:null,status:"ACTIVE",created_at:"2026-09-25T00:00:00Z"};
    else if(path.endsWith("/project_members")) body={project_id:projectId,user_id:userId,role:"owner",status:"active"};
    else if(path.endsWith("/tool_registry")) body=[];
    else if(path.endsWith("/capabilities")) body=[];
    else if(path.endsWith("/get_project_dashboard_summary")) body={total_jobs:2,active_jobs:2,running_jobs:1,blocked_jobs:0,available_capabilities:0,registered_capabilities:0};
    else if(path.endsWith("/jobs")) body=[job,secondJob];
    else if(path.endsWith("/datanest-ai-chat")){
      const requestBody=route.request().postDataJSON() as {jobId?:string}|null;
      const activeJob=requestBody?.jobId===secondJob.id?secondJob:job;
      body={
        sessionId:activeJob.id===secondJob.id?"fixture-session-002":"fixture-session-001",
        job:activeJob,
        events:[],
        certifiedMemory:[]
      };
    }
    else if(path.endsWith("/datanest-ai-certification")) body={
      role:"owner",
      candidates:[],
      validationRuns:[]
    };
    else if(path.includes("/accept_pending_project_member_invites_v1")||path.includes("/accept_pending_job_invites")) body=null;

    return route.fulfill({contentType:"application/json",body:JSON.stringify(body)});
  });

  await page.goto(appPath+"?view=ai");

  await expect(page.getByRole("heading",{name:"DataNest AI",exact:true}).first()).toBeVisible();
  await expect(page.getByRole("heading",{name:"Development command channel",exact:true})).toBeVisible();
  await expect(page.getByText("AI CORE LINKED",{exact:true})).toBeVisible();
  await expect(page.getByText("Hosted CI · Cloud browser",{exact:true})).toBeVisible();
  await expect(page.getByText(/Remote desktop/i)).toHaveCount(0);
  await expect(page.getByText("Current Job Context",{exact:true})).toBeVisible();
  await expect(page.getByText("AI Hero Layout Fixture",{exact:true}).first()).toBeVisible();

  for(const label of ["Continue","Analyze","Build","Debug","Plan","Compare"]){
    await expect(page.getByRole("button",{name:label,exact:true})).toBeVisible();
  }

  const composer=page.getByPlaceholder(/Ask DataNest AI to analyze/i);
  await page.getByRole("button",{name:"Jump to DataNest AI command composer",exact:true}).click();
  await expect(composer).toBeFocused();
  expect(await page.locator(".datanestAiComposer").evaluate(element=>getComputedStyle(element).position)).toBe("sticky");

  await composer.fill("First Job draft must stay with JOB-00099.");
  await page.locator(".datanestAiJobStrip .rndJobChip").filter({hasText:"Second AI Job Fixture"}).click();
  await expect(page.getByRole("heading",{name:"JOB-00100 · Second AI Job Fixture",exact:true})).toBeVisible();
  await expect(composer).toHaveValue("");

  await composer.fill("Second Job draft must stay with JOB-00100.");
  await page.locator(".datanestAiJobStrip .rndJobChip").filter({hasText:"AI Hero Layout Fixture"}).click();
  await expect(page.getByRole("heading",{name:"JOB-00099 · AI Hero Layout Fixture",exact:true})).toBeVisible();
  await expect(composer).toHaveValue("First Job draft must stay with JOB-00099.");

  await page.locator(".datanestAiJobStrip .rndJobChip").filter({hasText:"Second AI Job Fixture"}).click();
  await expect(composer).toHaveValue("Second Job draft must stay with JOB-00100.");
  await page.locator(".datanestAiJobStrip .rndJobChip").filter({hasText:"AI Hero Layout Fixture"}).click();
  await expect(composer).toHaveValue("First Job draft must stay with JOB-00099.");

  const layout=await page.evaluate(()=>{
    const rect=(selector:string)=>{
      const element=document.querySelector(selector);
      if(!(element instanceof HTMLElement))throw new Error("Missing "+selector);
      const box=element.getBoundingClientRect();
      return {x:box.x,y:box.y,width:box.width,height:box.height,right:box.right,bottom:box.bottom,center:box.x+box.width/2};
    };
    return {
      workspace:rect(".datanestAiWorkspace"),
      hero:rect(".datanestAiHeroV2"),
      chat:rect(".datanestAiChatStage"),
      context:rect(".datanestAiContextRail"),
      scrollWidth:document.documentElement.scrollWidth,
      viewportWidth:innerWidth
    };
  });

  expect(layout.chat.y).toBeGreaterThanOrEqual(layout.hero.bottom-2);
  expect(layout.context.y).toBeGreaterThanOrEqual(layout.chat.bottom-2);
  expect(layout.chat.width).toBeLessThanOrEqual(982);
  expect(Math.abs(layout.chat.center-layout.workspace.center)).toBeLessThanOrEqual(2);
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.viewportWidth);

  await page.setViewportSize({width:390,height:844});
  await expect(page.locator(".datanestAiCommandConsole")).toBeVisible();
  expect(await page.locator(".datanestAiComposer").evaluate(element=>getComputedStyle(element).position)).toBe("static");

  const mobile=await page.evaluate(()=>{
    const consoleElement=document.querySelector(".datanestAiCommandConsole");
    if(!(consoleElement instanceof HTMLElement))throw new Error("Missing DataNest AI Command Console");
    return {
      consoleWidth:consoleElement.getBoundingClientRect().width,
      scrollWidth:document.documentElement.scrollWidth,
      viewportWidth:innerWidth
    };
  });

  expect(mobile.consoleWidth).toBeLessThanOrEqual(mobile.viewportWidth);
  expect(mobile.scrollWidth).toBeLessThanOrEqual(mobile.viewportWidth);
});
