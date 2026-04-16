// types/admin-settings.mo — Unified Admin Settings type
// All Admin Panel configurable values stored in the canister.
module {

  /// All admin-controllable settings in one record.
  /// Stored in a single stable var so one atomic update covers all fields.
  public type AdminSettings = {
    // ── Referral / MLM rates ──────────────────────────────────────────────
    referralLevel1Pct : Nat;   // default 5
    referralLevel2Pct : Nat;   // default 2
    referralLevel3Pct : Nat;   // default 1
    referralLevel4Pct : Float; // default 0.5
    referralLevel5Pct : Float; // default 0.25

    // ── Payment / UPI ─────────────────────────────────────────────────────
    upiId             : Text;
    upiQrCodeUrl      : Text;
    razorpayKeyId     : Text;
    razorpayKeySecret : Text;

    // ── Ludo / Rewards ────────────────────────────────────────────────────
    pointsPerAd       : Nat;   // default 10
    redemptionRate    : Nat;   // points per ₹1, default 100
    minWithdrawal     : Nat;   // minimum withdrawal in ₹, default 50

    // ── Offer Portal ─────────────────────────────────────────────────────
    cpagripApiKey     : Text;

    // ── Cloudinary configuration ──────────────────────────────────────────
    cloudinaryCloudName : Text;  // default: "dquyiiu7o"
    cloudinaryApiKey    : Text;  // default: "199372638334688"
    cloudinaryApiSecret : Text;  // NEVER sent to frontend; kept server-side only

    // ── Feature toggles ───────────────────────────────────────────────────
    ludoEnabled       : Bool;
    rewardsEnabled    : Bool;
    gameEnabled       : Bool;
    udhaarBookEnabled : Bool;
  };

};
