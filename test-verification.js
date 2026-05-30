// Test script to verify the email verification URL generation
// Run with: node test-verification.js

const testEmail = "test@example.com";
const testName = "Test User";

async function testVerification() {
  try {
    console.log("Testing verification email generation...");
    console.log("Target domain: app.werzio.com");
    console.log("");
    
    const response = await fetch("https://app.werzio.com/api/send-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        email: testEmail, 
        name: testName 
      }),
    });

    const result = await response.json();
    
    console.log("Response status:", response.status);
    console.log("Response body:", JSON.stringify(result, null, 2));
    
    if (result.devUrl) {
      console.log("\n✓ Dev URL generated:", result.devUrl);
      console.log("Domain check:", result.devUrl.includes("app.werzio.com") ? "✓ CORRECT" : "✗ WRONG DOMAIN");
    }
    
    if (result.ok) {
      console.log("\n✓ Verification email sent successfully");
      console.log("Check the email to verify the domain in the link");
    } else {
      console.log("\n✗ Failed:", result.error);
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testVerification();
