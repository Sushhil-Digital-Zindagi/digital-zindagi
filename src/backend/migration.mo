// migration.mo — Explicit migration for offerPortalConfig schema change.
// Adds the new `cpagripApiKey` field with a default empty string.
//
// Old OfferPortalConfig (no cpagripApiKey):
//   { isEnabled; cpaLeadWebhookSecret; adminProfitPct; userProfitPct }
//
// New OfferPortalConfig (with cpagripApiKey):
//   { isEnabled; cpaLeadWebhookSecret; cpagripApiKey; adminProfitPct; userProfitPct }

module {

  // Old type — defined inline (do NOT import from .old/)
  type OldOfferPortalConfig = {
    isEnabled            : Bool;
    cpaLeadWebhookSecret : Text;
    adminProfitPct       : Nat;
    userProfitPct        : Nat;
  };

  // New type — matches the current types/offer-portal.mo definition
  type NewOfferPortalConfig = {
    isEnabled            : Bool;
    cpaLeadWebhookSecret : Text;
    cpagripApiKey        : Text;
    adminProfitPct       : Nat;
    userProfitPct        : Nat;
  };

  type OldActor = {
    var offerPortalConfig : OldOfferPortalConfig;
  };

  type NewActor = {
    var offerPortalConfig : NewOfferPortalConfig;
  };

  public func run(old : OldActor) : NewActor {
    {
      var offerPortalConfig = {
        old.offerPortalConfig with
        cpagripApiKey = "";
      };
    };
  };

};
