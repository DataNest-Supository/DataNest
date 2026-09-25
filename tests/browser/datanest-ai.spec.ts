import { expect, test } from "@playwright/test";

async function signIn(page:import("@playwright/test").Page){
  const email=process.env.DATANEST_AI_E2E_EMAIL;
  const password=process.env.DATANEST_AI_E2E_PASSWORD;
  if(!email||!password)throw new Error("DATANEST_AI_E2E_EMAIL and DATANEST_AI_E2E_PASSWORD are required.");

  await page.goto(process.env.DATANEST_APP_PATH||"/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button",{name:"Sign in"}).click();
  await expect(page.getByRole("button",{name:/Quick switch/})).toBeVisible({timeout:15000});
}

async function openWorkspace(page:import("@playwright/test").Page,label:string){
  await page.keyboard.press("Control+K");
  const dialog=page.getByRole("dialog",{name:"Quick switch DataNest workspace"});
  await expect(dialog).toBeVisible();
  const search=dialog.getByLabel("Search DataNest workspaces");
  await search.fill(label);
  await dialog.getByRole("option",{name:new RegExp(label,"i")}).first().click();
  await expect(dialog).toBeHidden();
}

test("quick switch searches workspaces and navigates with Ctrl+K",async({page})=>{
  await signIn(page);

  await page.keyboard.press("Control+K");
  const dialog=page.getByRole("dialog",{name:"Quick switch DataNest workspace"});
  await expect(dialog).toBeVisible();

  const search=dialog.getByLabel("Search DataNest workspaces");
  await expect(search).toBeFocused();
  await search.fill("Transparency");
  await dialog.getByRole("option",{name:/Transparency/}).click();

  await expect(page).toHaveURL(/(?:\?|&)view=transparency(?:&|$)/);
  await expect(page.getByRole("heading",{name:"Audit library + public accountability record",exact:true})).toBeVisible();

  await page.keyboard.press("Control+K");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});


test("quick switch ignores Enter until a search is typed",async({page})=>{
  await signIn(page);

  await page.keyboard.press("Control+K");
  const dialog=page.getByRole("dialog",{name:"Quick switch DataNest workspace"});
  const search=dialog.getByLabel("Search DataNest workspaces");
  await expect(search).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(dialog).toBeVisible();
  await expect(search).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});


test("quick switch opens the first matching workspace with Enter",async({page})=>{
  await signIn(page);

  await page.keyboard.press("Control+K");
  const dialog=page.getByRole("dialog",{name:"Quick switch DataNest workspace"});
  const search=dialog.getByLabel("Search DataNest workspaces");
  await expect(search).toBeFocused();

  await search.fill("Transparency");
  await page.keyboard.press("Enter");

  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/(?:\\?|&)view=transparency(?:&|$)/);
  await expect(page.getByRole("heading",{name:"Audit library + public accountability record",exact:true})).toBeVisible();
});


test("quick switch moves keyboard selection with ArrowDown before Enter",async({page})=>{
  await signIn(page);

  await page.keyboard.press("Control+K");
  const dialog=page.getByRole("dialog",{name:"Quick switch DataNest workspace"});
  const search=dialog.getByLabel("Search DataNest workspaces");
  await expect(search).toBeFocused();

  await search.fill("Research");
  const options=dialog.getByRole("option");
  await expect(options).toHaveCount(3);
  await expect(dialog.getByRole("option",{name:/Think Tanks/})).toHaveAttribute("aria-selected","true");

  await page.keyboard.press("ArrowDown");
  await expect(dialog.getByRole("option",{name:/DataNest AI/})).toHaveAttribute("aria-selected","true");

  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/(?:\\?|&)view=ai(?:&|$)/);
  await expect(page.getByRole("heading",{name:"DataNest AI",exact:true}).first()).toBeVisible();
});


test("quick switch traps focus and restores the opening control",async({page})=>{
  await signIn(page);

  const trigger=page.getByRole("button",{name:/Quick switch/});
  await trigger.focus();
  await trigger.click();

  const dialog=page.getByRole("dialog",{name:"Quick switch DataNest workspace"});
  await expect(dialog).toBeVisible();

  const close=dialog.getByRole("button",{name:"Close quick switch"});
  const options=dialog.getByRole("option");
  const lastOption=options.last();

  await lastOption.focus();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();

  await page.keyboard.press("Shift+Tab");
  await expect(lastOption).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});


