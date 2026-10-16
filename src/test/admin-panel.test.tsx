import { beforeEach, describe, expect, it } from "vitest";

import {
  ADMIN_CONFIG,
  checkAdminSession,
  getStoreSettings,
  loginAdmin,
  logoutAdmin,
  saveStoreSettings,
} from "@/lib/store-settings";

describe("Admin Authentication & Store Settings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("authenticates admin with configured credentials successfully", () => {
    expect(checkAdminSession()).toBe(false);

    const success = loginAdmin(
      "gislaynefreitas23@gmail.com",
      "tabacariasmoke2522"
    );

    expect(success).toBe(true);
    expect(checkAdminSession()).toBe(true);
  });

  it("rejects login attempt with incorrect email or password", () => {
    const wrongPass = loginAdmin("gislaynefreitas23@gmail.com", "senha-errada-123");
    expect(wrongPass).toBe(false);
    expect(checkAdminSession()).toBe(false);

    const wrongEmail = loginAdmin("outro@gmail.com", "tabacariasmoke2522");
    expect(wrongEmail).toBe(false);
    expect(checkAdminSession()).toBe(false);
  });

  it("logs out admin successfully and cleans session", () => {
    loginAdmin(ADMIN_CONFIG.email, ADMIN_CONFIG.password);
    expect(checkAdminSession()).toBe(true);

    logoutAdmin();
    expect(checkAdminSession()).toBe(false);
  });

  it("stores and retrieves customized store settings", async () => {
    const initial = getStoreSettings();
    expect(initial.siteName).toBe("Pantanal Smoke");
    expect(initial.deliveryFeeCuiaba).toBe(10.0);

    // Salva nova configuração
    await saveStoreSettings({
      ...initial,
      siteName: "Pantanal Smoke VIP",
      deliveryFeeCuiaba: 12.0,
      whatsappNumber: "5565999998888",
    });

    const updated = getStoreSettings();
    expect(updated.siteName).toBe("Pantanal Smoke VIP");
    expect(updated.deliveryFeeCuiaba).toBe(12.0);
    expect(updated.whatsappNumber).toBe("5565999998888");
  });
});
