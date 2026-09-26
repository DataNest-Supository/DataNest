import { expect, test } from "@playwright/test";

const appPath = process.env.DATANEST_APP_PATH || "/";

test("Products runs Legal Eagle through the governed DataNest AI route", async ({ page }) => {
  const projectId = "00000000-0000-4000-8000-000000000010";
  const userId = "00000000-0000-4000-8000-000000000001";
  const jobId = "00000000-0000-4000-8000-000000000020";
  let legalRequest:Record<string,unknown>|null=null;

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
    if (path.endsWith("/project_members")) body = {project_id:projectId,user_id:userId,role:"viewer",status:"active"};
    if (path.endsWith("/get_project_dashboard_summary")) body = {total_jobs:1,active_jobs:1,running_jobs:0,blocked_jobs:0,available_capabilities:0,registered_capabilities:0};
    if (path.endsWith("/jobs")) body = [{id:jobId,job_number:7,title:"Legal matter",status:"READY",updated_at:"2026-09-26T06:00:00Z"}];

    return route.fulfill({contentType:"application/json",body:JSON.stringify(body)});
  });

  await page.goto(appPath+"?view=products");

  await expect(page.getByRole("heading", {name:"Products that carry their architecture, evidence and decisions with them."})).toBeVisible();
  await expect(page.getByText("Product Concept Incubator", {exact:true})).toBeVisible();
  await expect(page.getByRole("heading", {name:"Assistance with a human at the centre."})).toBeHidden();
  await page.locator("details.conceptIncubator > summary").click();

  await expect(page.getByRole("heading", {name:"Assistance with a human at the centre."})).toBeVisible();
  await expect(page.getByRole("heading", {name:"Resonance Assistance"}).first()).toBeVisible();
  await expect(page.getByRole("heading", {name:"Legal Eagle"})).toBeVisible();
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
  await expect(page.getByText(/excluded from automatic project-wide learning/i)).toBeVisible();

  expect(legalRequest).not.toBeNull();
  expect(legalRequest?.productMode).toBe("legal_eagle");
  expect(legalRequest?.jurisdiction).toBe("South Africa · Gauteng");
  expect(legalRequest?.legalTask).toBe("timeline");
  expect(legalRequest?.jobId).toBe(jobId);

  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