test("workspace deep links survive reload and follow browser history",async({page})=>{
  await signIn(page);

  await openWorkspace(page,"Think Tanks");
  await expect(page).toHaveURL(/(?:\?|&)view=thinktank(?:&|$)/);
  await expect(page.getByText("THINK TANKS + DATANEST AI",{exact:true})).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(/(?:\?|&)view=thinktank(?:&|$)/);
  await expect(page.getByText("THINK TANKS + DATANEST AI",{exact:true})).toBeVisible();

  await openWorkspace(page,"DataNest AI");
  await expect(page).toHaveURL(/(?:\?|&)view=ai(?:&|$)/);

  await page.goBack();
  await expect(page).toHaveURL(/(?:\?|&)view=thinktank(?:&|$)/);
  await expect(page.getByText("THINK TANKS + DATANEST AI",{exact:true})).toBeVisible();

  await page.goForward();
  await expect(page).toHaveURL(/(?:\?|&)view=ai(?:&|$)/);
  await expect(page.getByRole("heading",{name:"DataNest AI",exact:true}).first()).toBeVisible();
});


test("mobile TranScheduler avoids horizontal table scrolling",async({page})=>{
  await signIn(page);
  await page.setViewportSize({width:390,height:844});

  await page.getByRole("button",{name:"Open menu"}).click();
  await page.getByText("Tools",{exact:true}).click();
  await page.getByRole("button",{name:"TranScheduler",exact:true}).click();
  await expect(page).toHaveURL(/(?:\?|&)view=scheduler(?:&|$)/);

  const table=page.locator(".schedulerTable");
  await expect(table).toBeVisible();

  const overflow=await table.evaluate(element=>element.scrollWidth-element.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  const rows=page.locator(".schedulerRow:not(.headerRow)");
  if(await rows.count()){
    const first=rows.first();
    const metrics=await first.evaluate(element=>({
      width:element.getBoundingClientRect().width,
      viewport:window.innerWidth
    }));
    expect(metrics.width).toBeLessThanOrEqual(metrics.viewport-28);
    await expect(first.locator('[data-label="Job"]')).toBeVisible();
    await expect(first.locator('[data-label="Status"]')).toBeVisible();
  }
});


test("mobile TranScheduler status filter uses a compact select",async({page})=>{
  await signIn(page);
  await page.setViewportSize({width:390,height:844});

  await page.getByRole("button",{name:"Open menu"}).click();
  await page.getByRole("button",{name:"TranScheduler",exact:true}).click();

  const statusFilter=page.getByLabel("Status filter");
  await expect(statusFilter).toBeVisible();
  await expect(page.locator(".schedulerFilterDesktop")).toBeHidden();

  await statusFilter.selectOption("RUNNING");
  await expect(statusFilter).toHaveValue("RUNNING");

  const rows=page.locator(".schedulerRow:not(.headerRow)");
  const count=await rows.count();
  for(let index=0;index<count;index++){
    await expect(rows.nth(index).locator('[data-label="Status"]')).toContainText("RUNNING");
  }
});


test("human input is traced and remains uncertified",async({page})=>{
  await signIn(page);
  await page.getByRole("button",{name:"DataNest AI",exact:true}).click();
  await expect(page.getByText("DataNest AI E2E Job",{exact:true}).first()).toBeVisible();
  await page.getByText("DataNest AI E2E Job",{exact:true}).first().click();

  const message="Keep DataNest AI trace IDs visible on every governed turn.";
  await page.getByPlaceholder(/Enter development input/i).fill(message);
  await page.getByRole("button",{name:"Send to DataNest AI"}).click();

  await expect(page.getByText(message,{exact:true})).toBeVisible();
  await expect(page.getByText("UNCERTIFIED",{exact:true}).last()).toBeVisible();
  await expect(page.getByText(/DN-AI-/).last()).toBeVisible();
  await expect(page.getByLabel("Certified Memory")).toBeVisible();
  await expect(page.getByLabel("Learning & Certification")).toBeVisible();
});

test("AI Companion return becomes uncertified evidence in the selected Job",async({page})=>{
  await signIn(page);
  await page.getByRole("button",{name:"DataNest AI",exact:true}).click();
  await expect(page.getByText("DataNest AI E2E Job",{exact:true}).first()).toBeVisible();
  await page.getByText("DataNest AI E2E Job",{exact:true}).first().click();

  await page.getByRole("button",{name:"AI Sidebar"}).click();
  await expect(page.getByText("RETURN TO DATANEST")).toBeVisible();

  page.on("popup",popup=>void popup.close());
  await page.getByRole("button",{name:"Open companion + load handoff"}).click();
  await expect(page.getByText("COMPANION · READY",{exact:true})).toBeVisible();

  const companionResult="AI Companion E2E evidence: preserve traceability before project-wide learning.";
  await page.getByPlaceholder(/Paste or type the external AI response here/i).fill(companionResult);
  await page.getByRole("button",{name:"Import to DataNest"}).click();
  await expect(page.getByText(/staged as UNCERTIFIED evidence/i)).toBeVisible();

  await page.getByRole("button",{name:"Hide AI Sidebar"}).click();
  await expect(page.getByText(companionResult,{exact:true})).toBeVisible();
  await expect(page.getByText("UNCERTIFIED",{exact:true}).last()).toBeVisible();
});


test("Think Tanks expose project-scoped collaboration and reviewed-memory boundaries",async({page})=>{
  await signIn(page);
  await page.getByRole("button",{name:"Think Tanks",exact:true}).click();

  await expect(page.getByText("THINK TANKS + DATANEST AI",{exact:true})).toBeVisible();
  await expect(page.getByText("Discuss → Ask → Decide → Act → Review → Remember",{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Project Commons",exact:true})).toBeVisible();
  await expect(page.getByText(/Project-wide discussion; link a channel to a Job to invoke DataNest AI/)).toBeVisible();
  await expect(page.getByText(/reusable learning reaches project memory only after independent human review/i)).toBeVisible();
});


test("Sparks workspace exposes internal utility boundaries",async({page})=>{
  await signIn(page);
  await page.getByRole("button",{name:"Sparks",exact:true}).click();

  await expect(page.getByText("SPARKS · INTERNAL UTILITY",{exact:true})).toBeVisible();
  await expect(page.getByText("Earned contribution utility, not money",{exact:true})).toBeVisible();
  await expect(page.getByText(/cannot be bought for cash, redeemed for cash, transferred peer-to-peer, traded/i)).toBeVisible();
  await expect(page.getByText(/platform spending is disabled in v1/i)).toBeVisible();
  await expect(page.getByText(/Ledger entries are append-only/i)).toBeVisible();
});


test("Sovereign Governance exposes project-scoped governance boundaries",async({page})=>{
  await signIn(page);
  await page.getByRole("button",{name:"Governance",exact:true}).click();

  await expect(page.getByText("RESONANCE SOVEREIGN GOVERNANCE",{exact:true})).toBeVisible();
  await expect(page.getByText("Transparent project governance with immutable decision history",{exact:true})).toBeVisible();
  await expect(page.getByRole("heading",{name:"No human-ratified protocol",exact:true})).toBeVisible();
  await expect(page.getByText(/has not invented mission, vision or governance text on your behalf/i)).toBeVisible();
  await expect(page.getByText(/do not amend signed agreements, create legal ownership, create royalty entitlements, grant project roles or create financial authority/i)).toBeVisible();
});


test("Governance exposes governed project membership and non-voter pending state",async({page})=>{
  await signIn(page);
  await page.getByRole("button",{name:"Governance",exact:true}).click();

  await expect(page.getByText("FORMAL MEMBERSHIP",{exact:true})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Project members + governance voters",exact:true})).toBeVisible();
  await expect(page.getByText(/Sending an invitation never creates an independent vote by itself/i)).toBeVisible();
  await expect(page.getByText(/1 ACTIVE VOTER/)).toBeVisible();
  await expect(page.getByText(/acceptance requires the matching authenticated account/i)).toBeVisible();
});


test("Transparency publishes the external audit return and pending validation state",async({page})=>{
  await signIn(page);
  await openWorkspace(page,"Transparency");

  await expect(page.getByRole("heading",{name:"Audit library + public accountability record",exact:true})).toBeVisible();
  await expect(page.getByText(/EXTERNAL AUDIT RETURN · 25 SEP 2026/)).toBeVisible();
  await expect(page.getByText(/not a full production certification/i).first()).toBeVisible();
  await expect(page.getByText(/14 reported · 0 DataNest-validated\/closed/i)).toBeVisible();
  await expect(page.getByText("AUD-001",{exact:true})).toBeVisible();
  await expect(page.getByText("AUD-014",{exact:true})).toBeVisible();
  await expect(page.getByText("PENDING",{exact:true}).first()).toBeVisible();

  await page.getByRole("button",{name:"Open full audit return",exact:true}).click();
  await expect(page.getByLabel("Complete external audit return source artifact")).toContainText("Final assessment:");
  await expect(page.getByLabel("Complete external audit return source artifact")).toContainText("AUD-014");
  await expect(page.getByRole("button",{name:"Download exact Markdown",exact:true})).toBeVisible();
});


test("public Transparency index publishes the audit return without sign in",async({page})=>{
  const appPath=(process.env.DATANEST_APP_PATH||"/").replace(/\/?$/,"/");
  await page.goto(appPath+"transparency/index.html");

  await expect(page.getByRole("heading",{name:"Transparency and Audit Library",exact:true})).toBeVisible();
  await expect(page.getByText("EXTERNAL AUDIT RETURN PUBLISHED",{exact:true})).toBeVisible();
  await expect(page.getByText(/14 findings/)).toBeVisible();
  await expect(page.getByText(/not a full production certification/i)).toBeVisible();
  await expect(page.getByRole("link",{name:"Structured findings (JSON)",exact:true})).toBeVisible();
  await expect(page.getByRole("link",{name:"Reported remediation backlog (JSON)",exact:true})).toBeVisible();

  await page.getByRole("link",{name:"Exact uploaded audit return (Markdown)",exact:true}).click();
  await expect(page.locator("body")).toContainText("RESONANCE DATANEST / RONSAS - EXTERNAL AUDIT RETURN");
  await expect(page.locator("body")).toContainText("AUD-014");
});
