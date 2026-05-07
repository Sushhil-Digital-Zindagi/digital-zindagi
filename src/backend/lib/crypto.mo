import CryptoTypes "../types/crypto";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Float "mo:core/Float";
import Time "mo:core/Time";
import Array "mo:core/Array";

module {

  // ─────────────────────────────────────────
  // MPIN Logic
  // ─────────────────────────────────────────

  let MPIN_SALT = "DZ_CRYPTO_2026";

  /// Deterministic hash of a 6-digit MPIN using fixed salt concatenation.
  public func hashMpin(mpin : Text) : Text {
    MPIN_SALT # "::" # mpin # "::" # MPIN_SALT
  };

  /// Compare an input MPIN against a stored hash.
  public func verifyMpin(inputMpin : Text, storedHash : Text) : Bool {
    hashMpin(inputMpin) == storedHash
  };

  /// True when the wallet MPIN lock period has not yet expired.
  public func isWalletLocked(wallet : CryptoTypes.CryptoWallet) : Bool {
    wallet.mpinLockedUntil > 0 and wallet.mpinLockedUntil > Time.now()
  };

  // ─────────────────────────────────────────
  // Wallet Logic
  // ─────────────────────────────────────────

  /// Initialise a brand-new wallet for a user with zero balances and no MPIN.
  public func createWallet(userId : Text) : CryptoTypes.CryptoWallet {
    let now = Time.now();
    {
      userId;
      balance = 0.0;
      totalDeposited = 0.0;
      totalWithdrawn = 0.0;
      mpinHash = "";
      mpinSetAt = 0;
      mpinFailedAttempts = 0;
      mpinLockedUntil = 0;
      lastDailyRewardClaimed = 0;
      dailyRewardStreak = 0;
      hasCompletedFirstTrade = false;
      referralCode = "";
      createdAt = now;
      updatedAt = now;
    }
  };

  /// Check whether a user can place a trade right now.
  /// Returns #ok when all checks pass, #err with a reason message otherwise.
  public func canTrade(
    wallet : CryptoTypes.CryptoWallet,
    freezeState : ?CryptoTypes.CryptoUserFreeze,
  ) : { #ok; #err : Text } {
    if (isWalletLocked(wallet)) {
      return #err("Wallet is locked due to too many failed MPIN attempts. Please try again later.");
    };
    switch (freezeState) {
      case (?fs) {
        if (fs.isBlocked) {
          return #err("Your account has been blocked. Please contact support.");
        };
        if (fs.isFrozen) {
          return #err("Your account is temporarily frozen. Trading is not allowed.");
        };
      };
      case null {};
    };
    #ok
  };

  // ─────────────────────────────────────────
  // Trading Logic
  // ─────────────────────────────────────────

  /// Calculate figures for a BUY order.
  public func calculateBuyOrder(
    amount : Float,
    price : Float,
    feePercent : Float,
  ) : {
    coinQuantity : Float;
    feeAmount : Float;
    totalDeducted : Float;
  } {
    let feeAmount = amount * feePercent / 100.0;
    let totalDeducted = amount + feeAmount;
    let coinQuantity = if (price > 0.0) { amount / price } else { 0.0 };
    { coinQuantity; feeAmount; totalDeducted }
  };

  /// Calculate figures for a SELL order.
  public func calculateSellOrder(
    quantity : Float,
    price : Float,
    feePercent : Float,
  ) : {
    grossValue : Float;
    feeAmount : Float;
    netProceeds : Float;
  } {
    let grossValue = quantity * price;
    let feeAmount = grossValue * feePercent / 100.0;
    let netProceeds = grossValue - feeAmount;
    { grossValue; feeAmount; netProceeds }
  };

  /// Update (or create) a portfolio holding after a BUY.
  /// Average buy price is recalculated as (totalCost + newCost) / (oldQty + newQty).
  public func updatePortfolioOnBuy(
    holding : ?CryptoTypes.PortfolioHolding,
    coinId : Text,
    coinSymbol : Text,
    coinName : Text,
    userId : Text,
    quantity : Float,
    price : Float,
  ) : CryptoTypes.PortfolioHolding {
    let now = Time.now();
    let newCost = quantity * price;
    switch (holding) {
      case (?h) {
        let newQty = h.quantity + quantity;
        let newTotalCost = h.totalCost + newCost;
        let newAvgPrice = if (newQty > 0.0) { newTotalCost / newQty } else { price };
        { h with
          quantity = newQty;
          avgBuyPrice = newAvgPrice;
          totalCost = newTotalCost;
          updatedAt = now;
        }
      };
      case null {
        {
          id = generateId("ph", 0);  // caller should override id with a proper unique ID
          userId;
          coinId;
          coinSymbol;
          coinName;
          quantity;
          avgBuyPrice = price;
          totalCost = newCost;
          updatedAt = now;
        }
      };
    }
  };

  /// Update a portfolio holding after a SELL.
  /// Returns null when the position is fully closed (quantity reaches 0 or below).
  /// avgBuyPrice is unchanged on sell.
  public func updatePortfolioOnSell(
    holding : CryptoTypes.PortfolioHolding,
    quantity : Float,
  ) : ?CryptoTypes.PortfolioHolding {
    let newQty = holding.quantity - quantity;
    if (newQty <= 0.0) {
      null
    } else {
      let soldCostBasis = quantity * holding.avgBuyPrice;
      let newTotalCost = holding.totalCost - soldCostBasis;
      ?{ holding with
        quantity = newQty;
        totalCost = if (newTotalCost > 0.0) { newTotalCost } else { 0.0 };
        updatedAt = Time.now();
      }
    }
  };

  // ─────────────────────────────────────────
  // Daily Reward Logic
  // ─────────────────────────────────────────

  let ONE_DAY_NS  : Int = 86_400_000_000_000;
  let TWO_DAYS_NS : Int = 172_800_000_000_000;

  /// True when the user is eligible to claim their daily reward.
  public func canClaimDailyReward(wallet : CryptoTypes.CryptoWallet) : Bool {
    if (wallet.lastDailyRewardClaimed == 0) {
      return true;
    };
    let elapsed = Time.now() - wallet.lastDailyRewardClaimed;
    elapsed >= ONE_DAY_NS
  };

  /// Calculate the new daily streak count.
  /// Streak increments when claimed within 48 hours; resets to 1 otherwise.
  public func calculateNewStreak(wallet : CryptoTypes.CryptoWallet) : Nat {
    if (wallet.lastDailyRewardClaimed == 0) {
      return 1;
    };
    let elapsed = Time.now() - wallet.lastDailyRewardClaimed;
    if (elapsed <= TWO_DAYS_NS) {
      wallet.dailyRewardStreak + 1
    } else {
      1
    }
  };

  // ─────────────────────────────────────────
  // Stop-Loss Helpers
  // ─────────────────────────────────────────

  /// Return all active stop-loss rules for a given coin that should trigger
  /// at the supplied current price (limitPrice >= currentPrice).
  public func findTriggeredStopLossRules(
    rules        : [CryptoTypes.StopLossRule],
    coinId       : Text,
    currentPrice : Float,
  ) : [CryptoTypes.StopLossRule] {
    rules.filter(func(r : CryptoTypes.StopLossRule) : Bool {
      r.coinId == coinId and r.isActive and r.limitPriceInr >= currentPrice
    })
  };

  // ─────────────────────────────────────────
  // ID Generation
  // ─────────────────────────────────────────

  /// Generate a simple unique ID: prefix_counter_timestamp.
  public func generateId(prefix : Text, counter : Nat) : Text {
    prefix # "_" # counter.toText() # "_" # Time.now().toText()
  };

  // ─────────────────────────────────────────
  // Stats Helpers
  // ─────────────────────────────────────────

  /// Compute aggregate portfolio statistics across all holdings.
  /// Missing prices fall back to the holding's avgBuyPrice.
  public func calculatePortfolioStats(
    holdings : [CryptoTypes.PortfolioHolding],
    prices : [(Text, Float)],
  ) : {
    totalValue : Float;
    totalCost : Float;
    totalGainLoss : Float;
    gainLossPercent : Float;
  } {
    // Build a simple lookup from the prices list.
    let findPrice = func(coinId : Text) : Float {
      switch (prices.find<(Text, Float)>(func((id, _)) { id == coinId })) {
        case (?(_, p)) { p };
        case null { 0.0 };
      }
    };

    var totalValue = 0.0;
    var totalCost  = 0.0;

    for (h in holdings.values()) {
      let price = findPrice(h.coinId);
      let currentPrice = if (price > 0.0) { price } else { h.avgBuyPrice };
      totalValue += h.quantity * currentPrice;
      totalCost  += h.totalCost;
    };

    let totalGainLoss = totalValue - totalCost;
    let gainLossPercent =
      if (totalCost > 0.0) { (totalGainLoss / totalCost) * 100.0 } else { 0.0 };

    { totalValue; totalCost; totalGainLoss; gainLossPercent }
  };

};
