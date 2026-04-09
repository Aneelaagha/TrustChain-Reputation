import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetUserScore,
  getGetUserScoreQueryKey,
  useExplainScore,
  useGetAllUsers,
  useAddVouch,
  useAddSignal
} from "@workspace/api-client-react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell, LabelList
} from "recharts";
import { Shield, TrendingUp, Users, Plus, BrainCircuit, Info } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const GREEN = "#1D9E75";
const AMBER = "#BA7517";
const CORAL = "#D85A30";

function getScoreColor(score: number): string {
  if (score >= 700) return GREEN;
  if (score >= 580) return AMBER;
  return CORAL;
}

function getScoreLabel(score: number): string {
  if (score >= 700) return "Good";
  if (score >= 580) return "Fair";
  return "Building";
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

const vouchSchema = z.object({
  voucheeId: z.string().min(1, "Please select a user"),
  strength: z.coerce.number().min(1).max(10)
});

const signalSchema = z.object({
  type: z.enum(["rent", "utility", "mobile", "default"]),
  months_consistent: z.coerce.number().min(1, "Must be at least 1 month")
});

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const userId = localStorage.getItem("trustchain_userId");
  const userName = localStorage.getItem("trustchain_userName") ?? "You";

  useEffect(() => {
    if (!userId) setLocation("/");
  }, [userId, setLocation]);

  const { data: scoreData, isLoading: isLoadingScore } = useGetUserScore(userId ?? "", {
    query: { enabled: !!userId, queryKey: getGetUserScoreQueryKey(userId ?? "") }
  });

  const [explanation, setExplanation] = useState<string | null>(null);
  const [explainPending, setExplainPending] = useState(false);
  const explainMutation = useExplainScore();

  const fetchExplanation = useCallback(() => {
    if (!userId || explainPending) return;
    setExplainPending(true);
    setExplanation(null);
    explainMutation.mutate({ data: { userId } }, {
      onSuccess: (res) => { setExplanation(res.explanation); setExplainPending(false); },
      onError: () => setExplainPending(false)
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (userId && scoreData && !explanation && !explainPending) fetchExplanation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, scoreData]);

  const { data: allUsers } = useGetAllUsers();
  const addVouch = useAddVouch();
  const addSignal = useAddSignal();

  const vouchForm = useForm<z.infer<typeof vouchSchema>>({
    resolver: zodResolver(vouchSchema),
    defaultValues: { voucheeId: "", strength: 5 }
  });

  const signalForm = useForm<z.infer<typeof signalSchema>>({
    resolver: zodResolver(signalSchema),
    defaultValues: { type: "rent", months_consistent: 1 }
  });

  const [vouchOpen, setVouchOpen] = useState(false);
  const [signalOpen, setSignalOpen] = useState(false);

  const refreshAll = (uid: string) => {
    queryClient.invalidateQueries({ queryKey: getGetUserScoreQueryKey(uid) });
    setTimeout(() => fetchExplanation(), 800);
  };

  const onVouchSubmit = (values: z.infer<typeof vouchSchema>) => {
    if (!userId) return;
    addVouch.mutate({ data: { voucherId: userId, voucheeId: values.voucheeId, strength: values.strength } }, {
      onSuccess: () => { setVouchOpen(false); vouchForm.reset(); refreshAll(userId); },
      onError: (err) => { console.error("Vouch failed:", err); alert("Vouch failed: " + JSON.stringify(err)); }
    });
  };

  const onSignalSubmit = (values: z.infer<typeof signalSchema>) => {
    if (!userId) return;
    addSignal.mutate({ data: { userId, type: values.type as "rent" | "utility" | "mobile" | "default", months_consistent: values.months_consistent } }, {
      onSuccess: () => { setSignalOpen(false); signalForm.reset(); refreshAll(userId); }
    });
  };

  if (!userId) return null;

  const currentScore = scoreData?.score ?? 300;
  const scoreColor = getScoreColor(currentScore);
  const scoreLabel = getScoreLabel(currentScore);
  const scorePercent = ((currentScore - 300) / 550) * 100;

  const chartData = (scoreData?.breakdown ?? []).map(item => ({
    name: item.label,
    points: item.points,
    isDefault: item.label.toLowerCase().includes("default")
  }));

  const initials = getInitials(userName);

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-12">
      {/* Nav */}
      <nav className="bg-white border-b border-[#E5E7EB] px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setLocation("/")}>
            <Shield className="text-brand w-6 h-6" />
            <span className="text-xl font-bold tracking-tight text-[#111827]">TrustChain</span>
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={() => setLocation("/network")}
              className="text-gray-500 font-medium hover:text-brand transition-colors text-sm"
            >
              Network
            </button>
            <div className="w-9 h-9 bg-brand/10 rounded-full flex items-center justify-center text-brand font-bold text-sm">
              {initials}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 md:px-6 mt-8 space-y-6">

        {/* Hero Score Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card flex flex-col items-center py-10 md:py-14"
        >
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
            Your Trust Score
          </span>

          {isLoadingScore ? (
            <Skeleton className="h-24 w-36 rounded-xl mb-6" />
          ) : (
            <div className="relative flex items-center justify-center">
              <h1 className="text-[96px] font-bold leading-none tabular-nums" style={{ color: scoreColor }}>
                {currentScore}
              </h1>
            </div>
          )}

          <div
            className="mt-4 px-5 py-1.5 rounded-full font-bold text-sm uppercase tracking-wider"
            style={{ backgroundColor: `${scoreColor}18`, color: scoreColor }}
          >
            {scoreLabel} Tier
          </div>

          {/* Progress bar */}
          <div className="mt-8 w-full max-w-sm bg-gray-100 h-2 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: scoreColor }}
              initial={{ width: 0 }}
              animate={{ width: `${scorePercent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
          <div className="mt-2 w-full max-w-sm flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
            <span>300</span>
            <span>850</span>
          </div>
        </motion.div>

        {/* Middle row: AI Insights + Score Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* AI Insights — wider */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card md:col-span-2 border-l-4"
            style={{ borderLeftColor: scoreColor }}
          >
            <div className="flex items-center gap-2 mb-4">
              <BrainCircuit className="w-5 h-5 text-brand" />
              <h3 className="font-bold text-base text-[#111827]">Score Insights</h3>
            </div>
            {explainPending || (!explanation && !explainPending && !scoreData) ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[88%]" />
                <Skeleton className="h-4 w-[72%]" />
              </div>
            ) : (
              <p className="text-gray-500 text-sm leading-relaxed">
                {explanation ?? "Generating your personalised insights..."}
              </p>
            )}
          </motion.div>

          {/* Quick stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card flex flex-col gap-4"
          >
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-[#111827]">At a Glance</h3>
              <Info className="w-4 h-4 text-gray-300" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Score tier</span>
                <span className="font-semibold" style={{ color: scoreColor }}>{scoreLabel}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Signal count</span>
                <span className="font-semibold text-[#111827]">{chartData.filter(d => !d.isDefault).length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Vouchers</span>
                <span className="font-semibold text-[#111827]">{scoreData?.vouchers?.length ?? 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Percentile</span>
                <span className="font-semibold text-[#111827]">{Math.round(scorePercent)}%</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Score Breakdown chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="card"
        >
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-base text-[#111827]">Score Breakdown</h3>
              <p className="text-xs text-gray-400 mt-0.5">Points contributed by each signal</p>
            </div>
            <TrendingUp className="w-4 h-4 text-gray-300" />
          </div>
          {isLoadingScore ? (
            <Skeleton className="w-full h-[200px]" />
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 60, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: "#9CA3AF" }} />
                <YAxis dataKey="name" type="category" fontSize={11} tickLine={false} axisLine={false} width={110} tick={{ fill: "#6B7280" }} />
                <RechartsTooltip
                  cursor={{ fill: "#F9FAFB" }}
                  contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 12 }}
                  formatter={(v: number) => [`${v > 0 ? "+" : ""}${v} pts`, "Points"]}
                />
                <Bar dataKey="points" radius={[0, 4, 4, 0]} barSize={20}>
                  {chartData.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={entry.isDefault ? CORAL : GREEN} fillOpacity={0.88} />
                  ))}
                  <LabelList
                    dataKey="points"
                    position="right"
                    style={{ fontSize: 12, fontWeight: 700 }}
                    formatter={(v: number) => `${v > 0 ? "+" : ""}${v}`}
                    fill="#374151"
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
              No signals recorded yet.
            </div>
          )}
        </motion.div>

        {/* My Vouchers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-base text-[#111827]">My Vouchers</h3>
            <Users className="w-4 h-4 text-gray-300" />
          </div>

          {isLoadingScore ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <Skeleton className="w-16 h-16 rounded-full" />
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
              ))}
            </div>
          ) : scoreData?.vouchers && scoreData.vouchers.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
              {scoreData.vouchers.map((vouch) => {
                const vColor = getScoreColor(vouch.score);
                const vTier = getScoreLabel(vouch.score);
                const vInitials = getInitials(vouch.name);
                return (
                  <div key={vouch.id} className="flex flex-col items-center text-center group cursor-pointer">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold mb-3 transition-transform group-hover:scale-105 border-2"
                      style={{
                        backgroundColor: `${vColor}20`,
                        color: vColor,
                        borderColor: vColor
                      }}
                    >
                      {vInitials}
                    </div>
                    <span className="font-bold text-sm text-[#111827] truncate w-full text-center">{vouch.name.split(" ")[0]}</span>
                    <span className="text-xs text-gray-400 font-medium">{vouch.score} · {vTier}</span>
                  </div>
                );
              })}

              {/* Add vouch button */}
              <Dialog open={vouchOpen} onOpenChange={setVouchOpen}>
                <DialogTrigger asChild>
                  <button className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-4 hover:border-brand hover:bg-brand/5 transition-all group cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-2 group-hover:bg-brand group-hover:text-white transition-colors text-gray-400">
                      <Plus className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-gray-400 group-hover:text-brand">Add New</span>
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Vouch for a Community Member</DialogTitle>
                    <DialogDescription>Stake your reputation to help someone else build theirs.</DialogDescription>
                  </DialogHeader>
                  <Form {...vouchForm}>
                    <form onSubmit={vouchForm.handleSubmit(onVouchSubmit)} className="space-y-4">
                      <FormField control={vouchForm.control} name="voucheeId" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Person</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Choose a user" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {allUsers?.filter(u => u.id !== userId).map(u => (
                                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={vouchForm.control} name="strength" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trust Strength (1–10)</FormLabel>
                          <FormControl><Input type="number" min="1" max="10" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <button type="submit" disabled={addVouch.isPending} className="btn-primary w-full disabled:opacity-60">
                        {addVouch.isPending ? "Submitting..." : "Submit Vouch"}
                      </button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <div className="flex flex-col items-center py-8 text-gray-400 text-sm gap-3">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <p>No vouchers yet — ask someone to vouch for you.</p>
            </div>
          )}
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="flex flex-col md:flex-row gap-4"
        >
          <Dialog open={vouchOpen} onOpenChange={setVouchOpen}>
            <DialogTrigger asChild>
              <button className="btn-primary flex-1 flex items-center justify-center gap-2">
                <Users className="w-5 h-5" /> Vouch for Someone
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Vouch for a Community Member</DialogTitle>
                <DialogDescription>Stake your reputation to help someone else build theirs.</DialogDescription>
              </DialogHeader>
              <Form {...vouchForm}>
                <form onSubmit={vouchForm.handleSubmit(onVouchSubmit)} className="space-y-4">
                  <FormField control={vouchForm.control} name="voucheeId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Person</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Choose a user" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {allUsers?.filter(u => u.id !== userId).map(u => (
                            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={vouchForm.control} name="strength" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trust Strength (1–10)</FormLabel>
                      <FormControl><Input type="number" min="1" max="10" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <button type="submit" disabled={addVouch.isPending} className="btn-primary w-full disabled:opacity-60">
                    {addVouch.isPending ? "Submitting..." : "Submit Vouch"}
                  </button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={signalOpen} onOpenChange={setSignalOpen}>
            <DialogTrigger asChild>
              <button className="btn-secondary flex-1 flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" /> Add Trust Signal
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record a Trust Signal</DialogTitle>
                <DialogDescription>Log consistent payments to boost your trust score.</DialogDescription>
              </DialogHeader>
              <Form {...signalForm}>
                <form onSubmit={signalForm.handleSubmit(onSignalSubmit)} className="space-y-4">
                  <FormField control={signalForm.control} name="type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Signal Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Choose signal type" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="rent">Rent Payment</SelectItem>
                          <SelectItem value="utility">Utility Bill</SelectItem>
                          <SelectItem value="mobile">Mobile Top-up</SelectItem>
                          <SelectItem value="default">Missed Payment (Default)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={signalForm.control} name="months_consistent" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Months Consistent</FormLabel>
                      <FormControl><Input type="number" min="1" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <button type="submit" disabled={addSignal.isPending} className="btn-primary w-full disabled:opacity-60">
                    {addSignal.isPending ? "Submitting..." : "Record Signal"}
                  </button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </motion.div>
      </main>
    </div>
  );
}
