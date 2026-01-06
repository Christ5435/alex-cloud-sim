import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function hashOtp(otp: string): string {
  let hash = 0;
  for (let i = 0; i < otp.length; i++) {
    const char = otp.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, otp, purpose = "login" } = await req.json();

    if (!userId || !otp) {
      return new Response(
        JSON.stringify({ error: "User ID and OTP are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const otpHash = hashOtp(otp);
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Find valid OTP
    const { data: otpRecord, error: fetchError } = await supabaseAdmin
      .from("otp_codes")
      .select("*")
      .eq("user_id", userId)
      .eq("code_hash", otpHash)
      .eq("purpose", purpose)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (fetchError || !otpRecord) {
      // Log failed attempt
      await supabaseAdmin
        .from("security_audit_logs")
        .insert({
          user_id: userId,
          event_type: "otp_verification_failed",
          event_description: "Invalid or expired OTP entered",
          ip_address: ipAddress,
          user_agent: userAgent,
          metadata: { purpose },
          success: false,
        });

      return new Response(
        JSON.stringify({ error: "Invalid or expired OTP" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark OTP as used
    const { error: updateError } = await supabaseAdmin
      .from("otp_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", otpRecord.id);

    if (updateError) {
      console.error("Error marking OTP as used:", updateError);
    }

    // Log successful verification
    await supabaseAdmin
      .from("security_audit_logs")
      .insert({
        user_id: userId,
        event_type: "otp_verification_success",
        event_description: "OTP verified successfully",
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata: { purpose },
        success: true,
      });

    return new Response(
      JSON.stringify({ success: true, message: "OTP verified successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in verify-otp:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
