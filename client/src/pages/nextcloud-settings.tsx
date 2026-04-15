import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Cloud, 
  Plus, 
  Settings, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  ArrowLeft,
  FolderOpen,
  Mail,
  Server,
  AlertTriangle
} from "lucide-react";
import type { NextcloudSettings } from "@shared/schema";

const settingsFormSchema = z.object({
  name: z.string().min(1, "Connection name is required"),
  serverUrl: z.string().url("Please enter a valid URL"),
  username: z.string().min(1, "Username is required"),
  appPassword: z.string().min(1, "App password is required"),
  watchFolder: z.string().min(1, "Watch folder path is required"),
  notificationEmail: z.string().email("Please enter a valid email"),
  isActive: z.boolean(),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export default function NextcloudSettingsPage() {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: settings, isLoading } = useQuery<NextcloudSettings[]>({
    queryKey: ['/api/nextcloud/settings'],
  });

  const { data: status } = useQuery<{
    pollingActive: boolean;
    queueLength: number;
    processing: boolean;
    activeConnections: number;
  }>({
    queryKey: ['/api/nextcloud/status'],
    refetchInterval: 10000,
  });

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      name: "",
      serverUrl: "",
      username: "",
      appPassword: "",
      watchFolder: "/Videos/AI-Detective",
      notificationEmail: "",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: SettingsFormValues) => {
      const payload = {
        ...data,
        isActive: data.isActive ? 1 : 0,
      };
      const response = await apiRequest("POST", "/api/nextcloud/settings", payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/nextcloud/settings'] });
      toast({ title: "Settings saved", description: "Your Nextcloud connection has been configured." });
      form.reset();
      setShowAddForm(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const response = await apiRequest("PUT", `/api/nextcloud/settings/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/nextcloud/settings'] });
      toast({ title: "Settings updated", description: "Your changes have been saved." });
      setEditingId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/nextcloud/settings/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/nextcloud/settings'] });
      toast({ title: "Connection removed", description: "The Nextcloud connection has been deleted." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const [testingId, setTestingId] = useState<string | null>(null);
  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      setTestingId(id);
      const response = await apiRequest("POST", `/api/nextcloud/settings/${id}/test`);
      return response.json();
    },
    onSuccess: (data) => {
      setTestingId(null);
      if (data.success) {
        toast({ title: "Connection successful!", description: "Your Nextcloud is properly configured." });
      } else {
        toast({ title: "Connection failed", description: data.error, variant: "destructive" });
      }
    },
    onError: (error: Error) => {
      setTestingId(null);
      toast({ title: "Test failed", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: SettingsFormValues) => {
    const payload = {
      ...data,
      isActive: data.isActive ? 1 : 0,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(data);
    }
  };

  const toggleActive = (id: string, currentValue: boolean) => {
    updateMutation.mutate({ id, data: { isActive: currentValue ? 0 : 1 } });
  };

  return (
    <div className="container mx-auto py-12 px-4 max-w-4xl">
      <div className="mb-8">
        <Link href="/">
          <Button variant="ghost" className="mb-4" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Nextcloud Integration</h1>
            <p className="text-muted-foreground">
              Connect your Nextcloud to automatically analyze videos shared from your phone
            </p>
          </div>
          {!showAddForm && (
            <Button onClick={() => setShowAddForm(true)} data-testid="button-add-connection">
              <Plus className="w-4 h-4 mr-2" />
              Add Connection
            </Button>
          )}
        </div>
      </div>

      {status && (
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                {status.pollingActive ? (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Polling Active
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <XCircle className="w-3 h-3" />
                    Polling Inactive
                  </Badge>
                )}
              </div>
              <div className="text-muted-foreground">
                {status.activeConnections} active connection{status.activeConnections !== 1 ? 's' : ''}
              </div>
              {status.queueLength > 0 && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <RefreshCw className={`w-3 h-3 ${status.processing ? 'animate-spin' : ''}`} />
                  {status.queueLength} video{status.queueLength !== 1 ? 's' : ''} in queue
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {showAddForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add Nextcloud Connection</CardTitle>
            <CardDescription>
              Connect to your Nextcloud server to watch for videos to analyze
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Connection Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="My Nextcloud Server" 
                          data-testid="input-name"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        A friendly name to identify this connection
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="serverUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Server URL</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input 
                            placeholder="http://34.46.215.101" 
                            className="pl-10"
                            data-testid="input-server-url"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Base URL only (no /index.php or paths)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="your-username"
                            data-testid="input-username"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="appPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>App Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password"
                            placeholder="Generate in Nextcloud settings"
                            data-testid="input-app-password"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Create an app password in Settings &rarr; Security
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="watchFolder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Watch Folder</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input 
                            placeholder="/Videos/AI-Detective"
                            className="pl-10"
                            data-testid="input-watch-folder"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Path to the folder where you'll share videos from your phone
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notificationEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notification Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input 
                            type="email"
                            placeholder="you@example.com"
                            className="pl-10"
                            data-testid="input-notification-email"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Receive analysis results via email
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active</FormLabel>
                        <FormDescription>
                          Enable automatic video detection for this connection
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-is-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex gap-3">
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending}
                    data-testid="button-save-settings"
                  >
                    {createMutation.isPending ? "Saving..." : "Save Connection"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => { setShowAddForm(false); form.reset(); }}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">Loading connections...</p>
          </div>
        </div>
      ) : settings && settings.length > 0 ? (
        <div className="space-y-4">
          {settings.map((setting) => (
            <Card key={setting.id} data-testid={`card-connection-${setting.id}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Cloud className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{setting.name}</CardTitle>
                      <CardDescription>{setting.serverUrl} &bull; @{setting.username}</CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={Boolean(setting.isActive)}
                    onCheckedChange={() => toggleActive(setting.id, Boolean(setting.isActive))}
                    data-testid={`switch-active-${setting.id}`}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Watch Folder</span>
                    <p className="font-mono">{setting.watchFolder}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Notification Email</span>
                    <p className="font-mono">{setting.notificationEmail}</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => testMutation.mutate(setting.id)}
                  disabled={testingId === setting.id}
                  data-testid={`button-test-${setting.id}`}
                >
                  {testingId === setting.id ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Test Connection
                    </>
                  )}
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-destructive hover:text-destructive"
                      data-testid={`button-delete-${setting.id}`}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove Nextcloud Connection?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will stop monitoring this Nextcloud folder for new videos. 
                        Your existing analyses will not be deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => deleteMutation.mutate(setting.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : !showAddForm ? (
        <Card>
          <CardContent className="py-20">
            <div className="text-center space-y-4">
              <Cloud className="w-16 h-16 mx-auto text-muted-foreground/50" />
              <div>
                <h3 className="text-lg font-semibold mb-2">No Nextcloud Connections</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Connect your Nextcloud to automatically analyze videos you share from apps like TikTok on your phone.
                </p>
              </div>
              <Button onClick={() => setShowAddForm(true)} data-testid="button-add-first-connection">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Connection
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <p>
            <strong>1. Set up Nextcloud on your phone:</strong> Install the Nextcloud app and log in to your server.
          </p>
          <p>
            <strong>2. Share videos to your watch folder:</strong> When you see a suspicious video on TikTok or other apps, 
            use the share menu to save it to your Nextcloud watch folder.
          </p>
          <p>
            <strong>3. Automatic analysis:</strong> Our system checks your folder every minute for new videos 
            and automatically runs AI detection analysis.
          </p>
          <p>
            <strong>4. Get notified:</strong> You'll receive an email with the analysis results, including 
            whether the video appears to be AI-generated and which tool may have created it.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
