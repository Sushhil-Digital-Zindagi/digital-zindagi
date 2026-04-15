// migration.mo — Explicit migration for stable-incompatible field additions.
//
// Two stable variables changed shape between the old and new version:
//   1. customCodes: CustomCode gained title/subtitle1/subtitle2/alignment/layoutStyle fields.
//   2. offerUsers:  OfferUser gained tier1Earnings/tier2Earnings/tier3Earnings fields.
//
// All other stable fields are unchanged and are passed through implicitly.

import Map "mo:core/Map";
import Nat "mo:core/Nat";

module {

  // ── Old type definitions (copied from .old/src/backend/main.mo) ────────────

  type OldCustomCode = {
    id       : Nat;
    name     : Text;
    code     : Text;
    btnLabel : Text;
    icon     : Text;
    placement : Text;
    enabled  : Bool;
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
    createdAt       : Int;
  };

  // ── New type definitions (must match main.mo exactly) ─────────────────────

  type NewCustomCode = {
    id          : Nat;
    name        : Text;
    code        : Text;
    btnLabel    : Text;
    icon        : Text;
    placement   : Text;
    enabled     : Bool;
    title       : Text;
    subtitle1   : Text;
    subtitle2   : Text;
    alignment   : Text;
    layoutStyle : Text;
  };

  type NewOfferUser = {
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

  // ── Migration input/output records ────────────────────────────────────────

  type OldState = {
    var customCodes : Map.Map<Nat, OldCustomCode>;
    var offerUsers  : Map.Map<Nat, OldOfferUser>;
  };

  type NewState = {
    var customCodes : Map.Map<Nat, NewCustomCode>;
    var offerUsers  : Map.Map<Nat, NewOfferUser>;
  };

  // ── Migration function ─────────────────────────────────────────────────────

  public func run(old : OldState) : NewState {
    let newCustomCodes = old.customCodes.map<Nat, OldCustomCode, NewCustomCode>(
      func(_id, cc) {
        {
          cc with
          title       = "";
          subtitle1   = "";
          subtitle2   = "";
          alignment   = "left";
          layoutStyle = "stacked";
        };
      }
    );

    let newOfferUsers = old.offerUsers.map<Nat, OldOfferUser, NewOfferUser>(
      func(_id, u) {
        {
          u with
          tier1Earnings = 0;
          tier2Earnings = 0;
          tier3Earnings = 0;
        };
      }
    );

    {
      var customCodes = newCustomCodes;
      var offerUsers  = newOfferUsers;
    };
  };

};
