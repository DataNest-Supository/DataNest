import { expect, test, type Page } from "@playwright/test";

const appPath=process.env.DATANEST_APP_PATH||"/";
const projectId="00000000-0000-4000-8000-000000000010";
const userId="00000000-0000-4000-8000-000000000001";
const jobId="00000000-0000-4000-8000-000000000020";
const capabilityId="00000000-0000-4000-8000-000000000030";
const envelopeA3="00000000-0000-4000-8000-000000000101";
const envelopeA4="00000000-0000-4000-8000-000000000102";
const envelopeDraftA3="00000000-0000-4000-8000-000000000103";

const job={
  id:jobId,job_number:42,title:"Fixture governed execution",description:"Phase D browser fixture",
  priority:80,status:"READY",required_capabilities:["chat"],acceptance:{},created_at:"2026-09-27T08:00:00Z",
  updated_at:"2026-09-27T09:00:00Z",deadline:"2026-09-28T09:00:00Z"
};
const capability={
  id:capabilityId,account_key:"fixture-runtime",connector_kind:"fixture",capability:"chat",state:"AVAILABLE",
  observed_at:"2026-09-27T10:00:00Z",next_check_at:null,confidence:1,concurrency_limit:2,running:0,metadata:{}
};

function authorityWorkspace(role:"viewer"|"operator"|"owner"){
  return {
    envelopes:[
      {
        id:envelopeA3,project_id:projectId,product_id:null,job_id:jobId,actor_type:"agent",actor_user_id:null,
        actor_key:"agent:fixture",sponsor_user_id:userId,purpose:"job_execution",autonomy_level:"A3",
        permitted_capabilities:["chat"],permitted_operations:["observe","prepare","execute"],
        data_scope:{project:true},resource_ceiling:{max_duration_seconds:900,max_operations:5,max_cost_minor:0,max_concurrency:1,blast_radius:"single_job"},
        reversibility:"reversible",evidence_requirements:{verification:true},approval_state:"approved",
        trace_key:"AUTH-FIXTURE-A3",effective_from:"2026-09-27T09:00:00Z",expires_at:"2099-09-27T11:00:00Z",
        created_by:"00000000-0000-4000-8000-000000000099",approved_by:userId,approved_at:"2026-09-27T09:01:00Z",created_at:"2026-09-27T08:50:00Z"
      },
      {
        id:envelopeDraftA3,project_id:projectId,product_id:null,job_id:jobId,actor_type:"workflow",actor_user_id:null,
        actor_key:"workflow:fixture",sponsor_user_id:userId,purpose:"job_execution",autonomy_level:"A3",
        permitted_capabilities:["chat"],permitted_operations:["observe","prepare","execute"],
        data_scope:{project:true},resource_ceiling:{max_duration_seconds:600,max_operations:3,max_cost_minor:0,max_concurrency:1,blast_radius:"single_job"},
        reversibility:"reversible",evidence_requirements:{verification:true},approval_state:"draft",
        trace_key:"AUTH-FIXTURE-DRAFT-A3",expires_at:"2099-09-27T11:00:00Z",created_by:"00000000-0000-4000-8000-000000000099",created_at:"2026-09-27T09:30:00Z"
      },
      {
        id:envelopeA4,project_id:projectId,product_id:null,job_id:jobId,actor_type:"human",actor_user_id:userId,
        actor_key:"user:"+userId,sponsor_user_id:userId,purpose:"high_impact_review",autonomy_level:"A4",
        permitted_capabilities:["chat"],permitted_operations:["observe","prepare"],
        data_scope:{project:true},resource_ceiling:{max_duration_seconds:300,max_operations:1,max_cost_minor:0,max_concurrency:1,blast_radius:"single_job"},
        reversibility:"irreversible",evidence_requirements:{human_review:true},approval_state:"draft",
        trace_key:"AUTH-FIXTURE-A4",expires_at:"2099-09-27T11:00:00Z",created_by:"00000000-0000-4000-8000-000000000099",created_at:"2026-09-27T09:40:00Z"
      }
    ],
    leases:[{
      id:"00000000-0000-4000-8000-000000000201",project_id:projectId,authority_envelope_id:envelopeA3,
      job_id:jobId,capability_id:capabilityId,actor_key:"agent:fixture",allowed_operations:["observe","execute"],
      data_scope:{project:true},resource_ceiling:{max_operations:5},approval_level:"A3",trace_key:"LEASE-FIXTURE",
      status:"active",max_operations:5,used_operations:2,expires_at:"2099-09-27T10:30:00Z",issued_by:userId,
      issued_at:"2026-09-27T09:05:00Z",last_used_at:"2026-09-27T09:10:00Z"
    }],
    breakers:[
      {id:"00000000-0000-4000-8000-000000000301",project_id:projectId,category:"resource_execution",state:"halted",reason:"Fixture emergency stop.",updated_by:userId,updated_at:"2026-09-27T09:20:00Z"},
      {id:"00000000-0000-4000-8000-000000000302",project_id:projectId,category:"autonomous_write",state:"open",reason:"Reviewed.",updated_by:userId,updated_at:"2026-09-27T09:20:00Z"}
    ],
    capabilities:[capability],
    caller_role:role,
    can_propose:role!=="viewer",
    can_approve_a3:role==="owner",
    can_manage_breakers:role==="owner",
    boundaries:{
      capacity_reservation_is_authorization:false,
      a4_generic_automation:false,
      human_job_controls_require_authority_envelope:false,
      phase_c_remains_independent:true
    }
  };
}

