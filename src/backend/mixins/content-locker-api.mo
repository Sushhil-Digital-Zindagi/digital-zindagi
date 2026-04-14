// mixins/content-locker-api.mo — Content Locker public API
import Types   "../types/content-locker";
import CLLib   "../lib/content-locker";
import Map     "mo:core/Map";
import Text    "mo:core/Text";
import Nat     "mo:core/Nat";
import Nat32   "mo:core/Nat32";
import Prim    "mo:prim";

module {

  public type LockedFeature       = Types.LockedFeature;
  public type ContentLockerConfig = Types.ContentLockerConfig;
  public type VerifyKeyResult     = Types.VerifyKeyResult;

  /// Return the full content locker configuration (all features).
  public func getContentLockerConfig(
    lockedFeatures : Map.Map<Text, LockedFeature>,
  ) : ContentLockerConfig {
    CLLib.getConfig(lockedFeatures);
  };

  /// Create or update a locked feature — admin only.
  /// The secretKey is hashed before storage using a deterministic Nat hash.
  public func setLockedFeature(
    lockedFeatures : Map.Map<Text, LockedFeature>,
    featureName    : Text,
    cpaOfferLink   : Text,
    secretKey      : Text,
  ) : { #ok : Text; #err : Text } {
    if (featureName == "") { return #err("featureName must not be empty") };
    if (secretKey == "")   { return #err("secretKey must not be empty") };
    // Hash the secret key — Nat hash → Text, never store plain text
    let keyHash = Prim.hashBlob(Prim.encodeUtf8(secretKey)).toNat();
    let id = CLLib.upsertFeature(lockedFeatures, featureName, cpaOfferLink, keyHash.toText());
    #ok(id);
  };

  /// Remove a locked feature by id — admin only.
  public func removeLockedFeature(
    lockedFeatures : Map.Map<Text, LockedFeature>,
    featureId      : Text,
  ) : { #ok; #err : Text } {
    if (CLLib.removeFeature(lockedFeatures, featureId)) {
      #ok;
    } else {
      #err("Feature not found: " # featureId);
    };
  };

  /// User-facing: verify a plain-text unlock key against the stored hash.
  public func verifyUnlockKey(
    lockedFeatures : Map.Map<Text, LockedFeature>,
    featureName    : Text,
    userKey        : Text,
  ) : VerifyKeyResult {
    // Hash the user-supplied key the same way before comparison
    let keyHash = Prim.hashBlob(Prim.encodeUtf8(userKey)).toNat();
    CLLib.verifyKey(lockedFeatures, featureName, keyHash.toText());
  };

};
