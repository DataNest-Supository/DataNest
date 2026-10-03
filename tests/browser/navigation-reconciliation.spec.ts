import { expect, test } from "@playwright/test";
import { setupUiGovernanceFixture } from "./ui-governance-fixture";

const appPath=process.env.DATANEST_APP_PATH||"/";

test("sidebar workspace finder opens quick switch and preserves deep-link navigation",async({page})=>{
  await setupUiGovernanceFixture(page);
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(appPath);

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
});

test("R&D Test Mode exposes a disabled busy state and announces mirror sync failure",async({page,context})=>{
  await setupUiGovernanceFixture(page);
  await context.route("https://datanest-supository.github.io/Mirror-DataNest/",route=>route.fulfill({body:"Mirror preview fixture"}));

  let finishManifest:()=>void=()=>{};
  await page.route("**/mirror-release.json",async route=>{
    await new Promise<void>(resolve=>{finishManifest=resolve;});
    await route.fulfill({status:503,body:"Unavailable fixture"});
  });

  await page.setViewportSize({width:1440,height:1000});
  await page.goto(appPath);

  const toggle=page.getByRole("switch",{name:/Enable R&D Test Mode/});
  const control=toggle.locator("xpath=ancestor::section");
  await toggle.click();
  await expect(toggle).toBeDisabled();

  finishManifest();
  await expect(control.getByRole("status")).toContainText("Live Mirror release manifest is not available yet.");
  await expect(toggle).toBeEnabled();
  await expect(control.getByRole("button",{name:"Sync latest build"})).toBeEnabled();
});
