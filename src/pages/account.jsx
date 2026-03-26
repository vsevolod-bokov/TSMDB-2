import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { updateProfile, verifyBeforeUpdateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User, Loader2 } from 'lucide-react';

// Converts Firebase Auth error codes into user-friendly messages.
function friendlyError(err) {
  const code = err?.code;
  switch (code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect password. Please try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/email-already-in-use':
      return 'This email is already in use by another account.';
    case 'auth/requires-recent-login':
      return 'For security, please sign out and sign back in before making this change.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';
    default:
      return err?.message || 'Something went wrong. Please try again.';
  }
}

const AVATAR_STYLES = [
  { id: "adventurer", label: "Adventurer" },
  { id: "avataaars", label: "Avataaars" },
  { id: "bottts", label: "Bottts" },
  { id: "fun-emoji", label: "Fun Emoji" },
  { id: "lorelei", label: "Lorelei" },
  { id: "pixel-art", label: "Pixel Art" },
];

const AVATARS_PER_PAGE = 8;

function getAvatarUrl(style, seed) {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&size=128`;
}

function generateSeeds(count) {
  return Array.from({ length: count }, () => Math.random().toString(36).substring(2, 8));
}

export default function Account() {
  const { user } = useAuth();

  useEffect(() => { document.title = 'Account - TSMDB'; }, []);

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [emailPassword, setEmailPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [profileMsg, setProfileMsg] = useState(null);
  const [emailMsg, setEmailMsg] = useState(null);
  const [passwordMsg, setPasswordMsg] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);

  // Avatar state
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [avatarStyle, setAvatarStyle] = useState(AVATAR_STYLES[0].id);
  const [seeds, setSeeds] = useState(() => generateSeeds(AVATARS_PER_PAGE));
  const [selectedSeed, setSelectedSeed] = useState(seeds[0]);

  async function handleUpdateProfile(e) {
    e.preventDefault();
    setProfileMsg(null);
    const trimmed = displayName.trim();
    if (!trimmed) {
      setProfileMsg({ type: 'error', text: 'Display name cannot be empty.' });
      return;
    }
    if (trimmed.length > 50) {
      setProfileMsg({ type: 'error', text: 'Display name must be 50 characters or less.' });
      return;
    }
    if (trimmed === user.displayName) {
      setProfileMsg({ type: 'error', text: 'Display name is the same as your current one.' });
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfile(user, { displayName: trimmed });
      setDisplayName(trimmed);
      setProfileMsg({ type: 'success', text: 'Display name updated.' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: friendlyError(err) });
    }
    setSavingProfile(false);
  }

  // Email change requires reauthentication first (Firebase security requirement),
  // then sends a verification link to the new address before actually changing it.
  async function handleUpdateEmail(e) {
    e.preventDefault();
    setEmailMsg(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailMsg({ type: 'error', text: 'Email address cannot be empty.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailMsg({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }
    if (trimmedEmail === user.email) {
      setEmailMsg({ type: 'error', text: 'This is already your current email address.' });
      return;
    }
    if (!emailPassword) {
      setEmailMsg({ type: 'error', text: 'Current password is required to change email.' });
      return;
    }
    setSavingEmail(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, emailPassword);
      await reauthenticateWithCredential(user, credential);
      await verifyBeforeUpdateEmail(user, trimmedEmail);
      setEmailPassword('');
      setEmailMsg({ type: 'success', text: 'A verification email has been sent to your new address. Please check your inbox and click the link to confirm the change.' });
    } catch (err) {
      setEmailMsg({ type: 'error', text: friendlyError(err) });
    }
    setSavingEmail(false);
  }

  // Password change also requires reauthentication before Firebase allows the update.
  async function handleUpdatePassword(e) {
    e.preventDefault();
    setPasswordMsg(null);
    if (!currentPassword) {
      setPasswordMsg({ type: 'error', text: 'Current password is required.' });
      return;
    }
    if (!newPassword) {
      setPasswordMsg({ type: 'error', text: 'New password cannot be empty.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordMsg({ type: 'error', text: 'New password must be different from current password.' });
      return;
    }
    setSavingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setPasswordMsg({ type: 'success', text: 'Password updated.' });
    } catch (err) {
      setPasswordMsg({ type: 'error', text: friendlyError(err) });
    }
    setSavingPassword(false);
  }

  async function handleSaveAvatar() {
    setSavingAvatar(true);
    try {
      const photoURL = getAvatarUrl(avatarStyle, selectedSeed);
      await updateProfile(user, { photoURL });
      setEditingAvatar(false);
      setProfileMsg({ type: 'success', text: 'Avatar updated.' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: friendlyError(err) });
    }
    setSavingAvatar(false);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Account Settings</h1>

      {/* Avatar Section */}
      <Card>
        <CardHeader>
          <CardTitle>Avatar</CardTitle>
          <CardDescription>Your profile picture across TSMDB.</CardDescription>
        </CardHeader>
        <CardContent>
          {!editingAvatar ? (
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user?.photoURL} alt={user?.displayName} />
                <AvatarFallback>
                  {user?.displayName?.charAt(0)?.toUpperCase() || <User className="h-8 w-8" />}
                </AvatarFallback>
              </Avatar>
              <Button variant="outline" onClick={() => setEditingAvatar(true)}>
                Change Avatar
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <img
                  src={getAvatarUrl(avatarStyle, selectedSeed)}
                  alt="Avatar preview"
                  className="h-20 w-20 rounded-full bg-muted"
                />
                <div>
                  <p className="text-sm font-medium">Pick a new avatar</p>
                  <p className="text-xs text-muted-foreground">Choose a style, then select one you like.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Style</Label>
                <div className="flex flex-wrap gap-1.5">
                  {AVATAR_STYLES.map(({ id, label }) => (
                    <Button
                      key={id}
                      type="button"
                      variant={avatarStyle === id ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setAvatarStyle(id);
                        const newSeeds = generateSeeds(AVATARS_PER_PAGE);
                        setSeeds(newSeeds);
                        setSelectedSeed(newSeeds[0]);
                      }}
                      className="text-xs"
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Choose your avatar</Label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {seeds.map((seed) => (
                    <button
                      key={seed}
                      type="button"
                      onClick={() => setSelectedSeed(seed)}
                      aria-label={`Avatar option ${seed}`}
                      aria-pressed={selectedSeed === seed}
                      className={`rounded-full overflow-hidden border-2 transition-colors p-0.5 ${
                        selectedSeed === seed ? "border-primary" : "border-transparent hover:border-muted-foreground/30"
                      }`}
                    >
                      <img
                        src={getAvatarUrl(avatarStyle, seed)}
                        alt=""
                        className="h-10 w-10 rounded-full bg-muted"
                      />
                    </button>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newSeeds = generateSeeds(AVATARS_PER_PAGE);
                    setSeeds(newSeeds);
                    setSelectedSeed(newSeeds[0]);
                  }}
                >
                  Show more
                </Button>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveAvatar} disabled={savingAvatar}>
                  {savingAvatar && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Avatar
                </Button>
                <Button variant="outline" onClick={() => setEditingAvatar(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Display Name */}
      <Card>
        <CardHeader>
          <CardTitle>Display Name</CardTitle>
          <CardDescription>This is your public name on TSMDB.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
              />
            </div>
            {profileMsg && (
              <p role="alert" className={`text-sm ${profileMsg.type === 'success' ? 'text-green-500' : 'text-destructive'}`}>
                {profileMsg.text}
              </p>
            )}
            <Button type="submit" disabled={savingProfile}>
              {savingProfile && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Email */}
      <Card>
        <CardHeader>
          <CardTitle>Email Address</CardTitle>
          <CardDescription>Update the email associated with your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateEmail} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newEmail">New Email</Label>
              <Input
                id="newEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="new@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emailCurrentPassword">Current Password</Label>
              <Input
                id="emailCurrentPassword"
                type="password"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                placeholder="Required to confirm changes"
              />
            </div>
            {emailMsg && (
              <p role="alert" className={`text-sm ${emailMsg.type === 'success' ? 'text-green-500' : 'text-destructive'}`}>
                {emailMsg.text}
              </p>
            )}
            <Button type="submit" disabled={savingEmail}>
              {savingEmail && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Email
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Change your account password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Your current password"
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Your new password"
              />
            </div>
            {passwordMsg && (
              <p role="alert" className={`text-sm ${passwordMsg.type === 'success' ? 'text-green-500' : 'text-destructive'}`}>
                {passwordMsg.text}
              </p>
            )}
            <Button type="submit" disabled={savingPassword}>
              {savingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
