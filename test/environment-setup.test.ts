import { describe, it, expect, beforeAll } from "bun:test";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

describe("environment setup", () => {
  const rootDir = resolve(__dirname, "..");

  it(".env.local exists with required secrets", () => {
    const envPath = resolve(rootDir, ".env.local");
    expect(existsSync(envPath)).toBe(true);
    
    const content = readFileSync(envPath, "utf-8");
    expect(content).toContain("BETTER_AUTH_SECRET");
    expect(content).toContain("BETTER_AUTH_URL");
    expect(content).toContain("NEXT_PUBLIC_POWERSYNC_URL");
  });

  it("package.json has required dependencies", () => {
    const pkgPath = resolve(rootDir, "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    
    expect(pkg.dependencies["better-auth"]).toBeDefined();
    expect(pkg.dependencies["@powersync/web"]).toBeDefined();
    expect(pkg.dependencies["@journeyapps/wa-sqlite"]).toBeDefined();
    expect(pkg.dependencies["@powersync/react"]).toBeDefined();
  });

  it("package.json has postinstall script for powersync", () => {
    const pkgPath = resolve(rootDir, "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    
    expect(pkg.scripts.postinstall).toContain("powersync-web");
    expect(pkg.scripts.postinstall).toContain("copy-assets");
    expect(pkg.scripts.postinstall).toContain("-o public");
  });

  it("next.config.ts has correct turbopack and image config", () => {
    const configPath = resolve(rootDir, "next.config.ts");
    const config = readFileSync(configPath, "utf-8");
    
    expect(config).toContain("turbopack");
    expect(config).toContain("disableStaticImages");
  });
});