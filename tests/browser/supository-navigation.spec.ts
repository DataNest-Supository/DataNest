import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { setupUiGovernanceFixture } from "./ui-governance-fixture";

const appPath=process.env.DATANEST_APP_PATH||"/";
const workspacePath=`${appPath.replace(/\/$/,"")}/workspace/`;

test("secure workspace entry stays distinct from the public DataNest front door",async({page},testInfo)=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(workspacePath);

  for(const width of [320,390,768]){
    await page.setViewportSize({width,height:844});
    const motion=await page.getByRole("combobox",{name:"Motion preference"}).boundingBox();
    expect(motion).not.toBeNull();
    expect(motion!.x).toBeGreaterThanOrEqual(0);
    expect(motion!.x+motion!.width).toBeLessThanOrEqual(width);
  }

  await page.setViewportSize({width:390,height:844});
  await expect(page.getByText("Welcome to your workspace. Sign in to continue.")).toBeVisible();
  await expect(page.getByLabel("Email",{exact:true})).toBeVisible();
  await expect(page.getByLabel("Password",{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Sign in",exact:true})).toBeVisible();
  await expect(page.getByRole("link",{name:"DataNest public home"})).toHaveAttribute("href",/\/DataNest\/?$/);
  await expect(page.getByRole("link",{name:/Public Audit Library/})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);

  await page.screenshot({path:testInfo.outputPath("workspace-entry-mobile.png"),fullPage:true});
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(workspacePath);
  await page.screenshot({path:testInfo.outputPath("workspace-entry-desktop.png"),fullPage:true});
});

test("sidebar workspace finder opens the existing search and preserves deep-link navigation",async({page},testInfo)=>{
  await setupUiGovernanceFixture(page);
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(workspacePath);
  await page.getByRole("button",{name:"Find a workspace"}).click();
  const dialog=page.getByRole("dialog",{name:"Quick switch DataNest workspace"});
  await expect(dialog).toBeVisible();
  const search=dialog.getByRole("searchbox",{name:"Search DataNest workspaces"});
  await expect(search).toBeFocused();
  await search.fill("TranScheduler");
  await search.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/view=scheduler/);
  await expect(page.locator("#workspace-title")).toBeFocused();
  await page.screenshot({path:testInfo.outputPath("workspace-desktop.png"),fullPage:true});
});

test("mobile navigation contains focus, restores its launcher and follows workspace selection",async({page},testInfo)=>{
  await setupUiGovernanceFixture(page);
  await page.setViewportSize({width:390,height:844});
  await page.goto(workspacePath);
  const menu=page.getByRole("button",{name:"Open menu",exact:true});
  const sidebar=page.locator("#datanest-navigation");
  await expect(sidebar).toHaveAttribute("inert","");
  await menu.click();
  const dialog=page.getByRole("dialog",{name:"DataNest navigation"});
  const close=dialog.getByRole("button",{name:"Close menu",exact:true});
  await expect(close).toBeFocused();
  await expect(page.locator("main.mainPane")).toHaveAttribute("inert","");
  const accessibility=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa"]).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.screenshot({path:testInfo.outputPath("mobile-navigation.png")});
  await close.press("Shift+Tab");
  await expect(dialog.getByRole("button",{name:"Sign out",exact:true})).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await expect(sidebar).toHaveAttribute("inert","");
  expect(await page.evaluate(()=>document.body.style.overflow)).not.toBe("hidden");

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
  await expect(page.locator("main.mainPane")).not.toHaveAttribute("inert");
  expect(await page.evaluate(()=>document.body.style.overflow)).not.toBe("hidden");
});

test("expanded R&D controls remain reachable on small screens and announce sync failures",async({page,context},testInfo)=>{
  await setupUiGovernanceFixture(page);
  await context.route("https://datanest-supository.github.io/Mirror-DataNest/",route=>route.fulfill({body:"Mirror preview fixture"}));
  let finishManifest:()=>void=()=>{};
  await page.route("**/mirror-release.json",async route=>{
    await new Promise<void>(resolve=>{finishManifest=resolve;});
    await route.fulfill({status:503,body:"Unavailable fixture"});
  });
  await page.setViewportSize({width:320,height:568});
  await page.goto(workspacePath);
  await page.getByRole("button",{name:"Open menu",exact:true}).click();
  const dialog=page.getByRole("dialog",{name:"DataNest navigation"});
  const toggle=dialog.getByRole("switch");
  await toggle.click();
  await expect(toggle).toBeDisabled();
  finishManifest();
  await expect(dialog.getByRole("status")).toContainText("Live Mirror release manifest is not available yet.");
  await expect(toggle).toBeEnabled();
  await expect(dialog.getByRole("button",{name:"Sync latest build"})).toBeEnabled();
  const signOut=dialog.getByRole("button",{name:"Sign out",exact:true});
  await signOut.scrollIntoViewIfNeeded();
  await expect(signOut).toBeInViewport();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath("mobile-rnd.png")});
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button",{name:"Open menu",exact:true})).toBeFocused();
});