async function setup(page:Page,role:"viewer"|"operator"|"owner"){
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
    const request=route.request();
    const pathname=new URL(request.url()).pathname;
    let body:unknown=[];
    const headers:Record<string,string>={"content-type":"application/json"};

    if(pathname.endsWith("/projects"))body={id:projectId,slug:"resonance-datanest",name:"Fixture project",description:null,status:"ACTIVE",created_at:"2026-09-26T00:00:00Z"};
    if(pathname.endsWith("/project_members"))body={project_id:projectId,user_id:userId,role,status:"active"};
    if(pathname.endsWith("/tool_registry"))body=[];
    if(pathname.endsWith("/capabilities"))body=[capability];
    if(pathname.endsWith("/jobs")){
      body=[job];
      headers["content-range"]="0-0/1";
    }
    if(pathname.endsWith("/rpc/get_project_dashboard_summary"))body={total_jobs:1,active_jobs:1,running_jobs:0,blocked_jobs:0,available_capabilities:1,registered_capabilities:1};
    if(pathname.endsWith("/rpc/get_execution_authority_workspace_v1"))body=authorityWorkspace(role);
    if(pathname.includes("/rpc/")&&Array.isArray(body))body="00000000-0000-4000-8000-000000000999";

    return route.fulfill({headers,body:JSON.stringify(body)});
  });
}

test("TranScheduler keeps Gantt default and human queue controls separate from automated authority",async({page})=>{
  await setup(page,"operator");
  await page.goto(appPath+"?view=scheduler");

  await expect(page.getByRole("button",{name:"Gantt chart",exact:true})).toHaveAttribute("aria-pressed","true");
  await expect(page.getByRole("button",{name:"Authority & Execution",exact:true})).toBeVisible();

  await page.getByRole("button",{name:"Queue",exact:true}).click();
  await expect(page.getByRole("button",{name:"Pause",exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Cancel",exact:true})).toBeVisible();
});

test("viewer can inspect Phase D authority without mutation controls",async({page})=>{
  await setup(page,"viewer");
  await page.goto(appPath+"?view=scheduler");
  await page.getByRole("button",{name:"Authority & Execution",exact:true}).click();

  await expect(page.getByText("Capacity reservation ≠ authorization lease.",{exact:false})).toBeVisible();
  await expect(page.getByText("A4 is human-gated.",{exact:false})).toBeVisible();
  for(const label of ["A0 · Observe","A1 · Advise","A2 · Prepare","A3 · Execute","A4 · High-impact"]){
    await expect(page.getByText(label,{exact:true}).first()).toBeVisible();
  }
  await expect(page.getByText("Fixture emergency stop.",{exact:true})).toBeVisible();
  await expect(page.locator("summary").filter({hasText:"Propose Authority Envelope"})).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Approve",exact:true})).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Halt",exact:true})).toHaveCount(0);
});

test("operator can propose bounded authority but cannot approve A3 or manage breakers",async({page})=>{
  await setup(page,"operator");
  await page.goto(appPath+"?view=scheduler");
  await page.getByRole("button",{name:"Authority & Execution",exact:true}).click();

  await expect(page.locator("summary").filter({hasText:"Propose Authority Envelope"})).toBeVisible();
  await expect(page.getByText("A3 · workflow:fixture",{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Approve",exact:true})).toHaveCount(0);
  await expect(page.locator("summary").filter({hasText:"Issue Capability Lease"})).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Halt",exact:true})).toHaveCount(0);
});

test("owner sees A3 review, lease and breaker controls while A4 stays non-automated",async({page})=>{
  await setup(page,"owner");
  await page.goto(appPath+"?view=scheduler");
  await page.getByRole("button",{name:"Authority & Execution",exact:true}).click();

  await expect(page.getByText("A3 · workflow:fixture",{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Approve",exact:true}).first()).toBeVisible();
  await expect(page.locator("summary").filter({hasText:"Issue Capability Lease · Owner / admin"})).toBeVisible();
  await expect(page.getByRole("button",{name:"Halt",exact:true}).first()).toBeVisible();
  await expect(page.getByText(/A4 remains human-gated; no automated lease action is exposed\./)).toBeVisible();

  await page.locator("summary").filter({hasText:"Issue Capability Lease · Owner / admin"}).click();
  const envelopeSelect=page.getByLabel("Approved envelope");
  await expect(envelopeSelect).toBeVisible();
  await expect(envelopeSelect.locator("option")).toHaveCount(2);

  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
