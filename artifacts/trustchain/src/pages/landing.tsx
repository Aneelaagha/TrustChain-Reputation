import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { useCreateOrFindUser } from "@workspace/api-client-react";
import { Shield, Zap, UserCheck, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
});

export default function Landing() {
  const [, setLocation] = useLocation();
  const createUser = useCreateOrFindUser();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", email: "" },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createUser.mutate({ data: values }, {
      onSuccess: (data) => {
        localStorage.setItem("trustchain_userId", data.id);
        localStorage.setItem("trustchain_userName", data.name);
        setLocation("/dashboard");
      },
    });
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left: Brand panel */}
      <div className="flex-1 bg-brand p-8 md:p-16 flex flex-col justify-between text-white">
        <div>
          <div className="flex items-center gap-2 mb-12">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <Shield className="text-brand w-6 h-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight">TrustChain</span>
          </div>

          <div className="max-w-xl">
            <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-8">
              Financial identity for the invisible.
            </h1>
            <p className="text-xl md:text-2xl text-white/80 mb-12 leading-relaxed">
              1.4 billion adults have no credit score. TrustChain changes that by building
              reputation from the ground up.
            </p>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="mt-1 bg-white/10 p-2 rounded-lg flex-shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Alternative data signals</h3>
                  <p className="text-white/60">Rent, utilities, and mobile data turned into trust.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="mt-1 bg-white/10 p-2 rounded-lg flex-shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Graph trust propagation</h3>
                  <p className="text-white/60">A network-based score modeled on mathematical trust.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="mt-1 bg-white/10 p-2 rounded-lg flex-shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Portable & user-owned</h3>
                  <p className="text-white/60">Your reputation travels with you, anywhere in the world.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-12 border-t border-white/10">
          <p className="text-sm text-white/40 uppercase tracking-widest font-semibold">
            Empowering the unbanked globally
          </p>
        </div>
      </div>

      {/* Right: Login card */}
      <div className="flex-1 bg-[#F8F9FA] flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="bg-white border border-[#E5E7EB] rounded-3xl p-8 md:p-12 shadow-sm">
            <h2 className="text-3xl font-bold mb-2 text-[#111827]">Welcome back</h2>
            <p className="text-gray-500 mb-8">Enter your details to access your trust profile.</p>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Amara Kofi"
                  className="w-full border border-[#E5E7EB] rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                  {...form.register("name")}
                />
                {form.formState.errors.name && (
                  <p className="text-red-500 text-xs mt-1">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="w-full border border-[#E5E7EB] rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                  {...form.register("email")}
                />
                {form.formState.errors.email && (
                  <p className="text-red-500 text-xs mt-1">{form.formState.errors.email.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={createUser.isPending}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {createUser.isPending ? "Creating Profile..." : (
                  <>Get Started <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
