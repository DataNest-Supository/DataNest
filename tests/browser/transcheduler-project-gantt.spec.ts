import { expect, test } from "@playwright/test";

const appPath = process.env.DATANEST_APP_PATH || "/";

test("TranScheduler groups jobs under the project and renders the priority gradient", async ({ page }) => {
  const projectId = "00000000-0000-4000-8000-000000000010";
  const userId = "00000000-0000-4000-8000-000000000001";
  const jobs = [
    {
      id:"00000000-0000-4000-8000-000000000101",job_number:101,title:"Critical release gate",description:null,
      priority:100,status:"READY",required_capabilities:["repository"],acceptance:{},
      created_at:"2026-09-25T09:00:00Z",updated_at:"2026-09-26T09:00:00Z",deadline:"2026-09-27T12:00:00Z"
    },
    {
      id:"00000000-0000-4000-8000-000000000102",job_number:102,title:"Active implementation",description:null,
      priority:50,status:"RUNNING",required_capabilities:["repository","database"],acceptance:{},
      created_at:"2026-09-25T12:00:00Z",updated_at:"2026-09-26T10:00:00Z",deadline:null
    },
    {
      id:"00000000-0000-4000-8000-000000000103",job_number:103,title:"Maintenance smoke check",description:null,
      priority:5,status:"COMPLETED",required_capabilities:["chat"],acceptance:{},
      created_at:"2026-09-24T08:00:00Z",updated_at:"2026-09-25T08:30:00Z",deadline:null
    }
  ];

  await page.clock.setFixedTime(new Date("2026-09-26T12:00:00Z"));
  await page.setViewportSize({width:1440,height:1000});
  await page.route("**/runtime-config.js", route => route.fulfill({
    contentType:"application/javascript",
    body:"window.__DATANEST_CONFIG__={supabaseUrl:'https://fixture.supabase.co',supabasePublishableKey:'fixture-key',authoritative:true}"
  }));

  await page.addInitScript(({userId}) => {
    const encode = (data:unknown) => btoa(JSON.stringify(data)).replaceAll("+","-").replaceAll("/","_").replaceAll("=","");
    localStorage.setItem("sb-fixture-auth-token",JSON.stringify({
      access_token:`${encode({alg:"HS256",typ:"JWT"})}.${encode({sub:userId,exp:4102444800,role:"authenticated"})}.fixture`,
      refresh_token:"fixture",token_type:"bearer",expires_at:4102444800,
      user:{id:userId,aud:"authenticated",role:"authenticated",email:"fixture@example.invalid"}
    }));
  },{userId});

  await page.route("https://fixture.supabase.co/**", route => {
    const path=new URL(route.request().url()).pathname;
    let body:unknown=[];
    if(path.endsWith("/projects")) body={id:projectId,slug:"fixture-project",name:"Fixture Project",description:null,status:"ACTIVE",created_at:"2026-09-24T00:00:00Z"};
    else if(path.endsWith("/project_members")) body={project_id:projectId,user_id:userId,role:"owner",status:"active"};
    else if(path.endsWith("/tool_registry")) body=[];
    else if(path.endsWith("/capabilities")) body=[{
      id:"00000000-0000-4000-8000-000000000201",account_key:"fixture",connector_kind:"github",capability:"repository",
      state:"AVAILABLE",observed_at:"2026-09-26T11:55:00Z",next_check_at:null,confidence:1,concurrency_limit:1,running:0,metadata:{}
    }];
    else if(path.endsWith("/get_project_dashboard_summary")) body={total_jobs:3,active_jobs:2,running_jobs:1,blocked_jobs:0,available_capabilities:1,registered_capabilities:1};
    else if(path.endsWith("/jobs")) body=jobs;
    else if(path.includes("/accept_pending_project_member_invites_v1")||path.includes("/accept_pending_job_invites")) body=null;
    return route.fulfill({contentType:"application/json",body:JSON.stringify(body)});
  });

  await page.goto(appPath+"?view=scheduler");

  await expect(page.getByRole("heading",{name:"Capability-aware project scheduler",exact:true})).toBeVisible();
  await expect(page.getByText("Fixture Project",{exact:true}).first()).toBeVisible();
  await expect(page.getByText("fixture-project",{exact:true}).first()).toBeVisible();
  await expect(page.locator(".schedulerProjectGroupHead")).toBeVisible();
  await expect(page.getByText("Maintenance",{exact:true})).toBeVisible();
  await expect(page.getByText("Critical",{exact:true})).toBeVisible();
  await expect(page.getByText("3 jobs",{exact:true})).toBeVisible();
  await expect(page.locator(".schedulerProjectGroupHead").getByText("2 active",{exact:true})).toBeVisible();
  await expect(page.getByText("Peak P100",{exact:true})).toBeVisible();

  const ganttPriorities=page.locator(".ganttPriorityMeta .priorityScaleMarker");
  await expect(ganttPriorities).toHaveCount(3);
  await expect(ganttPriorities.nth(0)).toHaveAttribute("style",/left:\s*100%/);
  await expect(ganttPriorities.nth(1)).toHaveAttribute("style",/left:\s*50%/);
  await expect(ganttPriorities.nth(2)).toHaveAttribute("style",/left:\s*5%/);

  await page.getByRole("button",{name:"Queue",exact:true}).click();
  await expect(page.locator(".schedulerProjectGroup .schedulerTable")).toBeVisible();
  await expect(page.locator(".schedulerPriorityCell .priorityScaleMarker")).toHaveCount(3);

  await page.getByRole("button",{name:"Gantt chart",exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  await expect(page.locator(".ganttViewport")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
