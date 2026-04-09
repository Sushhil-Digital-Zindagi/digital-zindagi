// mixins/udhaar-api.mo — Udhaar Book helper module (security-hardened)
//
// Security model enforced here:
//   - shopId is ALWAYS derived from the caller principal — never user-supplied.
//   - Ownership is verified before every mutation and read.
//   - Cross-provider reads are blocked: getCustomers/getTransactions/getBalance
//     all require the caller to own the record.
//
// These helpers are called from main.mo which passes (callerPrincipal.toText())
// as the shopId — no client-supplied shopId is ever trusted.
//
// Toggle key 'dz_udhaar_enabled' is managed via the existing updateToggle /
// getAllToggles functions in main.mo — no new toggle code here.
//
import Types    "../types/udhaar";
import UdhaarLib "../lib/udhaar";
import Map      "mo:core/Map";

module {

  public type UdhaarCustomer    = Types.UdhaarCustomer;
  public type UdhaarTransaction = Types.UdhaarTransaction;

  // ── Customer endpoints ─────────────────────────────────────────────────────

  /// Add a new customer for providerId (derived from caller principal as Text).
  /// Mutates: customers, nextCustomerId. Returns new customer id (Nat).
  public func addCustomer(
    customers  : Map.Map<Nat, UdhaarCustomer>,
    nextId     : var Nat,
    providerId : Text,   // MUST be caller.toText() — never user-supplied
    name       : Text,
    mobile     : Text,
    address    : Text,
  ) : Nat {
    let id = nextId;
    let c  = UdhaarLib.newCustomer(id, providerId, name, mobile, address);
    customers.add(id, c);
    nextId += 1;
    id;
  };

  /// Update name/mobile/address. Returns #ok on success, #err if not found or
  /// if the caller does not own the customer.
  public func updateCustomer(
    customers  : Map.Map<Nat, UdhaarCustomer>,
    id         : Nat,
    providerId : Text,   // MUST be caller.toText()
    name       : Text,
    mobile     : Text,
    address    : Text,
  ) : { #ok; #notFound; #unauthorized } {
    switch (customers.get(id)) {
      case null { #notFound };
      case (?c) {
        if (c.providerId != providerId) { return #unauthorized };
        customers.add(id, { c with name; mobile; address });
        #ok;
      };
    };
  };

  /// Delete a customer and all its transactions.
  /// Returns #ok on success, #notFound or #unauthorized otherwise.
  public func deleteCustomer(
    customers    : Map.Map<Nat, UdhaarCustomer>,
    transactions : Map.Map<Nat, UdhaarTransaction>,
    id           : Nat,
    providerId   : Text,   // MUST be caller.toText()
  ) : { #ok; #notFound; #unauthorized } {
    switch (customers.get(id)) {
      case null { return #notFound };
      case (?c) {
        if (c.providerId != providerId) { return #unauthorized };
      };
    };
    customers.remove(id);
    UdhaarLib.deleteByCustomer(transactions, id);
    #ok;
  };

  /// Return only customers belonging to providerId (caller.toText()).
  public func getCustomers(
    customers  : Map.Map<Nat, UdhaarCustomer>,
    providerId : Text,   // MUST be caller.toText()
  ) : [UdhaarCustomer] {
    UdhaarLib.listByProvider(customers, providerId);
  };

  // ── Transaction endpoints ──────────────────────────────────────────────────

  /// Add a transaction. customerId must belong to providerId.
  /// Returns ?Nat (new id) or null if customer not found / not owned.
  public func addTransaction(
    transactions : Map.Map<Nat, UdhaarTransaction>,
    customers    : Map.Map<Nat, UdhaarCustomer>,
    nextId       : var Nat,
    customerId   : Nat,
    providerId   : Text,   // MUST be caller.toText()
    amount       : Float,
    txType       : Text,
    date         : Text,
    note         : Text,
  ) : { #ok : Nat; #notFound; #unauthorized } {
    switch (customers.get(customerId)) {
      case null { return #notFound };
      case (?c) {
        if (c.providerId != providerId) { return #unauthorized };
      };
    };
    let id = nextId;
    let t  = UdhaarLib.newTransaction(id, customerId, amount, txType, date, note);
    transactions.add(id, t);
    nextId += 1;
    #ok(id);
  };

  /// Mark a transaction as "paid". Caller must own the transaction.
  public func markPaid(
    transactions : Map.Map<Nat, UdhaarTransaction>,
    customers    : Map.Map<Nat, UdhaarCustomer>,
    id           : Nat,
    providerId   : Text,   // MUST be caller.toText()
  ) : { #ok; #notFound; #unauthorized } {
    switch (transactions.get(id)) {
      case null { return #notFound };
      case (?t) {
        // Cross-check: transaction's customer must belong to this provider
        switch (customers.get(t.customerId)) {
          case null { return #notFound };
          case (?c) {
            if (c.providerId != providerId) { return #unauthorized };
          };
        };
        transactions.add(id, { t with status = "paid" });
        #ok;
      };
    };
  };

  /// Delete a transaction. Caller must own the transaction.
  public func deleteTransaction(
    transactions : Map.Map<Nat, UdhaarTransaction>,
    customers    : Map.Map<Nat, UdhaarCustomer>,
    id           : Nat,
    providerId   : Text,   // MUST be caller.toText()
  ) : { #ok; #notFound; #unauthorized } {
    switch (transactions.get(id)) {
      case null { return #notFound };
      case (?t) {
        switch (customers.get(t.customerId)) {
          case null { return #notFound };
          case (?c) {
            if (c.providerId != providerId) { return #unauthorized };
          };
        };
        transactions.remove(id);
        #ok;
      };
    };
  };

  /// Return all transactions for customerId. Caller must own the customer.
  public func getTransactions(
    transactions : Map.Map<Nat, UdhaarTransaction>,
    customers    : Map.Map<Nat, UdhaarCustomer>,
    customerId   : Nat,
    providerId   : Text,   // MUST be caller.toText()
  ) : { #ok : [UdhaarTransaction]; #notFound; #unauthorized } {
    switch (customers.get(customerId)) {
      case null { return #notFound };
      case (?c) {
        if (c.providerId != providerId) { return #unauthorized };
      };
    };
    #ok(UdhaarLib.listByCustomer(transactions, customerId));
  };

};
