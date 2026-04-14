// types/content-locker.mo — Content Locker domain types
module {

  /// A single feature that can be locked behind a CPA offer + secret key.
  public type LockedFeature = {
    id            : Text;
    featureName   : Text;
    cpaOfferLink  : Text;
    secretKeyHash : Text;   // hashed secret — never stored plain
    isLocked      : Bool;
    createdAt     : Int;    // Time.now() nanoseconds
    updatedAt     : Int;
  };

  /// Top-level config returned to callers (array of all locked features).
  public type ContentLockerConfig = {
    features : [LockedFeature];
  };

  /// Result of a user attempting to unlock a feature with a key.
  public type VerifyKeyResult = {
    #ok  : Bool;
    #err : Text;
  };

};
