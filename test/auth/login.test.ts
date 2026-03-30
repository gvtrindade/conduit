import { describe, it, expect } from "bun:test";

describe("Login and session management", () => {
  it("Login page exists and is accessible", async () => {
    const result = await fetch("http://localhost:3000/login");
    expect(result.status).toBe(200);
  });

  it("Can sign in with valid credentials and get session", async () => {
    const signInResult = await fetch("http://localhost:3000/api/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        password: "testpass123",
      }),
    });
    
    const signInData = await signInResult.json();
    expect(signInData.user).toBeDefined();
    expect(signInData.user.email).toBe("test@example.com");
    expect(signInData.token).toBeDefined();
  });

  it("Login with invalid credentials is rejected", async () => {
    const signInResult = await fetch("http://localhost:3000/api/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        password: "wrongpassword",
      }),
    });
    
    const signInData = await signInResult.json();
    expect(signInData.error).toBeDefined();
  });

  it("GET /api/auth/get-session returns session when authenticated", async () => {
    const signInResult = await fetch("http://localhost:3000/api/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        password: "testpass123",
      }),
    });
    
    const signInData = await signInResult.json();
    const sessionToken = signInData.token;

    const sessionResult = await fetch("http://localhost:3000/api/auth/get-session", {
      headers: {
        "Cookie": `better-auth.session_token=${sessionToken}`,
      },
    });
    
    const sessionData = await sessionResult.json();
    expect(sessionData.user).toBeDefined();
    expect(sessionData.user.email).toBe("test@example.com");
  });
});