import Link from "next/link";
import { ExternalLink } from "lucide-react";

type Props = {
  txHash: string;
  className?: string;
};

export function HashScanLink({ txHash, className = "" }: Props) {
  if (!txHash) return null;
  
  const shortHash = `${txHash.slice(0, 6)}...${txHash.slice(-4)}`;
  
  return (
    <Link
      href={`https://hashscan.io/testnet/transaction/${txHash}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 font-mono text-[11px] font-medium text-emerald-600 hover:text-emerald-700 hover:underline ${className}`}
      title={txHash}
    >
      {shortHash}
      <ExternalLink className="h-3 w-3" />
    </Link>
  );
}
