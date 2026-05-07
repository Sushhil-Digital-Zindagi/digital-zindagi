import Map "mo:core/Map";
import List "mo:core/List";
import CryptoTypes "types/crypto";

module {

  // ── Old type definitions (from previous deployment) ────────────────────────
  // Copied from .old/src/backend/types/crypto.mo
  type OldDepositRequest = {
    id : Text;
    userId : Text;
    amount : Float;
    utrNumber : Text;
    status : { #pending; #approved; #rejected };
    adminNote : ?Text;
    createdAt : Int;
    resolvedAt : ?Int;
  };

  // ── Old actor shape (only fields affected by this migration) ──────────────
  type OldActor = {
    cryptoDepositRequests : Map.Map<Text, OldDepositRequest>;
  };

  // ── New actor shape ───────────────────────────────────────────────────────
  type NewActor = {
    cryptoDepositRequests : Map.Map<Text, CryptoTypes.DepositRequest>;
  };

  // ── Migration function ────────────────────────────────────────────────────

  public func run(old : OldActor) : NewActor {
    let cryptoDepositRequests = old.cryptoDepositRequests.map<Text, OldDepositRequest, CryptoTypes.DepositRequest>(
      func(_id, req) {
        {
          req with
          screenshotUrl   = null : ?Text;
          rejectionReason = null : ?Text;
        }
      }
    );
    { cryptoDepositRequests };
  };
};
