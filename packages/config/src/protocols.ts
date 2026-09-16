export const PROTOCOL_IDS = {
  aaveV3: "aave-v3",
  uniswapV4: "uniswap-v4",
  layerZeroV2: "layerzero-v2",
  chainlinkDataFeeds: "chainlink-data-feeds",
  chainlinkAutomation: "chainlink-automation",
} as const;

export type SupportedProtocolId = (typeof PROTOCOL_IDS)[keyof typeof PROTOCOL_IDS];

export const REQUIRED_PROTOCOL_IDS = [
  PROTOCOL_IDS.aaveV3,
  PROTOCOL_IDS.uniswapV4,
  PROTOCOL_IDS.layerZeroV2,
  PROTOCOL_IDS.chainlinkDataFeeds,
] as const satisfies readonly SupportedProtocolId[];
