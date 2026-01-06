import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple hash function for OTP (in production, use proper crypto)
function hashOtp(otp: string): string {
  let hash = 0;
  for (let i = 0; i < otp.length; i++) {
    const char = otp.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, email, purpose = "login" } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate 6-digit OTP
    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    
    // Get client IP
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    // Delete any existing unused OTPs for this user
    await supabaseAdmin
      .from("otp_codes")
      .delete()
      .eq("user_id", userId)
      .is("used_at", null);

    // Insert new OTP
    const { error: insertError } = await supabaseAdmin
      .from("otp_codes")
      .insert({
        user_id: userId,
        code_hash: otpHash,
        purpose,
        ip_address: ipAddress,
      });

    if (insertError) {
      console.error("Error inserting OTP:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to generate OTP" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the OTP generation event
    await supabaseAdmin
      .from("security_audit_logs")
      .insert({
        user_id: userId,
        event_type: "otp_generated",
        event_description: `OTP generated for ${purpose}`,
        ip_address: ipAddress,
        metadata: { email, purpose },
        success: true,
      });

    // In production, send OTP via email/SMS
    // For now, we'll log it (simulated delivery)
    console.log(`[SIMULATED] OTP for ${email}: ${otp}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "OTP sent successfully",
        // Include OTP in response for development/testing
        // Remove this in production!
        otp_for_testing: otp,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-otp:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
