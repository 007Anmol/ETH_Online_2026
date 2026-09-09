import { LoginForm } from "./login-form";
import { WavyBackground } from "@/components/ui/wavy-background";

export default function LoginPage() {
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Dark mode logo overlay */}
      <div className="absolute top-0 left-0 w-full p-6 lg:px-10 flex justify-between z-20 items-center">
         <span className="text-white font-bold text-xl tracking-wider">VeriChain</span>
         <span className="text-zinc-500 text-sm font-medium tracking-widest uppercase">ETHGlobal 2026</span>
      </div>
      
      <WavyBackground className="mx-auto w-full max-w-4xl pb-40" containerClassName="absolute inset-0">
        <div className="flex flex-col items-center justify-center relative z-10 px-4 text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-emerald-400 mb-4 animate-pulse">
            Manufacturer Portal
          </p>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6">
            Physical-to-Digital <br /> <span className="text-emerald-300">Product Identity</span>
          </h1>
          <p className="text-base md:text-lg leading-relaxed text-zinc-300 max-w-2xl mb-12">
            Securely bind physical products to their digital twins. Connect your wallet, sign a message, and authenticate your World ID to begin minting verifiable identities on Hedera.
          </p>
          <LoginForm />
        </div>
      </WavyBackground>
    </div>
  );
}
