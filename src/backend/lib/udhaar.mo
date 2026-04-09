// lib/udhaar.mo — Udhaar Book domain logic (stateless, state injected via Map)
import Types  "../types/udhaar";
import Map    "mo:core/Map";
import Time   "mo:core/Time";
import Int    "mo:core/Int";
import Iter   "mo:core/Iter";

module {

  public type UdhaarCustomer    = Types.UdhaarCustomer;
  public type UdhaarTransaction = Types.UdhaarTransaction;

  // ── Customer helpers ───────────────────────────────────────────────────────

  /// Create a new customer record.
  public func newCustomer(
    id         : Nat,
    providerId : Text,
    name       : Text,
    mobile     : Text,
    address    : Text,
  ) : UdhaarCustomer {
    { id; providerId; name; mobile; address; createdAt = Time.now() };
  };

  /// Return all customers belonging to providerId.
  public func listByProvider(
    customers  : Map.Map<Nat, UdhaarCustomer>,
    providerId : Text,
  ) : [UdhaarCustomer] {
    customers.values()
      .filter(func(c : UdhaarCustomer) : Bool { c.providerId == providerId })
      .toArray();
  };

  // ── Transaction helpers ────────────────────────────────────────────────────

  /// Create a new transaction record in "pending" status.
  public func newTransaction(
    id         : Nat,
    customerId : Nat,
    amount     : Float,
    txType     : Text,
    date       : Text,
    note       : Text,
  ) : UdhaarTransaction {
    { id; customerId; amount; txType; date; note; status = "pending"; createdAt = Time.now() };
  };

  /// Return all transactions for customerId, newest-first (by createdAt desc).
  public func listByCustomer(
    txns       : Map.Map<Nat, UdhaarTransaction>,
    customerId : Nat,
  ) : [UdhaarTransaction] {
    txns.values()
      .filter(func(t : UdhaarTransaction) : Bool { t.customerId == customerId })
      .toArray()
      .sort(func(a : UdhaarTransaction, b : UdhaarTransaction) : { #less; #equal; #greater } {
        Int.compare(b.createdAt, a.createdAt)   // descending
      });
  };

  /// Compute balance: sum of give amounts minus sum of take amounts.
  public func computeBalance(
    txns       : Map.Map<Nat, UdhaarTransaction>,
    customerId : Nat,
  ) : Float {
    txns.values()
      .filter(func(t : UdhaarTransaction) : Bool { t.customerId == customerId })
      .foldLeft(0.0, func(acc : Float, t : UdhaarTransaction) : Float {
        if (t.txType == "give") { acc + t.amount } else { acc - t.amount }
      });
  };

  /// Delete all transactions belonging to customerId.
  public func deleteByCustomer(
    txns       : Map.Map<Nat, UdhaarTransaction>,
    customerId : Nat,
  ) {
    let ids = txns.entries()
      .filter(func(kv : (Nat, UdhaarTransaction)) : Bool { kv.1.customerId == customerId })
      .map(func(kv : (Nat, UdhaarTransaction)) : Nat { kv.0 })
      .toArray();
    for (k in ids.values()) {
      txns.remove(k);
    };
  };

};
