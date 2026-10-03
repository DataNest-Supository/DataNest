import { expect, test } from "@playwright/test";
import { setupUiGovernanceFixture } from "./ui-governance-fixture";

const appPath=process.env.DATANEST_APP_PATH||"/";
const appViewPath=(view:string)=>appPath+(appPath.includes("?")?"&":"?")+"view="+view;

test("sidebar workspace finder restores focus and preserves deep-link navigation",async({page})=>{
  await setupUiGovernanceFixture(page);
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(appPath);

  const launcher=page.getByRole("button",{name:"Find a workspace"});
  await launcher.click();
  const dialog=page.getByRole("dialog",{name:"Quick switch DataNest workspace"});
  await expect(dialog).toBeVisible();

  const search=dialog.getByRole("searchbox",{name:"Search DataNest workspaces"});
  await expect(search).toBeFocused();
  await search.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(launcher).toBeFocused();

  await launcher.click();
  await expect(dialog).toBeVisible();
  await expect(search).toBeFocused();
  await search.fill("TranScheduler");
  await search.press("Enter");

  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/view=scheduler/);
  await expect(page.locator("#workspace-title")).toBeFocused();
});

test("mobile navigation contains focus, isolates the workspace and restores its launcher",async({page})=>{
  await setupUiGovernanceFixture(page);
  await page.setViewportSize({width:390,height:844});
  await page.goto(appPath);

  const menu=page.getByRole("button",{name:"Open menu",exact:true});
  const sidebar=page.locator("#datanest-navigation");
  const main=page.locator("main.mainPane");
  const skipLink=page.locator(".skipLink");

  await expect(sidebar).toHaveAttribute("inert","");
  await menu.click();

  const dialog=page.getByRole("dialog",{name:"DataNest navigation"});
  const close=dialog.getByRole("button",{name:"Close menu",exact:true});
  const signOut=dialog.getByRole("button",{name:"Sign out",exact:true});
  await expect(close).toBeFocused();
  await expect(main).toHaveAttribute("inert","");
  await expect(skipLink).toHaveAttribute("inert","");
  await expect(skipLink).toHaveAttribute("aria-hidden","true");
  await expect.poll(()=>page.evaluate(()=>document.body.style.overflow)).toBe("hidden");

  await close.press("Shift+Tab");
  await expect(signOut).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await expect(sidebar).toHaveAttribute("inert","");
  await expect(main).not.toHaveAttribute("inert");
  await expect(skipLink).not.toHaveAttribute("inert");
  await expect(skipLink).not.toHaveAttribute("aria-hidden");
  await expect.poll(()=>page.evaluate(()=>document.body.style.overflow)).not.toBe("hidden");

  await menu.click();
  await dialog.getByRole("button",{name:"AI & I",exact:true}).click();
  await expect(menu).toBeFocused();

  await menu.click();
  await dialog.getByRole("button",{name:"DataNest AI",exact:true}).click();
  await expect(page).toHaveURL(/view=ai/);
  await expect(page.locator("#workspace-title")).toBeFocused();
  await expect(sidebar).toHaveAttribute("inert","");

  await menu.click();
  await page.setViewportSize({width:1440,height:900});
  await expect(sidebar).not.toHaveAttribute("inert");
  await expect(main).not.toHaveAttribute("inert");
  await expect.poll(()=>page.evaluate(()=>document.body.style.overflow)).not.toBe("hidden");
});

test("mobile same-view sidebar shortcuts restore focus to safe destinations",async({page})=>{
  await setupUiGovernanceFixture(page);
  await page.route("https://fixture.supabase.co/rest/v1/rpc/get_owner_optimizer_workspace_v1",route=>route.fulfill({
    status:200,
    json:{
      role:"owner",
      can_manage:true,
      can_approve:true,
      settings:{
        project_id:"00000000-0000-4000-8000-000000000010",
        enabled:false,
        cadence_hours:6,
        max_suggestions:5,
        last_run_at:null,
        last_success_at:null,
        next_run_after:null,
        updated_at:"2026-10-03T00:00:00.000Z"
      },
      runs:[],
      suggestions:[],
      pending_count:0,
      boundaries:{}
    }
  }));
  await page.route("https://fixture.supabase.co/rest/v1/rpc/get_owner_governance_control_monitor_v1",route=>route.fulfill({
    status:200,
    json:{latest_run:null,runs:[],alerts:[],runtime_events:[],open_alert_count:0,boundaries:{}}
  }));
  await page.addInitScript(()=>window.localStorage.setItem("datanest:admin-rd-test-mode","enabled"));
  await page.setViewportSize({width:390,height:844});

  await page.goto(appViewPath("settings"));
  const menu=page.getByRole("button",{name:"Open menu",exact:true});
  const sidebar=page.locator("#datanest-navigation");

  await menu.click();
  await page.locator(".accountSecurityShortcut").click();
  await expect(sidebar).toHaveAttribute("inert","");
  await expect(page.locator("#account-security")).toBeFocused();

  // The same-view Account security focus request must be consumed immediately.
  // Returning to Settings later should therefore use normal workspace-title focus.
  await menu.click();
  await page.getByRole("dialog",{name:"DataNest navigation"}).getByRole("button",{name:"DataNest AI",exact:true}).click();
  await expect(page.locator("#workspace-title")).toBeFocused();
  await menu.click();
  await page.getByRole("dialog",{name:"DataNest navigation"}).getByRole("button",{name:"Settings",exact:true}).click();
  await expect(page.locator("#workspace-title")).toBeFocused();

  await page.goto(appViewPath("productlab"));
  await menu.click();
  const productLabShortcut=page.getByRole("button",{name:"Review in Product Lab",exact:true});
  await expect(productLabShortcut).toBeVisible();
  await productLabShortcut.click();
  await expect(sidebar).toHaveAttribute("inert","");
  await expect(menu).toBeFocused();
});

test("R&D Test Mode exposes a disabled busy state and announces mirror sync failure",async({page,context})=>{
  await setupUiGovernanceFixture(page);
  await context.route("https://datanest-supository.github.io/Mirror-DataNest/",route=>route.fulfill({body:"Mirror preview fixture"}));

  let finishManifest:()=>void=()=>{};
  let markManifestStarted:()=>void=()=>{};
  const manifestStarted=new Promise<void>(resolve=>{markManifestStarted=resolve;});
  await page.route("**/mirror-release.json",async route=>{
    markManifestStarted();
    await new Promise<void>(resolve=>{finishManifest=resolve;});
    await route.fulfill({status:503,body:"Unavailable fixture"});
  });

  await page.setViewportSize({width:1440,height:1000});
  await page.goto(appPath);

  const toggle=page.getByRole("switch");
  const control=toggle.locator("xpath=ancestor::section");
  await expect(toggle).toHaveAccessibleName(/Enable R&D Test Mode/);
  await toggle.click();
  await manifestStarted;
  await expect(toggle).toBeDisabled();
  await expect(toggle).toHaveAccessibleName(/Disable R&D Test Mode/);

  finishManifest();
  await expect(control.getByRole("status")).toContainText("Live Mirror release manifest is not available yet.");
  await expect(toggle).toBeEnabled();
  await expect(control.getByRole("button",{name:"Sync latest build"})).toBeEnabled();
});
