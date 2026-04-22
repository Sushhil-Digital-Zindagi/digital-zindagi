// lib/marketplace.mo — Marketplace domain logic (stateless, state injected)
import Map       "mo:core/Map";
import Types     "../types/marketplace";
import Principal "mo:core/Principal";
import Int       "mo:core/Int";
import Nat       "mo:core/Nat";
import Text      "mo:core/Text";

module {

  public type Listings  = Map.Map<Nat, Types.MarketListing>;
  public type NewsItems = Map.Map<Nat, Types.LocalNewsItem>;

  // ─────────────────────────────────────────────────────────────────────────
  // Listings
  // ─────────────────────────────────────────────────────────────────────────

  /// Create a new listing; returns (#ok listingId).
  public func createListing(
    listings        : Listings,
    nextId          : Nat,
    sellerId        : Principal,
    title           : Text,
    description     : Text,
    price           : Nat,
    category        : Types.MarketCategory,
    city            : Text,
    photoUrls       : [Text],
    whatsappContact : Text,
    now             : Int,
  ) : { #ok : Nat; #err : Text } {
    if (title == "") { return #err("Title cannot be empty") };
    if (city  == "") { return #err("City cannot be empty")  };
    let listing : Types.MarketListing = {
      id              = nextId;
      sellerId;
      title;
      description;
      price;
      category;
      city;
      photoUrls;
      whatsappContact;
      isFeatured      = false;
      isActive        = true;
      createdAt       = now;
      expiresAt       = null;
    };
    listings.add(nextId, listing);
    #ok(nextId);
  };

  /// Return active listings, optionally filtered by city and/or category.
  public func getListings(
    listings : Listings,
    city     : ?Text,
    category : ?Types.MarketCategory,
    now      : Int,
  ) : [Types.MarketListing] {
    listings.values()
      .filter(func(l : Types.MarketListing) : Bool {
        if (not l.isActive) { return false };
        // Skip expired listings
        switch (l.expiresAt) {
          case (?exp) { if (exp <= now) { return false } };
          case null   {};
        };
        let cityOk = switch (city) {
          case null   { true };
          case (?c)   { l.city.toLower() == c.toLower() };
        };
        let catOk = switch (category) {
          case null   { true };
          case (?cat) { l.category == cat };
        };
        cityOk and catOk;
      })
      .toArray()
      .sort(func(a : Types.MarketListing, b : Types.MarketListing) : { #less; #equal; #greater } {
        // Featured first, then newest
        if (a.isFeatured and not b.isFeatured) { return #less };
        if (not a.isFeatured and b.isFeatured) { return #greater };
        Int.compare(b.createdAt, a.createdAt);
      });
  };

  /// Return all active listings owned by the caller.
  public func getMyListings(
    listings : Listings,
    callerId : Principal,
  ) : [Types.MarketListing] {
    listings.values()
      .filter(func(l : Types.MarketListing) : Bool {
        Principal.equal(l.sellerId, callerId) and l.isActive
      })
      .toArray();
  };

  /// Update a listing owned by the caller.
  public func updateListing(
    listings        : Listings,
    id              : Nat,
    callerId        : Principal,
    title           : ?Text,
    description     : ?Text,
    price           : ?Nat,
    city            : ?Text,
    photoUrls       : ?[Text],
    whatsappContact : ?Text,
  ) : { #ok : (); #err : Text } {
    switch (listings.get(id)) {
      case null { #err("Listing not found") };
      case (?l) {
        if (not Principal.equal(l.sellerId, callerId)) {
          return #err("Unauthorized: You do not own this listing");
        };
        let newTitle   = switch (title)           { case null { l.title };           case (?v) { v } };
        let newDesc    = switch (description)     { case null { l.description };     case (?v) { v } };
        let newPrice   = switch (price)           { case null { l.price };           case (?v) { v } };
        let newCity    = switch (city)            { case null { l.city };            case (?v) { v } };
        let newPhotos  = switch (photoUrls)       { case null { l.photoUrls };       case (?v) { v } };
        let newContact = switch (whatsappContact) { case null { l.whatsappContact }; case (?v) { v } };
        listings.add(id, { l with
          title           = newTitle;
          description     = newDesc;
          price           = newPrice;
          city            = newCity;
          photoUrls       = newPhotos;
          whatsappContact = newContact;
        });
        #ok(());
      };
    };
  };

  /// Soft-delete (deactivate) a listing owned by the caller.
  public func deleteListing(
    listings : Listings,
    id       : Nat,
    callerId : Principal,
    isAdmin  : Bool,
  ) : { #ok : (); #err : Text } {
    switch (listings.get(id)) {
      case null { #err("Listing not found") };
      case (?l) {
        if (not isAdmin and not Principal.equal(l.sellerId, callerId)) {
          return #err("Unauthorized: You do not own this listing");
        };
        listings.add(id, { l with isActive = false });
        #ok(());
      };
    };
  };

  /// Mark a listing as featured — admin only (enforced at mixin layer).
  public func featureListing(
    listings : Listings,
    id       : Nat,
  ) : { #ok : (); #err : Text } {
    switch (listings.get(id)) {
      case null { #err("Listing not found") };
      case (?l) {
        listings.add(id, { l with isFeatured = true });
        #ok(());
      };
    };
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Local news
  // ─────────────────────────────────────────────────────────────────────────

  /// Return all news items, newest first.
  public func getNewsItems(newsItems : NewsItems) : [Types.LocalNewsItem] {
    newsItems.values()
      .toArray()
      .sort(func(a : Types.LocalNewsItem, b : Types.LocalNewsItem) : { #less; #equal; #greater } {
        Int.compare(b.createdAt, a.createdAt)
      });
  };

  /// Admin: add a news item; returns (#ok id).
  public func addNewsItem(
    newsItems : NewsItems,
    nextId    : Nat,
    postedBy  : Principal,
    title     : Text,
    content   : Text,
    imageUrl  : ?Text,
    now       : Int,
  ) : { #ok : Nat; #err : Text } {
    if (title == "") { return #err("Title cannot be empty") };
    let item : Types.LocalNewsItem = {
      id        = nextId;
      title;
      content;
      imageUrl;
      createdAt = now;
      postedBy;
    };
    newsItems.add(nextId, item);
    #ok(nextId);
  };

  /// Admin: delete a news item by id.
  public func deleteNewsItem(
    newsItems : NewsItems,
    id        : Nat,
  ) : { #ok : (); #err : Text } {
    if (newsItems.containsKey(id)) {
      newsItems.remove(id);
      #ok(());
    } else {
      #err("News item not found");
    };
  };

};
