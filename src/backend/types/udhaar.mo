// types/udhaar.mo — Udhaar Book domain types
module {

  /// A customer in the provider's udhaar ledger.
  public type UdhaarCustomer = {
    id         : Nat;
    providerId : Text;   // provider identity (e.g. caller principal as Text)
    name       : Text;
    mobile     : Text;
    address    : Text;
    createdAt  : Int;    // Time.now() nanoseconds
  };

  /// A single credit/debit entry for a customer.
  public type UdhaarTransaction = {
    id         : Nat;
    customerId : Nat;
    amount     : Float;
    txType     : Text;  // "give" | "take"
    date       : Text;
    note       : Text;
    status     : Text;  // "pending" | "paid"
    createdAt  : Int;
  };

};
