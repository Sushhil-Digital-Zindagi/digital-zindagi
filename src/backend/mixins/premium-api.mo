// mixins/premium-api.mo — Premium subscription API module
import Map        "mo:core/Map";
import List       "mo:core/List";
import Time       "mo:core/Time";
import Types      "../types/premium";
import PremiumLib "../lib/premium";

module {

  public type Subscriptions = PremiumLib.Subscriptions;
  public type UpiRequests   = PremiumLib.UpiRequests;
  public type PricesStore   = PremiumLib.PricesStore;

  public type PremiumState = {
    subscriptions : Subscriptions;
    upiRequests   : UpiRequests;
    pricesStore   : PricesStore;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Queries
  // ─────────────────────────────────────────────────────────────────────────

  public func isPremiumUser(s : PremiumState, userId : Principal) : Bool {
    PremiumLib.isPremium(s.subscriptions, userId, Time.now());
  };

  public func getMySubscription(s : PremiumState, caller : Principal) : ?Types.PremiumSubscription {
    PremiumLib.getSubscription(s.subscriptions, caller);
  };

  public func getPremiumPrices(s : PremiumState) : Types.PremiumPrices {
    PremiumLib.getPrices(s.pricesStore);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Stripe
  // ─────────────────────────────────────────────────────────────────────────

  public func activateStripePremium(
    s                    : PremiumState,
    caller               : Principal,
    plan                 : Types.PremiumPlan,
    stripeSubscriptionId : Text,
  ) : { #ok : (); #err : Text } {
    PremiumLib.activateStripe(s.subscriptions, caller, plan, stripeSubscriptionId, Time.now());
  };

  // ─────────────────────────────────────────────────────────────────────────
  // UPI requests
  // ─────────────────────────────────────────────────────────────────────────

  /// Returns (#ok(requestId), newNextId)
  public func submitUpiPremiumRequest(
    s         : PremiumState,
    nextId    : Nat,
    caller    : Principal,
    plan      : Types.PremiumPlan,
    upiTxnRef : Text,
    amount    : Nat,
  ) : ({ #ok : Nat; #err : Text }, Nat) {
    let result = PremiumLib.submitUpiRequest(s.upiRequests, nextId, caller, plan, upiTxnRef, amount, Time.now());
    switch (result) {
      case (#ok(_)) { (result, nextId + 1) };
      case (#err(_)) { (result, nextId)    };
    };
  };

  public func adminGetUpiPremiumRequests(s : PremiumState) : [Types.UpiPaymentRequest] {
    PremiumLib.getAllUpiRequests(s.upiRequests);
  };

  public func adminApproveUpiPremium(
    s         : PremiumState,
    requestId : Nat,
  ) : { #ok : (); #err : Text } {
    PremiumLib.approveUpiRequest(s.upiRequests, s.subscriptions, requestId, Time.now());
  };

  public func adminRejectUpiPremium(
    s         : PremiumState,
    requestId : Nat,
  ) : { #ok : (); #err : Text } {
    PremiumLib.rejectUpiRequest(s.upiRequests, requestId);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Admin pricing
  // ─────────────────────────────────────────────────────────────────────────

  public func adminSetPremiumPrices(
    s         : PremiumState,
    monthly   : Nat,
    quarterly : Nat,
    annual    : Nat,
  ) : { #ok : (); #err : Text } {
    let prices : Types.PremiumPrices = { monthly; quarterly; annual };
    PremiumLib.setPrices(s.pricesStore, prices);
    #ok(());
  };

};
