// lib/content-locker.mo — Content Locker domain logic
import Types  "../types/content-locker";
import Map    "mo:core/Map";
import Time   "mo:core/Time";
import Int    "mo:core/Int";

module {

  public type LockedFeature       = Types.LockedFeature;
  public type ContentLockerConfig = Types.ContentLockerConfig;
  public type VerifyKeyResult     = Types.VerifyKeyResult;

  /// Return all locked features as a ContentLockerConfig snapshot.
  public func getConfig(
    lockedFeatures : Map.Map<Text, LockedFeature>,
  ) : ContentLockerConfig {
    let features = lockedFeatures.values().toArray();
    { features };
  };

  /// Add or update a locked feature. Returns the generated feature id.
  /// id is derived from featureName so the same feature name always maps to
  /// the same key (upsert semantic).
  public func upsertFeature(
    lockedFeatures : Map.Map<Text, LockedFeature>,
    featureName    : Text,
    cpaOfferLink   : Text,
    secretKeyHash  : Text,
  ) : Text {
    // Generate a stable id from featureName + timestamp suffix
    let now = Time.now();
    // Use featureName as the map key so updates replace the existing entry
    let id : Text = featureName # "-" # Int.abs(now).toText();
    let existing = lockedFeatures.get(featureName);
    let featureId : Text = switch (existing) {
      case (?e) { e.id };   // preserve existing id on update
      case null { id };
    };
    let feature : LockedFeature = {
      id           = featureId;
      featureName;
      cpaOfferLink;
      secretKeyHash;
      isLocked     = true;
      createdAt    = switch (existing) { case (?e) { e.createdAt }; case null { now } };
      updatedAt    = now;
    };
    lockedFeatures.add(featureName, feature);
    featureId;
  };

  /// Remove a locked feature by id. Returns true if it existed.
  /// Iterates the map to find the entry whose id matches featureId.
  public func removeFeature(
    lockedFeatures : Map.Map<Text, LockedFeature>,
    featureId      : Text,
  ) : Bool {
    // Find the map key whose stored id matches featureId
    let mEntry = lockedFeatures.entries().find(
      func(kv : (Text, LockedFeature)) : Bool { kv.1.id == featureId }
    );
    switch (mEntry) {
      case null { false };
      case (?(key, _)) {
        lockedFeatures.remove(key);
        true;
      };
    };
  };

  /// Verify that a user-supplied key hash matches the stored hash for a feature.
  public func verifyKey(
    lockedFeatures : Map.Map<Text, LockedFeature>,
    featureName    : Text,
    userKeyHash    : Text,
  ) : VerifyKeyResult {
    switch (lockedFeatures.get(featureName)) {
      case null { #err("Feature not found: " # featureName) };
      case (?feature) {
        if (not feature.isLocked) {
          // Feature exists but is unlocked — always passes
          #ok(true);
        } else if (feature.secretKeyHash == userKeyHash) {
          #ok(true);
        } else {
          #ok(false);
        };
      };
    };
  };

};
