import { expect, test, type Page } from "@playwright/test";

const appPath=process.env.DATANEST_APP_PATH||"/";
const projectId="00000000-0000-4000-8000-000000000010";
const userId="00000000-0000-4000-8000-000000000001";

async function setup(page:Page){
  await page.route("**/runtime-config.js",route=>route.fulfill({
    contentType:"application/javascript",
    body:"window.__DATANEST_CONFIG__={supabaseUrl:'https://fixture.supabase.co',supabasePublishableKey:'fixture-key',authoritative:true}"
  }));
  await page.addInitScript(({userId})=>{
    const encode=(data:unknown)=>btoa(JSON.stringify(data)).replaceAll("+","-").replaceAll("/","_").replaceAll("=","");
    localStorage.setItem("sb-fixture-auth-token",JSON.stringify({
      access_token:`${encode({alg:"HS256",typ:"JWT"})}.${encode({sub:userId,exp:4102444800,role:"authenticated"})}.fixture`,
      refresh_token:"fixture",token_type:"bearer",expires_at:4102444800,
      user:{id:userId,aud:"authenticated",role:"authenticated",email:"fixture@example.invalid"}
    }));
  },{userId});
  await page.route("https://fixture.supabase.co/**",route=>{
    const pathname=new URL(route.request().url()).pathname;
    let body:unknown=[];
    const headers:Record<string,string>={"content-type":"application/json"};
    if(pathname.endsWith("/projects"))body={id:projectId,slug:"resonance-datanest",name:"Fixture project",description:null,status:"ACTIVE",created_at:"2026-09-29T00:00:00Z"};
    else if(pathname.endsWith("/project_members"))body={project_id:projectId,user_id:userId,role:"viewer",status:"active"};
    else if(pathname.endsWith("/rpc/get_project_dashboard_summary"))body={total_jobs:0,active_jobs:0,running_jobs:0,blocked_jobs:0,available_capabilities:0,registered_capabilities:0};
    else if(pathname.endsWith("/jobs")){body=[];headers["content-range"]="*/0";}
    else if(pathname.includes("/accept_pending_project_member_invites_v1")||pathname.includes("/accept_pending_job_invites"))body=null;
    return route.fulfill({headers,body:JSON.stringify(body)});
  });
}

test("Business OS navigation regroups existing workspaces without exposing target-only routes",async({page})=>{
  await setup(page);
  await page.goto(appPath);

  await expect(page.locator(".navGroup>summary")).toHaveText([
    "Home","Explore","Portfolio","Projects","Intelligence","Governance","Assurance","System"
  ]);
  await expect(page.getByText(/Business, Intelligence, Collaboration, and Expansion Operating System/i)).toBeVisible();
  await expect(page.getByRole("button",{name:"External Audit & Optimizer",exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"iBank",exact:true})).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Barterer Tender",exact:true})).toHaveCount(0);

  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test("existing scheduler and transparency deep links remain addressable",async({page})=>{
  await setup(page);
  await page.goto(appPath+"?view=scheduler");
  await expect(page.getByRole("heading",{name:"TranScheduler",exact:true})).toBeVisible();

  await page.goto(appPath+"?view=transparency");
  await expect(page.getByRole("heading",{name:"Transparency",exact:true})).toBeVisible();
});
