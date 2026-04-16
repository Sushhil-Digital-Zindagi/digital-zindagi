// migration.mo — Upgrade migration from previous stable state.
// Old types are defined inline (copied from .old/src/backend/types/).
// New types are imported from the current types/ directory.
import Map "mo:core/Map";
import ASTypes "./types/admin-settings";
import OPTypes "./types/offer-portal";

module {

  // ── Old inline types ────────────────────────────────────────────────────────

  type OldAdminSettings = {
    referralLevel1Pct : Nat;
    referralLevel2Pct : Nat;
    referralLevel3Pct : Nat;
    upiId             : Text;
    upiQrCodeUrl      : Text;
    razorpayKeyId     : Text;
    razorpayKeySecret : Text;
    pointsPerAd       : Nat;
    redemptionRate    : Nat;
    minWithdrawal     : Nat;
    cpagripApiKey     : Text;
    ludoEnabled       : Bool;
    rewardsEnabled    : Bool;
    gameEnabled       : Bool;
    udhaarBookEnabled : Bool;
  };

  type OldOfferUser = {
    id              : Nat;
    userId          : Text;
    email           : Text;
    passwordHash    : Text;
    referralCode    : Text;
    referredBy      : ?Text;
    totalEarnings   : Nat;
    pendingEarnings : Nat;
    tier1Earnings   : Nat;
    tier2Earnings   : Nat;
    tier3Earnings   : Nat;
    createdAt       : Int;
  };

  // ── Migration input / output ─────────────────────────────────────────────────

  type OldActor = {
    var adminSettings : OldAdminSettings;
    var offerUsers    : Map.Map<Nat, OldOfferUser>;
  };

  type NewActor = {
    var adminSettings : ASTypes.AdminSettings;
    var offerUsers    : Map.Map<Nat, OPTypes.OfferUser>;
  };

  // ── Migration function ───────────────────────────────────────────────────────

  public func run(old : OldActor) : NewActor {
    let newAdminSettings : ASTypes.AdminSettings = {
      old.adminSettings with
      referralLevel4Pct   = 0.5  : Float;
      referralLevel5Pct   = 0.25 : Float;
      cloudinaryCloudName = "dquyiiu7o";
      cloudinaryApiKey    = "199372638334688";
      cloudinaryApiSecret = "[-bMdmPrWDfdfSsj8LckbC-4zmvg";
    };

    let newOfferUsers : Map.Map<Nat, OPTypes.OfferUser> =
      old.offerUsers.map<Nat, OldOfferUser, OPTypes.OfferUser>(
        func(_id, u) {
          { u with tier4Earnings = 0; tier5Earnings = 0 }
        }
      );

    {
      var adminSettings = newAdminSettings;
      var offerUsers    = newOfferUsers;
    };
  };

};
