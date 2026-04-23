/**
 * bot.config.ts — Configurado para Polygon Mainnet (chain ID 137)
 *
 * Par escolhido: WPOL/USDT 0.05%
 * Motivo: melhor liquidez e volume dentre as pools WPOL na Polygon.
 *   - TVL:     ~$1.06M
 *   - Vol/24h: ~$4.98M
 *   - Vol/TVL: ~4.7× (alta eficiência de capital para LP concentrado)
 *
 * ⚠️  ATENÇÃO — Capital atual (7.5 POL ≈ $0.71):
 *   Você tem POL suficiente para pagar gas de deploy + ~50 rebalances,
 *   mas NÃO tem capital de liquidez ainda.
 *   Antes de rodar o bot em modo real (DRY_RUN=false) você precisa de:
 *     • WPOL (wrap do seu POL via https://app.uniswap.org)
 *     • USDT ou USDC para o outro lado da posição
 *   O bot roda em DRY_RUN=true até você ter capital depositado.
 */

import { PairConfig } from "../src/analysis/data-provider";

export interface BotConfig {
  pair: string;
  pairConfig: PairConfig;
  initialLiquidityUSD: number;
  intervalMs:       number;
  jitterMs:         number;
  cooldownMs:       number;
  minRangePct:      number;
  maxRangePct:      number;
  atrPeriod:        number;
  atrMultiplier:    number;
  deadZonePct:      number;
  minDeviationPct:  number;
  maxSlippageBps:   number;
  maxVolatilityPct: number;
  maxPriceDropPct:  number;
  feeRatePct:       number;
  gasCostUSD:       number;
  tickSpacing:      number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pools disponíveis na Polygon — endereços verificados via GeckoTerminal
// ─────────────────────────────────────────────────────────────────────────────

export const PAIRS = {
  // ✅ RECOMENDADO — melhor Vol/TVL da Polygon
  // Vol/24h $4.98M | TVL $1.06M | Vol/TVL ~4.7×
  "WPOL/USDT-005": {
    geckoNetwork:     "polygon_pos",
    geckoPoolAddress: "0x9b08288c3be4f62bbf8d1c20ac9c5e6f9467d8b7",
    binanceSymbol:    "MATICUSDT",  // POL e MATIC têm o mesmo ticker na Binance
  },

  // Alternativa — par com USDC, menos volume
  // Vol/24h $703K | TVL $454K | Vol/TVL ~1.5×
  "USDC/WPOL-005": {
    geckoNetwork:     "polygon_pos",
    geckoPoolAddress: "0xb6e57ed85c4c9dbfef2a68711e9d6f36c56e0fcb",
    binanceSymbol:    "MATICUSDT",
  },

  // Alternativa — par com WETH, alto volume em relação ao TVL
  // Vol/24h $348K | TVL $444K
  "WPOL/WETH-005": {
    geckoNetwork:     "polygon_pos",
    geckoPoolAddress: "0x86f1d8390222a3691c28938ec7404a1661e618e0",
    binanceSymbol:    "MATICUSDT",
  },

  // Pool WPOL/USDC 0.05% — menor TVL ($158K), usar com cuidado
  "WPOL/USDC-005": {
    geckoNetwork:     "polygon_pos",
    geckoPoolAddress: "0xa374094527e1673a86de625aa59517c5de346d32",
    binanceSymbol:    "MATICUSDT",
  },
} satisfies Record<string, PairConfig>;

// ─────────────────────────────────────────────────────────────────────────────
// Configuração principal — WPOL/USDT 0.05% Polygon
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_CONFIG: BotConfig = {
  pair: "WPOL/USDT-005",

  pairConfig: PAIRS["WPOL/USDT-005"],

  // Capital inicial em USD
  // Com 7.5 POL (~$0.71) você não tem capital de LP ainda.
  // Ajuste para o valor real quando tiver WPOL + USDT depositados.
  initialLiquidityUSD: 0.71,

  // Loop principal
  intervalMs: 60_000,   // 1 minuto
  jitterMs:   15_000,   // ±15s anti-MEV

  // Cooldown conservador — POL é volátil
  cooldownMs: 15 * 60_000,   // 15 min

  // Range: WPOL é mais volátil que ETH → range mais largo
  minRangePct:    0.025,   // 2.5% mínimo
  maxRangePct:    0.15,    // 15% máximo
  atrPeriod:      14,
  atrMultiplier:  2.8,     // mais conservador (WPOL oscila mais que ETH)
  deadZonePct:    0.004,   // 0.4%

  // Desvio mínimo para trigger
  minDeviationPct: 0.015,   // 1.5%
  maxSlippageBps:  100,     // 1% — pool menor, mais slippage que ARB

  // Circuit breaker
  maxVolatilityPct: 0.25,   // WPOL pode ter spikes de 25%+
  maxPriceDropPct:  0.15,

  // Fee tier 0.05%
  feeRatePct:  0.0005,
  tickSpacing: 10,

  // Gas na Polygon: ~$0.0075 por tx (muito barato)
  gasCostUSD: 0.0075,
};
