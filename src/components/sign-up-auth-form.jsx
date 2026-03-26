"use client";
import { useState } from "react";
import { useSignUpAuthFormAction, useSignUpAuthFormSchema, useUI } from "@firebase-oss/ui-react";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { FirebaseUIError, getTranslation } from "@firebase-oss/ui-core";
import { updateProfile } from "firebase/auth";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Policies } from "./policies";

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

export function SignUpAuthForm(props) {
  const ui = useUI();
  const schema = useSignUpAuthFormSchema();
  const action = useSignUpAuthFormAction();
  const [avatarStyle, setAvatarStyle] = useState(AVATAR_STYLES[0].id);
  const [seeds, setSeeds] = useState(() => generateSeeds(AVATARS_PER_PAGE));
  const [selectedSeed, setSelectedSeed] = useState(seeds[0]);

  const form = useForm({
    resolver: standardSchemaResolver(schema),
    defaultValues: {
      email: "",
      password: "",
      displayName: "",
    },
  });

  function handleStyleChange(styleId) {
    setAvatarStyle(styleId);
    const newSeeds = generateSeeds(AVATARS_PER_PAGE);
    setSeeds(newSeeds);
    setSelectedSeed(newSeeds[0]);
  }

  function loadMore() {
    const newSeeds = generateSeeds(AVATARS_PER_PAGE);
    setSeeds(newSeeds);
    setSelectedSeed(newSeeds[0]);
  }

  async function onSubmit(values) {
    try {
      const credential = await action(values);
      const photoURL = getAvatarUrl(avatarStyle, selectedSeed);
      await updateProfile(credential.user, { photoURL });
      props.onSignUp?.(credential);
    } catch (error) {
      const message = error instanceof FirebaseUIError ? error.message : String(error);
      form.setError("root", { message });
    }
  }

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="flex flex-col items-center gap-4 md:w-1/2 md:border-r md:border-border md:pr-6">
        <h2 className="text-lg font-semibold">Welcome!</h2>
        <p className="text-sm text-muted-foreground text-center">
          Thank you for joining TSMDB. Pick an avatar to get started!
        </p>
        <img
          src={getAvatarUrl(avatarStyle, selectedSeed)}
          alt="Avatar preview"
          className="h-24 w-24 rounded-full bg-muted"
        />
        <div className="w-full space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Style</p>
          <div className="flex flex-wrap gap-1.5">
            {AVATAR_STYLES.map(({ id, label }) => (
              <Button
                key={id}
                type="button"
                variant={avatarStyle === id ? "default" : "outline"}
                size="sm"
                onClick={() => handleStyleChange(id)}
                className="text-xs"
              >
                {label}
              </Button>
            ))}
          </div>
          <p className="text-xs font-medium text-muted-foreground">Choose your avatar</p>
          <div className="grid grid-cols-4 gap-2">
            {seeds.map((seed) => (
              <button
                key={seed}
                type="button"
                onClick={() => setSelectedSeed(seed)}
                className={`rounded-full overflow-hidden border-2 transition-colors p-0.5 ${
                  selectedSeed === seed ? "border-primary" : "border-transparent hover:border-muted-foreground/30"
                }`}
              >
                <img
                  src={getAvatarUrl(avatarStyle, seed)}
                  alt="Avatar option"
                  className="h-10 w-10 rounded-full bg-muted"
                />
              </button>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={loadMore}>
            Show more
          </Button>
        </div>
      </div>

      <div className="md:w-1/2">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-y-4">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{getTranslation(ui, "labels", "displayName")}</FormLabel>
                  <FormControl>
                    <Input {...field} type="text" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{getTranslation(ui, "labels", "emailAddress")}</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{getTranslation(ui, "labels", "password")}</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            <Policies />
            <Button type="submit" disabled={ui.state !== "idle"}>
              {getTranslation(ui, "labels", "signUp")}
            </Button>
            {form.formState.errors.root && <FormMessage>{form.formState.errors.root.message}</FormMessage>}
          </form>
        </Form>
      </div>
    </div>
  );
}
