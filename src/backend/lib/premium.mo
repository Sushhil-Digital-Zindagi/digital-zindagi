// lib/premium.mo — Premium subscription domain logic (stateless, state injected)
import Map       "mo:core/Map";
import List      "mo:core/List";
import Types     "../types/premium";
import Principal "mo:core/Principal";
import Int       "mo:core/Int";
import Time      "mo:core/Time";

module {

  public type Subscriptions    = Map.Map<Principal, Types.PremiumSubscription>;
  public type UpiRequests      = Map.Map<Nat, Types.UpiPaymentRequest>;
  public type PricesStore      = List.List<Types.PremiumPrices>;

  // Default plan durations in nanoseconds
  let MONTH_NS  : Int = 2_592_000_000_000_000;   // 30 days
  let QUARTER_NS: Int = 7_776_000_000_000_000;   // 90 days
  let YEAR_NS   : Int = 31_536_000_000_000_000;  // 365 days

  let defaultPrices : Types.PremiumPrices = {
    monthly   = 9900;   // ₹99.00
    quarterly = 24900;  // ₹249.00
    annual    = 79900;  // ₹799.00
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  func durationNs(plan : Types.PremiumPlan) : Int {
    switch (plan) {
      case (#monthly)   { MONTH_NS   };
      case (#quarterly) { QUARTER_NS };
      case (#annual)    { YEAR_NS    };
    };
  };

  public func getPrices(store : PricesStore) : Types.PremiumPrices {
    switch (store.first()) {
      case null { defaultPrices };
      case (?p) { p };
    };
  };

  public func setPrices(store : PricesStore, prices : Types.PremiumPrices) {
    if (store.isEmpty()) { store.add(prices) }
    else { store.mapInPlace(func(_old) { prices }) };
  };

  // ── Subscription queries ──────────────────────────────────────────────────

  /// Check if a principal has an active, non-expired subscription.
  public func isPremium(
    subscriptions : Subscriptions,
    userId        : Principal,
    now           : Int,
  ) : Bool {
    switch (subscriptions.get(userId)) {
      case null     { false };
      case (?sub)   { sub.isActive and sub.expiresAt > now };
    };
  };

  /// Return the caller's subscription record.
  public func getSubscription(
    subscriptions : Subscriptions,
    userId        : Principal,
  ) : ?Types.PremiumSubscription {
    subscriptions.get(userId);
  };

  // ── Stripe activation ─────────────────────────────────────────────────────

  /// Called by frontend after Stripe confirms payment. Activates subscription.
  public func activateStripe(
    subscriptions        : Subscriptions,
    userId               : Principal,
    plan                 : Types.PremiumPlan,
    stripeSubscriptionId : Text,
    now                  : Int,
  ) : { #ok : (); #err : Text } {
    if (stripeSubscriptionId == "") { return #err("Stripe subscription ID required") };
    let sub : Types.PremiumSubscription = {
      userId;
      plan;
      startedAt            = now;
      expiresAt            = now + durationNs(plan);
      paymentMethod        = #stripe;
      stripeSubscriptionId = ?stripeSubscriptionId;
      isActive             = true;
    };
    subscriptions.add(userId, sub);
    #ok(());
  };

  // ── UPI payment requests ──────────────────────────────────────────────────

  /// Submit a UPI payment request for manual admin approval.
  public func submitUpiRequest(
    requests  : UpiRequests,
    nextId    : Nat,
    userId    : Principal,
    plan      : Types.PremiumPlan,
    upiTxnRef : Text,
    amount    : Nat,
    now       : Int,
  ) : { #ok : Nat; #err : Text } {
    if (upiTxnRef == "") { return #err("UPI transaction reference required") };
    let req : Types.UpiPaymentRequest = {
      id        = nextId;
      userId;
      plan;
      amount;
      upiTxnRef;
      status    = #pending;
      createdAt = now;
    };
    requests.add(nextId, req);
    #ok(nextId);
  };

  /// Return all UPI payment requests (admin view).
  public func getAllUpiRequests(requests : UpiRequests) : [Types.UpiPaymentRequest] {
    requests.values()
      .toArray()
      .sort(func(a : Types.UpiPaymentRequest, b : Types.UpiPaymentRequest) : { #less; #equal; #greater } {
        Int.compare(b.createdAt, a.createdAt)
      });
  };

  /// Admin: approve a UPI request, activating the subscription.
  public func approveUpiRequest(
    requests      : UpiRequests,
    subscriptions : Subscriptions,
    requestId     : Nat,
    now           : Int,
  ) : { #ok : (); #err : Text } {
    switch (requests.get(requestId)) {
      case null { #err("Request not found") };
      case (?req) {
        if (req.status != #pending) { return #err("Request is not pending") };
        // Mark request approved
        requests.add(requestId, { req with status = #approved });
        // Activate subscription
        let sub : Types.PremiumSubscription = {
          userId               = req.userId;
          plan                 = req.plan;
          startedAt            = now;
          expiresAt            = now + durationNs(req.plan);
          paymentMethod        = #upi;
          stripeSubscriptionId = null;
          isActive             = true;
        };
        subscriptions.add(req.userId, sub);
        #ok(());
      };
    };
  };

  /// Admin: reject a UPI request.
  public func rejectUpiRequest(
    requests  : UpiRequests,
    requestId : Nat,
  ) : { #ok : (); #err : Text } {
    switch (requests.get(requestId)) {
      case null { #err("Request not found") };
      case (?req) {
        if (req.status != #pending) { return #err("Request is not pending") };
        requests.add(requestId, { req with status = #rejected });
        #ok(());
      };
    };
  };

};
