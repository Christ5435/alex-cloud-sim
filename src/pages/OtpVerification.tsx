import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Loader2, RefreshCw, Clock } from 'lucide-react';

const RESEND_COOLDOWN = 60; // seconds

export default function OtpVerification() {
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [expiresIn, setExpiresIn] = useState(300); // 5 minutes in seconds
  
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const { userId, email, redirectTo } = location.state || {};

  useEffect(() => {
    if (!userId || !email) {
      navigate('/auth');
      return;
    }
  }, [userId, email, navigate]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Expiration timer
  useEffect(() => {
    if (expiresIn > 0) {
      const timer = setTimeout(() => setExpiresIn(expiresIn - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [expiresIn]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      toast({
        title: 'Invalid OTP',
        description: 'Please enter a 6-digit code',
        variant: 'destructive',
      });
      return;
    }

    setIsVerifying(true);

    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { userId, otp, purpose: 'login' },
      });

      if (error || !data?.success) {
        toast({
          title: 'Verification Failed',
          description: data?.error || 'Invalid or expired OTP. Please try again.',
          variant: 'destructive',
        });
        setOtp('');
        return;
      }

      toast({
        title: 'Verification Successful',
        description: 'You have been logged in.',
      });

      // Mark OTP as verified in session storage
      sessionStorage.setItem('otp_verified', 'true');
      sessionStorage.setItem('otp_verified_at', Date.now().toString());

      navigate(redirectTo || '/dashboard');
    } catch (err) {
      console.error('OTP verification error:', err);
      toast({
        title: 'Error',
        description: 'Failed to verify OTP. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;

    setIsResending(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-otp', {
        body: { userId, email, purpose: 'login' },
      });

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to resend OTP. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'OTP Sent',
        description: 'A new verification code has been sent to your email.',
      });

      // Show OTP for testing (remove in production)
      if (data?.otp_for_testing) {
        toast({
          title: 'Test OTP',
          description: `Your OTP is: ${data.otp_for_testing}`,
        });
      }

      setCooldown(RESEND_COOLDOWN);
      setExpiresIn(300);
      setOtp('');
    } catch (err) {
      console.error('OTP resend error:', err);
      toast({
        title: 'Error',
        description: 'Failed to resend OTP. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsResending(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!userId || !email) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 cloud-gradient-subtle opacity-50" />
      
      <Card className="w-full max-w-md relative z-10 shadow-xl border-border/50 animate-scale-in">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Verify Your Identity</CardTitle>
            <CardDescription className="mt-2">
              Enter the 6-digit code sent to {email}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={setOtp}
              onComplete={handleVerify}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {expiresIn > 0 ? (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Code expires in {formatTime(expiresIn)}</span>
            </div>
          ) : (
            <div className="text-center text-sm text-destructive">
              Code expired. Please request a new one.
            </div>
          )}

          <Button
            onClick={handleVerify}
            className="w-full"
            disabled={otp.length !== 6 || isVerifying || expiresIn === 0}
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify OTP'
            )}
          </Button>

          <div className="text-center">
            <Button
              variant="ghost"
              onClick={handleResend}
              disabled={cooldown > 0 || isResending}
              className="text-sm"
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : cooldown > 0 ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Resend in {cooldown}s
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Resend Code
                </>
              )}
            </Button>
          </div>

          <div className="text-center">
            <Button
              variant="link"
              onClick={() => navigate('/auth')}
              className="text-sm text-muted-foreground"
            >
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
