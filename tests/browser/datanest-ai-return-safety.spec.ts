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

async function openAiSidebar(page:import("@playwright/test").Page){
  await openWorkspace(page,"DataNest AI");
  await expect(page.getByText("DataNest AI E2E Job",{exact:true}).first()).toBeVisible();
  await page.getByText("DataNest AI E2E Job",{exact:true}).first().click();
  const assistant=page.getByRole("button",{name:"AI assistant",exact:true});
  await expect(assistant).toBeVisible();
  await assistant.click();
  await expect(page.getByText("RETURN TO DATANEST")).toBeVisible();
  await expect(page.getByRole("button",{name:"Open companion + load handoff",exact:true})).toBeEnabled();
}

test("session auto-fill requires opt-in, preserves edits, and stops when disabled",async({page,context})=>{
  await signIn(page);
  await context.grantPermissions(["clipboard-read","clipboard-write"],{
    origin:new URL(page.url()).origin
  });
  await openAiSidebar(page);

  page.on("popup",popup=>void popup.close());
  await page.getByRole("button",{name:"Open companion + load handoff"}).click();
  const response=page.getByPlaceholder(/Paste or type the external AI response here/i);
  await expect(response).toBeEnabled();
  await expect(page.getByText("AUTO-FILL ON",{exact:true})).toHaveCount(0);
  await page.bringToFront();

  // Wrap the REAL clipboard read: observe both attempted and completed reads.
  await page.evaluate(()=>{
    const clipboard=navigator.clipboard;
    const readText=clipboard.readText.bind(clipboard);
    document.documentElement.dataset.clipboardStarts="0";
    document.documentElement.dataset.clipboardReads="0";
    Object.defineProperty(clipboard,"readText",{configurable:true,value:async()=>{
      document.documentElement.dataset.clipboardStarts=String(
        Number(document.documentElement.dataset.clipboardStarts||"0")+1
      );
      const text=await readText();
      document.documentElement.dataset.clipboardReads=String(
        Number(document.documentElement.dataset.clipboardReads||"0")+1
      );
      return text;
    }});
  });
  const initial="Initial governed clipboard response.";
  await page.evaluate(async text=>navigator.clipboard.writeText(text),initial);
  const startsBeforeOptIn=await page.evaluate(()=>{
    window.dispatchEvent(new Event("focus"));
    return document.documentElement.dataset.clipboardStarts;
  });
  expect(startsBeforeOptIn).toBe("0");
  await expect(response).toHaveValue("");

  await page.getByRole("button",{name:"Enable session auto-fill",exact:true}).click();
  await expect(page.getByText("AUTO-FILL ON",{exact:true})).toBeVisible();
  await expect(response).toHaveValue(initial);

  const edited="Initial governed clipboard response - reviewed and edited.";
  await response.fill(edited);
  const unrelated="Unrelated clipboard text copied after the edit.";
  await page.evaluate(async text=>navigator.clipboard.writeText(text),unrelated);
  const readsBefore=await page.locator("html").getAttribute("data-clipboard-reads");
  await page.evaluate(()=>window.dispatchEvent(new Event("focus")));
  await expect.poll(async()=>Number(await page.locator("html").getAttribute("data-clipboard-reads"))).toBeGreaterThan(Number(readsBefore||"0"));
  await expect(response).toHaveValue(edited);

  await page.getByRole("button",{name:"Paste from clipboard",exact:true}).click();
  await expect(response).toHaveValue(unrelated);
  await page.getByRole("button",{name:"Turn off auto-fill",exact:true}).click();
  await expect(page.getByRole("button",{name:"Enable session auto-fill",exact:true})).toBeVisible();
  await response.fill("");
  const readCounts=await page.evaluate(()=>{
    const before=document.documentElement.dataset.clipboardStarts;
    window.dispatchEvent(new Event("focus"));
    return {before,after:document.documentElement.dataset.clipboardStarts};
  });
  expect(readCounts.after).toBe(readCounts.before);
  await expect(response).toHaveValue("");
});

