module {

  // A single UPI entry in the multi-UPI list
  public type UpiEntry = {
    id       : Text;
    upiId    : Text;
    upiName  : Text;
    isActive : Bool;
  };

  // A single QR code entry in the multi-QR list
  public type QrEntry = {
    id       : Text;
    qrUrl    : Text;
    qrLabel  : Text;
    isActive : Bool;
  };

  // Module-level config for the Digital Invest feature
  public type CryptoInvestConfig = {
    isEnabled : Bool;
    buyFeePercent : Float;         // e.g. 0.5 for 0.5%
    sellFeePercent : Float;
    minWithdrawal : Float;
    maxWithdrawal : Float;
    dailyRewardAmount : Float;
    isDailyRewardEnabled : Bool;
    highRiskThreshold : Float;     // coins dropping more than this % are tagged High Risk
    upiId : Text;                  // legacy: active UPI ID (kept for backwards compat)
    qrCodeUrl : Text;              // legacy: active QR code URL (kept for backwards compat)
    referralBonusAmount : Float;   // INR credited to referrer on referree's first trade
    referralBonusEnabled : Bool;
  };

  // A tradable coin listed in the app
  public type CryptoCoin = {
    id : Text;
    name : Text;                   // e.g. "Bitcoin"
    symbol : Text;                 // e.g. "BTC"
    coinGeckoId : Text;            // e.g. "bitcoin" - used for CoinGecko API calls
    logoUrl : Text;                // Cloudinary URL
    isListed : Bool;
    createdAt : Int;               // nanoseconds
  };

  // Per-user investment wallet
  public type CryptoWallet = {
    userId : Text;
    balance : Float;
    totalDeposited : Float;
    totalWithdrawn : Float;
    mpinHash : Text;               // SHA-256 of 6-digit MPIN
    mpinSetAt : Int;
    mpinFailedAttempts : Nat;
    mpinLockedUntil : Int;         // 0 if not locked
    lastDailyRewardClaimed : Int;  // timestamp of last claim (nanoseconds)
    dailyRewardStreak : Nat;
    hasCompletedFirstTrade : Bool; // for referral first-trade bonus tracking
    referralCode : Text;           // the offer portal referral code (if linked)
    createdAt : Int;
    updatedAt : Int;
  };

  // A coin position held by a user
  public type PortfolioHolding = {
    id : Text;
    userId : Text;
    coinId : Text;
    coinSymbol : Text;
    coinName : Text;
    quantity : Float;
    avgBuyPrice : Float;           // average cost basis in INR
    totalCost : Float;             // total amount spent in INR
    updatedAt : Int;
  };

  // Transaction type discriminant
  public type TxType = {
    #buy;
    #sell;
    #deposit;
    #withdrawal;
    #dailyReward;
  };

  // Transaction status
  public type TxStatus = {
    #pending;
    #completed;
    #failed;
    #pendingApproval;
    #approved;
    #rejected;
  };

  // Full trade / movement record
  public type CryptoTransaction = {
    id : Text;                     // unique transaction ID
    userId : Text;
    txType : TxType;
    coinId : ?Text;                // null for deposit / withdrawal / dailyReward
    coinSymbol : ?Text;
    quantity : ?Float;             // null for deposit / withdrawal / dailyReward
    priceAtTime : ?Float;          // price per coin at time of trade (INR)
    totalAmount : Float;           // total INR value
    feePercent : ?Float;
    feeAmount : ?Float;
    netAmount : Float;             // amount after fee
    status : TxStatus;
    adminNote : ?Text;
    createdAt : Int;
    updatedAt : Int;
  };

  // Withdrawal request submitted by a user
  public type CryptoWithdrawal = {
    id : Text;
    userId : Text;
    userEmail : Text;
    amount : Float;
    upiId : Text;
    status : { #pending; #approved; #rejected };
    adminNote : ?Text;
    createdAt : Int;
    resolvedAt : ?Int;
  };

  // Support ticket priority
  public type TicketPriority = { #low; #medium; #high };

  // Support ticket category
  public type TicketCategory = {
    #bugReport;
    #withdrawalQuery;
    #coinInquiry;
    #general;
  };

  // Support ticket status
  public type TicketStatus = { #open; #inProgress; #resolved };

  // User support query
  public type SupportTicket = {
    id : Text;
    userId : Text;
    userEmail : Text;
    subject : Text;
    description : Text;
    priority : TicketPriority;
    category : TicketCategory;
    status : TicketStatus;
    createdAt : Int;
    updatedAt : Int;
  };

  // A reply within a support ticket thread
  public type TicketReply = {
    id : Text;
    ticketId : Text;
    authorId : Text;
    authorRole : { #user; #admin };
    message : Text;
    createdAt : Int;
  };

  // Freeze / block state for a specific user in the crypto module
  public type CryptoUserFreeze = {
    userId : Text;
    isFrozen : Bool;   // stops trading but user can still view
    isBlocked : Bool;  // cannot access the module at all
    reason : Text;
    updatedAt : Int;
  };

  // Deposit request with UTR submitted by a user
  public type DepositRequest = {
    id : Text;
    userId : Text;
    amount : Float;
    utrNumber : Text;              // Bank/UPI Transaction Reference Number
    screenshotUrl : ?Text;         // Cloudinary URL of payment screenshot
    status : { #pending; #approved; #rejected };
    adminNote : ?Text;
    rejectionReason : ?Text;       // Populated on admin rejection
    createdAt : Int;
    resolvedAt : ?Int;
  };

  // Stop-loss rule set by a user for automatic sell on price drop
  public type StopLossRule = {
    id : Text;
    userId : Text;
    coinId : Text;
    coinSymbol : Text;
    quantityToSell : Float;        // quantity to auto-sell when triggered
    limitPriceInr : Float;         // sell triggers when price <= this value
    isActive : Bool;
    triggeredAt : ?Int;
    createdAt : Int;
  };

  // Admin action audit trail entry
  public type CryptoAdminAuditLog = {
    id : Text;
    adminEmail : Text;
    action : Text;              // e.g. "freeze_user", "update_fee", "approve_withdrawal"
    targetId : ?Text;           // user ID or coin ID affected
    beforeValue : ?Text;
    afterValue : ?Text;
    createdAt : Int;
  };

};
