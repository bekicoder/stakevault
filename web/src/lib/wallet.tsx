"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createWalletClient,
  custom,
  toHex,
  type Address,
  type EIP1193Provider,
  type WalletClient,
} from "viem";
import { chain } from "./config";
import { parseError } from "./errors";

export type WalletInfo = { uuid: string; name: string; icon: string; rdns: string };
export type DiscoveredWallet = { info: WalletInfo; provider: EIP1193Provider };

const LAST_WALLET_KEY = "stakevault:lastWallet";

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode): the app still works */
  }
}

type WalletContextValue = {
  wallets: DiscoveredWallet[];
  account?: Address;
  chainId?: number;
  walletClient?: WalletClient;
  isWrongNetwork: boolean;
  connecting: boolean;
  error?: string;
  connect: (wallet: DiscoveredWallet) => Promise<void>;
  disconnect: () => void;
  switchToTarget: () => Promise<void>;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallets, setWallets] = useState<DiscoveredWallet[]>([]);
  const [active, setActive] = useState<DiscoveredWallet>();
  const [account, setAccount] = useState<Address>();
  const [chainId, setChainId] = useState<number>();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string>();

  const reset = useCallback(() => {
    setActive(undefined);
    setAccount(undefined);
    setChainId(undefined);
  }, []);

  // 1. EIP-6963: discover every injected wallet (MetaMask, Rabby, Coinbase...) without
  //    fighting over window.ethereum.
  useEffect(() => {
    const onAnnounce = (event: Event) => {
      const { info, provider } = (event as CustomEvent<DiscoveredWallet>).detail;
      setWallets((prev) =>
        prev.some((w) => w.info.uuid === info.uuid) ? prev : [...prev, { info, provider }],
      );
    };
    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    return () => window.removeEventListener("eip6963:announceProvider", onAnnounce);
  }, []);

  // 2. Silent reconnect to the last used wallet (eth_accounts never opens a popup).
  useEffect(() => {
    if (active) return;
    const last = readStorage(LAST_WALLET_KEY);
    const wallet = wallets.find((w) => w.info.rdns === last);
    if (!wallet) return;
    (async () => {
      try {
        const accounts = (await wallet.provider.request({ method: "eth_accounts" })) as Address[];
        if (!accounts[0]) return;
        const id = Number(await wallet.provider.request({ method: "eth_chainId" }));
        setActive(wallet);
        setAccount(accounts[0]);
        setChainId(id);
      } catch {
        /* user can connect manually */
      }
    })();
  }, [wallets, active]);

  // 3. React to the user changing account or network inside the wallet.
  useEffect(() => {
    if (!active) return;
    const { provider } = active;
    const onAccounts = (accounts: Address[]) => {
      if (accounts.length === 0) reset();
      else setAccount(accounts[0]);
    };
    const onChain = (hexChainId: string) => setChainId(Number(hexChainId));
    provider.on("accountsChanged", onAccounts);
    provider.on("chainChanged", onChain);
    return () => {
      provider.removeListener("accountsChanged", onAccounts);
      provider.removeListener("chainChanged", onChain);
    };
  }, [active, reset]);

  const connect = useCallback(async (wallet: DiscoveredWallet) => {
    setConnecting(true);
    setError(undefined);
    try {
      const accounts = (await wallet.provider.request({
        method: "eth_requestAccounts",
      })) as Address[];
      const id = Number(await wallet.provider.request({ method: "eth_chainId" }));
      setActive(wallet);
      setAccount(accounts[0]);
      setChainId(id);
      writeStorage(LAST_WALLET_KEY, wallet.info.rdns);
    } catch (e) {
      setError(parseError(e));
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    writeStorage(LAST_WALLET_KEY, null);
    reset();
  }, [reset]);

  const switchToTarget = useCallback(async () => {
    if (!active) return;
    setError(undefined);
    try {
      await active.provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: toHex(chain.id) }],
      });
    } catch (e) {
      // 4902 = the wallet doesn't know this chain yet, so add it.
      if ((e as { code?: number } | null)?.code === 4902) {
        try {
          await active.provider.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: toHex(chain.id),
                chainName: chain.name,
                nativeCurrency: chain.nativeCurrency,
                rpcUrls: [...chain.rpcUrls.default.http],
                blockExplorerUrls: [chain.blockExplorers.default.url],
              },
            ],
          });
        } catch (addError) {
          setError(parseError(addError));
        }
      } else {
        setError(parseError(e));
      }
    }
  }, [active]);

  const walletClient = useMemo<WalletClient | undefined>(
    () =>
      active && account
        ? createWalletClient({ account, chain, transport: custom(active.provider) })
        : undefined,
    [active, account],
  );

  const value = useMemo<WalletContextValue>(
    () => ({
      wallets,
      account,
      chainId,
      walletClient,
      isWrongNetwork: Boolean(account) && chainId !== chain.id,
      connecting,
      error,
      connect,
      disconnect,
      switchToTarget,
    }),
    [wallets, account, chainId, walletClient, connecting, error, connect, disconnect, switchToTarget],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside <WalletProvider>");
  return ctx;
}
