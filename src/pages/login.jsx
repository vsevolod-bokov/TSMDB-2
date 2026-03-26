import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOnUserAuthenticated } from '@firebase-oss/ui-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SignInAuthForm } from '@/components/sign-in-auth-form';
import { SignUpAuthForm } from '@/components/sign-up-auth-form';
import movieBg from '@/assets/movie background.png';

export default function Login() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { document.title = 'Login - TSMDB'; }, []);
  useOnUserAuthenticated(() => navigate('/'));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" role="status" aria-label="Loading">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div
      className="flex items-center justify-center min-h-screen p-4 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${movieBg})` }}
    >
      <div className="w-full max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Welcome to TSMDB</CardTitle>
            <CardDescription>Your personal movie universe. Track, discover, and save your favorite films all in one place.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="sign-in">
              <TabsList className="w-full">
                <TabsTrigger value="sign-in" className="flex-1">Sign In</TabsTrigger>
                <TabsTrigger value="sign-up" className="flex-1">Sign Up</TabsTrigger>
              </TabsList>
              <TabsContent value="sign-in">
                <div className="max-w-sm mx-auto">
                  <SignInAuthForm />
                </div>
              </TabsContent>
              <TabsContent value="sign-up">
                <SignUpAuthForm />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
