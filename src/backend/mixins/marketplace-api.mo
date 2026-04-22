// mixins/marketplace-api.mo — Marketplace domain API module
import Map          "mo:core/Map";
import Time         "mo:core/Time";
import Principal    "mo:core/Principal";
import Types        "../types/marketplace";
import MarketLib    "../lib/marketplace";

module {

  public type Listings  = MarketLib.Listings;
  public type NewsItems = MarketLib.NewsItems;

  public type MarketState = {
    listings  : Listings;
    newsItems : NewsItems;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Listings
  // ─────────────────────────────────────────────────────────────────────────

  /// Returns (#ok(listingId), newNextId)
  public func createListing(
    s               : MarketState,
    nextId          : Nat,
    caller          : Principal,
    title           : Text,
    description     : Text,
    price           : Nat,
    category        : Types.MarketCategory,
    city            : Text,
    photoUrls       : [Text],
    whatsappContact : Text,
  ) : ({ #ok : Nat; #err : Text }, Nat) {
    let result = MarketLib.createListing(
      s.listings, nextId, caller, title, description, price,
      category, city, photoUrls, whatsappContact, Time.now(),
    );
    switch (result) {
      case (#ok(_)) { (result, nextId + 1) };
      case (#err(_)) { (result, nextId)    };
    };
  };

  public func getListings(
    s        : MarketState,
    city     : ?Text,
    category : ?Types.MarketCategory,
  ) : [Types.MarketListing] {
    MarketLib.getListings(s.listings, city, category, Time.now());
  };

  public func getMyListings(s : MarketState, caller : Principal) : [Types.MarketListing] {
    MarketLib.getMyListings(s.listings, caller);
  };

  public func updateListing(
    s               : MarketState,
    caller          : Principal,
    id              : Nat,
    title           : ?Text,
    description     : ?Text,
    price           : ?Nat,
    city            : ?Text,
    photoUrls       : ?[Text],
    whatsappContact : ?Text,
  ) : { #ok : (); #err : Text } {
    MarketLib.updateListing(s.listings, id, caller, title, description, price, city, photoUrls, whatsappContact);
  };

  public func deleteListing(
    s        : MarketState,
    caller   : Principal,
    id       : Nat,
    isAdmin  : Bool,
  ) : { #ok : (); #err : Text } {
    MarketLib.deleteListing(s.listings, id, caller, isAdmin);
  };

  /// Admin only — enforced at main.mo.
  public func featureListing(
    s  : MarketState,
    id : Nat,
  ) : { #ok : (); #err : Text } {
    MarketLib.featureListing(s.listings, id);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Local News
  // ─────────────────────────────────────────────────────────────────────────

  public func getNewsItems(s : MarketState) : [Types.LocalNewsItem] {
    MarketLib.getNewsItems(s.newsItems);
  };

  /// Returns (#ok(id), newNextId)
  public func adminAddNewsItem(
    s        : MarketState,
    nextId   : Nat,
    caller   : Principal,
    title    : Text,
    content  : Text,
    imageUrl : ?Text,
  ) : ({ #ok : Nat; #err : Text }, Nat) {
    let result = MarketLib.addNewsItem(s.newsItems, nextId, caller, title, content, imageUrl, Time.now());
    switch (result) {
      case (#ok(_)) { (result, nextId + 1) };
      case (#err(_)) { (result, nextId)    };
    };
  };

  public func adminDeleteNewsItem(
    s  : MarketState,
    id : Nat,
  ) : { #ok : (); #err : Text } {
    MarketLib.deleteNewsItem(s.newsItems, id);
  };

};
