import { expect, test } from "@playwright/test";

async function signIn(page:import("@playwright/test").Page){
  const email=process.env.DATANEST_AI_E2E_EMAIL;
  const password=process.env.DATANEST_AI_E2E_PASSWORD;
  if(!email||!password)throw new Error("DATANEST_AI_E2E_EMAIL and DATANEST_AI_E2E_PASSWORD are required.");

  await page.goto(process.env.DATANEST_APP_PATH||"/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button",{name:"Sign in"}).click();
  await expect(page.getByText("Resonance DataNest",{exact:true}).first()).toBeVisible();
}

async function openAiSidebar(page:import("@playwright/test").Page){
  await page.getByRole("button",{name:"DataNest AI",exact:true}).click();
  await expect(page.getByText("DataNest AI E2E Job",{exact:true}).first()).toBeVisible();
  await page.getByText("DataNest AI E2E Job",{exact:true}).first().click();
  await page.getByRole("button",{name:"AI Sidebar"}).click();
  await expect(page.getByText("RETURN TO DATANEST")).toBeVisible();
}

test("clipboard auto-fill preserves an edited response until explicit paste",async({page,context})=>{
  await signIn(page);
  await context.grantPermissions(["clipboard-read","clipboard-write"],{
    origin:new URL(page.url()).origin
  });
  await openAiSidebar(page);

  page.on("popup",popup=>void popup.close());
  await page.getByRole("button",{name:"Open companion + load prompt"}).click();
  await expect(page.getByText("COMPANION · READY",{exact:true})).toBeVisible();

  const response=page.getByPlaceholder(/External AI response will appear here/i);
  const initial="Initial governed clipboard response.";
  await page.evaluate(async text=>navigator.clipboard.writeText(text),initial);
  await page.evaluate(()=>window.dispatchEvent(new Event("focus")));
  await expect(response).toHaveValue(initial);

  const edited="Initial governed clipboard response — reviewed and edited.";
  await response.fill(edited);

  const unrelated="Unrelated clipboard text copied after the edit.";
  await page.evaluate(async text=>navigator.clipboard.writeText(text),unrelated);
  await page.evaluate(()=>window.dispatchEvent(new Event("focus")));
  await expect(response).toHaveValue(edited);

  await expect(page.getByRole("button",{name:"Paste from clipboard"})).toBeVisible();
  await page.getByRole("button",{name:"Paste from clipboard"}).click();
  await expect(response).toHaveValue(unrelated);
});

test("switching jobs replaces the tracked handoff with the newly selected manifest",async({page})=>{
  await signIn(page);
  await openAiSidebar(page);

  page.on("popup",popup=>void popup.close());
  await page.getByRole("button",{name:"Open companion + load prompt"}).click();
  await expect(page.getByText("COMPANION · READY",{exact:true})).toBeVisible();

  const handoff=page.locator("details.externalAiHandoff textarea");
  await expect(handoff).toHaveValue(/Job Manifest: JOB-\d+ · DataNest AI E2E Job\n/);

  const jobSelect=page.getByLabel("Job Manifest");
  const target=jobSelect.locator("option").filter({hasText:"DataNest AI E2E Job B"}).first();
  const switchJobId=await target.getAttribute("value");
  if(!switchJobId)throw new Error("DataNest AI E2E Job B fixture is required.");
  await jobSelect.selectOption(switchJobId);

  await expect(handoff).toHaveValue(/Job Manifest: JOB-\d+ · DataNest AI E2E Job B\n/);
  await expect(handoff).not.toHaveValue(/Job Manifest: JOB-\d+ · DataNest AI E2E Job\n/);
});