test("switching jobs replaces the tracked handoff with the newly selected manifest",async({page})=>{
  await signIn(page);
  await openAiSidebar(page);

  page.on("popup",popup=>void popup.close());
  await page.getByRole("button",{name:"Open companion + load handoff"}).click();
  await expect(page.getByPlaceholder(/Paste or type the external AI response here/i)).toBeEnabled();

  const handoff=page.locator("details.externalAiHandoff textarea");
  await expect(handoff).toHaveValue(/Job Manifest: JOB-\d+ \u00b7 DataNest AI E2E Job\n/);
  const jobSelect=page.getByRole("combobox",{name:/^Job Manifest/});
  const target=jobSelect.locator("option").filter({hasText:"DataNest AI E2E Job B"}).first();
  const switchJobId=await target.getAttribute("value");
  if(!switchJobId)throw new Error("DataNest AI E2E Job B fixture is required.");
  await jobSelect.selectOption(switchJobId);

  await expect(jobSelect).toHaveValue(switchJobId);
  await expect(handoff).toHaveValue(/Job Manifest: JOB-\d+ \u00b7 DataNest AI E2E Job B\n/);
  await expect(handoff).not.toHaveValue(/Job Manifest: JOB-\d+ \u00b7 DataNest AI E2E Job\n/);
  await expect(page.locator(".externalAiReturnDock textarea")).toBeDisabled();
  await expect(page.getByRole("button",{name:"Enable session auto-fill",exact:true})).toBeDisabled();
});

test("provider launch preloads traced work without user email and sidebar resizing works by keyboard",async({page,context})=>{
  await page.setViewportSize({width:1600,height:1000});
  await signIn(page);
  await openAiSidebar(page);

  // Exercise the real popup URL while preventing contact with an external provider.
  await context.route("https://chatgpt.com/**",route=>route.fulfill({
    status:200,contentType:"text/html",body:"<!doctype html><title>Provider navigation fixture</title>"
  }));
  const popupReady=page.waitForEvent("popup");
  await page.getByRole("button",{name:"Open companion + load handoff"}).click();
  const popup=await popupReady;
  await popup.waitForURL(url=>url.hostname==="chatgpt.com"&&Boolean(url.searchParams.get("prompt")));
  const providerUrl=new URL(popup.url());
  const prompt=providerUrl.searchParams.get("prompt")||"";
  expect(prompt).toContain("RESONANCE DATANEST — LIVE EXTERNAL AI HANDOFF");
  expect(prompt).toContain("[DATANEST TRACKING HEADER]");
  expect(prompt).toContain("Trace Key: DN-");
  expect(prompt).not.toContain(process.env.DATANEST_AI_E2E_EMAIL!);
  expect(providerUrl.hash).toBe("");
  await popup.close();
  await page.bringToFront();

  await expect.poll(async()=>{
    const box=await page.locator("aside.externalAiDock").boundingBox();
    return box?Math.round(1600-(box.x+box.width)):Number.POSITIVE_INFINITY;
  }).toBeLessThanOrEqual(2);

  const handoff=page.locator("details.externalAiHandoff textarea");
  await expect(handoff).toHaveValue(/Trace Key: DN-/);
  expect(await handoff.inputValue()).not.toContain(process.env.DATANEST_AI_E2E_EMAIL!);
  const dock=page.locator("aside.externalAiDock");
  const originalWidth=await dock.evaluate(element=>element.getBoundingClientRect().width);
  await page.getByRole("button",{name:"Widen AI sidebar",exact:true}).focus();
  await page.keyboard.press("Enter");
  await expect.poll(()=>dock.evaluate(element=>element.getBoundingClientRect().width)).toBe(originalWidth+40);
  await page.getByRole("button",{name:"Narrow AI sidebar",exact:true}).focus();
  await page.keyboard.press("Enter");
  await expect.poll(()=>dock.evaluate(element=>element.getBoundingClientRect().width)).toBe(originalWidth);
  await expect(page.locator(".externalAiReturnDock textarea")).toBeVisible();
});

