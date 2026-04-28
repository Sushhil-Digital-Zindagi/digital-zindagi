// migration.mo — Upgrades offerUsers by adding the `mobile` field (new in this version).
// Old OfferUser had no `mobile` field; new OfferUser has `mobile : ?Text`.
// All existing users get `mobile = null`.
import Map "mo:core/Map";
import OPTypes "types/offer-portal";

module {

  // ── Old types (copied from .old/src/backend/types/offer-portal.mo) ─────────
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
    tier4Earnings   : Nat;
    tier5Earnings   : Nat;
    createdAt       : Int;
  };

  // ── Migration input/output ──────────────────────────────────────────────────
  type OldActor = {
    offerUsers : Map.Map<Nat, OldOfferUser>;
  };

  type NewActor = {
    offerUsers : Map.Map<Nat, OPTypes.OfferUser>;
  };

  public func run(old : OldActor) : NewActor {
    let offerUsers = old.offerUsers.map<Nat, OldOfferUser, OPTypes.OfferUser>(
      func(_id, u) {
        {
          u with
          mobile = null : ?Text;
        }
      }
    );
    { offerUsers }
  };
};
