import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { anvil } from "wagmi/chains";

export const config = createConfig({
  chains: [anvil],
  connectors: [injected()],
  transports: {
    [anvil.id]: http("http://127.0.0.1:8545"),
  },
});