test("a new tracked session for the same Job does not inherit clipboard consent",async({page,context})=>{
  await signIn(page);
  await context.grantPermissions(["clipboard-read","clipboard-write"],{
    origin:new URL(page.url()).origin
  });
  await openAiSidebar(page);
  page.on("popup",popup=>void popup.close());
  const launch=page.getByRole("button",{name:"Open companion + load handoff",exact:true});
  await launch.click();
  const response=page.locator(".externalAiReturnDock textarea");
  await expect(response).toBeEnabled();
  await page.bringToFront();
  await page.getByRole("button",{name:"Enable session auto-fill",exact:true}).click();
  await expect(page.getByText("AUTO-FILL ON",{exact:true})).toBeVisible();
  const reviewed="Reviewed draft preserved while opening a fresh tracked session.";
  await response.fill(reviewed);
  const sessionLabel=page.locator(".externalAiReturnDock small");
  const previousSession=await sessionLabel.innerText();
  await launch.click();
  await expect(launch).toBeEnabled();
  await expect(sessionLabel).not.toHaveText(previousSession);
  await expect(page.getByText("AUTO-FILL ON",{exact:true})).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Enable session auto-fill",exact:true})).toBeEnabled();
  await expect(response).toHaveValue(reviewed);
});

async function holdRealClipboardRead(
  page:import("@playwright/test").Page,
  context:import("@playwright/test").BrowserContext
){
  await signIn(page);
  await context.grantPermissions(["clipboard-read","clipboard-write"],{
    origin:new URL(page.url()).origin
  });
  await openAiSidebar(page);
  page.on("popup",popup=>void popup.close());
  await page.getByRole("button",{name:"Open companion + load handoff",exact:true}).click();
  const response=page.locator(".externalAiReturnDock textarea");
  await expect(response).toBeEnabled();
  await page.bringToFront();
  await page.getByRole("button",{name:"Enable session auto-fill",exact:true}).click();
  await expect(page.getByText("AUTO-FILL ON",{exact:true})).toBeVisible();
  await response.fill("");
  // Delay only delivery of a REAL clipboard result; do not substitute its value.
  await page.evaluate(async()=>{
    await navigator.clipboard.writeText("Stale clipboard result from the previous capture context.");
    const readText=navigator.clipboard.readText.bind(navigator.clipboard);
    document.documentElement.dataset.heldClipboardReads="0";
    document.documentElement.dataset.releasedClipboardReads="0";
    Object.defineProperty(navigator.clipboard,"readText",{configurable:true,value:async()=>{
      const text=await readText();
      document.documentElement.dataset.heldClipboardReads=String(
        Number(document.documentElement.dataset.heldClipboardReads||"0")+1
      );
      await new Promise<void>(resolve=>window.addEventListener(
        "datanest:test-release-clipboard",()=>resolve(),{once:true}
      ));
      document.documentElement.dataset.releasedClipboardReads=String(
        Number(document.documentElement.dataset.releasedClipboardReads||"0")+1
      );
      return text;
    }});
    window.dispatchEvent(new Event("focus"));
  });
  await expect.poll(async()=>Number(await page.locator("html").getAttribute("data-held-clipboard-reads"))).toBeGreaterThan(0);
  return response;
}

async function releaseRealClipboardRead(page:import("@playwright/test").Page){
  await page.evaluate(async()=>{
    window.dispatchEvent(new Event("datanest:test-release-clipboard"));
    // Let promise continuations and React's rendered state settle, not just the event.
    await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
  });
  await expect.poll(async()=>Number(await page.locator("html").getAttribute("data-released-clipboard-reads"))).toBeGreaterThan(0);
}

test("disabling auto-fill discards an already pending clipboard result",async({page,context})=>{
  const response=await holdRealClipboardRead(page,context);
  await page.getByRole("button",{name:"Turn off auto-fill",exact:true}).click();
  await expect(page.getByRole("button",{name:"Enable session auto-fill",exact:true})).toBeVisible();
  await releaseRealClipboardRead(page);
  await expect(response).toHaveValue("");
});

for(const changedContext of ["Job","provider"] as const){
  test("a pending clipboard result is discarded after changing "+changedContext,async({page,context})=>{
    const response=await holdRealClipboardRead(page,context);
    if(changedContext==="Job"){
      const jobSelect=page.getByRole("combobox",{name:/^Job Manifest/});
      const option=jobSelect.locator("option").filter({hasText:"DataNest AI E2E Job B"}).first();
      const id=await option.getAttribute("value");
      if(!id)throw new Error("The second deterministic Job fixture is required.");
      await jobSelect.selectOption(id);
      await expect(jobSelect).toHaveValue(id);
    }else{
      await page.getByRole("combobox",{name:/^External AI/}).selectOption("gemini");
    }
    await expect(response).toBeDisabled();
    await releaseRealClipboardRead(page);
    await expect(response).toHaveValue("");
  });
}
