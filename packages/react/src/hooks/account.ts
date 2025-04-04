"use client";

import { useQuery } from "@tanstack/react-query";
import type { Account, Address, Decoder, FetchAccountConfig, Simplify } from "gill";
import { assertAccountExists, decodeAccount, fetchEncodedAccount } from "gill";
import { GILL_HOOK_CLIENT_KEY } from "../const";
import { useSolanaClient } from "./client";
import type { GillUseRpcHook } from "./types";

type RpcConfig = Simplify<Omit<FetchAccountConfig, "abortSignal">>;

type UseAccountResponse<TAddress extends string = string, TData extends Uint8Array | object = Uint8Array> = Account<
  TData,
  TAddress
> & {
  exists: true;
};

type UseAccountInput<
  TConfig extends RpcConfig = RpcConfig,
  TAddress extends string = string,
  TDecodedData extends object = Uint8Array,
> = GillUseRpcHook<TConfig> & {
  /**
   * Address of the account to get the balance of
   */
  address: TAddress | Address;
  /**
   * Account decoder that can decode the account's `data` byte array value
   */
  decoder?: Decoder<TDecodedData>;
};

/**
 * Get the account info for an address using the Solana RPC method of
 * [`getAccountInfo`](https://solana.com/docs/rpc/http/getaccountinfo)
 */
export function useAccount<
  TConfig extends RpcConfig = RpcConfig,
  TAddress extends string = string,
  TDecodedData extends object = Uint8Array,
>({ options, config, abortSignal, address, decoder }: UseAccountInput<TConfig, TAddress, TDecodedData>) {
  const { rpc } = useSolanaClient();

  if (abortSignal) {
    // @ts-expect-error we stripped the `abortSignal` from the type but are now adding it back in
    config = {
      ...(config || {}),
      abortSignal,
    };
  }

  const { data, ...rest } = useQuery({
    networkMode: "offlineFirst",
    ...options,
    queryKey: [GILL_HOOK_CLIENT_KEY, "getAccountInfo", address],
    queryFn: async () => {
      const account = await fetchEncodedAccount(rpc, address as Address, config);
      assertAccountExists(account);
      if (decoder) return decodeAccount(account, decoder as Decoder<TDecodedData>);
      return account;
    },
    enabled: !!address,
  });
  return {
    ...rest,
    account: data as UseAccountResponse<TAddress, TDecodedData>,
  };
}
